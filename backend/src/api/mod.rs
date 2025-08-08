pub mod routes;

use axum::Router;
use crate::{background::BackgroundServiceHandle, db::DbPool};

#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub background: BackgroundServiceHandle,
}

pub fn create_routes(pool: DbPool, background_handle: BackgroundServiceHandle) -> Router {
    let state = AppState {
        pool,
        background: background_handle,
    };
    
    Router::new()
        .merge(routes::health::routes())
        .merge(routes::imap_accounts::routes())
        .merge(routes::email_rules::routes())
        .merge(routes::feeds::routes())
        .merge(routes::imap_operations::routes())
        .merge(routes::background::routes())
        .with_state(state)
}