use axum::{
    routing::{get, patch}, 
    Router, Json, extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Response}
};
use serde::{Deserialize, Serialize};
use crate::api::AppState;
use crate::db::{operations::{FeedOps, FeedItemOps}, models::NewFeed};
use crate::feed::generator::FeedGenerator;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFeedRequest {
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub email_rule_id: String,
    pub feed_type: String,
    pub is_active: bool,
    pub max_items: Option<i32>,
    pub max_age_days: Option<i32>,
    pub min_items: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFeedRequest {
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub email_rule_id: String,
    pub feed_type: String,
    pub is_active: bool,
    pub max_items: Option<i32>,
    pub max_age_days: Option<i32>,
    pub min_items: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct FeedItemsQuery {
    limit: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedItemMetadata {
    pub id: String,
    pub title: String,
    pub pub_date: String,
    pub author: Option<String>,
    pub is_read: Option<bool>,
    pub starred: Option<bool>,
    pub body_size: Option<i32>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFeedItemRequest {
    pub is_read: Option<bool>,
    pub starred: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    error: String,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/feeds", get(list_feeds).post(create_feed))
        .route("/api/feeds/:id", get(get_feed).put(update_feed).delete(delete_feed))
        .route("/api/feeds/:id/items", get(get_feed_items))
        .route("/api/feeds/:id/items/metadata", get(get_feed_items_metadata))
        .route("/api/feed-items/:id", patch(update_feed_item))
        .route("/feeds/:id/rss", get(get_rss_feed))
        .route("/feeds/:id/atom", get(get_atom_feed))
}

async fn list_feeds(State(state): State<AppState>) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, 
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match FeedOps::get_all(&mut conn) {
        Ok(feeds) => Json(feeds).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to fetch feeds: {}", e) })).into_response(),
    }
}

async fn create_feed(
    State(state): State<AppState>,
    Json(req): Json<CreateFeedRequest>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let new_feed = NewFeed::with_retention(
        req.title,
        req.description,
        req.link,
        req.email_rule_id,
        req.feed_type,
        req.is_active,
        req.max_items,
        req.max_age_days,
        req.min_items,
    );

    match FeedOps::create(&mut conn, &new_feed) {
        Ok(feed) => (StatusCode::CREATED, Json(feed)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to create feed: {}", e) })).into_response(),
    }
}

async fn get_feed(
    State(state): State<AppState>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match FeedOps::get_by_id(&mut conn, &id) {
        Ok(feed) => Json(feed).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Feed not found: {}", e) })).into_response(),
    }
}

async fn update_feed(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateFeedRequest>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let updated_feed = NewFeed::with_retention(
        req.title,
        req.description,
        req.link,
        req.email_rule_id,
        req.feed_type,
        req.is_active,
        req.max_items,
        req.max_age_days,
        req.min_items,
    );

    match FeedOps::update(&mut conn, &id, &updated_feed) {
        Ok(feed) => Json(feed).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to update feed: {}", e) })).into_response(),
    }
}

async fn delete_feed(
    State(state): State<AppState>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match FeedOps::delete(&mut conn, &id) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to delete feed: {}", e) })).into_response(),
    }
}

async fn get_feed_items(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<FeedItemsQuery>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match FeedItemOps::get_by_feed_id(&mut conn, &id, params.limit) {
        Ok(items) => Json(items).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to fetch feed items: {}", e) })).into_response(),
    }
}

// Helper function to get feed data and items
async fn get_feed_data(state: &AppState, id: &str) -> Result<(crate::db::models::Feed, Vec<crate::db::models::FeedItem>), Response> {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response()),
    };

    // Get the feed metadata
    let feed = match FeedOps::get_by_id(&mut conn, id) {
        Ok(feed) => feed,
        Err(e) => {
            // Check if it's a not found error by checking the error message
            let error_msg = e.to_string();
            if error_msg.contains("not found") || error_msg.contains("NotFound") {
                return Err((StatusCode::NOT_FOUND,
                    Json(ErrorResponse { error: format!("Feed with ID '{}' not found", id) })).into_response());
            } else {
                return Err((StatusCode::INTERNAL_SERVER_ERROR,
                    Json(ErrorResponse { error: format!("Database error retrieving feed: {}", e) })).into_response());
            }
        }
    };

    // Get feed items (limit to most recent items, configurable via env var)
    let item_limit = std::env::var("FEED_ITEM_LIMIT")
        .unwrap_or_else(|_| "50".to_string())
        .parse::<i64>()
        .unwrap_or(50);
    let items = match FeedItemOps::get_by_feed_id(&mut conn, id, Some(item_limit)) {
        Ok(items) => items,
        Err(e) => return Err((StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to fetch feed items: {}", e) })).into_response()),
    };

    Ok((feed, items))
}

async fn get_rss_feed(
    State(state): State<AppState>,
    Path(id): Path<String>
) -> Response {
    let (feed, items) = match get_feed_data(&state, &id).await {
        Ok(data) => data,
        Err(error_response) => return error_response,
    };

    // Generate RSS feed
    match FeedGenerator::generate_rss(&feed, &items) {
        Ok(rss_content) => {
            let cache_duration = get_cache_duration();
            (StatusCode::OK, [
                ("content-type", "application/rss+xml; charset=utf-8"),
                ("cache-control", &format!("public, max-age={}", cache_duration)),
            ], rss_content).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to generate RSS feed: {}", e) })).into_response(),
    }
}

// Helper function to get cache duration from environment
fn get_cache_duration() -> String {
    std::env::var("FEED_CACHE_DURATION")
        .unwrap_or_else(|_| "300".to_string())
}

async fn get_atom_feed(
    State(state): State<AppState>,
    Path(id): Path<String>
) -> Response {
    let (feed, items) = match get_feed_data(&state, &id).await {
        Ok(data) => data,
        Err(error_response) => return error_response,
    };

    // Generate Atom feed
    match FeedGenerator::generate_atom(&feed, &items) {
        Ok(atom_content) => {
            let cache_duration = get_cache_duration();
            (StatusCode::OK, [
                ("content-type", "application/atom+xml; charset=utf-8"),
                ("cache-control", &format!("public, max-age={}", cache_duration)),
            ], atom_content).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to generate Atom feed: {}", e) })).into_response(),
    }
}

/// Get feed items metadata for management UI
async fn get_feed_items_metadata(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(params): Query<FeedItemsQuery>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };
    
    match FeedItemOps::get_by_feed_id(&mut conn, &id, params.limit) {
        Ok(items) => {
            let metadata: Vec<FeedItemMetadata> = items.into_iter().map(|item| {
                FeedItemMetadata {
                    id: item.id.unwrap_or_else(|| "unknown".to_string()),
                    title: item.title,
                    pub_date: item.pub_date,
                    author: item.author,
                    is_read: item.is_read,
                    starred: item.starred,
                    body_size: item.body_size,
                    created_at: item.created_at,
                }
            }).collect();
            Json(metadata).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to fetch feed items metadata: {}", e) })).into_response(),
    }
}

/// Update feed item metadata (read status, starred, etc.)
async fn update_feed_item(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(payload): Json<UpdateFeedItemRequest>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };
    
    // Get the existing item
    let mut item = match FeedItemOps::get_by_id(&mut conn, &id) {
        Ok(item) => item,
        Err(e) => return (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Feed item not found: {}", e) })).into_response(),
    };
    
    // Update the metadata fields
    if let Some(is_read) = payload.is_read {
        item.is_read = Some(is_read);
    }
    if let Some(starred) = payload.starred {
        item.starred = Some(starred);
    }
    
    // Save the updated item (this requires implementing an update method)
    match update_feed_item_metadata(&mut conn, &item) {
        Ok(_) => (StatusCode::OK, Json(item)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to update feed item: {}", e) })).into_response(),
    }
}

/// Helper function to update feed item metadata
fn update_feed_item_metadata(
    conn: &mut diesel::SqliteConnection,
    item: &crate::db::models::FeedItem
) -> anyhow::Result<()> {
    use crate::db::schema::feed_items::dsl::*;
    use diesel::prelude::*;
    
    let item_id = item.id.as_ref()
        .ok_or_else(|| anyhow::anyhow!("Item has no ID"))?;
    
    diesel::update(feed_items.filter(id.eq(item_id)))
        .set((
            is_read.eq(&item.is_read),
            starred.eq(&item.starred),
        ))
        .execute(conn)
        .map_err(|e| anyhow::anyhow!("Failed to update feed item: {}", e))?;
        
    Ok(())
}