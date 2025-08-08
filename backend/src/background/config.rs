//! Configuration for background email processing

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Configuration for background email processing
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackgroundConfig {
    /// Global processing interval (how often to check all accounts)
    pub global_interval_minutes: u64,
    
    /// Per-account processing interval (minimum time between processing same account)
    pub per_account_interval_minutes: u64,
    
    /// Maximum number of concurrent account processing tasks
    pub max_concurrent_accounts: usize,
    
    /// Whether background processing is enabled
    pub enabled: bool,
    
    /// Retry configuration
    pub retry: RetryConfig,
    
    /// Processing limits
    pub limits: ProcessingLimits,
}

/// Retry configuration for failed processing attempts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    /// Maximum number of retry attempts
    pub max_attempts: u32,
    
    /// Initial retry delay in seconds
    pub initial_delay_seconds: u64,
    
    /// Maximum retry delay in seconds
    pub max_delay_seconds: u64,
    
    /// Exponential backoff multiplier
    pub backoff_multiplier: f64,
}

/// Processing limits to prevent resource exhaustion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingLimits {
    /// Maximum number of emails to process per account per run
    pub max_emails_per_run: usize,
    
    /// Maximum processing time per account in seconds
    pub max_processing_time_seconds: u64,
    
    /// Maximum age of emails to process (in days)
    pub max_email_age_days: u32,
}

impl Default for BackgroundConfig {
    fn default() -> Self {
        Self {
            global_interval_minutes: 15,      // Check all accounts every 15 minutes
            per_account_interval_minutes: 30, // Process same account max once per 30 minutes
            max_concurrent_accounts: 3,       // Process up to 3 accounts simultaneously
            enabled: true,
            retry: RetryConfig::default(),
            limits: ProcessingLimits::default(),
        }
    }
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay_seconds: 30,    // Start with 30 second delay
            max_delay_seconds: 300,       // Max 5 minute delay
            backoff_multiplier: 2.0,      // Double the delay each retry
        }
    }
}

impl Default for ProcessingLimits {
    fn default() -> Self {
        Self {
            max_emails_per_run: 100,      // Process up to 100 emails per run
            max_processing_time_seconds: 300, // Max 5 minutes per account
            max_email_age_days: 7,        // Only process emails from last 7 days
        }
    }
}

impl BackgroundConfig {
    /// Load configuration from environment variables
    pub fn from_env() -> Self {
        let mut config = Self::default();
        
        // Load from environment variables with defaults
        if let Ok(interval) = std::env::var("BACKGROUND_GLOBAL_INTERVAL_MINUTES") {
            if let Ok(val) = interval.parse() {
                config.global_interval_minutes = val;
            }
        }
        
        if let Ok(interval) = std::env::var("BACKGROUND_PER_ACCOUNT_INTERVAL_MINUTES") {
            if let Ok(val) = interval.parse() {
                config.per_account_interval_minutes = val;
            }
        }
        
        if let Ok(concurrent) = std::env::var("BACKGROUND_MAX_CONCURRENT_ACCOUNTS") {
            if let Ok(val) = concurrent.parse() {
                config.max_concurrent_accounts = val;
            }
        }
        
        if let Ok(enabled) = std::env::var("BACKGROUND_PROCESSING_ENABLED") {
            config.enabled = enabled.to_lowercase() == "true";
        }
        
        // Retry configuration
        if let Ok(attempts) = std::env::var("BACKGROUND_RETRY_MAX_ATTEMPTS") {
            if let Ok(val) = attempts.parse() {
                config.retry.max_attempts = val;
            }
        }
        
        if let Ok(delay) = std::env::var("BACKGROUND_RETRY_INITIAL_DELAY_SECONDS") {
            if let Ok(val) = delay.parse() {
                config.retry.initial_delay_seconds = val;
            }
        }
        
        // Processing limits
        if let Ok(max_emails) = std::env::var("BACKGROUND_MAX_EMAILS_PER_RUN") {
            if let Ok(val) = max_emails.parse() {
                config.limits.max_emails_per_run = val;
            }
        }
        
        if let Ok(max_time) = std::env::var("BACKGROUND_MAX_PROCESSING_TIME_SECONDS") {
            if let Ok(val) = max_time.parse() {
                config.limits.max_processing_time_seconds = val;
            }
        }
        
        if let Ok(max_age) = std::env::var("BACKGROUND_MAX_EMAIL_AGE_DAYS") {
            if let Ok(val) = max_age.parse() {
                config.limits.max_email_age_days = val;
            }
        }
        
        config
    }
    
    /// Get global processing interval as Duration
    pub fn global_interval(&self) -> Duration {
        Duration::from_secs(self.global_interval_minutes * 60)
    }
    
    /// Get per-account processing interval as Duration
    pub fn per_account_interval(&self) -> Duration {
        Duration::from_secs(self.per_account_interval_minutes * 60)
    }
    
    /// Get initial retry delay as Duration
    #[allow(dead_code)]
    pub fn initial_retry_delay(&self) -> Duration {
        Duration::from_secs(self.retry.initial_delay_seconds)
    }
    
    /// Get maximum retry delay as Duration
    #[allow(dead_code)]
    pub fn max_retry_delay(&self) -> Duration {
        Duration::from_secs(self.retry.max_delay_seconds)
    }
    
    /// Get maximum processing time as Duration
    pub fn max_processing_time(&self) -> Duration {
        Duration::from_secs(self.limits.max_processing_time_seconds)
    }
    
    /// Calculate retry delay for given attempt number
    pub fn calculate_retry_delay(&self, attempt: u32) -> Duration {
        let delay_seconds = self.retry.initial_delay_seconds as f64 
            * self.retry.backoff_multiplier.powi(attempt as i32);
        
        let delay_seconds = delay_seconds.min(self.retry.max_delay_seconds as f64) as u64;
        Duration::from_secs(delay_seconds)
    }
    
    /// Validate configuration values
    pub fn validate(&self) -> anyhow::Result<()> {
        if self.global_interval_minutes == 0 {
            return Err(anyhow::anyhow!("global_interval_minutes must be greater than 0"));
        }
        
        if self.per_account_interval_minutes == 0 {
            return Err(anyhow::anyhow!("per_account_interval_minutes must be greater than 0"));
        }
        
        if self.max_concurrent_accounts == 0 {
            return Err(anyhow::anyhow!("max_concurrent_accounts must be greater than 0"));
        }
        
        if self.retry.max_attempts == 0 {
            return Err(anyhow::anyhow!("retry max_attempts must be greater than 0"));
        }
        
        if self.retry.backoff_multiplier <= 1.0 {
            return Err(anyhow::anyhow!("retry backoff_multiplier must be greater than 1.0"));
        }
        
        if self.limits.max_emails_per_run == 0 {
            return Err(anyhow::anyhow!("max_emails_per_run must be greater than 0"));
        }
        
        if self.limits.max_processing_time_seconds == 0 {
            return Err(anyhow::anyhow!("max_processing_time_seconds must be greater than 0"));
        }
        
        Ok(())
    }
}