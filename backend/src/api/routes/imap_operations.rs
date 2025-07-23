use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{info, error};

use crate::api::AppState;
use crate::db::operations::ImapAccountOps;
use crate::imap::{ImapClient, EmailProcessor};

#[derive(Debug, Serialize, Deserialize)]
pub struct TestConnectionResponse {
    pub success: bool,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub folders: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessAccountResponse {
    pub success: bool,
    pub emails_processed: usize,
    pub items_created: usize,
    pub errors: Vec<String>,
}

// Test IMAP connection and list folders
pub async fn test_connection(
    Path(account_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<TestConnectionResponse>, (StatusCode, String)> {
    info!("Testing IMAP connection for account: {}", account_id);
    
    let mut conn = state.pool
        .get()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    // Get the account
    let account = ImapAccountOps::get_by_id(&mut conn, &account_id)
        .map_err(|e| (StatusCode::NOT_FOUND, format!("Account not found: {}", e)))?;
    
    // Test connection
    let client = ImapClient::new(&account)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to create IMAP client: {}", e)))?;
    
    match client.test_connection().await {
        Ok(_) => {
            // Try to list folders
            match client.list_folders() {
                Ok(folders) => {
                    info!("Successfully connected and retrieved {} folders", folders.len());
                    Ok(Json(TestConnectionResponse {
                        success: true,
                        message: format!("Successfully connected to {}", account.host),
                        folders: Some(folders),
                    }))
                }
                Err(e) => {
                    error!("Connected but failed to list folders: {}", e);
                    Ok(Json(TestConnectionResponse {
                        success: true,
                        message: format!("Connected to {} but couldn't list folders: {}", account.host, e),
                        folders: None,
                    }))
                }
            }
        }
        Err(e) => {
            error!("Connection test failed: {}", e);
            
            // Extract more specific error information
            let error_message = if e.to_string().contains("Unable to parse status response") {
                format!("Connection failed: The server response was not in expected IMAP format. \
                        This often happens when: \
                        1) The port is wrong (e.g., using HTTP port instead of IMAP port), \
                        2) The server is not an IMAP server, \
                        3) TLS/SSL settings are incorrect. \
                        Common IMAP ports: 143 (plain), 993 (TLS/SSL). \
                        Original error: {}", e)
            } else if e.to_string().contains("certificate") {
                format!("TLS certificate error: {}. \
                        The server's certificate may be self-signed or expired. \
                        For testing, you might need to use plain connection (port 143) instead of TLS.", e)
            } else if e.to_string().contains("timeout") {
                format!("Connection timeout: {}. \
                        The server is not responding. Check if the host and port are correct \
                        and that your firewall allows the connection.", e)
            } else if e.to_string().contains("password") || e.to_string().contains("auth") {
                format!("Authentication failed: {}. \
                        Check your username and password. \
                        For Gmail, use an app-specific password. \
                        For Outlook/Office365, you might need to enable IMAP access.", e)
            } else if e.to_string().contains("logout") {
                format!("Connection successful but logout failed: {}. \
                        This is common with Protonmail Bridge and similar local IMAP servers. \
                        The connection test succeeded, but the server has quirks with logout commands. \
                        This should not affect normal operation.", e)
            } else {
                format!("Connection failed: {}", e)
            };
            
            Ok(Json(TestConnectionResponse {
                success: false,
                message: error_message,
                folders: None,
            }))
        }
    }
}

// Process emails for an account
pub async fn process_account(
    Path(account_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<ProcessAccountResponse>, (StatusCode, String)> {
    info!("Processing IMAP account: {}", account_id);
    
    let mut conn = state.pool
        .get()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    // Get the account
    let account = ImapAccountOps::get_by_id(&mut conn, &account_id)
        .map_err(|e| (StatusCode::NOT_FOUND, format!("Account not found: {}", e)))?;
    
    // Drop the connection before creating processor
    drop(conn);
    
    // Create processor with pool
    let processor = EmailProcessor::new(account, state.pool.clone());
    
    // Process emails
    match processor.process_account().await {
        Ok(result) => {
            info!("Processing complete: {} emails processed, {} items created", 
                  result.total_emails_processed, result.new_feed_items_created);
            
            Ok(Json(ProcessAccountResponse {
                success: true,
                emails_processed: result.total_emails_processed,
                items_created: result.new_feed_items_created,
                errors: result.errors,
            }))
        }
        Err(e) => {
            error!("Processing failed: {}", e);
            Ok(Json(ProcessAccountResponse {
                success: false,
                emails_processed: 0,
                items_created: 0,
                errors: vec![format!("Processing failed: {}", e)],
            }))
        }
    }
}

// Process all active accounts
pub async fn process_all_accounts(
    State(state): State<AppState>,
) -> Result<Json<Vec<ProcessAccountResponse>>, (StatusCode, String)> {
    info!("Processing all IMAP accounts");
    
    let mut conn = state.pool
        .get()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    // Get all accounts
    let accounts = ImapAccountOps::get_all(&mut conn)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to get accounts: {}", e)))?;
    
    drop(conn);
    
    let mut results = Vec::new();
    
    for account in accounts {
        info!("Processing account: {}", account.name);
        let processor = EmailProcessor::new(account, state.pool.clone());
        
        match processor.process_account().await {
            Ok(result) => {
                results.push(ProcessAccountResponse {
                    success: true,
                    emails_processed: result.total_emails_processed,
                    items_created: result.new_feed_items_created,
                    errors: result.errors,
                });
            }
            Err(e) => {
                error!("Failed to process account: {}", e);
                results.push(ProcessAccountResponse {
                    success: false,
                    emails_processed: 0,
                    items_created: 0,
                    errors: vec![format!("Processing failed: {}", e)],
                });
            }
        }
    }
    
    Ok(Json(results))
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/imap/:id/test", get(test_connection))
        .route("/api/imap/:id/process", post(process_account))
        .route("/api/imap/process-all", post(process_all_accounts))
}