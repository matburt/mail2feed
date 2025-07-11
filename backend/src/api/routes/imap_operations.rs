use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::{info, error};

use crate::db::{DbPool, operations::ImapAccountOps};
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
    State(pool): State<DbPool>,
) -> Result<Json<TestConnectionResponse>, (StatusCode, String)> {
    info!("Testing IMAP connection for account: {}", account_id);
    
    let mut conn = pool
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
            Ok(Json(TestConnectionResponse {
                success: false,
                message: format!("Failed to connect: {}", e),
                folders: None,
            }))
        }
    }
}

// Process emails for an account
pub async fn process_account(
    Path(account_id): Path<String>,
    State(pool): State<DbPool>,
) -> Result<Json<ProcessAccountResponse>, (StatusCode, String)> {
    info!("Processing IMAP account: {}", account_id);
    
    let mut conn = pool
        .get()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    // Get the account
    let account = ImapAccountOps::get_by_id(&mut conn, &account_id)
        .map_err(|e| (StatusCode::NOT_FOUND, format!("Account not found: {}", e)))?;
    
    // Drop the connection before creating processor
    drop(conn);
    
    // Create processor with pool
    let processor = EmailProcessor::new(account, pool);
    
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
    State(pool): State<DbPool>,
) -> Result<Json<Vec<ProcessAccountResponse>>, (StatusCode, String)> {
    info!("Processing all IMAP accounts");
    
    let mut conn = pool
        .get()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Database error: {}", e)))?;
    
    // Get all accounts
    let accounts = ImapAccountOps::get_all(&mut conn)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, format!("Failed to get accounts: {}", e)))?;
    
    drop(conn);
    
    let mut results = Vec::new();
    
    for account in accounts {
        info!("Processing account: {}", account.name);
        let processor = EmailProcessor::new(account, pool.clone());
        
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

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/api/imap/:id/test", get(test_connection))
        .route("/api/imap/:id/process", post(process_account))
        .route("/api/imap/process-all", post(process_all_accounts))
}