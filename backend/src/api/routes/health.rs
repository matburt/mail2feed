use axum::{routing::get, Router, Json, extract::State};
use serde::Serialize;
use chrono::Utc;
use crate::db::DbPool;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    version: String,
    timestamp: String,
    database: String,
}

pub fn routes() -> Router<DbPool> {
    Router::new().route("/health", get(health_check))
}

async fn health_check(State(pool): State<DbPool>) -> Json<HealthResponse> {
    let db_status = match pool.get() {
        Ok(_) => "connected",
        Err(_) => "disconnected",
    };

    Json(HealthResponse {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: Utc::now().to_rfc3339(),
        database: db_status.to_string(),
    })
}