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

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOF
# Database configuration
DATABASE_URL=sqlite:../data/mail2feed.db

# Server configuration
SERVER_HOST=127.0.0.1
SERVER_PORT=3001

# Logging configuration
RUST_LOG=info,mail2feed_backend=debug
EOF
    echo "✅ Created .env file"
else
    echo "✅ .env file already exists"
fi

# Create data directory
echo "📁 Creating data directory..."
mkdir -p ../data
echo "✅ Data directory created"

# Setup database
echo "🗄️  Setting up database..."
export DATABASE_URL="sqlite:../data/mail2feed.db"
diesel migration run
echo "✅ Database migrations completed"

# Install dependencies and build
echo "📦 Installing Rust dependencies..."
cargo build
echo "✅ Rust dependencies installed and project built"

# Run tests
echo "🧪 Running tests..."
cargo test
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