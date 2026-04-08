# Maintenance Guide for Production

## Daily Tasks

### Health Monitoring
```bash
# Check application health
pnpm health:check

# View monitoring dashboard
# Access http://your-domain.com/api/monitoring

# Check logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

### Backup Verification
```bash
# Run backup
pnpm backup

# Verify backup integrity
ls -la /opt/presentation-ai/backups/
```

## Weekly Tasks

### System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Docker images
docker-compose -f docker-compose.prod.yml pull

# Restart services
docker-compose -f docker-compose.prod.yml restart
```

### Log Analysis
```bash
# Check for errors in logs
docker-compose -f docker-compose.prod.yml logs --since="7 days" | grep -i error

# Analyze access patterns
docker-compose -f docker-compose.prod.yml logs nginx | grep -E "(GET|POST)" | awk '{print $1}' | sort | uniq -c | sort -nr | head -20
```

### Performance Review
- Check monitoring dashboard for performance metrics
- Review database query performance
- Monitor memory and CPU usage
- Check error rates and response times

## Monthly Tasks

### Security Updates
```bash
# Run security hardening script
pnpm harden:security

# Update SSL certificates
sudo certbot renew

# Review and rotate secrets
# Generate new NEXTAUTH_SECRET if needed
openssl rand -base64 32
```

### Database Maintenance
```bash
# Run database vacuum and analyze
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d presentation_ai -c "VACUUM ANALYZE;"

# Check database size and growth
docker-compose -f docker-compose.prod.yml exec db psql -U postgres -d presentation_ai -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"
```

### Backup Testing
```bash
# Test backup restoration
# Create a test environment and restore from backup
```

## Quarterly Tasks

### Comprehensive Security Audit
- Review all access logs for suspicious activity
- Audit user permissions and access controls
- Test security incident response procedures
- Update security policies and procedures

### Performance Optimization
- Analyze and optimize slow database queries
- Review and optimize application performance
- Consider infrastructure scaling needs
- Update dependencies and libraries

## Emergency Procedures

### Application Down
1. Check health endpoints
2. Review application logs
3. Restart services if needed
4. Check database connectivity
5. Restore from backup if necessary

### Security Incident
1. Isolate affected systems
2. Preserve evidence (logs, snapshots)
3. Assess impact and scope
4. Notify stakeholders
5. Implement remediation
6. Document incident and response

### Data Loss
1. Stop all writes to prevent further damage
2. Assess extent of data loss
3. Restore from most recent backup
4. Verify data integrity
5. Resume operations

## Monitoring Alerts

### Critical Alerts (Immediate Response)
- Application completely down
- Database connection failures
- Security breaches
- Data corruption

### Warning Alerts (Review Within 1 Hour)
- High error rates (>5%)
- Performance degradation (>50% increase)
- Disk space >90% used
- Memory usage >90%

### Info Alerts (Review Daily)
- SSL certificate expiration (<30 days)
- Backup failures
- Unusual access patterns

## Backup Strategy

### Automated Backups
- **Database**: Daily at 2 AM
- **Application Data**: Daily at 3 AM
- **SSL Certificates**: Weekly
- **Configuration**: Weekly

### Backup Retention
- **Daily**: 7 days
- **Weekly**: 4 weeks
- **Monthly**: 12 months
- **Yearly**: 7 years

### Backup Verification
- Test restore procedures monthly
- Verify backup integrity daily
- Monitor backup success/failure
- Store backups offsite/cloud

## Scaling Procedures

### Vertical Scaling
```bash
# Increase server resources
# Update Docker resource limits
# Monitor performance improvements
```

### Horizontal Scaling
```bash
# Add load balancer
# Deploy multiple application instances
# Configure session sharing (Redis)
# Update database connection pooling
```

### Database Scaling
```bash
# Add read replicas
# Implement database sharding
# Optimize query performance
# Consider managed database services
```

## Contact Information

### Emergency Contacts
- **Primary**: [Your Name] - [Phone] - [Email]
- **Secondary**: [Backup Contact] - [Phone] - [Email]

### Support Resources
- **Documentation**: [Internal Wiki/Knowledge Base]
- **Vendor Support**: [Database/AI Service Providers]
- **Community**: [Discord/Forum Links]

## Change Management

### Deployment Process
1. Test changes in staging environment
2. Create backup before deployment
3. Schedule deployment during low-traffic periods
4. Monitor system during and after deployment
5. Rollback plan ready if issues occur

### Version Control
- Tag releases in Git
- Document changes and impact
- Maintain deployment changelog
- Keep rollback versions available