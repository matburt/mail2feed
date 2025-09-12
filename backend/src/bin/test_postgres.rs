use anyhow::Result;
use mail2feed_backend::db::{connection, models::*, operations_generic::ImapAccountOpsGeneric};

fn main() -> Result<()> {
    println!("🧪 Testing PostgreSQL database operations...");

    // Load environment variables
    dotenvy::dotenv().ok();

    // Detect database type
    let db_type = connection::detect_database_type();
    println!("📊 Detected database type: {:?}", db_type);

    // Create database pool
    let pool = connection::create_pool()?;
    println!("✅ Successfully created database pool");

    match pool {
        connection::DatabasePool::SQLite(_) => {
            println!("📁 Using SQLite database");
        }
        #[cfg(feature = "postgres")]
        connection::DatabasePool::PostgreSQL(_) => {
            println!("🐘 Using PostgreSQL database");

            // Test creating an IMAP account
            let new_account = NewImapAccount::new(
                "Test Account".to_string(),
                "imap.test.com".to_string(),
                993,
                "testuser".to_string(),
                "testpass".to_string(),
                true,
            );

            println!("🔧 Testing IMAP account creation...");
            match ImapAccountOpsGeneric::create(&pool, &new_account) {
                Ok(account) => {
                    println!("✅ Created IMAP account: {:?}", account.id);

                    // Test retrieving the account
                    let account_id = account.id.as_ref().unwrap();
                    match ImapAccountOpsGeneric::get_by_id(&pool, account_id) {
                        Ok(retrieved_account) => {
                            println!("✅ Retrieved IMAP account: {}", retrieved_account.name);
                        }
                        Err(e) => {
                            println!("❌ Failed to retrieve IMAP account: {}", e);
                        }
                    }

                    // Test deleting the account
                    match ImapAccountOpsGeneric::delete(&pool, account_id) {
                        Ok(_) => {
                            println!("✅ Deleted IMAP account");
                        }
                        Err(e) => {
                            println!("❌ Failed to delete IMAP account: {}", e);
                        }
                    }
                }
                Err(e) => {
                    println!("❌ Failed to create IMAP account: {}", e);
                }
            }
        }
    }

    println!("🎉 PostgreSQL test completed!");

    Ok(())
}