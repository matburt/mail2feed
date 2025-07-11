#!/bin/bash

# Mail2Feed Development Server Script
# Starts the backend development server with hot reloading

set -e

echo "🚀 Starting Mail2Feed development server..."

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Error: Please run this script from the mail2feed root directory"
    exit 1
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: Backend directory not found"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found. Run ./scripts/setup.sh first"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "🔧 Configuration:"
echo "   Database: $DATABASE_URL"
echo "   Server: $SERVER_HOST:$SERVER_PORT"
echo "   Log Level: $RUST_LOG"
echo ""

# Check if cargo-watch is installed for hot reloading
if command -v cargo-watch &> /dev/null; then
    echo "🔄 Starting development server with hot reloading..."
    echo "   Server will restart automatically when files change"
    echo "   Press Ctrl+C to stop"
    echo ""
    cargo watch -x run
else
    echo "ℹ️  cargo-watch not found. Install it for hot reloading:"
    echo "   cargo install cargo-watch"
    echo ""
    echo "🏃 Starting development server..."
    echo "   Press Ctrl+C to stop"
    echo ""
    cargo run
fi