mod api;
mod background;
mod db;
mod feed;
mod imap;

use diesel::prelude::*;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tracing::{info, error};
use tracing_subscriber;
use crate::db::connection::{DatabasePool, create_pool as create_generic_pool};

pub const SQLITE_MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");
pub const POSTGRES_MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations_postgres");

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt::init();
    
    info!("Mail2Feed Backend Starting...");
    
    // Run database migrations based on database type
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    if database_url.starts_with("postgres://") || database_url.starts_with("postgresql://") {
        // PostgreSQL database - use PostgreSQL migrations and connection
        let mut connection = diesel::pg::PgConnection::establish(&database_url)
            .map_err(|e| anyhow::anyhow!("Failed to connect to PostgreSQL: {}", e))?;
        connection.run_pending_migrations(POSTGRES_MIGRATIONS)
            .map_err(|e| anyhow::anyhow!("Failed to run PostgreSQL migrations: {}", e))?;
    } else {
        // SQLite database - use SQLite migrations and connection
        let mut connection = db::establish_connection();
        connection.run_pending_migrations(SQLITE_MIGRATIONS)
            .map_err(|e| anyhow::anyhow!("Failed to run SQLite migrations: {}", e))?;
    }
    
    info!("Database initialized successfully!");
    
    // Create database pool using proper abstraction layer
    let generic_pool = create_generic_pool()
        .map_err(|e| anyhow::anyhow!("Failed to create database pool: {}", e))?;
    
    // For compatibility with existing API routes, convert to legacy pool format
    // TODO: This should be removed once all routes use generic database operations
    let legacy_pool = generic_pool.to_legacy_pool()
        .map_err(|e| anyhow::anyhow!("Failed to create legacy pool adapter: {}", e))?;
    
    info!("Database pool created successfully!");
    
    // Initialize and start background service
    let background_config = background::BackgroundConfig::from_env();
    let background_handle = background::initialize_background_service(legacy_pool.clone(), background_config).await?;
    
    // Start background service automatically if enabled
    if let Err(e) = background::start_background_service(&background_handle).await {
        error!("Failed to start background service: {}", e);
        info!("Web server will start without background processing");
    } else {
        info!("Background service started successfully");
    }
    
    // Get server configuration from environment
    let host = env::var("SERVER_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| "3000".to_string())
        .parse::<u16>()
        .unwrap_or(3000);
    
    // Configure CORS
    let cors_origins = env::var("CORS_ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:3000".to_string());
    
    let cors = if cors_origins == "*" {
        CorsLayer::new().allow_origin(Any)
    } else {
        let origins: Vec<_> = cors_origins
            .split(',')
            .map(|s| s.trim().parse().unwrap())
            .collect();
        CorsLayer::new().allow_origin(origins)
    };
    
    // Build the application routes
    let app = api::create_routes(legacy_pool, background_handle.clone())
        .layer(cors.allow_headers(Any).allow_methods(Any));
    
    // Start the server
    let addr = SocketAddr::from((host.parse::<std::net::IpAddr>()
        .unwrap_or_else(|_| "127.0.0.1".parse().unwrap()), port));
    
    info!("Server listening on {}", addr);
    
    // Setup graceful shutdown
    let server = axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .with_graceful_shutdown(shutdown_signal());
    
    // Run server with background service cleanup
    tokio::select! {
        result = server => {
            if let Err(e) = result {
                error!("Server error: {}", e);
                return Err(anyhow::anyhow!("Server error: {}", e));
            }
        }
        _ = tokio::signal::ctrl_c() => {
            info!("Received shutdown signal");
        }
    }
    
    // Shutdown background service
    info!("Shutting down background service...");
    if let Err(e) = background::stop_background_service(&background_handle).await {
        error!("Error stopping background service: {}", e);
    } else {
        info!("Background service stopped successfully");
    }
    
    Ok(())
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C signal handler");
}
