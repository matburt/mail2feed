use crate::api::AppState;
use crate::db::{
    models::NewEmailRule,
    operations_generic::{EmailRuleOpsGeneric, ImapAccountOpsGeneric},
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

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
    pub post_process_action: Option<String>, // Optional - inherits from account if not provided
    pub move_to_folder: Option<String>,
    #[serde(default)]
    pub inherit_account_defaults: bool, // If true, ignore post_process_action and move_to_folder
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
    pub post_process_action: Option<String>, // Optional - inherits from account if not provided
    pub move_to_folder: Option<String>,
    #[serde(default)]
    pub inherit_account_defaults: bool, // If true, ignore post_process_action and move_to_folder
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    error: String,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/email-rules", get(list_rules).post(create_rule))
        .route(
            "/api/email-rules/:id",
            get(get_rule).put(update_rule).delete(delete_rule),
        )
}

async fn list_rules(State(state): State<AppState>) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, 
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match EmailRuleOpsGeneric::get_all(&mut conn) {
        Ok(rules) => Json(rules).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to fetch rules: {}", e) })).into_response(),
    }
}

async fn create_rule(
    State(state): State<AppState>,
    Json(req): Json<CreateEmailRuleRequest>,
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let new_rule = if req.inherit_account_defaults {
        // Get the account to inherit defaults
        match ImapAccountOpsGeneric::get_by_id(&state.pool, &req.imap_account_id) {
            Ok(account) => {
                NewEmailRule::from_account_defaults(
                    req.name,
                    &account,
                    req.folder,
                    req.to_address,
                    req.from_address,
                    req.subject_contains,
                    req.label,
                    req.is_active,
                )
            }
            Err(e) => return (StatusCode::BAD_REQUEST,
                Json(ErrorResponse { error: format!("Invalid account ID: {}", e) })).into_response(),
        }
    } else {
        // Use provided values or defaults
        NewEmailRule::with_defaults(
            req.name,
            req.imap_account_id,
            req.folder,
            req.to_address,
            req.from_address,
            req.subject_contains,
            req.label,
            req.is_active,
            req.post_process_action.unwrap_or_else(|| "mark_read".to_string()),
            req.move_to_folder,
        )
    };

    match EmailRuleOpsGeneric::create(&state.pool, &new_rule) {
        Ok(rule) => (StatusCode::CREATED, Json(rule)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to create rule: {}", e) })).into_response(),
    }
}

async fn get_rule(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match EmailRuleOpsGeneric::get_by_id(&state.pool, &id) {
        Ok(rule) => Json(rule).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Rule not found: {}", e) })).into_response(),
    }
}

async fn update_rule(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(req): Json<UpdateEmailRuleRequest>,
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let updated_rule = if req.inherit_account_defaults {
        // Get the account to inherit defaults
        match ImapAccountOpsGeneric::get_by_id(&state.pool, &req.imap_account_id) {
            Ok(account) => {
                NewEmailRule::from_account_defaults(
                    req.name,
                    &account,
                    req.folder,
                    req.to_address,
                    req.from_address,
                    req.subject_contains,
                    req.label,
                    req.is_active,
                )
            }
            Err(e) => return (StatusCode::BAD_REQUEST,
                Json(ErrorResponse { error: format!("Invalid account ID: {}", e) })).into_response(),
        }
    } else {
        // Use provided values or defaults
        NewEmailRule::with_defaults(
            req.name,
            req.imap_account_id,
            req.folder,
            req.to_address,
            req.from_address,
            req.subject_contains,
            req.label,
            req.is_active,
            req.post_process_action.unwrap_or_else(|| "mark_read".to_string()),
            req.move_to_folder,
        )
    };

    match EmailRuleOpsGeneric::update(&state.pool, &id, &updated_rule) {
        Ok(rule) => Json(rule).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to update rule: {}", e) })).into_response(),
    }
}

async fn delete_rule(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Response {
    let mut conn = match state.pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match EmailRuleOpsGeneric::delete(&state.pool, &id) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to delete rule: {}", e) })).into_response(),
    }
}
