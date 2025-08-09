mod common;

use common::setup_test_db;
use mail2feed_backend::db::operations::*;
use mail2feed_backend::db::models::*;

#[test]
fn test_imap_account_crud() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create
    let new_account = NewImapAccount::new(
        "Test Account".to_string(),
        "imap.example.com".to_string(),
        993,
        "user@example.com".to_string(),
        "password123".to_string(),
        true,
    );
    
    let created = ImapAccountOps::create(&mut conn, &new_account).unwrap();
    assert_eq!(created.name, "Test Account");
    assert_eq!(created.host, "imap.example.com");
    assert_eq!(created.port, 993);
    assert_eq!(created.username, "user@example.com");
    assert!(created.use_tls);
    
    // Read
    let fetched = ImapAccountOps::get_by_id(&mut conn, created.id.as_ref().unwrap()).unwrap();
    assert_eq!(fetched.id, created.id);
    assert_eq!(fetched.name, created.name);
    
    // Update
    let mut updated_account = new_account.clone();
    updated_account.name = "Updated Account".to_string();
    updated_account.port = 143;
    
    let updated = ImapAccountOps::update(&mut conn, created.id.as_ref().unwrap(), &updated_account).unwrap();
    assert_eq!(updated.name, "Updated Account");
    assert_eq!(updated.port, 143);
    
    // List
    let all_accounts = ImapAccountOps::get_all(&mut conn).unwrap();
    assert_eq!(all_accounts.len(), 1);
    assert_eq!(all_accounts[0].id, created.id);
    
    // Delete
    ImapAccountOps::delete(&mut conn, created.id.as_ref().unwrap()).unwrap();
    let all_after_delete = ImapAccountOps::get_all(&mut conn).unwrap();
    assert_eq!(all_after_delete.len(), 0);
}

#[test]
fn test_email_rule_crud() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // First create an IMAP account
    let new_account = NewImapAccount::new(
        "Test Account".to_string(),
        "imap.example.com".to_string(),
        993,
        "user@example.com".to_string(),
        "password123".to_string(),
        true,
    );
    let account = ImapAccountOps::create(&mut conn, &new_account).unwrap();
    
    // Create email rule
    let new_rule = NewEmailRule::new(
        "Test Rule".to_string(),
        account.id.as_ref().unwrap().clone(),
        "INBOX".to_string(),
        Some("list@example.com".to_string()),
        None,
        Some("Newsletter".to_string()),
        None,
        true,
    );
    
    let created = EmailRuleOps::create(&mut conn, &new_rule).unwrap();
    assert_eq!(created.name, "Test Rule");
    assert_eq!(created.imap_account_id, *account.id.as_ref().unwrap());
    assert_eq!(created.folder, "INBOX");
    assert_eq!(created.to_address, Some("list@example.com".to_string()));
    assert_eq!(created.subject_contains, Some("Newsletter".to_string()));
    assert!(created.is_active);
    
    // Read
    let fetched = EmailRuleOps::get_by_id(&mut conn, created.id.as_ref().unwrap()).unwrap();
    assert_eq!(fetched.id, created.id);
    
    // Get by account
    let account_rules = EmailRuleOps::get_by_account_id(&mut conn, account.id.as_ref().unwrap()).unwrap();
    assert_eq!(account_rules.len(), 1);
    assert_eq!(account_rules[0].id, created.id);
    
    // Get active rules
    let active_rules = EmailRuleOps::get_active(&mut conn).unwrap();
    assert_eq!(active_rules.len(), 1);
    
    // Update
    let mut updated_rule = new_rule.clone();
    updated_rule.is_active = false;
    updated_rule.subject_contains = Some("Updated".to_string());
    
    let updated = EmailRuleOps::update(&mut conn, created.id.as_ref().unwrap(), &updated_rule).unwrap();
    assert!(!updated.is_active);
    assert_eq!(updated.subject_contains, Some("Updated".to_string()));
    
    // Verify active rules after update
    let active_after_update = EmailRuleOps::get_active(&mut conn).unwrap();
    assert_eq!(active_after_update.len(), 0);
    
    // Delete
    EmailRuleOps::delete(&mut conn, created.id.as_ref().unwrap()).unwrap();
    assert!(EmailRuleOps::get_by_id(&mut conn, created.id.as_ref().unwrap()).is_err());
}

#[test]
fn test_feed_crud() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create prerequisites
    let new_account = NewImapAccount::new(
        "Test Account".to_string(),
        "imap.example.com".to_string(),
        993,
        "user@example.com".to_string(),
        "password123".to_string(),
        true,
    );
    let account = ImapAccountOps::create(&mut conn, &new_account).unwrap();
    
    let new_rule = NewEmailRule::new(
        "Test Rule".to_string(),
        account.id.as_ref().unwrap().clone(),
        "INBOX".to_string(),
        Some("list@example.com".to_string()),
        None,
        None,
        None,
        true,
    );
    let rule = EmailRuleOps::create(&mut conn, &new_rule).unwrap();
    
    // Create feed
    let new_feed = NewFeed::new(
        "Test Feed".to_string(),
        Some("A test feed description".to_string()),
        Some("https://example.com/feed".to_string()),
        rule.id.as_ref().unwrap().clone(),
        "rss".to_string(),
        true,
    );
    
    let created = FeedOps::create(&mut conn, &new_feed).unwrap();
    assert_eq!(created.title, "Test Feed");
    assert_eq!(created.description, Some("A test feed description".to_string()));
    assert_eq!(created.feed_type, "rss");
    assert!(created.is_active);
    
    // Read
    let fetched = FeedOps::get_by_id(&mut conn, created.id.as_ref().unwrap()).unwrap();
    assert_eq!(fetched.id, created.id);
    
    // Get by rule
    let rule_feeds = FeedOps::get_by_rule_id(&mut conn, rule.id.as_ref().unwrap()).unwrap();
    assert_eq!(rule_feeds.len(), 1);
    assert_eq!(rule_feeds[0].id, created.id);
    
    // Get active feeds
    let active_feeds = FeedOps::get_active(&mut conn).unwrap();
    assert_eq!(active_feeds.len(), 1);
    
    // Update
    let mut updated_feed = new_feed.clone();
    updated_feed.feed_type = "atom".to_string();
    updated_feed.is_active = false;
    
    let updated = FeedOps::update(&mut conn, created.id.as_ref().unwrap(), &updated_feed).unwrap();
    assert_eq!(updated.feed_type, "atom");
    assert!(!updated.is_active);
    
    // Delete
    FeedOps::delete(&mut conn, created.id.as_ref().unwrap()).unwrap();
    assert!(FeedOps::get_by_id(&mut conn, created.id.as_ref().unwrap()).is_err());
}

#[test]
fn test_feed_item_crud() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create prerequisites
    let new_account = NewImapAccount::new(
        "Test Account".to_string(),
        "imap.example.com".to_string(),
        993,
        "user@example.com".to_string(),
        "password123".to_string(),
        true,
    );
    let account = ImapAccountOps::create(&mut conn, &new_account).unwrap();
    
    let new_rule = NewEmailRule::new(
        "Test Rule".to_string(),
        account.id.as_ref().unwrap().clone(),
        "INBOX".to_string(),
        None,
        None,
        None,
        None,
        true,
    );
    let rule = EmailRuleOps::create(&mut conn, &new_rule).unwrap();
    
    let new_feed = NewFeed::new(
        "Test Feed".to_string(),
        None,
        None,
        rule.id.as_ref().unwrap().clone(),
        "rss".to_string(),
        true,
    );
    let feed = FeedOps::create(&mut conn, &new_feed).unwrap();
    
    // Create feed item
    let new_item = NewFeedItem::new(
        feed.id.as_ref().unwrap().clone(),
        "Test Item".to_string(),
        Some("Test item description".to_string()),
        Some("https://example.com/item".to_string()),
        Some("author@example.com".to_string()),
        chrono::Utc::now(),
        Some("msg-123".to_string()),
        Some("Test Subject".to_string()),
        Some("sender@example.com".to_string()),
        Some("Email body content".to_string()),
    );
    
    let created = FeedItemOps::create(&mut conn, &new_item).unwrap();
    assert_eq!(created.title, "Test Item");
    assert_eq!(created.feed_id, *feed.id.as_ref().unwrap());
    assert_eq!(created.email_message_id, Some("msg-123".to_string()));
    
    // Read
    let fetched = FeedItemOps::get_by_id(&mut conn, created.id.as_ref().unwrap()).unwrap();
    assert_eq!(fetched.id, created.id);
    
    // Get by feed
    let feed_items = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap();
    assert_eq!(feed_items.len(), 1);
    assert_eq!(feed_items[0].id, created.id);
    
    // Get by feed with limit
    let limited_items = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), Some(10)).unwrap();
    assert_eq!(limited_items.len(), 1);
    
    // Get by email message ID
    let by_msg_id = FeedItemOps::get_by_email_message_id(&mut conn, "msg-123").unwrap();
    assert!(by_msg_id.is_some());
    assert_eq!(by_msg_id.unwrap().id, created.id);
    
    // Delete single item
    FeedItemOps::delete(&mut conn, created.id.as_ref().unwrap()).unwrap();
    assert!(FeedItemOps::get_by_id(&mut conn, created.id.as_ref().unwrap()).is_err());
    
    // Create another item and test delete by feed
    let new_item2 = NewFeedItem::new(
        feed.id.as_ref().unwrap().clone(),
        "Test Item 2".to_string(),
        None,
        None,
        None,
        chrono::Utc::now(),
        None,
        None,
        None,
        None,
    );
    FeedItemOps::create(&mut conn, &new_item2).unwrap();
    
    FeedItemOps::delete_by_feed_id(&mut conn, feed.id.as_ref().unwrap()).unwrap();
    let items_after_delete = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap();
    assert_eq!(items_after_delete.len(), 0);
}

#[test]
fn test_cascade_deletes() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create account with rule and feed
    let new_account = NewImapAccount::new(
        "Test Account".to_string(),
        "imap.example.com".to_string(),
        993,
        "user@example.com".to_string(),
        "password123".to_string(),
        true,
    );
    let account = ImapAccountOps::create(&mut conn, &new_account).unwrap();
    
    let new_rule = NewEmailRule::new(
        "Test Rule".to_string(),
        account.id.as_ref().unwrap().clone(),
        "INBOX".to_string(),
        None,
        None,
        None,
        None,
        true,
    );
    let rule = EmailRuleOps::create(&mut conn, &new_rule).unwrap();
    
    let new_feed = NewFeed::new(
        "Test Feed".to_string(),
        None,
        None,
        rule.id.as_ref().unwrap().clone(),
        "rss".to_string(),
        true,
    );
    let feed = FeedOps::create(&mut conn, &new_feed).unwrap();
    
    let new_item = NewFeedItem::new(
        feed.id.as_ref().unwrap().clone(),
        "Test Item".to_string(),
        None,
        None,
        None,
        chrono::Utc::now(),
        None,
        None,
        None,
        None,
    );
    FeedItemOps::create(&mut conn, &new_item).unwrap();
    
    // Verify everything exists
    assert_eq!(ImapAccountOps::get_all(&mut conn).unwrap().len(), 1);
    assert_eq!(EmailRuleOps::get_all(&mut conn).unwrap().len(), 1);
    assert_eq!(FeedOps::get_all(&mut conn).unwrap().len(), 1);
    assert_eq!(FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap().len(), 1);
    
    // Delete account should cascade
    ImapAccountOps::delete(&mut conn, account.id.as_ref().unwrap()).unwrap();
    
    // Verify cascade worked
    assert_eq!(ImapAccountOps::get_all(&mut conn).unwrap().len(), 0);
    assert_eq!(EmailRuleOps::get_all(&mut conn).unwrap().len(), 0);
    assert_eq!(FeedOps::get_all(&mut conn).unwrap().len(), 0);
    // Feed items should also be gone due to feed deletion
    assert_eq!(FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap().len(), 0);
}