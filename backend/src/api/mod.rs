pub mod routes;

use axum::Router;
use crate::db::DbPool;

pub fn create_routes(pool: DbPool) -> Router {
    Router::new()
        .merge(routes::health::routes())
        .merge(routes::imap_accounts::routes())
        .merge(routes::email_rules::routes())
        .merge(routes::feeds::routes())
        .merge(routes::imap_operations::routes())
        .with_state(pool)
}