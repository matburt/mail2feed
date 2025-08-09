//! Email processing scheduler
//! 
//! Manages the scheduling and execution of background email processing tasks

use crate::background::{config::BackgroundConfig, cleanup::FeedCleanupService};
use crate::db::{models::ImapAccount, operations, DbPool};
use crate::imap::processor::EmailProcessor;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, RwLock};
use tokio::time::interval;
use tokio_util::sync::CancellationToken;
use tracing::{debug, error, info, warn};

/// Statistics for account processing
#[derive(Debug, Clone, Default)]
pub struct ProcessingStats {
    pub emails_processed: usize,
    pub errors_count: usize,
    pub last_run: Option<Instant>,
    pub last_success: Option<Instant>,
    pub last_error: Option<String>,
    pub consecutive_failures: u32,
}

/// Account processing state
#[derive(Debug, Clone)]
pub struct AccountState {
    #[allow(dead_code)]
    pub account_id: String,
    pub stats: ProcessingStats,
    pub is_processing: bool,
    pub next_allowed_run: Instant,
    pub retry_count: u32,
}

/// Email processing scheduler
#[derive(Clone)]
pub struct EmailScheduler {
    pool: DbPool,
    config: BackgroundConfig,
    account_states: Arc<RwLock<HashMap<String, AccountState>>>,
    cancellation_token: CancellationToken,
    is_running: Arc<Mutex<bool>>,
    processing_semaphore: Arc<tokio::sync::Semaphore>,
}

impl EmailScheduler {
    /// Create a new email scheduler
    pub fn new(pool: DbPool, config: BackgroundConfig) -> anyhow::Result<Self> {
        config.validate()?;
        
        let processing_semaphore = Arc::new(tokio::sync::Semaphore::new(config.max_concurrent_accounts));
        
        Ok(Self {
            pool,
            config,
            account_states: Arc::new(RwLock::new(HashMap::new())),
            cancellation_token: CancellationToken::new(),
            is_running: Arc::new(Mutex::new(false)),
            processing_semaphore,
        })
    }
    
    /// Start the background scheduler
    pub async fn start(&self) -> anyhow::Result<()> {
        let mut is_running = self.is_running.lock().await;
        if *is_running {
            return Err(anyhow::anyhow!("Scheduler is already running"));
        }
        *is_running = true;
        drop(is_running);
        
        info!("Starting email processing scheduler...");
        info!(
            "Configuration: global_interval={}min, per_account_interval={}min, max_concurrent={}",
            self.config.global_interval_minutes,
            self.config.per_account_interval_minutes,
            self.config.max_concurrent_accounts
        );
        
        // Initialize account states
        self.initialize_account_states().await?;
        
        // Start the main scheduling loop by cloning necessary data
        let scheduler_clone = self.clone_for_task();
        tokio::spawn(async move {
            scheduler_clone.run_scheduler_loop().await;
        });
        
        info!("Email processing scheduler started successfully");
        Ok(())
    }
    
    /// Stop the background scheduler
    pub async fn stop(&self) -> anyhow::Result<()> {
        info!("Stopping email processing scheduler...");
        
        // Cancel all running tasks
        self.cancellation_token.cancel();
        
        // Wait a moment for tasks to complete
        tokio::time::sleep(Duration::from_secs(2)).await;
        
        let mut is_running = self.is_running.lock().await;
        *is_running = false;
        
        info!("Email processing scheduler stopped");
        Ok(())
    }
    
    /// Check if the scheduler is running
    #[allow(dead_code)]
    pub async fn is_running(&self) -> bool {
        *self.is_running.lock().await
    }
    
    /// Get processing statistics for all accounts
    #[allow(dead_code)]
    pub async fn get_stats(&self) -> HashMap<String, ProcessingStats> {
        let states = self.account_states.read().await;
        states.iter()
            .map(|(id, state)| (id.clone(), state.stats.clone()))
            .collect()
    }
    
    /// Get processing state for a specific account
    #[allow(dead_code)]
    pub async fn get_account_state(&self, account_id: &str) -> Option<AccountState> {
        let states = self.account_states.read().await;
        states.get(account_id).cloned()
    }
    
    /// Manually trigger processing for a specific account
    pub async fn process_account_now(&self, account_id: &str) -> anyhow::Result<ProcessingStats> {
        let _permit = self.processing_semaphore.acquire().await
            .map_err(|_| anyhow::anyhow!("Failed to acquire processing permit"))?;
        
        let account = self.get_account_by_id(account_id).await?;
        let processor = EmailProcessor::new(account.clone(), self.pool.clone());
        let start_time = std::time::Instant::now();
        
        info!("Manually processing account '{}' ({})", account.name, account_id);
        
        let result = tokio::time::timeout(
            self.config.max_processing_time(),
            processor.process_account()
        ).await;
        
        let processing_result = match result {
            Ok(Ok(result)) => {
                info!(
                    "Successfully processed account '{}': {} emails in {:?}",
                    account.name,
                    result.total_emails_processed,
                    start_time.elapsed()
                );
                Ok(result)
            }
            Ok(Err(e)) => {
                warn!("Failed to process account '{}': {}", account.name, e);
                Err(e)
            }
            Err(_) => {
                error!("Timeout processing account '{}'", account.name);
                Err(anyhow::anyhow!("Processing timeout"))
            }
        };
        
        // Update account state
        let mut states = self.account_states.write().await;
        let now = std::time::Instant::now();
        
        if let Some(state) = states.get_mut(account_id) {
            state.stats.last_run = Some(now);
            
            match &processing_result {
                Ok(result) => {
                    state.stats.emails_processed += result.total_emails_processed;
                    state.stats.errors_count += result.errors.len();
                    state.stats.last_success = Some(now);
                    state.stats.last_error = None;
                    state.stats.consecutive_failures = 0;
                    state.retry_count = 0;
                    state.next_allowed_run = now + self.config.per_account_interval();
                    
                    Ok(ProcessingStats {
                        emails_processed: result.total_emails_processed,
                        errors_count: result.errors.len(),
                        last_run: Some(start_time),
                        last_success: Some(start_time),
                        last_error: None,
                        consecutive_failures: 0,
                    })
                }
                Err(e) => {
                    state.stats.errors_count += 1;
                    state.stats.last_error = Some(e.to_string());
                    state.stats.consecutive_failures += 1;
                    state.retry_count += 1;
                    
                    let retry_delay = if state.retry_count <= self.config.retry.max_attempts {
                        self.config.calculate_retry_delay(state.retry_count - 1)
                    } else {
                        state.retry_count = 0;
                        self.config.per_account_interval()
                    };
                    
                    state.next_allowed_run = now + retry_delay;
                    
                    error!("Manual account processing failed for {}: {}", account_id, e);
                    Err(anyhow::anyhow!("Processing failed: {}", e))
                }
            }
        } else {
            match processing_result {
                Ok(_) => Ok(ProcessingStats {
                    emails_processed: 0,
                    errors_count: 0,
                    last_run: Some(start_time),
                    last_success: Some(start_time),
                    last_error: None,
                    consecutive_failures: 0,
                }),
                Err(e) => Err(e)
            }
        }
    }
    
    /// Main scheduler loop
    async fn run_scheduler_loop(&self) {
        let mut ticker = interval(self.config.global_interval());
        let mut cleanup_ticker = interval(std::time::Duration::from_secs(24 * 60 * 60)); // Run cleanup daily
        
        loop {
            tokio::select! {
                _ = ticker.tick() => {
                    if let Err(e) = self.process_due_accounts().await {
                        error!("Error during scheduled processing: {}", e);
                    }
                }
                _ = cleanup_ticker.tick() => {
                    if let Err(e) = self.run_cleanup().await {
                        error!("Error during feed cleanup: {}", e);
                    }
                }
                _ = self.cancellation_token.cancelled() => {
                    info!("Scheduler loop cancelled");
                    break;
                }
            }
        }
    }
    
    /// Process accounts that are due for processing
    async fn process_due_accounts(&self) -> anyhow::Result<()> {
        debug!("Checking for accounts due for processing...");
        
        let accounts = self.get_active_accounts().await?;
        let now = Instant::now();
        let mut tasks = Vec::new();
        
        for account in accounts {
            // Skip accounts with no ID
            let Some(account_id) = &account.id else {
                warn!("Skipping account with no ID: {}", account.name);
                continue;
            };
            
            // Check if account is due for processing
            let should_process = {
                let states = self.account_states.read().await;
                if let Some(state) = states.get(account_id) {
                    !state.is_processing && now >= state.next_allowed_run
                } else {
                    true // New account, should process
                }
            };
            
            if should_process {
                // Check if we can acquire a processing slot
                if self.processing_semaphore.available_permits() > 0 {
                    // Mark as processing
                    self.mark_account_processing(account_id, true).await;
                    
                    // Spawn processing task with proper ownership
                    let pool = self.pool.clone();
                    let config = self.config.clone();
                    let account_states = self.account_states.clone();
                    let semaphore = self.processing_semaphore.clone();
                    let account_id_clone = account_id.clone();
                    
                    let task = tokio::spawn(async move {
                        // Acquire permit inside the task
                        let _permit = semaphore.acquire().await;
                        
                        // Process the account
                        let processor = EmailProcessor::new(account.clone(), pool);
                        let start_time = std::time::Instant::now();
                        
                        let result = match tokio::time::timeout(
                            config.max_processing_time(),
                            processor.process_account()
                        ).await {
                            Ok(Ok(processing_result)) => {
                                info!(
                                    "Successfully processed account '{}': {} emails in {:?}",
                                    account.name,
                                    processing_result.total_emails_processed,
                                    start_time.elapsed()
                                );
                                Ok(processing_result)
                            }
                            Ok(Err(e)) => {
                                warn!("Failed to process account '{}': {}", account.name, e);
                                Err(e)
                            }
                            Err(_) => {
                                error!("Timeout processing account '{}'", account.name);
                                Err(anyhow::anyhow!("Processing timeout"))
                            }
                        };
                        
                        // Update account state
                        let mut states = account_states.write().await;
                        let now = std::time::Instant::now();
                        
                        if let Some(state) = states.get_mut(&account_id_clone) {
                            state.stats.last_run = Some(now);
                            state.is_processing = false;
                            
                            match result {
                                Ok(processing_result) => {
                                    state.stats.emails_processed += processing_result.total_emails_processed;
                                    state.stats.errors_count += processing_result.errors.len();
                                    state.stats.last_success = Some(now);
                                    state.stats.last_error = None;
                                    state.stats.consecutive_failures = 0;
                                    state.retry_count = 0;
                                    state.next_allowed_run = now + config.per_account_interval();
                                }
                                Err(e) => {
                                    state.stats.errors_count += 1;
                                    state.stats.last_error = Some(e.to_string());
                                    state.stats.consecutive_failures += 1;
                                    state.retry_count += 1;
                                    
                                    let retry_delay = if state.retry_count <= config.retry.max_attempts {
                                        config.calculate_retry_delay(state.retry_count - 1)
                                    } else {
                                        state.retry_count = 0;
                                        config.per_account_interval()
                                    };
                                    
                                    state.next_allowed_run = now + retry_delay;
                                }
                            }
                        }
                    });
                    
                    tasks.push(task);
                } else {
                    debug!("No processing slots available for account {}", account_id);
                }
            }
        }
        
        if !tasks.is_empty() {
            debug!("Started {} background processing tasks", tasks.len());
        }
        
        Ok(())
    }
    
    /// Initialize account states for all active accounts
    async fn initialize_account_states(&self) -> anyhow::Result<()> {
        let accounts = self.get_active_accounts().await?;
        let mut states = self.account_states.write().await;
        
        let now = Instant::now();
        
        for account in accounts {
            if let Some(account_id) = &account.id {
                if !states.contains_key(account_id) {
                    states.insert(account_id.clone(), AccountState {
                        account_id: account_id.clone(),
                        stats: ProcessingStats::default(),
                        is_processing: false,
                        next_allowed_run: now,
                        retry_count: 0,
                    });
                }
            }
        }
        
        info!("Initialized states for {} accounts", states.len());
        Ok(())
    }
    
    /// Mark account as processing or not processing
    async fn mark_account_processing(&self, account_id: &str, processing: bool) {
        let mut states = self.account_states.write().await;
        if let Some(state) = states.get_mut(account_id) {
            state.is_processing = processing;
        }
    }
    
    /// Get all active IMAP accounts
    async fn get_active_accounts(&self) -> anyhow::Result<Vec<ImapAccount>> {
        let mut conn = self.pool.get()
            .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
        
        operations::ImapAccountOps::get_all(&mut conn)
            .map_err(|e| anyhow::anyhow!("Failed to fetch accounts: {}", e))
    }
    
    /// Get account by ID
    async fn get_account_by_id(&self, account_id: &str) -> anyhow::Result<ImapAccount> {
        let mut conn = self.pool.get()
            .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
        
        operations::ImapAccountOps::get_by_id(&mut conn, account_id)
            .map_err(|e| anyhow::anyhow!("Failed to fetch account: {}", e))
    }
    
    /// Clone for spawning tasks (contains only necessary references)
    fn clone_for_task(&self) -> Self {
        Self {
            pool: self.pool.clone(),
            config: self.config.clone(),
            account_states: self.account_states.clone(),
            cancellation_token: self.cancellation_token.clone(),
            is_running: self.is_running.clone(),
            processing_semaphore: self.processing_semaphore.clone(),
        }
    }
    
    /// Run feed cleanup for retention policy enforcement
    async fn run_cleanup(&self) -> anyhow::Result<()> {
        debug!("Starting scheduled feed cleanup...");
        
        let cleanup_service = FeedCleanupService::new(self.pool.clone());
        let result = cleanup_service.cleanup_all_feeds().await?;
        
        if result.items_removed > 0 {
            info!("Feed cleanup completed: {} feeds processed, {} items removed, {} errors", 
                  result.feeds_processed, result.items_removed, result.errors);
        } else {
            debug!("Feed cleanup completed: no items removed");
        }
        
        Ok(())
    }
}