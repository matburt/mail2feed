-- Add default email handling configuration to IMAP accounts (PostgreSQL conditional syntax)
ALTER TABLE imap_accounts ADD COLUMN IF NOT EXISTS default_post_process_action TEXT NOT NULL DEFAULT 'mark_read';
ALTER TABLE imap_accounts ADD COLUMN IF NOT EXISTS default_move_to_folder TEXT NULL;
