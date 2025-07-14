#!/bin/bash

# Mail2Feed Development Setup Script
# This script sets up the development environment for the mail2feed project

set -e  # Exit on any error

echo "🚀 Setting up Mail2Feed development environment..."

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Error: Please run this script from the mail2feed root directory"
    exit 1
fi

# Check required tools
echo "📋 Checking required tools..."

# Check Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi

# Check Cargo
if ! command -v cargo &> /dev/null; then
    echo "❌ Cargo is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi

# Check Node.js (for future frontend development)
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js is not installed. It will be needed for frontend development."
    echo "   You can install it from https://nodejs.org/"
fi

# Check SQLite3
if ! command -v sqlite3 &> /dev/null; then
    echo "⚠️  SQLite3 is not installed. Installing..."
    if command -v apt-get &> /dev/null; then
        sudo apt-get update && sudo apt-get install -y sqlite3 libsqlite3-dev
    elif command -v brew &> /dev/null; then
        brew install sqlite3
    else
        echo "❌ Please install SQLite3 manually"
        exit 1
    fi
fi

echo "✅ All required tools are available"

# Setup backend
echo "🦀 Setting up Rust backend..."
cd backend

# Install diesel CLI if not present
if ! command -v diesel &> /dev/null; then
    echo "📦 Installing Diesel CLI..."
    cargo install diesel_cli --no-default-features --features sqlite
fi

# Ensure cargo bin directory is in PATH
export PATH="$HOME/.cargo/bin:$PATH"

# Verify diesel is now available
if ! command -v diesel &> /dev/null; then
    echo "❌ Diesel CLI installation failed or not in PATH"
    echo "   Please ensure ~/.cargo/bin is in your PATH"
    exit 1
fi

# Get absolute path to data directory for consistent use
DATA_DIR=$(realpath ../data)

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database configuration  
DATABASE_URL=sqlite:${DATA_DIR}/mail2feed.db

# Server configuration
SERVER_HOST=127.0.0.1
SERVER_PORT=3001

# Logging configuration
RUST_LOG=info,mail2feed_backend=debug

# Feed configuration (optional)
FEED_ITEM_LIMIT=50
FEED_CACHE_DURATION=300
EOF
    echo "✅ Created .env file with absolute database path"
else
    echo "✅ .env file already exists"
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p ../data
echo "✅ Data directory created"

# Setup database
echo "🗄️  Setting up database..."
# Note: For diesel CLI, we don't use the sqlite: prefix in DATABASE_URL
export DATABASE_URL="${DATA_DIR}/mail2feed.db"
echo "📝 Database URL: ${DATABASE_URL}"

# Use diesel setup to create database and run migrations
echo "🔄 Setting up database with diesel..."
diesel setup
if [ $? -eq 0 ]; then
    echo "✅ Database setup completed successfully"
else
    echo "❌ Database setup failed with diesel setup. Trying manual approach..."
    # Create the database file manually if diesel setup failed
    if [ ! -f "${DATA_DIR}/mail2feed.db" ]; then
        echo "📋 Creating database file manually..."
        sqlite3 "${DATA_DIR}/mail2feed.db" "SELECT 1;"
    fi
    
    # Try running migrations
    diesel migration run
    if [ $? -eq 0 ]; then
        echo "✅ Database migrations completed with manual approach"
    else
        echo "❌ Database setup failed completely. Please check the error messages above."
        exit 1
    fi
fi

# Install dependencies and build
echo "📦 Installing Rust dependencies..."
cargo build
echo "✅ Rust dependencies installed and project built"

# Run tests (single-threaded to avoid environment variable race conditions)
echo "🧪 Running tests..."
cargo test -- --test-threads=1
echo "✅ All tests passed"

cd ..

# Setup frontend (future)
echo "🌐 Frontend setup (placeholder for future development)..."
if [ -d "frontend" ]; then
    cd frontend
    if [ -f "package.json" ] && command -v npm &> /dev/null; then
        echo "📦 Installing frontend dependencies..."
        npm install
        echo "✅ Frontend dependencies installed"
    fi
    cd ..
else
    echo "ℹ️  Frontend directory not yet created - will be added in Phase 4"
fi

echo ""
echo "🎉 Mail2Feed development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Review the configuration in backend/.env"
echo "   2. Start the development server: ./scripts/dev.sh"
echo "   3. Run tests: ./scripts/test.sh"
echo "   4. Check the API: curl http://localhost:3001/health"
echo ""
echo "📚 For more information, see README.md"