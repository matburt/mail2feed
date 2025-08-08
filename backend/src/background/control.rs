//! Background service control messaging
//! 
//! Provides message-based communication between the web API and background service

use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;
use tracing::info;

/// Control messages that can be sent to the background service
#[derive(Debug, Clone)]
pub enum ControlMessage {
    /// Trigger immediate processing of all accounts
    ProcessAllNow,
    /// Trigger immediate processing of a specific account
    ProcessAccountNow { account_id: String },
    /// Pause the background service
    Pause,
    /// Resume the background service
    Resume,
    /// Reload configuration
    ReloadConfig,
    /// Get current status (response sent via response channel)
    GetStatus { response_tx: mpsc::UnboundedSender<ServiceStatusResponse> },
    /// Shutdown the service gracefully
    Shutdown,
}

/// Response messages from the background service
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ServiceStatusResponse {
    /// Service status information
    Status {
        is_running: bool,
        is_paused: bool,
        accounts_processing: usize,
        total_processed: usize,
        uptime_seconds: u64,
    },
    /// Processing result for a specific account
    ProcessingResult {
        account_id: String,
        success: bool,
        message: String,
        emails_processed: usize,
    },
    /// Error response
    Error { message: String },
}

/// Control channel for communicating with background service
pub struct ServiceController {
    control_tx: mpsc::UnboundedSender<ControlMessage>,
}

impl ServiceController {
    /// Create a new service controller
    pub fn new(control_tx: mpsc::UnboundedSender<ControlMessage>) -> Self {
        Self { control_tx }
    }
    
    /// Send a control message to the background service
    pub async fn send_command(&self, message: ControlMessage) -> Result<(), String> {
        self.control_tx.send(message)
            .map_err(|e| format!("Failed to send control message: {}", e))
    }
    
    /// Trigger immediate processing of all accounts
    pub async fn process_all_now(&self) -> Result<(), String> {
        info!("Triggering immediate processing of all accounts");
        self.send_command(ControlMessage::ProcessAllNow).await
    }
    
    /// Trigger immediate processing of a specific account
    pub async fn process_account_now(&self, account_id: String) -> Result<(), String> {
        info!("Triggering immediate processing of account: {}", account_id);
        self.send_command(ControlMessage::ProcessAccountNow { account_id }).await
    }
    
    /// Pause the background service
    pub async fn pause(&self) -> Result<(), String> {
        info!("Pausing background service");
        self.send_command(ControlMessage::Pause).await
    }
    
    /// Resume the background service
    pub async fn resume(&self) -> Result<(), String> {
        info!("Resuming background service");
        self.send_command(ControlMessage::Resume).await
    }
    
    /// Get service status
    pub async fn get_status(&self) -> Result<ServiceStatusResponse, String> {
        let (response_tx, mut response_rx) = mpsc::unbounded_channel();
        
        self.send_command(ControlMessage::GetStatus { response_tx }).await?;
        
        // Wait for response with timeout
        match tokio::time::timeout(
            std::time::Duration::from_secs(5), 
            response_rx.recv()
        ).await {
            Ok(Some(response)) => Ok(response),
            Ok(None) => Err("Background service did not respond".to_string()),
            Err(_) => Err("Timeout waiting for service status".to_string()),
        }
    }
    
    /// Shutdown the background service
    pub async fn shutdown(&self) -> Result<(), String> {
        info!("Requesting background service shutdown");
        self.send_command(ControlMessage::Shutdown).await
    }
}

impl Clone for ServiceController {
    fn clone(&self) -> Self {
        Self {
            control_tx: self.control_tx.clone(),
        }
    }
}