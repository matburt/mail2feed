use anyhow::{Result, Context};
use crate::db::models::{EmailRule, ImapAccount, NewFeedItem, EmailAction};
use crate::db::operations;
use super::client::{ImapClient, Email};
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::SqliteConnection;
use tracing::{info, warn, error, debug};

pub struct EmailProcessor {
    account: ImapAccount,
    pool: Pool<ConnectionManager<SqliteConnection>>,
}

impl EmailProcessor {
    pub fn new(account: ImapAccount, pool: Pool<ConnectionManager<SqliteConnection>>) -> Self {
        Self { account, pool }
    }
    
    pub async fn process_account(&self) -> Result<ProcessingResult> {
        info!("Processing IMAP account: {}", self.account.name);
        
        // Get account ID or return early if None
        let account_id = self.account.id.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Account has no ID"))?;
        
        // Get email rules for this account
        let rules = operations::get_email_rules_by_account(&self.pool, account_id)?;
        
        if rules.is_empty() {
            info!("No active rules for account: {}", self.account.name);
            return Ok(ProcessingResult {
                total_emails_processed: 0,
                new_feed_items_created: 0,
                errors: vec![],
            });
        }
        
        let client = ImapClient::new(&self.account)?;
        let mut result = ProcessingResult::default();
        
        // Process each rule
        for rule in rules {
            if !rule.is_active {
                continue;
            }
            
            match self.process_rule(&client, &rule).await {
                Ok(rule_result) => {
                    result.total_emails_processed += rule_result.emails_processed;
                    result.new_feed_items_created += rule_result.items_created;
                }
                Err(e) => {
                    error!("Error processing rule '{}': {}", rule.name, e);
                    result.errors.push(format!("Rule '{}': {}", rule.name, e));
                }
            }
        }
        
        Ok(result)
    }
    
    async fn process_rule(&self, client: &ImapClient, rule: &EmailRule) -> Result<RuleProcessingResult> {
        info!("Processing rule: {} for folder: {}", rule.name, rule.folder);
        
        // Get the feed associated with this rule
        let rule_id = rule.id.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Rule has no ID"))?;
        let feeds = operations::get_feeds_by_rule(&self.pool, rule_id)?;
        if feeds.is_empty() {
            warn!("No feed configured for rule: {}", rule.name);
            return Ok(RuleProcessingResult {
                emails_processed: 0,
                items_created: 0,
            });
        }
        
        let feed = &feeds[0]; // Use the first feed
        let feed_id = feed.id.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Feed has no ID"))?;
        
        // Fetch emails from the specified folder
        let emails = client.fetch_emails_from_folder(&rule.folder, Some(100))
            .await
            .with_context(|| format!("Failed to fetch emails from folder: {}", rule.folder))?;
        
        let mut result = RuleProcessingResult {
            emails_processed: 0,
            items_created: 0,
        };
        
        info!("Processing {} emails against rule criteria", emails.len());
        
        for (index, email) in emails.iter().enumerate() {
            let email_number = index + 1;
            info!("🔄 Processing email {}/{}: '{}'", email_number, emails.len(), email.subject);
            debug!("Checking email - UID: {}, Subject: '{}', From: '{}' against rule: {}", 
                   email.uid, email.subject, email.from, rule.name);
                   
            if self.matches_rule(&email, rule) {
                result.emails_processed += 1;
                info!("✅ Email {} matches rule '{}': {}", email_number, rule.name, email.subject);
                info!("Email details: from='{}', date='{}'", email.from, email.date.format("%Y-%m-%d %H:%M:%S"));
                
                // Check if we already have this email in the feed
                debug!("Checking duplicate for email {}: '{}'", email_number, email.subject);
                if !self.email_exists_in_feed(&email, feed_id)? {
                    // Create a new feed item
                    info!("📝 Attempting to create feed item for email {}: '{}'", email_number, email.subject);
                    match self.create_feed_item(&email, feed_id) {
                        Ok(item_id) => {
                            result.items_created += 1;
                            info!("✅ Successfully created feed item {} with ID {}: '{}'", email_number, item_id, email.subject);
                            
                            // Post-process the email according to the rule
                            if let Err(e) = self.post_process_email(client, &email, rule).await {
                                warn!("⚠️ Failed to post-process email {}: '{}' - {}", email_number, email.subject, e);
                            } else {
                                info!("✅ Post-processed email {} successfully", email_number);
                            }
                        }
                        Err(e) => {
                            error!("❌ Failed to create feed item for email {}: '{}' - Error: {}", email_number, email.subject, e);
                        }
                    }
                } else {
                    info!("⏭️ Email {} already exists in feed: {}", email_number, email.subject);
                }
            } else {
                debug!("❌ Email {} does not match rule criteria: '{}'", email_number, email.subject);
            }
        }
        
        info!("📊 Rule processing complete: processed {} emails, created {} feed items", 
              result.emails_processed, result.items_created);
        
        if result.emails_processed > 0 && result.items_created == 0 {
            error!("🚨 CRITICAL: {} emails were processed but NO feed items were created!", result.emails_processed);
        } else if result.items_created < result.emails_processed {
            warn!("⚠️ Mismatch: {} emails processed but only {} feed items created", 
                  result.emails_processed, result.items_created);
        } else if result.items_created == result.emails_processed {
            info!("✅ All processed emails successfully converted to feed items");
        }
        
        Ok(result)
    }
    
    fn matches_rule(&self, email: &Email, rule: &EmailRule) -> bool {
        info!("Matching email against rule '{}': from_pattern={:?}, to_pattern={:?}, subject_pattern={:?}", 
               rule.name, rule.from_address, rule.to_address, rule.subject_contains);
        info!("Email details: UID={}, from='{}', to='{}', subject='{}'", 
               email.uid, email.from, email.to, email.subject);
        
        // Check from address
        if let Some(from_pattern) = &rule.from_address {
            if !email.from.to_lowercase().contains(&from_pattern.to_lowercase()) {
                info!("Email from '{}' does not contain pattern '{}'", email.from, from_pattern);
                return false;
            } else {
                info!("Email from '{}' matches pattern '{}'", email.from, from_pattern);
            }
        }
        
        // Check to address
        if let Some(to_pattern) = &rule.to_address {
            if !email.to.to_lowercase().contains(&to_pattern.to_lowercase()) {
                info!("Email to '{}' does not contain pattern '{}'", email.to, to_pattern);
                return false;
            } else {
                info!("Email to '{}' matches pattern '{}'", email.to, to_pattern);
            }
        }
        
        // Check subject
        if let Some(subject_pattern) = &rule.subject_contains {
            if !email.subject.to_lowercase().contains(&subject_pattern.to_lowercase()) {
                info!("Email subject '{}' does not contain pattern '{}'", email.subject, subject_pattern);
                return false;
            } else {
                info!("Email subject '{}' matches pattern '{}'", email.subject, subject_pattern);
            }
        }
        
        // TODO: Check labels/tags when IMAP server supports them
        
        info!("Email matches all rule criteria");
        true
    }
    
    fn email_exists_in_feed(&self, email: &Email, feed_id_val: &str) -> Result<bool> {
        let conn = &mut self.pool.get()?;
        
        use crate::db::schema::feed_items::dsl::*;
        use diesel::prelude::*;
        
        // Priority 1: Use message ID if available and not empty
        if !email.message_id.is_empty() {
            debug!("Checking duplicate by message ID: '{}'", email.message_id);
            let count = feed_items
                .filter(feed_id.eq(feed_id_val))
                .filter(email_message_id.eq(&email.message_id))
                .count()
                .get_result::<i64>(conn)?;
            
            if count > 0 {
                debug!("Found duplicate by message ID '{}': {} existing items", email.message_id, count);
                return Ok(true);
            }
        }
        
        // Priority 2: Fall back to subject + from + date combination for more robust duplicate detection
        debug!("Checking duplicate by subject+from combination: '{}' from '{}'", email.subject, email.from);
        let email_date_str = email.date.to_rfc3339();
        debug!("Comparing with email date: {}", email_date_str);
        let count = feed_items
            .filter(feed_id.eq(feed_id_val))
            .filter(title.eq(&email.subject))
            .filter(email_from.eq(&email.from))
            .filter(pub_date.eq(email_date_str))
            .count()
            .get_result::<i64>(conn)?;
            
        debug!("Duplicate check for '{}' from '{}': found {} existing items", 
               email.subject, email.from, count);
        Ok(count > 0)
    }
    
    fn create_feed_item(&self, email: &Email, feed_id_val: &str) -> Result<String> {
        let new_item = NewFeedItem::new(
            feed_id_val.to_string(),
            email.subject.clone(),
            Some(self.truncate_body(&email.body, 500)),
            Some(format!("mailto:{}?subject={}", email.from, urlencoding::encode(&email.subject))),
            Some(email.from.clone()),
            email.date,
            Some(email.message_id.clone()),
            Some(email.subject.clone()),
            Some(email.from.clone()),
            Some(email.body.clone()),
        );
        
        operations::create_feed_item(&self.pool, new_item)
    }
    
    fn truncate_body(&self, body: &str, max_length: usize) -> String {
        if body.len() <= max_length {
            body.to_string()
        } else {
            format!("{}...", &body[..max_length])
        }
    }
    
    /// Post-process an email according to the rule's action configuration
    async fn post_process_email(&self, client: &ImapClient, email: &Email, rule: &EmailRule) -> Result<()> {
        let action = EmailAction::from_str(&rule.post_process_action);
        
        info!("Post-processing email '{}' with action: {:?}", email.subject, action);
        
        match action {
            EmailAction::DoNothing => {
                debug!("No post-processing action for email: {}", email.subject);
                Ok(())
            }
            EmailAction::MarkAsRead => {
                client.mark_as_read_in_folder(email.uid, &rule.folder)
                    .await
                    .with_context(|| format!("Failed to mark email {} as read in folder '{}'", email.uid, rule.folder))?;
                info!("Marked email '{}' as read in folder '{}'", email.subject, rule.folder);
                Ok(())
            }
            EmailAction::Delete => {
                client.delete_email_in_folder(email.uid, &rule.folder)
                    .await
                    .with_context(|| format!("Failed to delete email {} from folder '{}'", email.uid, rule.folder))?;
                info!("Deleted email '{}' from folder '{}'", email.subject, rule.folder);
                Ok(())
            }
            EmailAction::MoveToFolder => {
                if let Some(target_folder) = &rule.move_to_folder {
                    client.move_to_folder_from_folder(email.uid, &rule.folder, target_folder)
                        .await
                        .with_context(|| format!("Failed to move email {} from '{}' to folder '{}'", email.uid, rule.folder, target_folder))?;
                    info!("Moved email '{}' from '{}' to folder '{}'", email.subject, rule.folder, target_folder);
                    Ok(())
                } else {
                    warn!("Move action configured but no target folder specified for rule '{}'", rule.name);
                    Ok(())
                }
            }
        }
    }
}

#[derive(Debug, Default)]
pub struct ProcessingResult {
    pub total_emails_processed: usize,
    pub new_feed_items_created: usize,
    pub errors: Vec<String>,
}

#[derive(Debug)]
struct RuleProcessingResult {
    pub emails_processed: usize,
    pub items_created: usize,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ProcessedEmail {
    pub email: Email,
    pub rule_id: String,
    pub feed_id: String,
}