#[cfg(feature = "postgres")]
use diesel::prelude::*;
#[cfg(feature = "postgres")]
use diesel::pg::PgConnection;
#[cfg(feature = "postgres")]
use diesel::r2d2::{ConnectionManager, Pool};
#[cfg(feature = "postgres")]
use crate::db::models::*;
#[cfg(feature = "postgres")]
use crate::db::schema::*;
#[cfg(feature = "postgres")]
use anyhow::Result;
#[cfg(feature = "postgres")]
use chrono::{DateTime, Utc};

#[cfg(feature = "postgres")]
pub type PgPool = Pool<ConnectionManager<PgConnection>>;

// IMAP Account operations
#[cfg(feature = "postgres")]
pub fn create_imap_account(
    conn: &mut PgConnection,
    new_account: &NewImapAccount,
) -> Result<ImapAccount> {
    use crate::db::schema::imap_accounts::dsl::*;

    let result = diesel::insert_into(imap_accounts)
        .values(new_account)
        .get_result::<ImapAccount>(conn)?;
    
    Ok(result)
}

#[cfg(feature = "postgres")]
pub fn get_imap_account(
    conn: &mut PgConnection,
    account_id: &str,
) -> Result<Option<ImapAccount>> {
    use crate::db::schema::imap_accounts::dsl::*;

    let account = imap_accounts
        .filter(id.eq(account_id))
        .first::<ImapAccount>(conn)
        .optional()?;
    
    Ok(account)
}

#[cfg(feature = "postgres")]
pub fn get_all_imap_accounts(
    conn: &mut PgConnection,
) -> Result<Vec<ImapAccount>> {
    use crate::db::schema::imap_accounts::dsl::*;

    let accounts = imap_accounts
        .load::<ImapAccount>(conn)?;
    
    Ok(accounts)
}

#[cfg(feature = "postgres")]
pub fn update_imap_account(
    conn: &mut PgConnection,
    account_id: &str,
    updated_account: &NewImapAccount,
) -> Result<ImapAccount> {
    use crate::db::schema::imap_accounts::dsl::*;

    let updated = diesel::update(imap_accounts.filter(id.eq(account_id)))
        .set((
            name.eq(&updated_account.name),
            host.eq(&updated_account.host),
            port.eq(updated_account.port),
            username.eq(&updated_account.username),
            password.eq(&updated_account.password),
            use_tls.eq(updated_account.use_tls),
            default_post_process_action.eq(&updated_account.default_post_process_action),
            default_move_to_folder.eq(&updated_account.default_move_to_folder),
            updated_at.eq(&updated_account.updated_at),
        ))
        .get_result::<ImapAccount>(conn)?;
    
    Ok(updated)
}

#[cfg(feature = "postgres")]
pub fn delete_imap_account(
    conn: &mut PgConnection,
    account_id: &str,
) -> Result<usize> {
    use crate::db::schema::imap_accounts::dsl::*;

    let deleted = diesel::delete(imap_accounts.filter(id.eq(account_id)))
        .execute(conn)?;
    
    Ok(deleted)
}

// Email Rule operations
#[cfg(feature = "postgres")]
pub fn create_email_rule(
    conn: &mut PgConnection,
    new_rule: &NewEmailRule,
) -> Result<EmailRule> {
    use crate::db::schema::email_rules::dsl::*;

    let result = diesel::insert_into(email_rules)
        .values(new_rule)
        .get_result::<EmailRule>(conn)?;
    
    Ok(result)
}

#[cfg(feature = "postgres")]
pub fn get_email_rule(
    conn: &mut PgConnection,
    rule_id: &str,
) -> Result<Option<EmailRule>> {
    use crate::db::schema::email_rules::dsl::*;

    let rule = email_rules
        .filter(id.eq(rule_id))
        .first::<EmailRule>(conn)
        .optional()?;
    
    Ok(rule)
}

#[cfg(feature = "postgres")]
pub fn get_all_email_rules(
    conn: &mut PgConnection,
) -> Result<Vec<EmailRule>> {
    use crate::db::schema::email_rules::dsl::*;

    let rules = email_rules
        .load::<EmailRule>(conn)?;
    
    Ok(rules)
}

#[cfg(feature = "postgres")]
pub fn get_rules_by_account(
    conn: &mut PgConnection,
    account_id: &str,
) -> Result<Vec<EmailRule>> {
    use crate::db::schema::email_rules::dsl::*;

    let rules = email_rules
        .filter(imap_account_id.eq(account_id))
        .load::<EmailRule>(conn)?;
    
    Ok(rules)
}

#[cfg(feature = "postgres")]
pub fn update_email_rule(
    conn: &mut PgConnection,
    rule_id: &str,
    updated_rule: &NewEmailRule,
) -> Result<EmailRule> {
    use crate::db::schema::email_rules::dsl::*;

    let updated = diesel::update(email_rules.filter(id.eq(rule_id)))
        .set((
            name.eq(&updated_rule.name),
            imap_account_id.eq(&updated_rule.imap_account_id),
            folder.eq(&updated_rule.folder),
            to_address.eq(&updated_rule.to_address),
            from_address.eq(&updated_rule.from_address),
            subject_contains.eq(&updated_rule.subject_contains),
            label.eq(&updated_rule.label),
            is_active.eq(updated_rule.is_active),
            post_process_action.eq(&updated_rule.post_process_action),
            move_to_folder.eq(&updated_rule.move_to_folder),
            updated_at.eq(&updated_rule.updated_at),
        ))
        .get_result::<EmailRule>(conn)?;
    
    Ok(updated)
}

#[cfg(feature = "postgres")]
pub fn delete_email_rule(
    conn: &mut PgConnection,
    rule_id: &str,
) -> Result<usize> {
    use crate::db::schema::email_rules::dsl::*;

    let deleted = diesel::delete(email_rules.filter(id.eq(rule_id)))
        .execute(conn)?;
    
    Ok(deleted)
}

// Feed operations
#[cfg(feature = "postgres")]
pub fn create_feed(
    conn: &mut PgConnection,
    new_feed: &NewFeed,
) -> Result<Feed> {
    use crate::db::schema::feeds::dsl::*;

    let result = diesel::insert_into(feeds)
        .values(new_feed)
        .get_result::<Feed>(conn)?;
    
    Ok(result)
}

#[cfg(feature = "postgres")]
pub fn get_feed(
    conn: &mut PgConnection,
    feed_id: &str,
) -> Result<Option<Feed>> {
    use crate::db::schema::feeds::dsl::*;

    let feed = feeds
        .filter(id.eq(feed_id))
        .first::<Feed>(conn)
        .optional()?;
    
    Ok(feed)
}

#[cfg(feature = "postgres")]
pub fn get_all_feeds(
    conn: &mut PgConnection,
) -> Result<Vec<Feed>> {
    use crate::db::schema::feeds::dsl::*;

    let all_feeds = feeds
        .load::<Feed>(conn)?;
    
    Ok(all_feeds)
}

#[cfg(feature = "postgres")]
pub fn get_feeds_by_rule(
    conn: &mut PgConnection,
    rule_id: &str,
) -> Result<Vec<Feed>> {
    use crate::db::schema::feeds::dsl::*;

    let rule_feeds = feeds
        .filter(email_rule_id.eq(rule_id))
        .load::<Feed>(conn)?;
    
    Ok(rule_feeds)
}

#[cfg(feature = "postgres")]
pub fn update_feed(
    conn: &mut PgConnection,
    feed_id: &str,
    updated_feed: &NewFeed,
) -> Result<Feed> {
    use crate::db::schema::feeds::dsl::*;

    let updated = diesel::update(feeds.filter(id.eq(feed_id)))
        .set((
            title.eq(&updated_feed.title),
            description.eq(&updated_feed.description),
            link.eq(&updated_feed.link),
            email_rule_id.eq(&updated_feed.email_rule_id),
            feed_type.eq(&updated_feed.feed_type),
            is_active.eq(updated_feed.is_active),
            max_items.eq(updated_feed.max_items),
            max_age_days.eq(updated_feed.max_age_days),
            min_items.eq(updated_feed.min_items),
            updated_at.eq(&updated_feed.updated_at),
        ))
        .get_result::<Feed>(conn)?;
    
    Ok(updated)
}

#[cfg(feature = "postgres")]
pub fn delete_feed(
    conn: &mut PgConnection,
    feed_id: &str,
) -> Result<usize> {
    use crate::db::schema::feeds::dsl::*;

    let deleted = diesel::delete(feeds.filter(id.eq(feed_id)))
        .execute(conn)?;
    
    Ok(deleted)
}

// Feed Item operations
#[cfg(feature = "postgres")]
pub fn create_feed_item(
    conn: &mut PgConnection,
    new_item: &NewFeedItem,
) -> Result<FeedItem> {
    use crate::db::schema::feed_items::dsl::*;

    let result = diesel::insert_into(feed_items)
        .values(new_item)
        .get_result::<FeedItem>(conn)?;
    
    Ok(result)
}

#[cfg(feature = "postgres")]
pub fn get_feed_item(
    conn: &mut PgConnection,
    item_id: &str,
) -> Result<Option<FeedItem>> {
    use crate::db::schema::feed_items::dsl::*;

    let item = feed_items
        .filter(id.eq(item_id))
        .first::<FeedItem>(conn)
        .optional()?;
    
    Ok(item)
}

#[cfg(feature = "postgres")]
pub fn get_items_by_feed_id(
    conn: &mut PgConnection,
    feed_id_param: &str,
    limit: Option<i64>,
) -> Result<Vec<FeedItem>> {
    use crate::db::schema::feed_items::dsl::*;

    let mut query = feed_items
        .filter(feed_id.eq(feed_id_param))
        .order(pub_date.desc())
        .into_boxed();

    if let Some(limit_val) = limit {
        query = query.limit(limit_val);
    }

    let items = query.load::<FeedItem>(conn)?;
    Ok(items)
}

#[cfg(feature = "postgres")]
pub fn get_feed_items_by_feed(
    conn: &mut PgConnection,
    feed_id_param: &str,
) -> Result<Vec<FeedItem>> {
    get_items_by_feed_id(conn, feed_id_param, None)
}

#[cfg(feature = "postgres")]
pub fn update_feed_item(
    conn: &mut PgConnection,
    item_id: &str,
    updated_item: &NewFeedItem,
) -> Result<FeedItem> {
    use crate::db::schema::feed_items::dsl::*;

    let updated = diesel::update(feed_items.filter(id.eq(item_id)))
        .set((
            feed_id.eq(&updated_item.feed_id),
            title.eq(&updated_item.title),
            description.eq(&updated_item.description),
            link.eq(&updated_item.link),
            author.eq(&updated_item.author),
            pub_date.eq(&updated_item.pub_date),
            email_message_id.eq(&updated_item.email_message_id),
            email_subject.eq(&updated_item.email_subject),
            email_from.eq(&updated_item.email_from),
            email_body.eq(&updated_item.email_body),
            is_read.eq(updated_item.is_read),
            starred.eq(updated_item.starred),
            body_size.eq(updated_item.body_size),
        ))
        .get_result::<FeedItem>(conn)?;
    
    Ok(updated)
}

#[cfg(feature = "postgres")]
pub fn delete_feed_item(
    conn: &mut PgConnection,
    item_id: &str,
) -> Result<usize> {
    use crate::db::schema::feed_items::dsl::*;

    let deleted = diesel::delete(feed_items.filter(id.eq(item_id)))
        .execute(conn)?;
    
    Ok(deleted)
}

#[cfg(feature = "postgres")]
pub fn cleanup_old_feed_items(
    conn: &mut PgConnection,
    feed_id_param: &str,
    max_items: i32,
) -> Result<usize> {
    use crate::db::schema::feed_items::dsl::*;

    // Get items sorted by pub_date descending, then delete all except the first max_items
    let items_to_keep: Vec<Option<String>> = feed_items
        .filter(feed_id.eq(feed_id_param))
        .order(pub_date.desc())
        .limit(max_items as i64)
        .select(id)
        .load::<Option<String>>(conn)?;

    if items_to_keep.is_empty() {
        return Ok(0);
    }

    let deleted = diesel::delete(feed_items
        .filter(feed_id.eq(feed_id_param))
        .filter(id.ne_all(items_to_keep)))
    .execute(conn)?;

    Ok(deleted)
}

#[cfg(feature = "postgres")]
pub fn cleanup_old_items_by_date(
    conn: &mut PgConnection,
    feed_id_param: &str,
    cutoff_date: DateTime<Utc>,
) -> Result<usize> {
    use crate::db::schema::feed_items::dsl::*;

    let cutoff_date_str = cutoff_date.to_rfc3339();
    let deleted = diesel::delete(feed_items
        .filter(feed_id.eq(feed_id_param))
        .filter(pub_date.lt(cutoff_date_str)))
    .execute(conn)?;

    Ok(deleted)
}

#[cfg(feature = "postgres")]
pub fn find_duplicate_items(
    conn: &mut PgConnection,
    feed_id_param: &str,
    title_param: &str,
    link_param: Option<&str>,
) -> Result<Vec<FeedItem>> {
    use crate::db::schema::feed_items::dsl::*;

    let mut query = feed_items
        .filter(feed_id.eq(feed_id_param))
        .filter(title.eq(title_param))
        .into_boxed();

    if let Some(link_val) = link_param {
        query = query.filter(link.eq(link_val));
    }

    let duplicates = query.load::<FeedItem>(conn)?;
    Ok(duplicates)
}