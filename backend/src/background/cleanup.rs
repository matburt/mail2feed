use anyhow::Result;
use crate::db::operations;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::SqliteConnection;
use tracing::{info, warn, debug};
use chrono::{Utc, Duration};

pub struct FeedCleanupService {
    pool: Pool<ConnectionManager<SqliteConnection>>,
}

impl FeedCleanupService {
    pub fn new(pool: Pool<ConnectionManager<SqliteConnection>>) -> Self {
        Self { pool }
    }
    
    /// Run cleanup for all feeds based on their retention policies
    pub async fn cleanup_all_feeds(&self) -> Result<CleanupResult> {
        info!("Starting feed cleanup process");
        
        let mut conn = self.pool.get()
            .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
        let feeds = operations::FeedOps::get_all(&mut conn)?;
        let mut total_result = CleanupResult::default();
        
        for feed in feeds {
            match self.cleanup_feed(&feed).await {
                Ok(result) => {
                    total_result.feeds_processed += 1;
                    total_result.items_removed += result.items_removed;
                    
                    if result.items_removed > 0 {
                        info!("Cleaned up {} items from feed '{}'", result.items_removed, feed.title);
                    }
                }
                Err(e) => {
                    warn!("Failed to cleanup feed '{}': {}", feed.title, e);
                    total_result.errors += 1;
                }
            }
        }
        
        info!("Cleanup complete: {} feeds processed, {} items removed, {} errors", 
              total_result.feeds_processed, total_result.items_removed, total_result.errors);
        
        Ok(total_result)
    }
    
    /// Cleanup a specific feed based on its retention policies
    pub async fn cleanup_feed(&self, feed: &crate::db::models::Feed) -> Result<CleanupResult> {
        let feed_id = feed.id.as_ref()
            .ok_or_else(|| anyhow::anyhow!("Feed has no ID"))?;
            
        debug!("Cleaning up feed '{}' ({})", feed.title, feed_id);
        
        // Get all feed items for this feed, ordered by creation date (newest first)
        let mut conn = self.pool.get()
            .map_err(|e| anyhow::anyhow!("Failed to get database connection: {}", e))?;
        let all_items = operations::FeedItemOps::get_by_feed_id(&mut conn, feed_id, None)?;
        
        if all_items.is_empty() {
            debug!("No items to clean up in feed '{}'", feed.title);
            return Ok(CleanupResult { items_removed: 0, ..Default::default() });
        }
        
        let mut items_to_remove = Vec::new();
        let now = Utc::now();
        
        // Apply retention policies
        
        // 1. Age-based cleanup: Remove items older than max_age_days
        if let Some(max_age_days) = feed.max_age_days {
            let cutoff_date = now - Duration::days(max_age_days as i64);
            
            for item in &all_items {
                if let Ok(created_at) = chrono::DateTime::parse_from_rfc3339(&item.created_at) {
                    if created_at.with_timezone(&Utc) < cutoff_date {
                        if let Some(item_id) = &item.id {
                            items_to_remove.push(item_id.clone());
                            debug!("Item '{}' is older than {} days, marking for removal", 
                                   item.title, max_age_days);
                        }
                    }
                }
            }
        }
        
        // 2. Count-based cleanup: Keep only the newest max_items, but respect min_items
        if let Some(max_items) = feed.max_items {
            let min_items = feed.min_items.unwrap_or(0) as usize;
            let max_items = max_items as usize;
            
            if all_items.len() > max_items {
                // Calculate how many to remove, but don't go below min_items
                let target_count = max_items.max(min_items);
                let items_to_remove_by_count = all_items.len().saturating_sub(target_count);
                
                // Sort items by creation date (oldest first for removal)
                let mut sorted_items = all_items.clone();
                sorted_items.sort_by(|a, b| a.created_at.cmp(&b.created_at));
                
                // Take the oldest items for removal (but avoid duplicates with age-based removal)
                for item in sorted_items.iter().take(items_to_remove_by_count) {
                    if let Some(item_id) = &item.id {
                        if !items_to_remove.contains(item_id) {
                            items_to_remove.push(item_id.clone());
                            debug!("Item '{}' exceeds max_items limit, marking for removal", item.title);
                        }
                    }
                }
            }
        }
        
        // Ensure we don't remove more than we should based on min_items constraint
        if let Some(min_items) = feed.min_items {
            let min_items = min_items as usize;
            let items_after_removal = all_items.len().saturating_sub(items_to_remove.len());
            
            if items_after_removal < min_items {
                let excess_removals = min_items - items_after_removal;
                items_to_remove.truncate(items_to_remove.len().saturating_sub(excess_removals));
                debug!("Adjusted removal count to respect min_items constraint of {}", min_items);
            }
        }
        
        // Actually remove the items
        let mut removed_count = 0;
        for item_id in items_to_remove {
            match operations::FeedItemOps::delete(&mut conn, &item_id) {
                Ok(_) => {
                    removed_count += 1;
                    debug!("Removed feed item: {}", item_id);
                }
                Err(e) => {
                    warn!("Failed to remove feed item {}: {}", item_id, e);
                }
            }
        }
        
        Ok(CleanupResult {
            feeds_processed: 1,
            items_removed: removed_count,
            errors: 0,
        })
    }
}

#[derive(Debug, Default)]
pub struct CleanupResult {
    pub feeds_processed: usize,
    pub items_removed: usize,
    pub errors: usize,
}