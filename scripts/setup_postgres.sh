#!/bin/bash

# Mail2Feed PostgreSQL Development Setup Script
set -e

echo "🚀 Starting Mail2Feed PostgreSQL development setup..."

# Check if Docker and Docker Compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Change to project root directory
cd "$(dirname "$0")/.."

echo "📦 Starting PostgreSQL services..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
# Wait for PostgreSQL to be healthy
timeout=60
while [ $timeout -gt 0 ]; do
    if docker-compose exec -T postgres pg_isready -U mail2feed_user -d mail2feed &> /dev/null; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ PostgreSQL failed to start within 60 seconds"
    docker-compose logs postgres
    exit 1
fi

# Run migrations
echo "🔧 Running PostgreSQL migrations..."
cd backend
export DATABASE_URL="postgresql://mail2feed_user:mail2feed_pass@localhost:5432/mail2feed"

# Check if diesel_cli is available
if ! command -v diesel &> /dev/null; then
    echo "📦 Installing diesel_cli with PostgreSQL support..."
    cargo install diesel_cli --no-default-features --features postgres
fi

# Run migrations
diesel migration run --migration-dir migrations_postgres

echo "✅ PostgreSQL setup complete!"
echo ""
echo "📊 Database connection details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: mail2feed"
echo "  Username: mail2feed_user"
echo "  Password: mail2feed_pass"
echo ""
echo "🌐 Optional: Start pgAdmin with:"
echo "  docker-compose --profile pgadmin up -d"
echo "  Then open: http://localhost:8080"
echo "  Login: admin@mail2feed.local / admin123"
echo ""
echo "🔗 DATABASE_URL: postgresql://mail2feed_user:mail2feed_pass@localhost:5432/mail2feed"