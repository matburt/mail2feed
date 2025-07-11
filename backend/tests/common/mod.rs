use diesel::prelude::*;
use diesel::sqlite::SqliteConnection;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use mail2feed_backend::db::DbPool;
use diesel::r2d2::{ConnectionManager, Pool};
use std::env;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub fn setup_test_db() -> DbPool {
    env::set_var("DATABASE_URL", ":memory:");
    
    let manager = ConnectionManager::<SqliteConnection>::new(":memory:");
    let pool = Pool::builder()
        .max_size(1)
        .build(manager)
        .expect("Failed to create test pool");
    
    let mut conn = pool.get().expect("Failed to get connection");
    
    // Enable foreign key constraints in SQLite
    diesel::sql_query("PRAGMA foreign_keys = ON")
        .execute(&mut *conn)
        .expect("Failed to enable foreign keys");
    
    conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");
    
    pool
}

pub fn _cleanup_test_db(_pool: DbPool) {
    // Connection pool will be dropped automatically
}