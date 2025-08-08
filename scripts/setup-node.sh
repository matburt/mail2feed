#!/bin/bash

# Script to setup Node.js 20 environment for mail2feed development
# This ensures the correct Node.js version is active

echo "🔧 Setting up Node.js 20 environment..."

# Setup NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# Switch to Node 20
if nvm use v20.19.3 >/dev/null 2>&1; then
    echo "✅ Node.js $(node --version) is now active"
    echo "✅ npm $(npm --version) is available"
else
    echo "❌ Failed to switch to Node.js 20"
    echo "📋 Available versions:"
    nvm list
    exit 1
fi

echo ""
echo "🚀 Ready for development!"
echo "   Backend: cargo run (from backend/)"
echo "   Frontend: npm run dev (from frontend/)"
echo "   Or use: ./scripts/dev.sh"