#!/bin/bash

# Mail2Feed PostgreSQL Development Server Script
set -e

echo "🚀 Starting Mail2Feed development server with PostgreSQL..."

# Change to project root directory
cd "$(dirname "$0")/.."

# Ensure PostgreSQL is running
echo "📦 Ensuring PostgreSQL is running..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
timeout=30
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T postgres pg_isready -U mail2feed_user -d mail2feed &> /dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ PostgreSQL failed to start within 30 seconds"
    exit 1
fi

# Start backend with PostgreSQL
cd backend
export DATABASE_URL="postgresql://mail2feed_user:mail2feed_pass@localhost:5432/mail2feed"
export RUST_LOG=debug

echo "🔧 Building and starting backend with PostgreSQL support..."
echo "📊 Using DATABASE_URL: $DATABASE_URL"

# Build with PostgreSQL features enabled
cargo build --features postgres

# Run the server
cargo run --features postgres

echo "🎉 Development server stopped."