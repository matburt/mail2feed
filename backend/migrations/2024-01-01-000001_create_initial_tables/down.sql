-- Drop tables in reverse order due to foreign key constraints
DROP TABLE IF EXISTS feed_items;
DROP TABLE IF EXISTS feeds;
DROP TABLE IF EXISTS email_rules;
DROP TABLE IF EXISTS imap_accounts;