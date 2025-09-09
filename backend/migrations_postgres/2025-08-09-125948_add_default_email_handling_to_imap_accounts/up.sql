-- Add default email handling configuration to IMAP accounts
ALTER TABLE imap_accounts ADD COLUMN default_post_process_action TEXT NOT NULL DEFAULT 'mark_read';
ALTER TABLE imap_accounts ADD COLUMN default_move_to_folder TEXT NULL;
