# SSL Certificate Setup Guide

## Quick SSL Setup with Let's Encrypt

### Prerequisites
- Domain pointing to your server
- Ports 80 and 443 open
- Nginx configured

### Step 1: Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python-certbot-nginx
```

### Step 2: Obtain SSL Certificate
```bash
# Stop nginx temporarily if using port 80
sudo systemctl stop nginx

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Or with nginx plugin (recommended)
sudo certbot --nginx -d your-domain.com
```

### Step 3: Copy Certificates to Nginx Directory
```bash
# Create SSL directory
sudo mkdir -p /path/to/app/nginx/ssl

# Copy certificates
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /path/to/app/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /path/to/app/nginx/ssl/key.pem

# Set proper permissions
sudo chown -R www-data:www-data /path/to/app/nginx/ssl
sudo chmod 600 /path/to/app/nginx/ssl/*.key
```

### Step 4: Update Docker Compose
Uncomment the nginx service in `docker-compose.prod.yml`:
```yaml
nginx:
  image: nginx:alpine
  # ... rest of config
```

### Step 5: Update Environment
Update `.env` file:
```env
NEXTAUTH_URL=https://your-domain.com
```

### Step 6: Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

## Automatic Renewal

### Setup Cron Job
```bash
# Add to crontab
sudo crontab -e

# Add this line (runs twice daily)
0 */12 * * * /usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"
```

### Docker-based Renewal
```bash
# Create renewal script
cat > /path/to/app/scripts/renew-ssl.sh << 'EOF'
#!/bin/bash
docker run --rm -v /path/to/app/nginx/ssl:/etc/letsencrypt certbot/certbot renew
docker-compose -f /path/to/app/docker-compose.prod.yml restart nginx
EOF

chmod +x /path/to/app/scripts/renew-ssl.sh
```

## Troubleshooting

### Common Issues

1. **Port 80 blocked**: Ensure port 80 is open for HTTP-01 challenge
2. **DNS not propagated**: Wait for DNS changes to propagate
3. **Certificate expired**: Run renewal manually with `sudo certbot renew`

### Manual Certificate Installation

If using different CA or self-signed for testing:
```bash
# Self-signed for testing
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=your-domain.com"

# Copy to nginx directory
cp cert.pem /path/to/app/nginx/ssl/
cp key.pem /path/to/app/nginx/ssl/
```