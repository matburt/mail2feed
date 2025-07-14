pub mod client;
pub mod processor;

use anyhow::Result;
use crate::db::models::ImapAccount;

pub use client::ImapClient;
pub use processor::EmailProcessor;

#[allow(dead_code)]
pub async fn check_account(account: &ImapAccount) -> Result<()> {
    let client = ImapClient::new(account)?;
    client.test_connection().await
}