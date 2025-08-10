-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create IMAP accounts table
CREATE TABLE imap_accounts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    use_tls BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL DEFAULT now()::TEXT,
    updated_at TEXT NOT NULL DEFAULT now()::TEXT,
    default_post_process_action TEXT NOT NULL DEFAULT 'mark_read',
    default_move_to_folder TEXT
);

-- Create email rules table
CREATE TABLE email_rules (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    name TEXT NOT NULL,
    imap_account_id TEXT NOT NULL REFERENCES imap_accounts(id) ON DELETE CASCADE,
    folder TEXT NOT NULL DEFAULT 'INBOX',
    to_address TEXT,
    from_address TEXT,
    subject_contains TEXT,
    label TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL DEFAULT now()::TEXT,
    updated_at TEXT NOT NULL DEFAULT now()::TEXT,
    post_process_action TEXT NOT NULL DEFAULT 'mark_read',
    move_to_folder TEXT
);

-- Create feeds table
CREATE TABLE feeds (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    email_rule_id TEXT NOT NULL REFERENCES email_rules(id) ON DELETE CASCADE,
    feed_type TEXT NOT NULL DEFAULT 'rss',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL DEFAULT now()::TEXT,
    updated_at TEXT NOT NULL DEFAULT now()::TEXT,
    max_items INTEGER DEFAULT 100,
    max_age_days INTEGER DEFAULT 30,
    min_items INTEGER DEFAULT 10
);

-- Create feed items table
CREATE TABLE feed_items (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    feed_id TEXT NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    author TEXT,
    pub_date TEXT NOT NULL,
    email_message_id TEXT,
    email_subject TEXT,
    email_from TEXT,
    email_body TEXT,
    created_at TEXT NOT NULL DEFAULT now()::TEXT,
    is_read BOOLEAN DEFAULT false,
    starred BOOLEAN DEFAULT false,
    body_size INTEGER
);

-- Create indexes for better query performance
CREATE INDEX idx_email_rules_account_id ON email_rules(imap_account_id);
CREATE INDEX idx_email_rules_active ON email_rules(is_active);
CREATE INDEX idx_feeds_rule_id ON feeds(email_rule_id);
CREATE INDEX idx_feeds_active ON feeds(is_active);
CREATE INDEX idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX idx_feed_items_pub_date ON feed_items(pub_date);
CREATE INDEX idx_feed_items_email_message_id ON feed_items(email_message_id);

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now()::TEXT;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_imap_accounts_updated_at BEFORE UPDATE ON imap_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_rules_updated_at BEFORE UPDATE ON email_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feeds_updated_at BEFORE UPDATE ON feeds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();