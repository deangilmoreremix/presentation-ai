#!/bin/bash
# Production Deployment Quick Start Script

set -e

echo "🚀 ALLWEONE Presentation AI - Production Deployment"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

print_status "Docker and Docker Compose are available"

# Check if environment file exists
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Copying from example..."
    if [ -f ".env.production.example" ]; then
        cp .env.production.example .env
        print_warning ".env file created from example. Please review and update values:"
        print_warning "- NEXTAUTH_SECRET: Generate a secure 32+ character secret"
        print_warning "- API keys: Add your actual API keys"
        print_warning "- NEXTAUTH_URL: Update when you have a domain"

        read -p "Do you want to continue with default values for now? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Please edit .env file and run this script again."
            exit 0
        fi
    else
        print_error ".env.production.example not found!"
        exit 1
    fi
fi

print_status "Environment file exists"

# Validate environment variables
echo "🔍 Validating environment variables..."
if ! grep -q "DATABASE_URL=" .env; then
    print_error "DATABASE_URL not set in .env"
    exit 1
fi

if ! grep -q "NEXTAUTH_SECRET=" .env; then
    print_error "NEXTAUTH_SECRET not set in .env"
    exit 1
fi

if ! grep -q "NEXTAUTH_URL=" .env; then
    print_error "NEXTAUTH_URL not set in .env"
    exit 1
fi

print_status "Basic environment validation passed"

# Create necessary directories
mkdir -p nginx/ssl logs

# Build and start services
echo "🐳 Starting production deployment..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Start database first
echo "📊 Starting database..."
docker-compose -f docker-compose.prod.yml up -d db

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️ Running database migrations..."
docker-compose -f docker-compose.prod.yml exec -T db sh -c 'until pg_isready -U postgres; do sleep 1; done'
docker-compose -f docker-compose.prod.yml exec -T app sh -c 'cd /app && pnpm prod:migrate'

# Start application
echo "🚀 Starting application..."
docker-compose -f docker-compose.prod.yml up -d app

# Wait for app to be ready
echo "⏳ Waiting for application to be ready..."
sleep 30

# Run health check
echo "🏥 Running health checks..."
if docker-compose -f docker-compose.prod.yml exec -T app sh -c 'curl -f http://localhost:3000/api/health' >/dev/null 2>&1; then
    print_status "Application health check passed!"
else
    print_error "Application health check failed!"
    echo "Check logs with: docker-compose -f docker-compose.prod.yml logs app"
    exit 1
fi

# Optional: Seed database
read -p "Would you like to seed the database with default themes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🌱 Seeding database..."
    docker-compose -f docker-compose.prod.yml exec -T app sh -c 'cd /app && pnpm prod:seed'
    print_status "Database seeded successfully"
fi

print_status "Production deployment completed successfully!"
echo ""
echo "🎉 Your ALLWEONE Presentation AI is now running in production!"
echo ""
echo "📋 Next steps:"
echo "1. Configure your domain DNS to point to this server"
echo "2. Obtain SSL certificates (Let's Encrypt recommended)"
echo "3. Update nginx/ssl/ with your certificates"
echo "4. Uncomment nginx service in docker-compose.prod.yml"
echo "5. Set up monitoring and alerting"
echo "6. Configure backups"
echo ""
echo "🔗 Application URLs:"
echo "   Health Check: http://your-server-ip:3000/api/health"
echo "   Application:  http://your-server-ip:3000"
echo "   Monitoring:   http://your-server-ip:3000/api/monitoring"
echo ""
echo "📊 Useful commands:"
echo "   View logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "   Restart app:  docker-compose -f docker-compose.prod.yml restart app"
echo "   Stop all:     docker-compose -f docker-compose.prod.yml down"
echo "   Update app:   docker-compose -f docker-compose.prod.yml up -d --build app"