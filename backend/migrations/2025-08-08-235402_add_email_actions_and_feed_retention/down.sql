-- Remove indexes
DROP INDEX IF EXISTS idx_feed_items_starred;
DROP INDEX IF EXISTS idx_feed_items_is_read; 
DROP INDEX IF EXISTS idx_feed_items_created_at_feed_id;

-- Remove metadata fields from feed_items
ALTER TABLE feed_items DROP COLUMN body_size;
ALTER TABLE feed_items DROP COLUMN starred;
ALTER TABLE feed_items DROP COLUMN is_read;

-- Remove retention configuration from feeds
ALTER TABLE feeds DROP COLUMN min_items;
ALTER TABLE feeds DROP COLUMN max_age_days;
ALTER TABLE feeds DROP COLUMN max_items;

-- Remove email action configuration from email_rules
ALTER TABLE email_rules DROP COLUMN move_to_folder;
ALTER TABLE email_rules DROP COLUMN post_process_action;