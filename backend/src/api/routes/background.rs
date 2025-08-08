use axum::{
    routing::{get, post},
    Router, Json, extract::{State, Path},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use crate::{
    api::AppState,
    background::{self, service::ServiceStatus},
};
use tracing::{info, error};

#[derive(Serialize)]
pub struct BackgroundStatusResponse {
    pub status: ServiceStatus,
}

#[derive(Deserialize)]
pub struct StartServiceRequest {
    pub force: Option<bool>,
}

#[derive(Deserialize)]
pub struct ProcessAccountRequest {
    pub account_id: String,
}

#[derive(Serialize)]
pub struct ProcessAccountResponse {
    pub account_id: String,
    pub success: bool,
    pub message: String,
}

#[derive(Serialize)]
pub struct ServiceActionResponse {
    pub success: bool,
    pub message: String,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/background/status", get(get_status))
        .route("/api/background/start", post(start_service))
        .route("/api/background/stop", post(stop_service))
        .route("/api/background/restart", post(restart_service))
        .route("/api/background/process/:account_id", post(process_account))
        .route("/api/background/process-all", post(process_all_accounts))
}

/// Get background service status
async fn get_status(
    State(state): State<AppState>
) -> Result<Json<BackgroundStatusResponse>, (StatusCode, String)> {
    match background::get_service_status(&state.background).await {
        Some(status) => Ok(Json(BackgroundStatusResponse { status })),
        None => {
            let status = ServiceStatus::default();
            Ok(Json(BackgroundStatusResponse { status }))
        }
    }
}

/// Start the background service
async fn start_service(
    State(state): State<AppState>,
    Json(_request): Json<StartServiceRequest>
) -> Result<Json<ServiceActionResponse>, (StatusCode, String)> {
    info!("API request to start background service");
    
    match background::start_background_service(&state.background).await {
        Ok(()) => Ok(Json(ServiceActionResponse {
            success: true,
            message: "Background service started successfully".to_string(),
        })),
        Err(e) => {
            error!("Failed to start background service: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to start service: {}", e)))
        }
    }
}

/// Stop the background service
async fn stop_service(
    State(state): State<AppState>
) -> Result<Json<ServiceActionResponse>, (StatusCode, String)> {
    info!("API request to stop background service");
    
    match background::stop_background_service(&state.background).await {
        Ok(()) => Ok(Json(ServiceActionResponse {
            success: true,
            message: "Background service stopped successfully".to_string(),
        })),
        Err(e) => {
            error!("Failed to stop background service: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to stop service: {}", e)))
        }
    }
}

/// Restart the background service
async fn restart_service(
    State(state): State<AppState>
) -> Result<Json<ServiceActionResponse>, (StatusCode, String)> {
    info!("API request to restart background service");
    
    // Stop first
    if let Err(e) = background::stop_background_service(&state.background).await {
        error!("Failed to stop background service during restart: {}", e);
    }
    
    // Wait a moment for cleanup
    tokio::time::sleep(std::time::Duration::from_secs(1)).await;
    
    // Start again
    match background::start_background_service(&state.background).await {
        Ok(()) => Ok(Json(ServiceActionResponse {
            success: true,
            message: "Background service restarted successfully".to_string(),
        })),
        Err(e) => {
            error!("Failed to restart background service: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to restart service: {}", e)))
        }
    }
}

/// Process a specific account manually
async fn process_account(
    Path(account_id): Path<String>,
    State(state): State<AppState>
) -> Result<Json<ProcessAccountResponse>, (StatusCode, String)> {
    info!("API request to process account: {}", account_id);
    
    // Verify the account exists
    let mut conn = state.pool.get()
        .map_err(|e| {
            error!("Failed to get database connection: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, "Database connection failed".to_string())
        })?;
    
    use crate::db::operations::ImapAccountOps;
    match ImapAccountOps::get_by_id(&mut conn, &account_id) {
        Ok(_account) => {
            // Use the controller to trigger processing
            match state.background.controller.process_account_now(account_id.clone()).await {
                Ok(()) => Ok(Json(ProcessAccountResponse {
                    account_id: account_id.clone(),
                    success: true,
                    message: format!("Triggered processing for account {}", account_id),
                })),
                Err(e) => {
                    error!("Failed to trigger account processing {}: {}", account_id, e);
                    Ok(Json(ProcessAccountResponse {
                        account_id: account_id.clone(),
                        success: false,
                        message: format!("Failed to trigger processing: {}", e),
                    }))
                }
            }
        }
        Err(_) => {
            Err((StatusCode::NOT_FOUND, format!("Account {} not found", account_id)))
        }
    }
}

/// Process all accounts manually (non-blocking)
async fn process_all_accounts(
    State(state): State<AppState>
) -> Result<Json<ServiceActionResponse>, (StatusCode, String)> {
    info!("API request to process all accounts via controller");
    
    // Use the controller to trigger processing
    match state.background.controller.process_all_now().await {
        Ok(()) => {
            Ok(Json(ServiceActionResponse {
                success: true,
                message: "Triggered processing of all accounts".to_string(),
            }))
        }
        Err(e) => {
            error!("Failed to trigger account processing: {}", e);
            Err((StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to trigger processing: {}", e)))
        }
    }
}