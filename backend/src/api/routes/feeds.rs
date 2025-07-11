use axum::{
    routing::{delete, get, post, put}, 
    Router, Json, extract::{State, Path, Query},
    http::StatusCode,
    response::{IntoResponse, Response}
};
use serde::{Deserialize, Serialize};
use crate::db::{DbPool, operations::{FeedOps, FeedItemOps}, models::NewFeed};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFeedRequest {
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub email_rule_id: String,
    pub feed_type: String,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFeedRequest {
    pub title: String,
    pub description: Option<String>,
    pub link: Option<String>,
    pub email_rule_id: String,
    pub feed_type: String,
    pub is_active: bool,
}

#[derive(Debug, Deserialize)]
pub struct FeedItemsQuery {
    limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    error: String,
}

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/api/feeds", get(list_feeds).post(create_feed))
        .route("/api/feeds/:id", get(get_feed).put(update_feed).delete(delete_feed))
        .route("/api/feeds/:id/items", get(get_feed_items))
        .route("/feeds/:id/rss", get(get_rss_feed))
        .route("/feeds/:id/atom", get(get_atom_feed))
}

async fn list_feeds(State(pool): State<DbPool>) -> Response {
    let mut conn = match pool.get() {
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
    State(pool): State<DbPool>,
    Json(req): Json<CreateFeedRequest>
) -> Response {
    let mut conn = match pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let new_feed = NewFeed::new(
        req.title,
        req.description,
        req.link,
        req.email_rule_id,
        req.feed_type,
        req.is_active,
    );

    match FeedOps::create(&mut conn, &new_feed) {
        Ok(feed) => (StatusCode::CREATED, Json(feed)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to create feed: {}", e) })).into_response(),
    }
}

async fn get_feed(
    State(pool): State<DbPool>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match pool.get() {
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
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(req): Json<UpdateFeedRequest>
) -> Response {
    let mut conn = match pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let updated_feed = NewFeed::new(
        req.title,
        req.description,
        req.link,
        req.email_rule_id,
        req.feed_type,
        req.is_active,
    );

    match FeedOps::update(&mut conn, &id, &updated_feed) {
        Ok(feed) => Json(feed).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to update feed: {}", e) })).into_response(),
    }
}

async fn delete_feed(
    State(pool): State<DbPool>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match pool.get() {
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
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Query(params): Query<FeedItemsQuery>
) -> Response {
    let mut conn = match pool.get() {
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

async fn get_rss_feed(
    State(_pool): State<DbPool>,
    Path(_id): Path<String>
) -> Response {
    (StatusCode::NOT_IMPLEMENTED,
        Json(ErrorResponse { error: "RSS feed generation not yet implemented".to_string() })).into_response()
}

async fn get_atom_feed(
    State(_pool): State<DbPool>,
    Path(_id): Path<String>
) -> Response {
    (StatusCode::NOT_IMPLEMENTED,
        Json(ErrorResponse { error: "Atom feed generation not yet implemented".to_string() })).into_response()
}