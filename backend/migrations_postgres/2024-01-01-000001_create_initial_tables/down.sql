-- Drop triggers
DROP TRIGGER IF EXISTS update_feeds_updated_at ON feeds;
DROP TRIGGER IF EXISTS update_email_rules_updated_at ON email_rules;
DROP TRIGGER IF EXISTS update_imap_accounts_updated_at ON imap_accounts;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_feed_items_email_message_id;
DROP INDEX IF EXISTS idx_feed_items_pub_date;
DROP INDEX IF EXISTS idx_feed_items_feed_id;
DROP INDEX IF EXISTS idx_feeds_active;
DROP INDEX IF EXISTS idx_feeds_rule_id;
DROP INDEX IF EXISTS idx_email_rules_active;
DROP INDEX IF EXISTS idx_email_rules_account_id;

-- Drop tables in reverse order due to foreign key constraints
DROP TABLE IF EXISTS feed_items;
DROP TABLE IF EXISTS feeds;
DROP TABLE IF EXISTS email_rules;
DROP TABLE IF EXISTS imap_accounts;

-- Drop UUID extension
DROP EXTENSION IF EXISTS "uuid-ossp";