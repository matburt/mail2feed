use diesel::prelude::*;
use anyhow::Result;
use crate::db::models::*;
use crate::db::schema::*;

pub struct ImapAccountOps;

impl ImapAccountOps {
    pub fn create(conn: &mut SqliteConnection, new_account: &NewImapAccount) -> Result<ImapAccount> {
        diesel::insert_into(imap_accounts::table)
            .values(new_account)
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to create IMAP account: {}", e))?;
        
        Self::get_by_id(conn, &new_account.id)
    }

    pub fn get_by_id(conn: &mut SqliteConnection, account_id: &str) -> Result<ImapAccount> {
        imap_accounts::table
            .filter(imap_accounts::id.eq(account_id))
            .first(conn)
            .map_err(|e| anyhow::anyhow!("Failed to find IMAP account {}: {}", account_id, e))
    }

    pub fn get_all(conn: &mut SqliteConnection) -> Result<Vec<ImapAccount>> {
        imap_accounts::table
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load IMAP accounts: {}", e))
    }

    pub fn update(conn: &mut SqliteConnection, account_id: &str, updated_account: &NewImapAccount) -> Result<ImapAccount> {
        diesel::update(imap_accounts::table.filter(imap_accounts::id.eq(account_id)))
            .set((
                imap_accounts::name.eq(&updated_account.name),
                imap_accounts::host.eq(&updated_account.host),
                imap_accounts::port.eq(updated_account.port),
                imap_accounts::username.eq(&updated_account.username),
                imap_accounts::password.eq(&updated_account.password),
                imap_accounts::use_tls.eq(updated_account.use_tls),
                imap_accounts::updated_at.eq(&updated_account.updated_at),
            ))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to update IMAP account {}: {}", account_id, e))?;
        
        Self::get_by_id(conn, account_id)
    }

    pub fn delete(conn: &mut SqliteConnection, account_id: &str) -> Result<()> {
        diesel::delete(imap_accounts::table.filter(imap_accounts::id.eq(account_id)))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to delete IMAP account {}: {}", account_id, e))?;
        Ok(())
    }
}

pub struct EmailRuleOps;

impl EmailRuleOps {
    pub fn create(conn: &mut SqliteConnection, new_rule: &NewEmailRule) -> Result<EmailRule> {
        diesel::insert_into(email_rules::table)
            .values(new_rule)
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to create email rule: {}", e))?;
        
        Self::get_by_id(conn, &new_rule.id)
    }

    pub fn get_by_id(conn: &mut SqliteConnection, rule_id: &str) -> Result<EmailRule> {
        email_rules::table
            .filter(email_rules::id.eq(rule_id))
            .first(conn)
            .map_err(|e| anyhow::anyhow!("Failed to find email rule {}: {}", rule_id, e))
    }

    pub fn get_all(conn: &mut SqliteConnection) -> Result<Vec<EmailRule>> {
        email_rules::table
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load email rules: {}", e))
    }

    pub fn get_by_account_id(conn: &mut SqliteConnection, account_id: &str) -> Result<Vec<EmailRule>> {
        email_rules::table
            .filter(email_rules::imap_account_id.eq(account_id))
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load email rules for account {}: {}", account_id, e))
    }

    #[allow(dead_code)]
    pub fn get_active(conn: &mut SqliteConnection) -> Result<Vec<EmailRule>> {
        email_rules::table
            .filter(email_rules::is_active.eq(true))
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load active email rules: {}", e))
    }

    pub fn update(conn: &mut SqliteConnection, rule_id: &str, updated_rule: &NewEmailRule) -> Result<EmailRule> {
        diesel::update(email_rules::table.filter(email_rules::id.eq(rule_id)))
            .set((
                email_rules::name.eq(&updated_rule.name),
                email_rules::imap_account_id.eq(&updated_rule.imap_account_id),
                email_rules::folder.eq(&updated_rule.folder),
                email_rules::to_address.eq(&updated_rule.to_address),
                email_rules::from_address.eq(&updated_rule.from_address),
                email_rules::subject_contains.eq(&updated_rule.subject_contains),
                email_rules::label.eq(&updated_rule.label),
                email_rules::is_active.eq(updated_rule.is_active),
                email_rules::updated_at.eq(&updated_rule.updated_at),
            ))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to update email rule {}: {}", rule_id, e))?;
        
        Self::get_by_id(conn, rule_id)
    }

    pub fn delete(conn: &mut SqliteConnection, rule_id: &str) -> Result<()> {
        diesel::delete(email_rules::table.filter(email_rules::id.eq(rule_id)))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to delete email rule {}: {}", rule_id, e))?;
        Ok(())
    }
}

pub struct FeedOps;

impl FeedOps {
    pub fn create(conn: &mut SqliteConnection, new_feed: &NewFeed) -> Result<Feed> {
        diesel::insert_into(feeds::table)
            .values(new_feed)
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to create feed: {}", e))?;
        
        Self::get_by_id(conn, &new_feed.id)
    }

    pub fn get_by_id(conn: &mut SqliteConnection, feed_id: &str) -> Result<Feed> {
        feeds::table
            .filter(feeds::id.eq(feed_id))
            .first(conn)
            .map_err(|e| anyhow::anyhow!("Failed to find feed {}: {}", feed_id, e))
    }

    pub fn get_all(conn: &mut SqliteConnection) -> Result<Vec<Feed>> {
        feeds::table
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load feeds: {}", e))
    }

    #[allow(dead_code)]
    pub fn get_active(conn: &mut SqliteConnection) -> Result<Vec<Feed>> {
        feeds::table
            .filter(feeds::is_active.eq(true))
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load active feeds: {}", e))
    }

    pub fn get_by_rule_id(conn: &mut SqliteConnection, rule_id: &str) -> Result<Vec<Feed>> {
        feeds::table
            .filter(feeds::email_rule_id.eq(rule_id))
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load feeds for rule {}: {}", rule_id, e))
    }

    pub fn update(conn: &mut SqliteConnection, feed_id: &str, updated_feed: &NewFeed) -> Result<Feed> {
        diesel::update(feeds::table.filter(feeds::id.eq(feed_id)))
            .set((
                feeds::title.eq(&updated_feed.title),
                feeds::description.eq(&updated_feed.description),
                feeds::link.eq(&updated_feed.link),
                feeds::email_rule_id.eq(&updated_feed.email_rule_id),
                feeds::feed_type.eq(&updated_feed.feed_type),
                feeds::is_active.eq(updated_feed.is_active),
                feeds::updated_at.eq(&updated_feed.updated_at),
            ))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to update feed {}: {}", feed_id, e))?;
        
        Self::get_by_id(conn, feed_id)
    }

    pub fn delete(conn: &mut SqliteConnection, feed_id: &str) -> Result<()> {
        diesel::delete(feeds::table.filter(feeds::id.eq(feed_id)))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to delete feed {}: {}", feed_id, e))?;
        Ok(())
    }
}

pub struct FeedItemOps;

impl FeedItemOps {
    pub fn create(conn: &mut SqliteConnection, new_item: &NewFeedItem) -> Result<FeedItem> {
        tracing::info!("📝 Creating feed item: id={}, title={}, feed_id={}", new_item.id, new_item.title, new_item.feed_id);
        tracing::debug!("Feed item details: pub_date={}, author={:?}, body_size={:?}", 
                       new_item.pub_date, new_item.author, new_item.body_size);
        
        let insert_result = diesel::insert_into(feed_items::table)
            .values(new_item)
            .execute(conn);
            
        match insert_result {
            Ok(rows_affected) => {
                tracing::info!("✅ Database insert successful: {} rows affected for item '{}'", rows_affected, new_item.title);
                let retrieved_item = Self::get_by_id(conn, &new_item.id)?;
                tracing::info!("✅ Successfully retrieved created item with ID: {}", retrieved_item.id.as_ref().unwrap_or(&"None".to_string()));
                Ok(retrieved_item)
            }
            Err(e) => {
                tracing::error!("❌ Database insert failed for '{}': {}", new_item.title, e);
                Err(anyhow::anyhow!("Failed to create feed item '{}': {}", new_item.title, e))
            }
        }
    }

    pub fn get_by_id(conn: &mut SqliteConnection, item_id: &str) -> Result<FeedItem> {
        feed_items::table
            .filter(feed_items::id.eq(item_id))
            .first(conn)
            .map_err(|e| anyhow::anyhow!("Failed to find feed item {}: {}", item_id, e))
    }

    pub fn get_by_feed_id(conn: &mut SqliteConnection, feed_id: &str, limit: Option<i64>) -> Result<Vec<FeedItem>> {
        let mut query = feed_items::table
            .filter(feed_items::feed_id.eq(feed_id))
            .order(feed_items::pub_date.desc())
            .into_boxed();

        if let Some(limit_val) = limit {
            query = query.limit(limit_val);
        }

        query
            .load(conn)
            .map_err(|e| anyhow::anyhow!("Failed to load feed items for feed {}: {}", feed_id, e))
    }

    #[allow(dead_code)]
    pub fn get_by_email_message_id(conn: &mut SqliteConnection, message_id: &str) -> Result<Option<FeedItem>> {
        feed_items::table
            .filter(feed_items::email_message_id.eq(message_id))
            .first(conn)
            .optional()
            .map_err(|e| anyhow::anyhow!("Failed to find feed item by message ID {}: {}", message_id, e))
    }

    #[allow(dead_code)]
    pub fn delete_by_feed_id(conn: &mut SqliteConnection, feed_id: &str) -> Result<()> {
        diesel::delete(feed_items::table.filter(feed_items::feed_id.eq(feed_id)))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to delete feed items for feed {}: {}", feed_id, e))?;
        Ok(())
    }

    #[allow(dead_code)]
    pub fn delete(conn: &mut SqliteConnection, item_id: &str) -> Result<()> {
        diesel::delete(feed_items::table.filter(feed_items::id.eq(item_id)))
            .execute(conn)
            .map_err(|e| anyhow::anyhow!("Failed to delete feed item {}: {}", item_id, e))?;
        Ok(())
    }
}

// Convenience functions for the pool-based operations

use diesel::r2d2::{ConnectionManager, Pool};

pub fn get_email_rules_by_account(
    pool: &Pool<ConnectionManager<SqliteConnection>>,
    account_id: &str,
) -> Result<Vec<EmailRule>> {
    let mut conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
    EmailRuleOps::get_by_account_id(&mut conn, account_id)
}

pub fn get_feeds_by_rule(
    pool: &Pool<ConnectionManager<SqliteConnection>>,
    rule_id: &str,
) -> Result<Vec<Feed>> {
    let mut conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
    FeedOps::get_by_rule_id(&mut conn, rule_id)
}

pub fn create_feed_item(
    pool: &Pool<ConnectionManager<SqliteConnection>>,
    new_item: NewFeedItem,
) -> Result<String> {
    tracing::debug!("📡 Getting database connection from pool for item: '{}'", new_item.title);
    let mut conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
    tracing::debug!("✅ Got database connection from pool");
    
    let item = FeedItemOps::create(&mut conn, &new_item)?;
    let item_id = item.id.ok_or_else(|| anyhow::anyhow!("Created item has no ID"))?;
    tracing::info!("🎉 Pool-based feed item creation complete: ID={}", item_id);
    Ok(item_id)
}

pub fn get_all_feeds(
    pool: &Pool<ConnectionManager<SqliteConnection>>,
) -> Result<Vec<Feed>> {
    let mut conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
    FeedOps::get_all(&mut conn)
}

pub fn get_feed_items_by_feed(
    pool: &Pool<ConnectionManager<SqliteConnection>>,
    feed_id: &str,
) -> Result<Vec<FeedItem>> {
    let mut conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
    FeedItemOps::get_by_feed_id(&mut conn, feed_id, None)
}

pub fn delete_feed_item(
    pool: &Pool<ConnectionManager<SqliteConnection>>,
    item_id: &str,
) -> Result<()> {
    let mut conn = pool.get()
        .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
    FeedItemOps::delete(&mut conn, item_id)
}