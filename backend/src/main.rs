mod api;
mod db;
mod feed;
mod imap;

use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};
use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{CorsLayer, Any};
use tracing::info;
use tracing_subscriber;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();
    tracing_subscriber::fmt::init();
    
    info!("Mail2Feed Backend Starting...");
    
    // Run database migrations
    let mut connection = db::establish_connection();
    connection.run_pending_migrations(MIGRATIONS)
        .map_err(|e| anyhow::anyhow!("Failed to run migrations: {}", e))?;
    
    info!("Database initialized successfully!");
    
    // Create database pool
    let pool = db::create_pool()
        .map_err(|e| anyhow::anyhow!("Failed to create database pool: {}", e))?;
    
    info!("Database pool created successfully!");
    
    // Background service temporarily disabled for AppState migration
    
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
    let app = api::create_routes(pool, background_handle)
        .layer(cors.allow_headers(Any).allow_methods(Any));
    
    // Start the server
    let addr = SocketAddr::from((host.parse::<std::net::IpAddr>()
        .unwrap_or_else(|_| "127.0.0.1".parse().unwrap()), port));
    
    info!("Server listening on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .map_err(|e| anyhow::anyhow!("Server error: {}", e))?;
    
    Ok(())
}
