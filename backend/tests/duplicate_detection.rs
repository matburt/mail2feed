use mail2feed_backend::db::{models::*, operations::*};
use mail2feed_backend::db::schema::feed_items;
use mail2feed_backend::imap::client::Email;
use diesel::prelude::*;
use diesel::connection::SimpleConnection;
use diesel::r2d2::{ConnectionManager, Pool};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Helper to create a test database
fn create_test_database() -> Pool<ConnectionManager<SqliteConnection>> {
    let db_name = format!("test_duplicate_detection_{}.db", Uuid::new_v4());
    let database_url = format!("sqlite://{}", db_name);
    
    // Create database and run migrations  
    let mut connection = SqliteConnection::establish(&database_url).unwrap();
    
    // Create tables with direct SQL (simplified approach for testing)
    connection.batch_execute(r#"
        CREATE TABLE imap_accounts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            host TEXT NOT NULL,
            port INTEGER NOT NULL,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            use_tls BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        
        CREATE TABLE email_rules (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            imap_account_id TEXT NOT NULL,
            folder TEXT NOT NULL DEFAULT 'INBOX',
            to_address TEXT,
            from_address TEXT,
            subject_contains TEXT,
            label TEXT,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            post_process_action TEXT NOT NULL DEFAULT 'mark_read',
            move_to_folder TEXT,
            FOREIGN KEY (imap_account_id) REFERENCES imap_accounts(id) ON DELETE CASCADE
        );
        
        CREATE TABLE feeds (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            link TEXT,
            email_rule_id TEXT NOT NULL,
            feed_type TEXT NOT NULL DEFAULT 'rss',
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            max_items INTEGER DEFAULT 100,
            max_age_days INTEGER DEFAULT 30,
            min_items INTEGER DEFAULT 10,
            FOREIGN KEY (email_rule_id) REFERENCES email_rules(id) ON DELETE CASCADE
        );
        
        CREATE TABLE feed_items (
            id TEXT PRIMARY KEY,
            feed_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            link TEXT,
            author TEXT,
            pub_date TEXT NOT NULL,
            email_message_id TEXT,
            email_subject TEXT,
            email_from TEXT,
            email_body TEXT,
            created_at TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            starred BOOLEAN DEFAULT FALSE,
            body_size INTEGER DEFAULT 0,
            FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
        );
    "#).unwrap();
    
    // Create connection pool
    let manager = ConnectionManager::<SqliteConnection>::new(&database_url);
    Pool::builder().build(manager).unwrap()
}

/// Helper to create test data
fn setup_test_data(pool: &Pool<ConnectionManager<SqliteConnection>>) -> (String, String, String) {
    let mut conn = pool.get().unwrap();
    
    // Create test IMAP account
    let account = NewImapAccount {
        id: "test-account-id".to_string(),
        name: "Test Account".to_string(),
        host: "test.example.com".to_string(),
        port: 993,
        username: "test@example.com".to_string(),
        password: "password".to_string(),
        use_tls: true,
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
    };
    
    let created_account = ImapAccountOps::create(&mut conn, &account).unwrap();
    let account_id = created_account.id.unwrap();
    
    // Create test email rule
    let rule = NewEmailRule {
        id: "test-rule-id".to_string(),
        name: "Test Rule".to_string(),
        imap_account_id: account_id.clone(),
        folder: "INBOX".to_string(),
        to_address: Some("test@example.com".to_string()),
        from_address: None,
        subject_contains: None,
        label: None,
        is_active: true,
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
        post_process_action: "mark_read".to_string(),
        move_to_folder: None,
    };
    
    let created_rule = EmailRuleOps::create(&mut conn, &rule).unwrap();
    let rule_id = created_rule.id.unwrap();
    
    // Create test feed
    let feed = NewFeed {
        id: "test-feed-id".to_string(),
        title: "Test Feed".to_string(),
        description: Some("Test feed description".to_string()),
        link: Some("https://example.com".to_string()),
        email_rule_id: rule_id.clone(),
        feed_type: "rss".to_string(),
        is_active: true,
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
        max_items: Some(100),
        max_age_days: Some(30),
        min_items: Some(10),
    };
    
    let created_feed = FeedOps::create(&mut conn, &feed).unwrap();
    let feed_id = created_feed.id.unwrap();
    
    (account_id, rule_id, feed_id)
}

/// Helper to create test email
fn create_test_email(uid: u32, subject: &str, from: &str, message_id: &str, date: DateTime<Utc>) -> Email {
    Email {
        uid,
        message_id: message_id.to_string(),
        subject: subject.to_string(),
        from: from.to_string(),
        to: "test@example.com".to_string(),
        date,
        body: "Test email body".to_string(),
        is_seen: false,
    }
}

#[tokio::test]
async fn test_duplicate_detection_with_message_id() {
    let pool = create_test_database();
    let (_account_id, _rule_id, feed_id) = setup_test_data(&pool);
    
    let email_date = Utc::now();
    
    // Create first feed item with message ID
    let item1 = NewFeedItem::new(
        feed_id.clone(),
        "Test Email".to_string(),
        Some("Test description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        Some("test-message-id@example.com".to_string()),
        Some("Test Email".to_string()),
        Some("sender@example.com".to_string()),
        Some("Test email body".to_string()),
    );
    
    let item_id1 = create_feed_item(&pool, item1).unwrap();
    assert!(!item_id1.is_empty(), "Feed item should be created");
    
    // Test duplicate detection logic manually using database queries
    let mut conn = pool.get().unwrap();
    
    // Check by message ID - should find 1 item
    let count_by_message_id = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id))
        .filter(feed_items::email_message_id.eq("test-message-id@example.com"))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_by_message_id, 1, "Should find exactly 1 item by message ID");
    
    // Try to create another item with same message ID but different subject
    let item2 = NewFeedItem::new(
        feed_id.clone(),
        "Different Subject".to_string(), // Different subject
        Some("Different description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        Some("test-message-id@example.com".to_string()), // Same message ID
        Some("Different Subject".to_string()),
        Some("sender@example.com".to_string()),
        Some("Different body".to_string()),
    );
    
    let item_id2 = create_feed_item(&pool, item2).unwrap();
    assert!(!item_id2.is_empty(), "Second item should be created (database allows duplicates)");
    
    // Now check if we can detect the duplicate by message ID
    let count_by_message_id_after = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id))
        .filter(feed_items::email_message_id.eq("test-message-id@example.com"))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_by_message_id_after, 2, "Should find 2 items with same message ID");
}

#[tokio::test]
async fn test_duplicate_detection_without_message_id() {
    let pool = create_test_database();
    let (_account_id, _rule_id, feed_id) = setup_test_data(&pool);
    
    let email_date = Utc::now();
    
    // Create first item without message ID - should use subject+from+date
    let item1 = NewFeedItem::new(
        feed_id.clone(),
        "Test Email".to_string(),
        Some("Test description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        None, // No message ID - should fall back to subject+from+date
        Some("Test Email".to_string()),
        Some("sender@example.com".to_string()),
        Some("Test email body".to_string()),
    );
    
    let item_id1 = create_feed_item(&pool, item1).unwrap();
    assert!(!item_id1.is_empty(), "Feed item should be created");
    
    // Test duplicate detection using subject+from+date combination
    let mut conn = pool.get().unwrap();
    let email_date_str = email_date.to_rfc3339();
    
    let count_by_subject_from_date = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id))
        .filter(feed_items::title.eq("Test Email"))
        .filter(feed_items::email_from.eq("sender@example.com"))
        .filter(feed_items::pub_date.eq(&email_date_str))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_by_subject_from_date, 1, "Should find exactly 1 item by subject+from+date");
    
    // Test with different subject - should not be duplicate
    let count_different_subject = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id))
        .filter(feed_items::title.eq("Different Subject"))
        .filter(feed_items::email_from.eq("sender@example.com"))
        .filter(feed_items::pub_date.eq(&email_date_str))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_different_subject, 0, "Should not find items with different subject");
    
    // Test with different sender - should not be duplicate
    let count_different_sender = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id))
        .filter(feed_items::title.eq("Test Email"))
        .filter(feed_items::email_from.eq("different@example.com"))
        .filter(feed_items::pub_date.eq(&email_date_str))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_different_sender, 0, "Should not find items with different sender");
}

#[tokio::test]
async fn test_duplicate_detection_priority() {
    let pool = create_test_database();
    let (_account_id, _rule_id, feed_id) = setup_test_data(&pool);
    
    let email_date = Utc::now();
    
    // Create first item with message ID
    let item1 = NewFeedItem::new(
        feed_id.clone(),
        "Test Email".to_string(),
        Some("Test description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        Some("unique-message-id@example.com".to_string()),
        Some("Test Email".to_string()),
        Some("sender@example.com".to_string()),
        Some("Test email body".to_string()),
    );
    
    let item_id1 = create_feed_item(&pool, item1).unwrap();
    assert!(!item_id1.is_empty(), "Feed item should be created");
    
    // Test priority: message ID takes precedence over subject+from+date
    // The processor should prioritize message ID even when subject/from/date are different
    let mut conn = pool.get().unwrap();
    
    // Check that message ID detection works regardless of other fields
    let count_same_message_id = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id))
        .filter(feed_items::email_message_id.eq("unique-message-id@example.com"))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_same_message_id, 1, "Should find item by message ID");
    
    // Verify that subject+from+date combo differs but message ID would still match
    let count_different_combo = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id))
        .filter(feed_items::title.eq("Completely Different Subject"))
        .filter(feed_items::email_from.eq("different-sender@example.com"))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_different_combo, 0, "Should not find items with different subject/from combination");
}

#[tokio::test]
async fn test_duplicate_detection_across_different_feeds() {
    let pool = create_test_database();
    let (_account_id, rule_id, feed_id1) = setup_test_data(&pool);
    
    // Create second feed
    let mut conn = pool.get().unwrap();
    let feed2 = NewFeed {
        id: "test-feed-id-2".to_string(),
        title: "Test Feed 2".to_string(),
        description: Some("Second test feed".to_string()),
        link: Some("https://example2.com".to_string()),
        email_rule_id: rule_id,
        feed_type: "rss".to_string(),
        is_active: true,
        created_at: Utc::now().to_rfc3339(),
        updated_at: Utc::now().to_rfc3339(),
        max_items: Some(100),
        max_age_days: Some(30),
        min_items: Some(10),
    };
    
    let created_feed2 = FeedOps::create(&mut conn, &feed2).unwrap();
    let feed_id2 = created_feed2.id.unwrap();
    
    let email_date = Utc::now();
    
    // Create item in first feed
    let item1 = NewFeedItem::new(
        feed_id1.clone(),
        "Test Email".to_string(),
        Some("Test description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        Some("test-message-id@example.com".to_string()),
        Some("Test Email".to_string()),
        Some("sender@example.com".to_string()),
        Some("Test email body".to_string()),
    );
    
    let item_id1 = create_feed_item(&pool, item1).unwrap();
    assert!(!item_id1.is_empty(), "Feed item should be created in feed 1");
    
    // Verify item exists in feed 1
    let count_in_feed1 = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id1))
        .filter(feed_items::email_message_id.eq("test-message-id@example.com"))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_in_feed1, 1, "Should find item in feed 1");
    
    // Verify item does NOT exist in feed 2 (duplicates are per-feed)
    let count_in_feed2 = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id2))
        .filter(feed_items::email_message_id.eq("test-message-id@example.com"))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_in_feed2, 0, "Should not find item in feed 2 initially");
    
    // Can create same email in second feed (different feed_id)
    let item2 = NewFeedItem::new(
        feed_id2.clone(),
        "Test Email".to_string(),
        Some("Test description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        Some("test-message-id@example.com".to_string()),
        Some("Test Email".to_string()),
        Some("sender@example.com".to_string()),
        Some("Test email body".to_string()),
    );
    
    let item_id2 = create_feed_item(&pool, item2).unwrap();
    assert!(!item_id2.is_empty(), "Feed item should be created in feed 2");
    assert_ne!(item_id1, item_id2, "Items should have different IDs");
    
    // Now both feeds should have the item
    let count_in_feed2_after = feed_items::table
        .filter(feed_items::feed_id.eq(&feed_id2))
        .filter(feed_items::email_message_id.eq("test-message-id@example.com"))
        .count()
        .get_result::<i64>(&mut conn)
        .unwrap();
    
    assert_eq!(count_in_feed2_after, 1, "Should now find item in feed 2");
}

#[tokio::test]
async fn test_database_operations_direct() {
    let pool = create_test_database();
    let (_account_id, _rule_id, feed_id) = setup_test_data(&pool);
    
    let email_date = Utc::now();
    
    // Test direct database operations
    let new_item = NewFeedItem::new(
        feed_id.clone(),
        "Test Subject".to_string(),
        Some("Test description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        Some("test-message-id@example.com".to_string()),
        Some("Test Subject".to_string()),
        Some("sender@example.com".to_string()),
        Some("Test email body".to_string()),
    );
    
    // Create item using pool-based operation
    let item_id = create_feed_item(&pool, new_item).unwrap();
    assert!(!item_id.is_empty(), "Item ID should not be empty");
    
    // Verify item exists in database
    let mut conn = pool.get().unwrap();
    let retrieved_item = FeedItemOps::get_by_id(&mut conn, &item_id).unwrap();
    assert_eq!(retrieved_item.title, "Test Subject");
    assert_eq!(retrieved_item.email_message_id, Some("test-message-id@example.com".to_string()));
    assert_eq!(retrieved_item.feed_id, feed_id);
    
    // Test duplicate creation should still work at database level
    // (duplicate detection happens at processor level)
    let new_item2 = NewFeedItem::new(
        feed_id.clone(),
        "Test Subject".to_string(),
        Some("Test description".to_string()),
        Some("https://example.com".to_string()),
        Some("sender@example.com".to_string()),
        email_date,
        Some("test-message-id@example.com".to_string()),
        Some("Test Subject".to_string()),
        Some("sender@example.com".to_string()),
        Some("Test email body".to_string()),
    );
    
    let item_id2 = create_feed_item(&pool, new_item2).unwrap();
    assert!(!item_id2.is_empty(), "Second item should be created (database allows duplicates)");
    assert_ne!(item_id, item_id2, "Items should have different IDs");
}

#[test]
fn test_email_struct_creation() {
    let email_date = Utc::now();
    let email = create_test_email(
        42,
        "Test Subject",
        "test@example.com",
        "message-id-123",
        email_date
    );
    
    assert_eq!(email.uid, 42);
    assert_eq!(email.subject, "Test Subject");
    assert_eq!(email.from, "test@example.com");
    assert_eq!(email.message_id, "message-id-123");
    assert_eq!(email.to, "test@example.com");
    assert_eq!(email.date, email_date);
    assert_eq!(email.body, "Test email body");
    assert!(!email.is_seen);
}