-- Database initialization script for production
-- This script runs when the PostgreSQL container starts

-- Create the database if it doesn't exist
-- Note: This is handled by POSTGRES_DB environment variable in docker-compose

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create indexes for better performance
-- These will be created by Prisma migrations, but we can add them here for reference