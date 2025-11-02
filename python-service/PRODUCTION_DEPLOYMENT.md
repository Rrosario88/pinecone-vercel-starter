# Production Deployment Guide

## Overview
This guide covers deploying the Real AutoGen RAG system to production environments using Docker and Docker Compose.

## Prerequisites

### System Requirements
- **Docker**: 20.10+ with Docker Compose v2.0+
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: 10GB+ available disk space
- **Network**: Stable internet connection for API access

### API Keys Required
- **OpenAI API Key**: For GPT-4 model access
- **Pinecone API Key**: For vector database operations

## Quick Deployment

### 1. Environment Setup
```bash
# Clone the repository
git clone -b feature/implement-real-autogen https://github.com/Rrosario88/pinecone-vercel-starter.git
cd pinecone-vercel-starter/python-service

# Copy and configure environment
cp .env.prod.example .env.prod
# Edit .env.prod with your production API keys
```

### 2. Automated Deployment
```bash
# Local deployment only
./deploy-production.sh

# Build, push to Docker Hub, then deploy
./deploy-production.sh --push
```

### 3. Manual Deployment
```bash
# Build images
docker build -t real-autogen-rag-service:latest .
cd .. && docker build -t pinecone-vercel-starter-pdf-rag-app:latest .
cd python-service

# Deploy with production compose
docker-compose -f docker-compose.prod.yml up -d

# Health check
curl http://localhost:8000/health
curl http://localhost:3000/api/health
```

## Configuration

### Environment Variables (.env.prod)
```bash
# Required
OPENAI_API_KEY=your_production_openai_key
PINECONE_API_KEY=your_production_pinecone_key
PINECONE_INDEX=your_production_index_name

# Optional
PORT=8000
NODE_ENV=production
LOG_LEVEL=INFO
```

### Production Docker Compose Features
- **Health Checks**: Automated service monitoring
- **Resource Limits**: Memory and CPU constraints
- **Restart Policies**: Automatic recovery on failures
- **Network Isolation**: Dedicated production network

## Scaling and Performance

### Resource Allocation
```yaml
deploy:
  resources:
    limits:
      memory: 2G      # Maximum memory
      cpus: '1.0'     # Maximum CPU cores
    reservations:
      memory: 1G      # Minimum memory
      cpus: '0.5'     # Minimum CPU cores
```

### Performance Metrics
- **Single Agent**: 2-5 seconds response time
- **Multi-Agent**: 20-45 seconds response time
- **Memory Usage**: 200-500MB per service
- **Concurrent Users**: 10-20 simultaneous sessions

## Monitoring and Maintenance

### Health Monitoring
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Health checks
curl http://localhost:8000/health
curl http://localhost:3000/api/health
```

### Log Management
```bash
# Backend logs
docker logs real-autogen-rag-prod

# Frontend logs
docker logs pdf-rag-app-prod

# Real-time log streaming
docker-compose -f docker-compose.prod.yml logs -f backend
```

## Security Considerations

### API Key Security
- Store API keys in environment files only
- Never commit `.env.prod` to version control
- Use Docker secrets for production deployments
- Rotate API keys regularly

### Network Security
- Services run in isolated Docker network
- Only necessary ports exposed (3000, 8000)
- Configure firewall rules as needed
- Use HTTPS in production (reverse proxy)

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check environment variables
docker exec real-autogen-rag-prod env | grep API

# Check port conflicts
lsof -i :8000
lsof -i :3000

# View error logs
docker-compose -f docker-compose.prod.yml logs
```

#### Slow Response Times
```bash
# Check resource usage
docker stats

# Monitor API rate limits
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/usage

# Optimize agent configuration
# Set use_researcher=false for faster responses
```

#### Memory Issues
```bash
# Check memory usage
docker stats --no-stream

# Increase memory limits
# Edit docker-compose.prod.yml deploy.resources.limits.memory
```

## Backup and Recovery

### Data Backup
```bash
# Backup Pinecone data (via Pinecone console)
# Backup uploaded files
docker cp pdf-rag-app-prod:/app/uploads ./backup/uploads-$(date +%Y%m%d)
```

### Service Recovery
```bash
# Restart services
docker-compose -f docker-compose.prod.yml restart

# Full redeployment
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

## Production Best Practices

### 1. Environment Management
- Use separate `.env.prod` for production
- Implement proper secret management
- Monitor API usage and costs

### 2. Performance Optimization
- Enable response caching where appropriate
- Monitor resource utilization
- Scale horizontally if needed

### 3. Security Hardening
- Regular security updates
- Implement rate limiting
- Use HTTPS with SSL certificates
- Monitor access logs

### 4. Monitoring and Alerting
- Set up health check alerts
- Monitor API response times
- Track error rates and patterns
- Implement log aggregation

## Support and Maintenance

### Regular Maintenance Tasks
- Weekly: Check for Docker image updates
- Monthly: Review API usage and costs
- Quarterly: Rotate API keys
- Annually: Security audit and updates

### Getting Help
1. Check service logs: `docker-compose logs`
2. Verify environment variables
3. Test API endpoints individually
4. Review GitHub issues for known problems
5. Check system resource utilization

---

**Note**: This production deployment includes the real AutoGen multi-agent system with genuine AI collaboration, not simulated responses.