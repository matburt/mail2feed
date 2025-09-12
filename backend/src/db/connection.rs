use diesel::prelude::*;
use diesel::r2d2::{ConnectionManager, Pool};
use diesel::Connection;
use dotenvy::dotenv;
use std::env;
use anyhow::Result;

#[derive(Debug, Clone)]
pub enum DatabaseType {
    SQLite,
    PostgreSQL,
}

#[derive(Clone)]
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

// Connection type alias for compatibility with existing code
pub type SqliteConnection = diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<diesel::sqlite::SqliteConnection>>;

#[cfg(feature = "postgres")]
pub type PostgresConnection = diesel::r2d2::PooledConnection<diesel::r2d2::ConnectionManager<diesel::pg::PgConnection>>;

// Connection enum for generic handling
pub enum DatabaseConnection {
    SQLite(SqliteConnection),
    #[cfg(feature = "postgres")]
    PostgreSQL(PostgresConnection),
}

// Helper methods for DatabasePool compatibility
impl DatabasePool {
    /// Get a connection from the pool - returns appropriate connection type
    /// This provides compatibility with existing `.get()` calls
    pub fn get(&self) -> Result<DatabaseConnection> {
        match self {
            DatabasePool::SQLite(pool) => {
                Ok(DatabaseConnection::SQLite(pool.get()?))
            }
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(pool) => {
                Ok(DatabaseConnection::PostgreSQL(pool.get()?))
            }
        }
    }

    /// Get the database type for this pool
    pub fn database_type(&self) -> DatabaseType {
        match self {
            DatabasePool::SQLite(_) => DatabaseType::SQLite,
            #[cfg(feature = "postgres")]
            DatabasePool::PostgreSQL(_) => DatabaseType::PostgreSQL,
        }
    }
    
    /// Get SQLite pool (only if this is a SQLite database)
    pub fn as_sqlite_pool(&self) -> Result<&Pool<ConnectionManager<diesel::sqlite::SqliteConnection>>> {
        match self {
            DatabasePool::SQLite(pool) => Ok(pool),
            _ => Err(anyhow::anyhow!("Expected SQLite database but found PostgreSQL"))
        }
    }
    
    /// Get PostgreSQL pool (only if this is a PostgreSQL database)
    #[cfg(feature = "postgres")]
    pub fn as_postgres_pool(&self) -> Result<&Pool<ConnectionManager<diesel::pg::PgConnection>>> {
        match self {
            DatabasePool::PostgreSQL(pool) => Ok(pool),
            _ => Err(anyhow::anyhow!("Expected PostgreSQL database but found SQLite"))
        }
    }
}