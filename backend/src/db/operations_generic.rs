use crate::db::models::*;
use crate::db::connection::DatabasePool;
use anyhow::Result;

pub struct ImapAccountOpsGeneric;

impl ImapAccountOpsGeneric {
    pub fn create(
        pool: &DatabasePool,
        new_account: &NewImapAccount,
    ) -> Result<ImapAccount> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::ImapAccountOps::create(&mut conn, new_account)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::create_imap_account(&mut conn, new_account)
            }
        }
    }

    pub fn get_by_id(
        pool: &DatabasePool,
        account_id: &str,
    ) -> Result<ImapAccount> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::ImapAccountOps::get_by_id(&mut conn, account_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_imap_account(&mut conn, account_id)
                    .and_then(|opt| opt.ok_or_else(|| anyhow::anyhow!("Account not found")))
            }
        }
    }

    pub fn get_all(
        pool: &DatabasePool,
    ) -> Result<Vec<ImapAccount>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::ImapAccountOps::get_all(&mut conn)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_all_imap_accounts(&mut conn)
            }
        }
    }

    pub fn update(
        pool: &DatabasePool,
        account_id: &str,
        updated_account: &NewImapAccount,
    ) -> Result<ImapAccount> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::ImapAccountOps::update(&mut conn, account_id, updated_account)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                // Need to create UpdateImapAccount from NewImapAccount - this is a type mismatch we'll address
                // For now, return an error indicating PostgreSQL update is not yet implemented
                Err(anyhow::anyhow!("PostgreSQL IMAP account update not yet implemented"))
            }
        }
    }

    pub fn delete(
        pool: &DatabasePool,
        account_id: &str,
    ) -> Result<()> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::ImapAccountOps::delete(&mut conn, account_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::delete_imap_account(&mut conn, account_id)?;
                Ok(())
            }
        }
    }
}

pub struct EmailRuleOpsGeneric;

impl EmailRuleOpsGeneric {
    pub fn create(
        pool: &DatabasePool,
        new_rule: &NewEmailRule,
    ) -> Result<EmailRule> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::EmailRuleOps::create(&mut conn, new_rule)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::create_email_rule(&mut conn, new_rule)
            }
        }
    }

    pub fn get_by_id(
        pool: &DatabasePool,
        rule_id: &str,
    ) -> Result<EmailRule> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::EmailRuleOps::get_by_id(&mut conn, rule_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_email_rule(&mut conn, rule_id)
                    .and_then(|opt| opt.ok_or_else(|| anyhow::anyhow!("Rule not found")))
            }
        }
    }

    pub fn get_all(
        pool: &DatabasePool,
    ) -> Result<Vec<EmailRule>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::EmailRuleOps::get_all(&mut conn)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_all_email_rules(&mut conn)
            }
        }
    }

    pub fn get_by_account_id(
        pool: &DatabasePool,
        account_id: &str,
    ) -> Result<Vec<EmailRule>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::EmailRuleOps::get_by_account_id(&mut conn, account_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_rules_by_account(&mut conn, account_id)
            }
        }
    }

    pub fn get_active(
        pool: &DatabasePool,
    ) -> Result<Vec<EmailRule>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::EmailRuleOps::get_active(&mut conn)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(_pg_pool) => {
                // Not implemented in PostgreSQL version yet
                Err(anyhow::anyhow!("PostgreSQL get_active rules not yet implemented"))
            }
        }
    }

    pub fn update(
        pool: &DatabasePool,
        rule_id: &str,
        updated_rule: &NewEmailRule,
    ) -> Result<EmailRule> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::EmailRuleOps::update(&mut conn, rule_id, updated_rule)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(_pg_pool) => {
                // Type mismatch between NewEmailRule and UpdateEmailRule
                Err(anyhow::anyhow!("PostgreSQL email rule update not yet implemented"))
            }
        }
    }

    pub fn delete(
        pool: &DatabasePool,
        rule_id: &str,
    ) -> Result<()> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::EmailRuleOps::delete(&mut conn, rule_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::delete_email_rule(&mut conn, rule_id)?;
                Ok(())
            }
        }
    }
}

pub struct FeedOpsGeneric;

impl FeedOpsGeneric {
    pub fn create(
        pool: &DatabasePool,
        new_feed: &NewFeed,
    ) -> Result<Feed> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedOps::create(&mut conn, new_feed)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::create_feed(&mut conn, new_feed)
            }
        }
    }

    pub fn get_by_id(
        pool: &DatabasePool,
        feed_id: &str,
    ) -> Result<Feed> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedOps::get_by_id(&mut conn, feed_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_feed(&mut conn, feed_id)
                    .and_then(|opt| opt.ok_or_else(|| anyhow::anyhow!("Feed not found")))
            }
        }
    }

    pub fn get_all(
        pool: &DatabasePool,
    ) -> Result<Vec<Feed>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedOps::get_all(&mut conn)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_all_feeds(&mut conn)
            }
        }
    }

    pub fn get_by_rule_id(
        pool: &DatabasePool,
        rule_id: &str,
    ) -> Result<Vec<Feed>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedOps::get_by_rule_id(&mut conn, rule_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_feeds_by_rule(&mut conn, rule_id)
            }
        }
    }

    pub fn get_active(
        pool: &DatabasePool,
    ) -> Result<Vec<Feed>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedOps::get_active(&mut conn)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(_pg_pool) => {
                // Not implemented in PostgreSQL version yet
                Err(anyhow::anyhow!("PostgreSQL get_active feeds not yet implemented"))
            }
        }
    }

    pub fn update(
        pool: &DatabasePool,
        feed_id: &str,
        updated_feed: &NewFeed,
    ) -> Result<Feed> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedOps::update(&mut conn, feed_id, updated_feed)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(_pg_pool) => {
                // Type mismatch between NewFeed and UpdateFeed
                Err(anyhow::anyhow!("PostgreSQL feed update not yet implemented"))
            }
        }
    }

    pub fn delete(
        pool: &DatabasePool,
        feed_id: &str,
    ) -> Result<()> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedOps::delete(&mut conn, feed_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::delete_feed(&mut conn, feed_id)?;
                Ok(())
            }
        }
    }
}

pub struct FeedItemOpsGeneric;

impl FeedItemOpsGeneric {
    pub fn create(
        pool: &DatabasePool,
        new_item: &NewFeedItem,
    ) -> Result<FeedItem> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedItemOps::create(&mut conn, new_item)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::create_feed_item(&mut conn, new_item)
            }
        }
    }

    pub fn get_by_id(
        pool: &DatabasePool,
        item_id: &str,
    ) -> Result<FeedItem> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedItemOps::get_by_id(&mut conn, item_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_feed_item(&mut conn, item_id)
                    .and_then(|opt| opt.ok_or_else(|| anyhow::anyhow!("Feed item not found")))
            }
        }
    }

    pub fn get_by_feed_id(
        pool: &DatabasePool,
        feed_id: &str,
        limit: Option<i64>,
    ) -> Result<Vec<FeedItem>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedItemOps::get_by_feed_id(&mut conn, feed_id, limit)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::get_items_by_feed_id(&mut conn, feed_id, limit)
            }
        }
    }

    pub fn get_by_email_message_id(
        pool: &DatabasePool,
        message_id: &str,
    ) -> Result<Option<FeedItem>> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedItemOps::get_by_email_message_id(&mut conn, message_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(_pg_pool) => {
                // Not implemented in PostgreSQL version yet
                Err(anyhow::anyhow!("PostgreSQL get_by_email_message_id not yet implemented"))
            }
        }
    }

    pub fn delete_by_feed_id(
        pool: &DatabasePool,
        feed_id: &str,
    ) -> Result<()> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedItemOps::delete_by_feed_id(&mut conn, feed_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(_pg_pool) => {
                // Not implemented in PostgreSQL version yet
                Err(anyhow::anyhow!("PostgreSQL delete_by_feed_id not yet implemented"))
            }
        }
    }

    pub fn delete(
        pool: &DatabasePool,
        item_id: &str,
    ) -> Result<()> {
        match pool {
            DatabasePool::SQLite(sqlite_pool) => {
                let mut conn = sqlite_pool.get()?;
                crate::db::operations::FeedItemOps::delete(&mut conn, item_id)
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pg_pool) => {
                let mut conn = pg_pool.get()?;
                crate::db::operations_pg::delete_feed_item(&mut conn, item_id)?;
                Ok(())
            }
        }
    }
}