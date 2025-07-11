#!/bin/bash

# Mail2Feed Clean Script
# Cleans build artifacts and temporary files

set -e

echo "🧹 Cleaning Mail2Feed project..."

# Check if we're in the right directory
if [ ! -f "CLAUDE.md" ]; then
    echo "❌ Error: Please run this script from the mail2feed root directory"
    exit 1
fi

# Clean backend
if [ -d "backend" ]; then
    echo "🦀 Cleaning Rust backend..."
    cd backend
    cargo clean
    echo "✅ Backend cleaned"
    cd ..
fi

# Clean frontend (future)
if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo "🌐 Cleaning frontend..."
    cd frontend
    
    # Remove node_modules and build artifacts
    if [ -d "node_modules" ]; then
        rm -rf node_modules
        echo "   Removed node_modules"
    fi
    
    if [ -d "dist" ]; then
        rm -rf dist
        echo "   Removed dist"
    fi
    
    if [ -d "build" ]; then
        rm -rf build
        echo "   Removed build"
    fi
    
    echo "✅ Frontend cleaned"
    cd ..
else
    echo "ℹ️  No frontend to clean (Phase 4)"
fi

# Clean temporary files
echo "🗑️  Cleaning temporary files..."

# Remove log files
find . -name "*.log" -type f -delete 2>/dev/null || true

# Remove backup files
find . -name "*~" -type f -delete 2>/dev/null || true
find . -name "*.bak" -type f -delete 2>/dev/null || true

# Remove OS-specific files
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
find . -name "Thumbs.db" -type f -delete 2>/dev/null || true

echo "✅ Temporary files cleaned"

echo ""
echo "🎉 Project cleaned successfully!"
echo ""
echo "💡 To rebuild the project, run:"
echo "   ./scripts/setup.sh  # To reinstall dependencies"
echo "   ./scripts/dev.sh    # To start development server"