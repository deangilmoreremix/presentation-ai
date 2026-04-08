# Production Deployment Guide

This guide covers deploying the ALLWEONE Presentation AI application to production.

## Prerequisites

- Docker and Docker Compose
- PostgreSQL database (managed or self-hosted)
- Domain name with SSL certificate
- Reverse proxy (nginx recommended)
- Monitoring and alerting setup

## Environment Setup

### Required Environment Variables

Copy `.env.production.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://username:password@hostname:5432/database_name"

# Authentication
NEXTAUTH_SECRET="your-32-character-secret-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://your-domain.com"

# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
TOGETHER_AI_API_KEY="your-together-ai-key"
FAL_API_KEY="your-fal-api-key"  # Optional

# File Storage
UPLOADTHING_TOKEN="your-uploadthing-token"

# External Services
UNSPLASH_ACCESS_KEY="your-unsplash-access-key"
TAVILY_API_KEY="your-tavily-api-key"
```

### Security Notes

- Generate unique `NEXTAUTH_SECRET` for production
- Use strong, unique API keys
- Never commit secrets to version control
- Use environment-specific secrets

## Database Setup

### Using Docker Compose (Recommended)

```bash
docker-compose -f docker-compose.prod.yml up -d db
```

### Manual PostgreSQL Setup

```sql
CREATE DATABASE presentation_ai;
CREATE USER presentation_user WITH ENCRYPTED PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE presentation_ai TO presentation_user;
```

## Deployment

### Option 1: Docker Compose (Simplest)

1. **Configure environment**:
   ```bash
   cp .env.production.example .env
   # Edit .env with production values
   ```

2. **Deploy**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run migrations**:
   ```bash
   docker-compose -f docker-compose.prod.yml exec app pnpm prod:migrate
   ```

4. **Seed data** (optional):
   ```bash
   docker-compose -f docker-compose.prod.yml exec app pnpm prod:seed
   ```

### Option 2: Manual Deployment

1. **Install dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Build application**:
   ```bash
   pnpm prod:build
   ```

3. **Run migrations**:
   ```bash
   pnpm prod:migrate
   ```

4. **Start application**:
   ```bash
   pnpm prod:start
   ```

## Reverse Proxy Configuration

### Nginx Example

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://localhost:3000;
        # ... same proxy settings as above
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Monitoring & Alerting

### Health Checks

The application provides several health check endpoints:

- `/api/health` - Basic health check
- `/api/monitoring` - Detailed system metrics

### Automated Monitoring

Set up automated health checks:

```bash
# Using systemd timer
sudo cp scripts/presentation-ai-health.service /etc/systemd/system/
sudo systemctl enable presentation-ai-health
sudo systemctl start presentation-ai-health

# Or using cron
*/5 * * * * /path/to/app/scripts/health-check.js
```

### Log Monitoring

Configure log aggregation:

```bash
# Using rsyslog or similar
# Application logs are written to stdout/stderr
# Use docker logs or log aggregation service
```

## Performance Optimization

### Database Optimization

1. **Indexes**: Ensure proper indexes on frequently queried columns
2. **Connection pooling**: Use PgBouncer for production
3. **Query optimization**: Monitor slow queries

### Caching Strategy

1. **API responses**: Implement Redis caching for expensive operations
2. **Static assets**: Use CDN for static files
3. **Database queries**: Cache frequently accessed data

### Scaling

1. **Horizontal scaling**: Run multiple app instances behind load balancer
2. **Database scaling**: Use read replicas for read-heavy operations
3. **CDN**: Use CDN for global content delivery

## Backup & Recovery

### Database Backups

```bash
# Automated backup script
pg_dump -U username -h hostname database_name > backup.sql

# Restore
psql -U username -h hostname database_name < backup.sql
```

### File Backups

```bash
# Backup uploaded files
rsync -av /path/to/uploads /backup/location/
```

## Security Checklist

- [ ] SSL/TLS configured
- [ ] Security headers implemented
- [ ] Rate limiting active
- [ ] Input validation enabled
- [ ] Secrets properly managed
- [ ] Dependencies updated
- [ ] Firewall configured
- [ ] Regular security audits

## Troubleshooting

### Common Issues

1. **Application won't start**
   - Check environment variables
   - Verify database connectivity
   - Check application logs

2. **Slow performance**
   - Monitor database queries
   - Check system resources
   - Review caching configuration

3. **Memory issues**
   - Monitor heap usage
   - Adjust Node.js memory limits
   - Check for memory leaks

### Logs

```bash
# View application logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db

# System logs
journalctl -u presentation-ai-health -f
```

## Maintenance

### Regular Tasks

- [ ] Update dependencies monthly
- [ ] Review and rotate secrets quarterly
- [ ] Monitor performance metrics weekly
- [ ] Backup verification daily
- [ ] Security updates as needed

### Updates

1. **Staging deployment**: Test updates in staging environment
2. **Zero-downtime deployment**: Use rolling updates
3. **Rollback plan**: Keep previous version ready for rollback

## Support

For production issues:

1. Check application logs
2. Review monitoring dashboards
3. Check health endpoints
4. Contact development team

Remember: Always test changes in a staging environment before production deployment!