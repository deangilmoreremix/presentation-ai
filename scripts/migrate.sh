#!/usr/bin/env bash
# Production database migration script

set -e

echo "Running database migrations..."

# Generate Prisma client
echo "Generating Prisma client..."
pnpm prisma generate

# Run migrations in production
if [ "$NODE_ENV" = "production" ]; then
  echo "Running migrations in production mode..."
  pnpm prisma migrate deploy
else
  echo "Running migrations in development mode..."
  pnpm prisma db push
fi

echo "Database migrations completed successfully!"