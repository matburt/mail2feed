-- Add email post-processing action configuration to email_rules
ALTER TABLE email_rules ADD COLUMN post_process_action TEXT NOT NULL DEFAULT 'mark_read';
ALTER TABLE email_rules ADD COLUMN move_to_folder TEXT;

-- Add feed item retention configuration to feeds  
ALTER TABLE feeds ADD COLUMN max_items INTEGER DEFAULT 100;
ALTER TABLE feeds ADD COLUMN max_age_days INTEGER DEFAULT 30;
ALTER TABLE feeds ADD COLUMN min_items INTEGER DEFAULT 10;

-- Add metadata fields to feed_items for better management
ALTER TABLE feed_items ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
ALTER TABLE feed_items ADD COLUMN starred BOOLEAN DEFAULT FALSE;
ALTER TABLE feed_items ADD COLUMN body_size INTEGER DEFAULT 0;

-- Create index for cleanup queries
CREATE INDEX idx_feed_items_created_at_feed_id ON feed_items(feed_id, created_at);
CREATE INDEX idx_feed_items_is_read ON feed_items(is_read);
CREATE INDEX idx_feed_items_starred ON feed_items(starred);