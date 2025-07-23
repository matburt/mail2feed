//! Background email processing services
//! 
//! This module provides automated email processing capabilities that run
//! continuously in the background, monitoring IMAP accounts and generating
//! RSS/Atom feeds from new emails.

pub mod config;
pub mod scheduler;
pub mod service;

pub use config::BackgroundConfig;
pub use scheduler::EmailScheduler;
pub use service::BackgroundService;

use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{info, error};

/// Global background service state
pub type BackgroundServiceHandle = Arc<RwLock<Option<BackgroundService>>>;

/// Initialize the background service system
pub async fn initialize_background_service(
    pool: crate::db::DbPool,
    config: BackgroundConfig,
) -> anyhow::Result<BackgroundServiceHandle> {
    info!("Initializing background email processing service...");
    
    let service = BackgroundService::new(pool, config)?;
    let handle = Arc::new(RwLock::new(Some(service)));
    
    info!("Background service initialized successfully");
    Ok(handle)
}

/// Start the background service
pub async fn start_background_service(handle: BackgroundServiceHandle) -> anyhow::Result<()> {
    let mut service_guard = handle.write().await;
    
    if let Some(service) = service_guard.as_mut() {
        service.start().await?;
        info!("Background email processing service started");
    } else {
        error!("Background service not initialized");
        return Err(anyhow::anyhow!("Background service not initialized"));
    }
    
    Ok(())
}

/// Stop the background service
pub async fn stop_background_service(handle: BackgroundServiceHandle) -> anyhow::Result<()> {
    let mut service_guard = handle.write().await;
    
    if let Some(service) = service_guard.as_mut() {
        service.stop().await?;
        info!("Background email processing service stopped");
    }
    
    Ok(())
}

/// Get background service status
pub async fn get_service_status(handle: BackgroundServiceHandle) -> Option<service::ServiceStatus> {
    let service_guard = handle.read().await;
    
    if let Some(service) = service_guard.as_ref() {
        Some(service.get_status().await)
    } else {
        None
    }
}