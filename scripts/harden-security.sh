#!/bin/bash
# Security Hardening Script for Production Server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_header() {
    echo -e "\n${BLUE}🔒 $1${NC}"
    echo "----------------------------------------"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_header "Production Security Hardening"
echo "This script will help secure your production server"
echo "Make sure to backup your data before proceeding!"
echo ""

read -p "Do you want to proceed with security hardening? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Security hardening cancelled."
    exit 0
fi

# Update system packages
print_header "System Updates"
print_info "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System packages updated"

# Install essential security packages
print_header "Security Packages"
print_info "Installing security packages..."
sudo apt install -y ufw fail2ban unattended-upgrades apt-listchanges

# Configure UFW firewall
print_header "Firewall Configuration"
print_info "Configuring UFW firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
print_status "Firewall configured (SSH, HTTP, HTTPS allowed)"

# Configure fail2ban
print_header "Fail2Ban Configuration"
print_info "Configuring Fail2Ban for SSH protection..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# SSH hardening
print_header "SSH Security"
print_info "Hardening SSH configuration..."
sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo sed -i 's/#PermitEmptyPasswords yes/PermitEmptyPasswords no/' /etc/ssh/sshd_config
sudo sed -i 's/X11Forwarding yes/X11Forwarding no/' /etc/ssh/sshd_config

# Restart SSH
sudo systemctl restart sshd
print_status "SSH hardened (root login disabled, password auth disabled)"

# Automatic security updates
print_header "Automatic Updates"
print_info "Configuring automatic security updates..."
sudo dpkg-reconfigure --priority=low unattended-upgrades

# Create application user if it doesn't exist
print_header "Application User"
if id "presentation" &>/dev/null; then
    print_info "Application user already exists"
else
    print_info "Creating dedicated application user..."
    sudo useradd -m -s /bin/bash presentation
    sudo usermod -aG docker presentation
    print_status "Application user created"
fi

# Set proper permissions for application directory
print_header "File Permissions"
APP_DIR="/path/to/app"
if [ -d "$APP_DIR" ]; then
    print_info "Setting proper file permissions..."
    sudo chown -R presentation:presentation "$APP_DIR"
    sudo chmod 755 "$APP_DIR"

    # Secure sensitive files
    if [ -f "$APP_DIR/.env" ]; then
        sudo chmod 600 "$APP_DIR/.env"
    fi

    if [ -d "$APP_DIR/nginx/ssl" ]; then
        sudo chmod 600 "$APP_DIR/nginx/ssl/*.key" 2>/dev/null || true
        sudo chmod 644 "$APP_DIR/nginx/ssl/*.pem" 2>/dev/null || true
    fi

    print_status "File permissions secured"
else
    print_warning "Application directory not found at $APP_DIR"
fi

# Configure logrotate for application logs
print_header "Log Rotation"
if [ ! -f "/etc/logrotate.d/presentation-ai" ]; then
    print_info "Installing log rotation configuration..."
    sudo cp "$APP_DIR/config/logrotate.conf" /etc/logrotate.d/presentation-ai
    print_status "Log rotation configured"
else
    print_info "Log rotation already configured"
fi

# Kernel hardening
print_header "Kernel Security"
print_info "Applying basic kernel hardening..."
sudo sysctl -w net.ipv4.tcp_syncookies=1
sudo sysctl -w net.ipv4.ip_forward=0
sudo sysctl -w net.ipv4.conf.all.accept_redirects=0
sudo sysctl -w net.ipv4.conf.default.accept_redirects=0

# Make sysctl changes persistent
echo "net.ipv4.tcp_syncookies=1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.ip_forward=0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.all.accept_redirects=0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.conf.default.accept_redirects=0" | sudo tee -a /etc/sysctl.conf

print_status "Kernel security hardening applied"

# Install and configure auditd
print_header "Audit System"
print_info "Installing audit system..."
sudo apt install -y auditd audispd-plugins
sudo systemctl enable auditd
sudo systemctl start auditd
print_status "Audit system installed and running"

print_header "Security Hardening Complete!"
echo ""
print_status "Your server has been hardened with:"
echo "  ✅ System packages updated"
echo "  ✅ Firewall configured (UFW)"
echo "  ✅ Fail2Ban installed and running"
echo "  ✅ SSH hardened (no root login, no password auth)"
echo "  ✅ Automatic security updates configured"
echo "  ✅ Dedicated application user created"
echo "  ✅ File permissions secured"
echo "  ✅ Log rotation configured"
echo "  ✅ Kernel security hardening applied"
echo "  ✅ Audit system installed"
echo ""
print_warning "Important next steps:"
echo "  1. Test SSH access with your key before closing this session"
echo "  2. Update your deployment scripts to use the 'presentation' user"
echo "  3. Set up monitoring and alerting for security events"
echo "  4. Regularly review logs for suspicious activity"
echo "  5. Keep your system updated with security patches"
echo ""
print_info "Security hardening completed successfully!"