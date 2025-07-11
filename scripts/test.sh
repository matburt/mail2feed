#!/bin/bash

# Mail2Feed Test Runner Script
# Runs all tests with proper configuration

set -e

echo "🧪 Running Mail2Feed tests..."

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Error: Please run this script from the mail2feed root directory"
    exit 1
fi

# Navigate to backend directory
cd backend

# Set test environment variables
export RUST_LOG=error  # Reduce log noise during tests

echo "📋 Test Configuration:"
echo "   Backend: Rust with Cargo"
echo "   Database: In-memory SQLite"
echo "   Log Level: $RUST_LOG"
echo ""

# Run backend tests
echo "🦀 Running backend tests..."
echo "----------------------------------------"

# Run tests with output
cargo test --verbose

echo ""
echo "✅ Backend tests completed successfully!"

# Check for frontend tests (future)
cd ..
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo ""
    echo "🌐 Running frontend tests..."
    echo "----------------------------------------"
    cd frontend
    
    if command -v npm &> /dev/null; then
        npm test
        echo "✅ Frontend tests completed successfully!"
    else
        echo "⚠️  npm not found, skipping frontend tests"
    fi
    cd ..
else
    echo "ℹ️  Frontend tests not yet available (Phase 4)"
fi

echo ""
echo "🎉 All tests completed successfully!"