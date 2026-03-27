#!/bin/bash
set -e

echo "🚀 ALLWEONE Presentation AI - Database Setup"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL container
echo "📦 Starting PostgreSQL container..."
docker compose up -d postgres

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PostgreSQL failed to start in time."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    # Update DATABASE_URL with Docker default
    sed -i 's|DATABASE_URL=""|DATABASE_URL="postgresql://postgres:postgres@localhost:5432/presentation_ai"|' .env
    echo "   .env file created with default database URL"
    echo "   ⚠️  Update .env with your API keys for full functionality"
fi

# Push database schema
echo "🗄️  Pushing database schema..."
pnpm db:push

# Seed database
echo "🌱 Seeding database..."
pnpm db:seed

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "  1. (Optional) Add API keys to .env for AI features"
echo "  2. Run 'pnpm dev' to start the application"
echo "  3. Visit http://localhost:3000"
