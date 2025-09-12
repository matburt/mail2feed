use dotenvy::dotenv;
use mail2feed_backend::db::{create_pool, establish_connection, operations::ImapAccountOps};
use mail2feed_backend::imap::processor::EmailProcessor;
use std::env;
use tracing::{error, info};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt::init();

    let args: Vec<String> = env::args().collect();

    if args.len() != 2 {
        eprintln!("Usage: {} <account_id>", args[0]);
        eprintln!("Process emails for a specific IMAP account");
        std::process::exit(1);
    }

    let account_id = &args[1];

    info!("Processing emails for account: {}", account_id);

    // Create database pool
    let pool =
        create_pool().map_err(|e| anyhow::anyhow!("Failed to create database pool: {}", e))?;

    // Get the account
    let mut conn = establish_connection();
    let account = ImapAccountOps::get_by_id(&mut conn, account_id)
        .map_err(|e| anyhow::anyhow!("Account not found: {}", e))?;

    info!(
        "Found account: {} ({}:{})",
        account.name, account.host, account.port
    );

    // Create processor and process emails
    let processor = EmailProcessor::new(account, pool);

    match processor.process_account().await {
        Ok(result) => {
            info!("Processing completed successfully!");
            info!("Total emails processed: {}", result.total_emails_processed);
            info!("New feed items created: {}", result.new_feed_items_created);

            if !result.errors.is_empty() {
                info!("Errors encountered:");
                for error in result.errors {
                    error!("  - {}", error);
                }
            }
        }
        Err(e) => {
            error!("Processing failed: {}", e);
            std::process::exit(1);
        }
    }

    Ok(())
}
