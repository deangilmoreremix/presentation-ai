#!/bin/bash
# Automated Backup Script for Production

set -e

# Configuration
BACKUP_DIR="/opt/presentation-ai/backups"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="presentation_ai_$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "🗄️  Starting backup: $BACKUP_NAME"

# Database backup
echo "📊 Backing up database..."
docker-compose -f /path/to/app/docker-compose.prod.yml exec -T db pg_dump -U postgres presentation_ai > "$BACKUP_DIR/${BACKUP_NAME}_db.sql"

if [ $? -eq 0 ]; then
    print_status "Database backup completed"
else
    print_error "Database backup failed"
    exit 1
fi

# Application data backup (uploads, configs)
echo "📁 Backing up application data..."
tar -czf "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" \
    -C /path/to/app \
    nginx/ssl \
    .env \
    prisma/migrations \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    .

if [ $? -eq 0 ]; then
    print_status "Application data backup completed"
else
    print_error "Application data backup failed"
    exit 1
fi

# Compress database backup
echo "🗜️  Compressing database backup..."
gzip "$BACKUP_DIR/${BACKUP_NAME}_db.sql"

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR/${BACKUP_NAME}"* | awk '{sum += $1} END {print sum}')

# Clean up old backups
echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "presentation_ai_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "presentation_ai_*_app.tar.gz" -mtime +$RETENTION_DAYS -delete

# Verify backup integrity
echo "🔍 Verifying backup integrity..."
if gunzip -t "$BACKUP_DIR/${BACKUP_NAME}_db.sql.gz" && tar -tzf "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" > /dev/null; then
    print_status "Backup integrity check passed"
else
    print_error "Backup integrity check failed"
    exit 1
fi

# Log backup completion
echo "$(date): Backup $BACKUP_NAME completed successfully. Size: $BACKUP_SIZE" >> "$BACKUP_DIR/backup.log"

print_status "Backup completed successfully!"
print_status "Backup location: $BACKUP_DIR"
print_status "Backup size: $BACKUP_SIZE"
print_status "Retention: $RETENTION_DAYS days"

# Optional: Upload to cloud storage
if [ -n "$BACKUP_S3_BUCKET" ]; then
    echo "☁️  Uploading to S3..."
    aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}_db.sql.gz" "s3://$BACKUP_S3_BUCKET/database/"
    aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}_app.tar.gz" "s3://$BACKUP_S3_BUCKET/app/"
    print_status "Backup uploaded to S3"
fi

echo "🎉 All backups completed successfully!"