//! Email processing scheduler
//! 
//! Manages the scheduling and execution of background email processing tasks

use crate::background::config::BackgroundConfig;
use crate::db::{models::ImapAccount, operations, DbPool};
use crate::imap::processor::{EmailProcessor, ProcessingResult};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, RwLock};
use tokio::time::{interval, timeout};
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
    pub account_id: String,
    pub stats: ProcessingStats,
    pub is_processing: bool,
    pub next_allowed_run: Instant,
    pub retry_count: u32,
}

/// Email processing scheduler
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
        
        // Start the main scheduling loop
        let scheduler_task = self.run_scheduler_loop();
        
        // Spawn the task and return immediately
        tokio::spawn(scheduler_task);
        
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
    pub async fn is_running(&self) -> bool {
        *self.is_running.lock().await
    }
    
    /// Get processing statistics for all accounts
    pub async fn get_stats(&self) -> HashMap<String, ProcessingStats> {
        let states = self.account_states.read().await;
        states.iter()
            .map(|(id, state)| (id.clone(), state.stats.clone()))
            .collect()
    }
    
    /// Get processing state for a specific account
    pub async fn get_account_state(&self, account_id: &str) -> Option<AccountState> {
        let states = self.account_states.read().await;
        states.get(account_id).cloned()
    }
    
    /// Manually trigger processing for a specific account
    pub async fn process_account_now(&self, account_id: &str) -> anyhow::Result<ProcessingStats> {
        let semaphore = self.processing_semaphore.clone();
        let permit = semaphore.acquire().await
            .map_err(|_| anyhow::anyhow!("Failed to acquire processing permit"))?;
        
        let account = self.get_account_by_id(account_id).await?;
        let result = self.process_single_account(account, true).await;
        
        drop(permit);
        
        match result {
            Ok(stats) => Ok(stats),
            Err(e) => {
                error!("Manual account processing failed for {}: {}", account_id, e);
                Err(e)
            }
        }
    }
    
    /// Main scheduler loop
    async fn run_scheduler_loop(&self) {
        let mut ticker = interval(self.config.global_interval());
        
        loop {
            tokio::select! {
                _ = ticker.tick() => {
                    if let Err(e) = self.process_due_accounts().await {
                        error!("Error during scheduled processing: {}", e);
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
            let account_id = account.id.clone();
            
            // Check if account is due for processing
            let should_process = {
                let states = self.account_states.read().await;
                if let Some(state) = states.get(&account_id) {
                    !state.is_processing && now >= state.next_allowed_run
                } else {
                    true // New account, should process
                }
            };
            
            if should_process {
                // Try to acquire processing permit
                let semaphore = self.processing_semaphore.clone();
                if let Ok(permit) = semaphore.try_acquire() {
                    // Mark as processing
                    self.mark_account_processing(&account_id, true).await;
                    
                    // Spawn processing task
                    let scheduler = self.clone_for_task();
                    let task = tokio::spawn(async move {
                        let result = scheduler.process_single_account(account, false).await;
                        scheduler.mark_account_processing(&account_id, false).await;
                        drop(permit);
                        
                        if let Err(e) = result {
                            error!("Background processing failed for account {}: {}", account_id, e);
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
    
    /// Process a single account
    async fn process_single_account(
        &self, 
        account: ImapAccount, 
        manual: bool
    ) -> anyhow::Result<ProcessingStats> {
        let account_id = account.id.clone();
        let start_time = Instant::now();
        
        info!(
            "Processing account '{}' ({}) - {}",
            account.name,
            account_id,
            if manual { "manual" } else { "scheduled" }
        );
        
        // Create processor for this account
        let processor = EmailProcessor::new(account.clone(), self.pool.clone());
        
        // Apply processing timeout
        let processing_future = processor.process_account();
        let result = timeout(
            self.config.max_processing_time(),
            processing_future
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
                warn!(
                    "Failed to process account '{}': {} (took {:?})",
                    account.name,
                    e,
                    start_time.elapsed()
                );
                Err(e)
            }
            Err(_) => {
                let timeout_error = anyhow::anyhow!(
                    "Processing timeout after {:?}",
                    self.config.max_processing_time()
                );
                error!(
                    "Timeout processing account '{}' after {:?}",
                    account.name,
                    self.config.max_processing_time()
                );
                Err(timeout_error)
            }
        };
        
        // Update account state
        self.update_account_state(&account_id, &processing_result).await;
        
        match processing_result {
            Ok(result) => Ok(ProcessingStats {
                emails_processed: result.total_emails_processed,
                errors_count: result.errors.len(),
                last_run: Some(start_time),
                last_success: Some(start_time),
                last_error: None,
                consecutive_failures: 0,
            }),
            Err(e) => Err(e),
        }
    }
    
    /// Initialize account states for all active accounts
    async fn initialize_account_states(&self) -> anyhow::Result<()> {
        let accounts = self.get_active_accounts().await?;
        let mut states = self.account_states.write().await;
        
        let now = Instant::now();
        
        for account in accounts {
            if !states.contains_key(&account.id) {
                states.insert(account.id.clone(), AccountState {
                    account_id: account.id,
                    stats: ProcessingStats::default(),
                    is_processing: false,
                    next_allowed_run: now,
                    retry_count: 0,
                });
            }
        }
        
        info!("Initialized states for {} accounts", states.len());
        Ok(())
    }
    
    /// Update account state after processing
    async fn update_account_state(
        &self,
        account_id: &str,
        result: &anyhow::Result<ProcessingResult>
    ) {
        let mut states = self.account_states.write().await;
        let now = Instant::now();
        
        if let Some(state) = states.get_mut(account_id) {
            state.stats.last_run = Some(now);
            
            match result {
                Ok(processing_result) => {
                    state.stats.emails_processed += processing_result.total_emails_processed;
                    state.stats.errors_count += processing_result.errors.len();
                    state.stats.last_success = Some(now);
                    state.stats.last_error = None;
                    state.stats.consecutive_failures = 0;
                    state.retry_count = 0;
                    state.next_allowed_run = now + self.config.per_account_interval();
                }
                Err(e) => {
                    state.stats.errors_count += 1;
                    state.stats.last_error = Some(e.to_string());
                    state.stats.consecutive_failures += 1;
                    state.retry_count += 1;
                    
                    // Calculate next retry time with exponential backoff
                    let retry_delay = if state.retry_count <= self.config.retry.max_attempts {
                        self.config.calculate_retry_delay(state.retry_count - 1)
                    } else {
                        // Max retries exceeded, wait for next regular interval
                        state.retry_count = 0;
                        self.config.per_account_interval()
                    };
                    
                    state.next_allowed_run = now + retry_delay;
                }
            }
        }
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
}