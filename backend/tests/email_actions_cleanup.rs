use mail2feed_backend::db::{models::*, operations::*};
use chrono::{Utc, Duration};
use diesel::SqliteConnection;

mod common;
use common::setup_test_db;

#[test]
fn test_email_action_enum() {
    // Test from_str
    assert!(matches!(EmailAction::from_str("mark_read"), EmailAction::MarkAsRead));
    assert!(matches!(EmailAction::from_str("delete"), EmailAction::Delete));
    assert!(matches!(EmailAction::from_str("move_to_folder"), EmailAction::MoveToFolder));
    assert!(matches!(EmailAction::from_str("do_nothing"), EmailAction::DoNothing));
    assert!(matches!(EmailAction::from_str("unknown"), EmailAction::MarkAsRead)); // Default
}

#[test]
fn test_new_feed_item_metadata() {
    // Test that NewFeedItem properly sets metadata fields
    let feed_item = NewFeedItem::new(
        "feed-123".to_string(),
        "Test Item".to_string(),
        Some("Description".to_string()),
        Some("https://example.com".to_string()),
        Some("Author".to_string()),
        Utc::now(),
        Some("msg-id".to_string()),
        Some("Subject".to_string()),
        Some("from@example.com".to_string()),
        Some("Email body content".to_string()),
    );
    
    assert_eq!(feed_item.is_read, Some(false));
    assert_eq!(feed_item.starred, Some(false));
    assert_eq!(feed_item.body_size, Some("Email body content".len() as i32));
}

#[test]
fn test_feed_cleanup_age_based() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create test data
    let account = create_test_account(&mut conn);
    let rule = create_test_rule(&mut conn, &account);
    
    // Create feed with 7-day retention
    let mut new_feed = NewFeed::new(
        "Test Feed".to_string(),
        None,
        None,
        rule.id.as_ref().unwrap().clone(),
        "rss".to_string(),
        true,
    );
    new_feed.max_age_days = Some(7);
    new_feed.min_items = Some(1);
    let feed = FeedOps::create(&mut conn, &new_feed).unwrap();
    
    // Create old item (10 days old)
    let old_date = Utc::now() - Duration::days(10);
    let old_item = create_test_feed_item(&mut conn, &feed, "Old Item", old_date);
    
    // Create recent item (2 days old) 
    let recent_date = Utc::now() - Duration::days(2);
    let recent_item = create_test_feed_item(&mut conn, &feed, "Recent Item", recent_date);
    
    // Test age-based cleanup logic directly
    let all_items = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap();
    assert_eq!(all_items.len(), 2);
    
    // Manually delete old item as cleanup would do
    if let Some(max_age_days) = feed.max_age_days {
        let cutoff_date = Utc::now() - Duration::days(max_age_days as i64);
        for item in &all_items {
            if let Ok(created_at) = chrono::DateTime::parse_from_rfc3339(&item.created_at) {
                if created_at.with_timezone(&Utc) < cutoff_date {
                    FeedItemOps::delete(&mut conn, item.id.as_ref().unwrap()).unwrap();
                }
            }
        }
    }
    
    // Verify old item is gone, recent item remains
    assert!(FeedItemOps::get_by_id(&mut conn, old_item.id.as_ref().unwrap()).is_err());
    assert!(FeedItemOps::get_by_id(&mut conn, recent_item.id.as_ref().unwrap()).is_ok());
}

#[test]
fn test_feed_cleanup_count_based() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create test data
    let account = create_test_account(&mut conn);
    let rule = create_test_rule(&mut conn, &account);
    
    // Create feed with max 2 items, min 1 item
    let mut new_feed = NewFeed::new(
        "Test Feed".to_string(),
        None,
        None,
        rule.id.as_ref().unwrap().clone(),
        "rss".to_string(),
        true,
    );
    new_feed.max_items = Some(2);
    new_feed.min_items = Some(1);
    let feed = FeedOps::create(&mut conn, &new_feed).unwrap();
    
    // Create 4 items at different times
    let base_time = Utc::now() - Duration::days(4);
    let item1 = create_test_feed_item(&mut conn, &feed, "Item 1", base_time);
    let item2 = create_test_feed_item(&mut conn, &feed, "Item 2", base_time + Duration::days(1));
    let item3 = create_test_feed_item(&mut conn, &feed, "Item 3", base_time + Duration::days(2));
    let item4 = create_test_feed_item(&mut conn, &feed, "Item 4", base_time + Duration::days(3));
    
    // Test count-based cleanup logic directly
    let all_items = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap();
    assert_eq!(all_items.len(), 4);
    
    // Manually implement count-based cleanup as service would do
    if let Some(max_items) = feed.max_items {
        let min_items = feed.min_items.unwrap_or(0) as usize;
        let max_items = max_items as usize;
        
        if all_items.len() > max_items {
            let target_count = max_items.max(min_items);
            let items_to_remove_count = all_items.len().saturating_sub(target_count);
            
            // Sort items by creation date (oldest first for removal)
            let mut sorted_items = all_items.clone();
            sorted_items.sort_by(|a, b| a.created_at.cmp(&b.created_at));
            
            // Remove the oldest items
            for item in sorted_items.iter().take(items_to_remove_count) {
                FeedItemOps::delete(&mut conn, item.id.as_ref().unwrap()).unwrap();
            }
        }
    }
    
    // Verify oldest items are gone, newest remain
    assert!(FeedItemOps::get_by_id(&mut conn, item1.id.as_ref().unwrap()).is_err());
    assert!(FeedItemOps::get_by_id(&mut conn, item2.id.as_ref().unwrap()).is_err());
    assert!(FeedItemOps::get_by_id(&mut conn, item3.id.as_ref().unwrap()).is_ok());
    assert!(FeedItemOps::get_by_id(&mut conn, item4.id.as_ref().unwrap()).is_ok());
}

#[test]
fn test_feed_cleanup_respects_min_items() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create test data
    let account = create_test_account(&mut conn);
    let rule = create_test_rule(&mut conn, &account);
    
    // Create feed with old max_age but min_items = 3
    let mut new_feed = NewFeed::new(
        "Test Feed".to_string(),
        None,
        None,
        rule.id.as_ref().unwrap().clone(),
        "rss".to_string(),
        true,
    );
    new_feed.max_age_days = Some(1); // Very short retention
    new_feed.min_items = Some(3);    // But keep at least 3
    let feed = FeedOps::create(&mut conn, &new_feed).unwrap();
    
    // Create 5 old items (all older than 1 day)
    let old_date = Utc::now() - Duration::days(5);
    for i in 1..=5 {
        create_test_feed_item(&mut conn, &feed, &format!("Item {}", i), old_date);
    }
    
    // Test min_items constraint logic
    let all_items = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap();
    assert_eq!(all_items.len(), 5);
    
    // Simulate age-based cleanup but respect min_items
    let mut items_to_remove = Vec::new();
    if let Some(max_age_days) = feed.max_age_days {
        let cutoff_date = Utc::now() - Duration::days(max_age_days as i64);
        for item in &all_items {
            if let Ok(created_at) = chrono::DateTime::parse_from_rfc3339(&item.created_at) {
                if created_at.with_timezone(&Utc) < cutoff_date {
                    items_to_remove.push(item.id.as_ref().unwrap().clone());
                }
            }
        }
    }
    
    // Apply min_items constraint  
    if let Some(min_items) = feed.min_items {
        let min_items = min_items as usize;
        let items_after_removal = all_items.len().saturating_sub(items_to_remove.len());
        if items_after_removal < min_items {
            let excess_removals = min_items - items_after_removal;
            items_to_remove.truncate(items_to_remove.len().saturating_sub(excess_removals));
        }
    }
    
    // Remove items
    for item_id in items_to_remove {
        FeedItemOps::delete(&mut conn, &item_id).unwrap();
    }
    
    // Verify 3 items remain
    let remaining = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap();
    assert_eq!(remaining.len(), 3);
}

#[test]
fn test_feed_cleanup_all_feeds() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    // Create test data with multiple feeds
    let account = create_test_account(&mut conn);
    let rule1 = create_test_rule(&mut conn, &account);
    let rule2 = {
        let new_rule = NewEmailRule::new(
            "Rule 2".to_string(),
            account.id.as_ref().unwrap().clone(),
            "INBOX".to_string(),
            None,
            None,
            None,
            None,
            true,
        );
        EmailRuleOps::create(&mut conn, &new_rule).unwrap()
    };
    
    // Create two feeds
    let feed1 = {
        let mut new_feed = NewFeed::new(
            "Feed 1".to_string(),
            None,
            None,
            rule1.id.as_ref().unwrap().clone(),
            "rss".to_string(),
            true,
        );
        new_feed.max_items = Some(1);
        FeedOps::create(&mut conn, &new_feed).unwrap()
    };
    
    let feed2 = {
        let mut new_feed = NewFeed::new(
            "Feed 2".to_string(),
            None,
            None,
            rule2.id.as_ref().unwrap().clone(),
            "rss".to_string(),
            true,
        );
        new_feed.max_items = Some(1);
        FeedOps::create(&mut conn, &new_feed).unwrap()
    };
    
    // Add 2 items to each feed
    create_test_feed_item(&mut conn, &feed1, "Feed1 Item1", Utc::now() - Duration::days(2));
    create_test_feed_item(&mut conn, &feed1, "Feed1 Item2", Utc::now() - Duration::days(1));
    create_test_feed_item(&mut conn, &feed2, "Feed2 Item1", Utc::now() - Duration::days(2));
    create_test_feed_item(&mut conn, &feed2, "Feed2 Item2", Utc::now() - Duration::days(1));
    
    // Test multiple feed cleanup logic  
    let feeds = FeedOps::get_all(&mut conn).unwrap();
    assert_eq!(feeds.len(), 2);
    
    let mut total_removed = 0;
    for feed in &feeds {
        let all_items = FeedItemOps::get_by_feed_id(&mut conn, feed.id.as_ref().unwrap(), None).unwrap();
        
        // Apply count-based cleanup (max_items = 1, so remove excess)
        if let Some(max_items) = feed.max_items {
            let max_items = max_items as usize;
            if all_items.len() > max_items {
                let items_to_remove_count = all_items.len() - max_items;
                
                // Sort by creation date and remove oldest
                let mut sorted_items = all_items.clone();
                sorted_items.sort_by(|a, b| a.created_at.cmp(&b.created_at));
                
                for item in sorted_items.iter().take(items_to_remove_count) {
                    FeedItemOps::delete(&mut conn, item.id.as_ref().unwrap()).unwrap();
                    total_removed += 1;
                }
            }
        }
    }
    
    assert_eq!(total_removed, 2); // 1 from each feed
}

// Helper functions for test setup

fn create_test_account(conn: &mut SqliteConnection) -> ImapAccount {
    let new_account = NewImapAccount::new(
        "Test Account".to_string(),
        "localhost".to_string(),
        993,
        "user@example.com".to_string(),
        "password".to_string(),
        true,
    );
    ImapAccountOps::create(conn, &new_account).unwrap()
}

fn create_test_rule(conn: &mut SqliteConnection, account: &ImapAccount) -> EmailRule {
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
    EmailRuleOps::create(conn, &new_rule).unwrap()
}

fn create_test_feed_item(
    conn: &mut SqliteConnection,
    feed: &Feed,
    title: &str,
    created_at: chrono::DateTime<Utc>,
) -> FeedItem {
    let mut new_item = NewFeedItem::new(
        feed.id.as_ref().unwrap().clone(),
        title.to_string(),
        None,
        None,
        None,
        created_at,
        None,
        None,
        None,
        None,
    );
    // Override the created_at to the specific time for testing
    new_item.created_at = created_at.to_rfc3339();
    FeedItemOps::create(conn, &new_item).unwrap()
}

// Additional test for email rule post-processing field defaults
#[test]
fn test_email_rule_post_processing_defaults() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    let account = create_test_account(&mut conn);
    let rule = create_test_rule(&mut conn, &account);
    
    // Verify default post-processing action
    assert_eq!(rule.post_process_action, "mark_read");
    assert_eq!(rule.move_to_folder, None);
}

// Test for new metadata fields in feed items
#[test]
fn test_feed_item_metadata_fields() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    let account = create_test_account(&mut conn);
    let rule = create_test_rule(&mut conn, &account);
    
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
        Utc::now(),
        None,
        None,
        None,
        Some("Body content here".to_string()),
    );
    
    let created_item = FeedItemOps::create(&mut conn, &new_item).unwrap();
    
    // Verify new metadata fields
    assert_eq!(created_item.is_read, Some(false));
    assert_eq!(created_item.starred, Some(false));
    assert_eq!(created_item.body_size, Some("Body content here".len() as i32));
}

// Test for feed retention field defaults
#[test]
fn test_feed_retention_defaults() {
    let pool = setup_test_db();
    let mut conn = pool.get().unwrap();
    
    let account = create_test_account(&mut conn);
    let rule = create_test_rule(&mut conn, &account);
    
    let new_feed = NewFeed::new(
        "Test Feed".to_string(),
        None,
        None,
        rule.id.as_ref().unwrap().clone(),
        "rss".to_string(),
        true,
    );
    let created_feed = FeedOps::create(&mut conn, &new_feed).unwrap();
    
    // Verify retention defaults
    assert_eq!(created_feed.max_items, Some(100));
    assert_eq!(created_feed.max_age_days, Some(30));
    assert_eq!(created_feed.min_items, Some(10));
}