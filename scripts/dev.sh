#!/bin/bash

# Mail2Feed Development Server Script
# Starts both backend and frontend development servers

set -e

echo "🚀 Starting Mail2Feed development servers..."

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Error: Please run this script from the mail2feed root directory"
    exit 1
fi

# Setup Node.js 20 environment
echo "📦 Setting up Node.js environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

# Use Node.js version from .nvmrc if it exists, otherwise use Node 20
if [ -f ".nvmrc" ]; then
    nvm use
elif nvm use v20.19.3 >/dev/null 2>&1; then
    echo "   ✅ Using Node.js $(node --version)"
else
    echo "   ⚠️  Node.js 20.19.3 not found, using current version: $(node --version)"
fi

# Check if backend directory exists
if [ ! -d "backend" ]; then
    echo "❌ Error: Backend directory not found"
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    echo "❌ Error: Frontend directory not found"
    exit 1
fi

# Function to kill background processes on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    kill $(jobs -p) 2>/dev/null || true
    exit
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT INT TERM

# Start backend server
echo "🔧 Starting backend server..."
cd backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ Error: Backend .env file not found. Run ./scripts/setup.sh first"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

echo "   Database: $DATABASE_URL"
echo "   Backend API: http://$SERVER_HOST:$SERVER_PORT"
echo ""

# Start backend server in background
if command -v cargo-watch &> /dev/null; then
    echo "🔄 Backend server running with hot reloading..."
    cargo watch -x run &
else
    echo "🏃 Backend server running..."
    echo "   ℹ️  Install cargo-watch for hot reloading: cargo install cargo-watch"
    cargo run &
fi

# Give backend time to start
sleep 2

# Start frontend server
echo ""
echo "🎨 Starting frontend server..."
cd ../frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "   Frontend UI: http://localhost:3002"
echo ""

# Start frontend server in foreground (it will be terminated when script exits)
npm run dev &

echo ""
echo "✅ Development servers are running!"
echo ""
echo "   🌐 Frontend: http://0.0.0.0:3002 (accessible from network)"
echo "   🔧 Backend API: http://0.0.0.0:$SERVER_PORT (accessible from network)"
echo "   📖 API Health: http://0.0.0.0:$SERVER_PORT/health"
echo ""
echo "   Local access:"
echo "   - Frontend: http://localhost:3002"
echo "   - Backend: http://localhost:$SERVER_PORT"
echo ""
echo "   Press Ctrl+C to stop all servers"
echo ""

# Wait for all background jobs
wait