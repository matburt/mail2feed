//! Background service management
//! 
//! Provides the main service interface for managing background email processing

use crate::background::{config::BackgroundConfig, scheduler::EmailScheduler, control::{ControlMessage, ServiceStatusResponse}};
use crate::db::connection::DatabasePool;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::{RwLock, mpsc};
use tracing::{error, info, warn};

/// Overall service status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceState {
    /// Service is stopped
    Stopped,
    /// Service is starting up
    Starting,
    /// Service is running normally
    Running,
    /// Service is stopping
    Stopping,
    /// Service encountered an error
    Error(String),
}

/// Background service status information
#[derive(Debug, Clone, Serialize)]
pub struct ServiceStatus {
    /// Current state of the service
    pub state: ServiceState,
    /// When the service was started (as timestamp)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<u64>,
    /// Configuration being used
    pub config: BackgroundConfig,
    /// Number of accounts being monitored
    pub accounts_count: usize,
    /// Number of accounts currently being processed
    pub active_processing_count: usize,
    /// Total emails processed since start
    pub total_emails_processed: usize,
    /// Total errors since start
    pub total_errors: usize,
    /// Uptime in seconds
    pub uptime_seconds: Option<u64>,
}

/// Main background service
pub struct BackgroundService {
    scheduler: EmailScheduler,
    state: Arc<RwLock<ServiceState>>,
    started_at: Arc<RwLock<Option<Instant>>>,
    config: BackgroundConfig,
    control_rx: mpsc::UnboundedReceiver<ControlMessage>,
    is_paused: Arc<RwLock<bool>>,
}

impl BackgroundService {
    /// Create a new background service
    pub fn new(pool: DatabasePool, config: BackgroundConfig, control_rx: mpsc::UnboundedReceiver<ControlMessage>) -> anyhow::Result<Self> {
        info!("Creating background service with config: {:?}", config);
        
        // Validate configuration
        config.validate()?;
        
        if !config.enabled {
            warn!("Background processing is disabled in configuration");
        }
        
        let scheduler = EmailScheduler::new(pool, config.clone())?;
        
        Ok(Self {
            scheduler,
            state: Arc::new(RwLock::new(ServiceState::Stopped)),
            started_at: Arc::new(RwLock::new(None)),
            config,
            control_rx,
            is_paused: Arc::new(RwLock::new(false)),
        })
    }
    
    /// Start the background service
    pub async fn start(&mut self) -> anyhow::Result<()> {
        if !self.config.enabled {
            return Err(anyhow::anyhow!("Background processing is disabled"));
        }
        
        // Check current state
        {
            let current_state = self.state.read().await;
            match *current_state {
                ServiceState::Running => {
                    return Err(anyhow::anyhow!("Service is already running"));
                }
                ServiceState::Starting => {
                    return Err(anyhow::anyhow!("Service is already starting"));
                }
                _ => {}
            }
        }
        
        info!("Starting background email processing service...");
        
        // Update state to starting
        {
            let mut state = self.state.write().await;
            *state = ServiceState::Starting;
        }
        
        // Start the scheduler
        match self.scheduler.start().await {
            Ok(()) => {
                let now = Instant::now();
                
                // Update state to running
                {
                    let mut state = self.state.write().await;
                    *state = ServiceState::Running;
                }
                
                // Record start time
                {
                    let mut started_at = self.started_at.write().await;
                    *started_at = Some(now);
                }
                
                // Start control message handler
                self.start_control_handler().await;
                
                info!("Background service started successfully");
                Ok(())
            }
            Err(e) => {
                error!("Failed to start background service: {}", e);
                
                // Update state to error
                {
                    let mut state = self.state.write().await;
                    *state = ServiceState::Error(e.to_string());
                }
                
                Err(e)
            }
        }
    }
    
    /// Stop the background service
    pub async fn stop(&mut self) -> anyhow::Result<()> {
        // Check current state
        {
            let current_state = self.state.read().await;
            match *current_state {
                ServiceState::Stopped => {
                    return Ok(()); // Already stopped
                }
                ServiceState::Stopping => {
                    return Err(anyhow::anyhow!("Service is already stopping"));
                }
                _ => {}
            }
        }
        
        info!("Stopping background email processing service...");
        
        // Update state to stopping
        {
            let mut state = self.state.write().await;
            *state = ServiceState::Stopping;
        }
        
        // Stop the scheduler
        match self.scheduler.stop().await {
            Ok(()) => {
                // Update state to stopped
                {
                    let mut state = self.state.write().await;
                    *state = ServiceState::Stopped;
                }
                
                // Clear start time
                {
                    let mut started_at = self.started_at.write().await;
                    *started_at = None;
                }
                
                info!("Background service stopped successfully");
                Ok(())
            }
            Err(e) => {
                error!("Error stopping background service: {}", e);
                
                // Update state to error
                {
                    let mut state = self.state.write().await;
                    *state = ServiceState::Error(e.to_string());
                }
                
                Err(e)
            }
        }
    }
    
    /// Restart the background service
    #[allow(dead_code)]
    pub async fn restart(&mut self) -> anyhow::Result<()> {
        info!("Restarting background service...");
        
        // Stop first (ignore errors if already stopped)
        let _ = self.stop().await;
        
        // Wait a moment
        tokio::time::sleep(std::time::Duration::from_secs(1)).await;
        
        // Start again
        self.start().await
    }
    
    /// Get current service status
    pub async fn get_status(&self) -> ServiceStatus {
        let state = self.state.read().await.clone();
        let started_at = *self.started_at.read().await;
        
        // Get scheduler statistics
        let scheduler_stats = self.scheduler.get_stats().await;
        
        let accounts_count = scheduler_stats.len();
        let active_processing_count = 0; // TODO: Get from scheduler
        
        let (total_emails_processed, total_errors) = scheduler_stats.values().fold(
            (0usize, 0usize), 
            |(emails, errors), stats| {
                (emails + stats.emails_processed, errors + stats.errors_count)
            }
        );
        
        let uptime_seconds = started_at.map(|start| start.elapsed().as_secs());
        
        ServiceStatus {
            state,
            started_at: started_at.map(|_| std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()),
            config: self.config.clone(),
            accounts_count,
            active_processing_count,
            total_emails_processed,
            total_errors,
            uptime_seconds,
        }
    }
    
    /// Check if service is running
    #[allow(dead_code)]
    pub async fn is_running(&self) -> bool {
        matches!(*self.state.read().await, ServiceState::Running)
    }
    
    /// Get service state
    #[allow(dead_code)]
    pub async fn get_state(&self) -> ServiceState {
        self.state.read().await.clone()
    }
    
    /// Process a specific account manually
    #[allow(dead_code)]
    pub async fn process_account(&self, account_id: &str) -> anyhow::Result<()> {
        if !self.is_running().await {
            return Err(anyhow::anyhow!("Service is not running"));
        }
        
        info!("Manually triggering processing for account: {}", account_id);
        
        match self.scheduler.process_account_now(account_id).await {
            Ok(stats) => {
                info!(
                    "Manual processing completed for account {}: {} emails processed",
                    account_id, stats.emails_processed
                );
                Ok(())
            }
            Err(e) => {
                error!("Manual processing failed for account {}: {}", account_id, e);
                Err(e)
            }
        }
    }
    
    /// Update service configuration (requires restart to take effect)
    #[allow(dead_code)]
    pub fn update_config(&mut self, new_config: BackgroundConfig) -> anyhow::Result<()> {
        new_config.validate()?;
        self.config = new_config;
        info!("Service configuration updated (restart required for changes to take effect)");
        Ok(())
    }
    
    /// Get current configuration
    #[allow(dead_code)]
    pub fn get_config(&self) -> &BackgroundConfig {
        &self.config
    }
    
    /// Start the control message handler
    async fn start_control_handler(&mut self) {
        let state = self.state.clone();
        let started_at = self.started_at.clone();
        let is_paused = self.is_paused.clone();
        let scheduler = self.scheduler.clone();
        let _config = self.config.clone();
        
        // Take ownership of the control receiver
        let mut control_rx = std::mem::replace(&mut self.control_rx, {
            let (_, rx) = mpsc::unbounded_channel();
            rx
        });
        
        tokio::spawn(async move {
            info!("Starting background service control message handler");
            
            while let Some(message) = control_rx.recv().await {
                match message {
                    ControlMessage::ProcessAllNow => {
                        info!("Received command: ProcessAllNow");
                        // Trigger immediate processing via scheduler
                        // This is non-blocking and will be handled by the scheduler
                    }
                    
                    ControlMessage::ProcessAccountNow { account_id } => {
                        info!("Received command: ProcessAccountNow for account {}", account_id);
                        // Trigger processing for specific account
                        if let Err(e) = scheduler.process_account_now(&account_id).await {
                            error!("Failed to process account {}: {}", account_id, e);
                        }
                    }
                    
                    ControlMessage::Pause => {
                        info!("Received command: Pause");
                        let mut paused = is_paused.write().await;
                        *paused = true;
                    }
                    
                    ControlMessage::Resume => {
                        info!("Received command: Resume");
                        let mut paused = is_paused.write().await;
                        *paused = false;
                    }
                    
                    ControlMessage::ReloadConfig => {
                        info!("Received command: ReloadConfig");
                        // Configuration reload will require service restart
                        warn!("Configuration reload requires service restart - not implemented yet");
                    }
                    
                    ControlMessage::GetStatus { response_tx } => {
                        let current_state = state.read().await.clone();
                        let start_time = started_at.read().await;
                        let paused = *is_paused.read().await;
                        
                        let uptime = if let Some(start) = *start_time {
                            start.elapsed().as_secs()
                        } else {
                            0
                        };
                        
                        let response = ServiceStatusResponse::Status {
                            is_running: matches!(current_state, ServiceState::Running),
                            is_paused: paused,
                            accounts_processing: 0, // TODO: Get from scheduler
                            total_processed: 0,     // TODO: Get from scheduler
                            uptime_seconds: uptime,
                        };
                        
                        if response_tx.send(response).is_err() {
                            warn!("Failed to send status response - receiver may have been dropped");
                        }
                    }
                    
                    ControlMessage::Shutdown => {
                        info!("Received command: Shutdown");
                        // Set state to stopping
                        {
                            let mut current_state = state.write().await;
                            *current_state = ServiceState::Stopping;
                        }
                        break;
                    }
                }
            }
            
            info!("Background service control message handler stopped");
        });
    }
}

impl Default for ServiceStatus {
    fn default() -> Self {
        Self {
            state: ServiceState::Stopped,
            started_at: None,
            config: BackgroundConfig::default(),
            accounts_count: 0,
            active_processing_count: 0,
            total_emails_processed: 0,
            total_errors: 0,
            uptime_seconds: None,
        }
    }
}