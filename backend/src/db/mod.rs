pub mod schema;
pub mod models;
pub mod operations;
pub mod connection;
pub mod operations_generic;
#[cfg(feature = "postgres")]
pub mod operations_pg;

// Re-export for backward compatibility
pub use connection::{DbPool, establish_connection, create_sqlite_pool as create_pool};