use axum::{routing::get, Router, Json, extract::State};
use serde::Serialize;
use chrono::Utc;
use crate::api::AppState;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    version: String,
    timestamp: String,
    database: String,
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/health", get(health_check))
}

async fn health_check(State(state): State<AppState>) -> Json<HealthResponse> {
    let db_status = match state.pool.get() {
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