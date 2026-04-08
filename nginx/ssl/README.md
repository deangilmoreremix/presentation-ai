# Placeholder SSL certificates for development
# Replace these with your actual SSL certificates for production

# To get free SSL certificates, use Let's Encrypt:
# sudo certbot certonly --standalone -d your-domain.com
# Then copy the generated files to this directory

# Example commands:
# sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./nginx/ssl/cert.pem
# sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./nginx/ssl/key.pem

# For development/testing, you can create self-signed certificates:
# openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"

# IMPORTANT: Never commit real SSL certificates to version control!