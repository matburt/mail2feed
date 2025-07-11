-- Create IMAP accounts table
CREATE TABLE imap_accounts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 993,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    use_tls BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Create email rules table
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
    FOREIGN KEY (imap_account_id) REFERENCES imap_accounts(id) ON DELETE CASCADE
);

-- Create feeds table
CREATE TABLE feeds (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    link TEXT,
    email_rule_id TEXT NOT NULL,
    feed_type TEXT NOT NULL DEFAULT 'rss', -- 'rss' or 'atom'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (email_rule_id) REFERENCES email_rules(id) ON DELETE CASCADE
);

-- Create feed items table
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
    FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_email_rules_imap_account ON email_rules(imap_account_id);
CREATE INDEX idx_feeds_email_rule ON feeds(email_rule_id);
CREATE INDEX idx_feed_items_feed ON feed_items(feed_id);
CREATE INDEX idx_feed_items_pub_date ON feed_items(pub_date);
CREATE INDEX idx_feed_items_message_id ON feed_items(email_message_id);