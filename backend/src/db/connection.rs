use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use dotenvy::dotenv;
use std::env;
use anyhow::Result;

#[derive(Debug, Clone)]
pub enum DatabaseType {
    SQLite,
    PostgreSQL,
}

pub enum DatabasePool {
    SQLite(Pool<ConnectionManager<diesel::sqlite::SqliteConnection>>),
    #[cfg(feature = "postgres")]
    PostgreSQL(Pool<ConnectionManager<diesel::pg::PgConnection>>),
}

impl DatabaseType {
    pub fn from_url(database_url: &str) -> Self {
        if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
            DatabaseType::PostgreSQL
        } else {
            DatabaseType::SQLite
        }
    }
}

pub fn detect_database_type() -> DatabaseType {
    dotenv().ok();
    
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    DatabaseType::from_url(&database_url)
}

pub fn create_pool() -> Result<DatabasePool> {
    dotenv().ok();
    
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let db_type = DatabaseType::from_url(&database_url);
    
    match db_type {
        DatabaseType::SQLite => {
            let manager = ConnectionManager::<diesel::sqlite::SqliteConnection>::new(database_url);
            let pool = Pool::builder()
                .build(manager)
                .map_err(|e| anyhow::anyhow!("Failed to create SQLite database pool: {}", e))?;
            Ok(DatabasePool::SQLite(pool))
        }
        DatabaseType::PostgreSQL => {
            #[cfg(feature = "postgres")]
            {
                let manager = ConnectionManager::<diesel::pg::PgConnection>::new(database_url);
                let pool = Pool::builder()
                    .build(manager)
                    .map_err(|e| anyhow::anyhow!("Failed to create PostgreSQL database pool: {}", e))?;
                Ok(DatabasePool::PostgreSQL(pool))
            }
            #[cfg(not(feature = "postgres"))]
            {
                Err(anyhow::anyhow!("PostgreSQL support not compiled in"))
            }
        }
    }
}

// Legacy compatibility functions for existing code
pub type DbPool = Pool<ConnectionManager<diesel::sqlite::SqliteConnection>>;

pub fn establish_connection() -> diesel::sqlite::SqliteConnection {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    diesel::sqlite::SqliteConnection::establish(&database_url)
        .unwrap_or_else(|_| panic!("Error connecting to {}", database_url))
}

pub fn create_sqlite_pool() -> Result<DbPool> {
    dotenv().ok();
    
    let database_url = env::var("DATABASE_URL")
        .expect("DATABASE_URL must be set");
    
    let manager = ConnectionManager::<diesel::sqlite::SqliteConnection>::new(database_url);
    let pool = Pool::builder()
        .build(manager)
        .map_err(|e| anyhow::anyhow!("Failed to create database pool: {}", e))?;
    
    Ok(pool)
}