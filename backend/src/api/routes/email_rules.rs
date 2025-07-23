use axum::{
    routing::get, 
    Router, Json, extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Response}
};
use serde::{Deserialize, Serialize};
use crate::api::AppState;
use crate::db::{operations::EmailRuleOps, models::NewEmailRule};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateEmailRuleRequest {
    pub name: String,
    pub imap_account_id: String,
    pub folder: String,
    pub to_address: Option<String>,
    pub from_address: Option<String>,
    pub subject_contains: Option<String>,
    pub label: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateEmailRuleRequest {
    pub name: String,
    pub imap_account_id: String,
    pub folder: String,
    pub to_address: Option<String>,
    pub from_address: Option<String>,
    pub subject_contains: Option<String>,
    pub label: Option<String>,
    pub is_active: bool,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    error: String,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/email-rules", get(list_rules).post(create_rule))
        .route("/api/email-rules/:id", get(get_rule).put(update_rule).delete(delete_rule))
}

async fn list_rules(State(state): State<AppState>) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, 
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match EmailRuleOps::get_all(&mut conn) {
        Ok(rules) => Json(rules).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to fetch rules: {}", e) })).into_response(),
    }
}

async fn create_rule(
    State(state): State<AppState>,
    Json(req): Json<CreateEmailRuleRequest>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let new_rule = NewEmailRule::new(
        req.name,
        req.imap_account_id,
        req.folder,
        req.to_address,
        req.from_address,
        req.subject_contains,
        req.label,
        req.is_active,
    );

    match EmailRuleOps::create(&mut conn, &new_rule) {
        Ok(rule) => (StatusCode::CREATED, Json(rule)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to create rule: {}", e) })).into_response(),
    }
}

async fn get_rule(
    State(state): State<AppState>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match EmailRuleOps::get_by_id(&mut conn, &id) {
        Ok(rule) => Json(rule).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Rule not found: {}", e) })).into_response(),
    }
}

async fn update_rule(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateEmailRuleRequest>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let updated_rule = NewEmailRule::new(
        req.name,
        req.imap_account_id,
        req.folder,
        req.to_address,
        req.from_address,
        req.subject_contains,
        req.label,
        req.is_active,
    );

    match EmailRuleOps::update(&mut conn, &id, &updated_rule) {
        Ok(rule) => Json(rule).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to update rule: {}", e) })).into_response(),
    }
}

async fn delete_rule(
    State(state): State<AppState>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match EmailRuleOps::delete(&mut conn, &id) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to delete rule: {}", e) })).into_response(),
    }
}