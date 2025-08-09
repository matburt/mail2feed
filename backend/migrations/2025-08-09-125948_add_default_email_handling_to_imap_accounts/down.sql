-- Remove default email handling configuration from IMAP accounts
ALTER TABLE imap_accounts DROP COLUMN default_post_process_action;
ALTER TABLE imap_accounts DROP COLUMN default_move_to_folder;
