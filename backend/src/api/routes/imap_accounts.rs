use axum::{
    routing::{delete, get, post, put}, 
    Router, Json, extract::{State, Path},
    http::StatusCode,
    response::{IntoResponse, Response}
};
use serde::{Deserialize, Serialize};
use crate::db::{DbPool, operations::ImapAccountOps, models::NewImapAccount};

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateImapAccountRequest {
    pub name: String,
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub use_tls: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateImapAccountRequest {
    pub name: String,
    pub host: String,
    pub port: i32,
    pub username: String,
    pub password: String,
    pub use_tls: bool,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    error: String,
}

pub fn routes() -> Router<DbPool> {
    Router::new()
        .route("/api/imap-accounts", get(list_accounts).post(create_account))
        .route("/api/imap-accounts/:id", get(get_account).put(update_account).delete(delete_account))
}

async fn list_accounts(State(pool): State<DbPool>) -> Response {
    let mut conn = match pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, 
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match ImapAccountOps::get_all(&mut conn) {
        Ok(accounts) => Json(accounts).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to fetch accounts: {}", e) })).into_response(),
    }
}

async fn create_account(
    State(pool): State<DbPool>,
    Json(req): Json<CreateImapAccountRequest>
) -> Response {
    let mut conn = match pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let new_account = NewImapAccount::new(
        req.name,
        req.host,
        req.port,
        req.username,
        req.password,
        req.use_tls,
    );

    match ImapAccountOps::create(&mut conn, &new_account) {
        Ok(account) => (StatusCode::CREATED, Json(account)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Failed to create account: {}", e) })).into_response(),
    }
}

async fn get_account(
    State(pool): State<DbPool>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match ImapAccountOps::get_by_id(&mut conn, &id) {
        Ok(account) => Json(account).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Account not found: {}", e) })).into_response(),
    }
}

async fn update_account(
    State(pool): State<DbPool>,
    Path(id): Path<String>,
    Json(req): Json<UpdateImapAccountRequest>
) -> Response {
    let mut conn = match pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    let updated_account = NewImapAccount::new(
        req.name,
        req.host,
        req.port,
        req.username,
        req.password,
        req.use_tls,
    );

    match ImapAccountOps::update(&mut conn, &id, &updated_account) {
        Ok(account) => Json(account).into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to update account: {}", e) })).into_response(),
    }
}

async fn delete_account(
    State(pool): State<DbPool>,
    Path(id): Path<String>
) -> Response {
    let mut conn = match pool.get() {
        Ok(conn) => conn,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse { error: format!("Database connection error: {}", e) })).into_response(),
    };

    match ImapAccountOps::delete(&mut conn, &id) {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::NOT_FOUND,
            Json(ErrorResponse { error: format!("Failed to delete account: {}", e) })).into_response(),
    }
}