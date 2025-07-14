use anyhow::{Result, Context};
use crate::db::models::{EmailRule, ImapAccount, NewFeedItem};
use crate::db::operations;
use super::client::{ImapClient, Email};
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::SqliteConnection;
use tracing::{info, warn, error};
use chrono::Utc;
use uuid::Uuid;

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
        
        // Get email rules for this account
        let rules = operations::get_email_rules_by_account(&self.pool, &self.account.id)?;
        
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
        let feeds = operations::get_feeds_by_rule(&self.pool, &rule.id)?;
        if feeds.is_empty() {
            warn!("No feed configured for rule: {}", rule.name);
            return Ok(RuleProcessingResult {
                emails_processed: 0,
                items_created: 0,
            });
        }
        
        let feed = &feeds[0]; // Use the first feed
        
        // Fetch emails from the specified folder
        let emails = client.fetch_emails_from_folder(&rule.folder, Some(100))
            .with_context(|| format!("Failed to fetch emails from folder: {}", rule.folder))?;
        
        let mut result = RuleProcessingResult {
            emails_processed: 0,
            items_created: 0,
        };
        
        for email in emails {
            if self.matches_rule(&email, rule) {
                result.emails_processed += 1;
                
                // Check if we already have this email in the feed
                if !self.email_exists_in_feed(&email, &feed.id)? {
                    // Create a new feed item
                    match self.create_feed_item(&email, &feed.id) {
                        Ok(_) => {
                            result.items_created += 1;
                            info!("Created feed item for email: {}", email.subject);
                        }
                        Err(e) => {
                            error!("Failed to create feed item: {}", e);
                        }
                    }
                }
            }
        }
        
        Ok(result)
    }
    
    fn matches_rule(&self, email: &Email, rule: &EmailRule) -> bool {
        // Check from address
        if let Some(from_pattern) = &rule.from_address {
            if !email.from.to_lowercase().contains(&from_pattern.to_lowercase()) {
                return false;
            }
        }
        
        // Check to address
        if let Some(to_pattern) = &rule.to_address {
            if !email.to.to_lowercase().contains(&to_pattern.to_lowercase()) {
                return false;
            }
        }
        
        // Check subject
        if let Some(subject_pattern) = &rule.subject_contains {
            if !email.subject.to_lowercase().contains(&subject_pattern.to_lowercase()) {
                return false;
            }
        }
        
        // TODO: Check labels/tags when IMAP server supports them
        
        true
    }
    
    fn email_exists_in_feed(&self, email: &Email, feed_id_val: &str) -> Result<bool> {
        let conn = &mut self.pool.get()?;
        
        use crate::db::schema::feed_items::dsl::*;
        use diesel::prelude::*;
        
        let count = feed_items
            .filter(feed_id.eq(feed_id_val))
            .filter(email_message_id.eq(&email.message_id))
            .count()
            .get_result::<i64>(conn)?;
            
        Ok(count > 0)
    }
    
    fn create_feed_item(&self, email: &Email, feed_id_val: &str) -> Result<String> {
        let new_item = NewFeedItem {
            id: Uuid::new_v4().to_string(),
            feed_id: feed_id_val.to_string(),
            title: email.subject.clone(),
            description: Some(self.truncate_body(&email.body, 500)),
            link: Some(format!("mailto:{}?subject={}", email.from, urlencoding::encode(&email.subject))),
            author: Some(email.from.clone()),
            pub_date: email.date.to_rfc3339(),
            email_message_id: Some(email.message_id.clone()),
            email_subject: Some(email.subject.clone()),
            email_from: Some(email.from.clone()),
            email_body: Some(email.body.clone()),
            created_at: Utc::now().to_rfc3339(),
        };
        
        operations::create_feed_item(&self.pool, new_item)
    }
    
    fn truncate_body(&self, body: &str, max_length: usize) -> String {
        if body.len() <= max_length {
            body.to_string()
        } else {
            format!("{}...", &body[..max_length])
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