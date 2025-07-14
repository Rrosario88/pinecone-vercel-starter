# Docker Setup Guide

This guide explains how to run the PDF RAG application using Docker and Docker Compose.

## Prerequisites

- Docker Desktop or Docker Engine installed
- Docker Compose (included with Docker Desktop)

## Quick Start

### Production Deployment

1. **Copy environment variables:**
   ```bash
   cp .env.example .env
   ```

2. **Configure your environment variables in `.env`:**
   - Set your OpenAI API key
   - Set your Pinecone API key and configuration
   - Configure other application settings as needed

3. **Run the application:**
   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   Open http://localhost:3000 in your browser

### Development Mode

For development with hot reloading:

```bash
# Install dependencies first
npm install

# Run in development mode with hot reloading
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

## Docker Configuration

### Environment Variables

Required environment variables (set in `.env` file):

- `OPENAI_API_KEY`: Your OpenAI API key
- `PINECONE_API_KEY`: Your Pinecone API key
- `PINECONE_ENVIRONMENT`: Pinecone environment (default: gcp-starter)
- `PINECONE_INDEX`: Your Pinecone index name

Optional environment variables:
- `OPENAI_BASE_URL`: OpenAI API base URL (default: https://api.openai.com/v1)
- `NODE_ENV`: Node environment (default: production)
- `PORT`: Application port (default: 3000)

### Volumes

- `pdf_uploads`: Persists uploaded PDF files
- `app_logs`: Stores application logs

### Health Checks

The container includes health checks that verify the application is responding correctly:
- Health check endpoint: `/api/health`
- Check interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## Docker Commands

### Build and run
```bash
docker-compose up --build
```

### Run in background
```bash
docker-compose up -d
```

### Stop the application
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f pdf-rag-app
```

### Rebuild without cache
```bash
docker-compose build --no-cache
```

### Remove volumes (warning: this deletes uploaded files)
```bash
docker-compose down -v
```

## Troubleshooting

### Container won't start
1. Check that all required environment variables are set in `.env`
2. Verify Docker has enough resources allocated
3. Check logs: `docker-compose logs pdf-rag-app`

### Health check failures
1. Ensure the application is starting properly
2. Check if port 3000 is available
3. Verify network connectivity

### Permission issues
1. Ensure the uploads directory has correct permissions
2. Check Docker Desktop file sharing settings on macOS/Windows

### Out of disk space
1. Clean up Docker images: `docker system prune -a`
2. Remove unused volumes: `docker volume prune`

## Production Considerations

- Use a reverse proxy (nginx, traefik) for SSL termination
- Configure proper logging and monitoring
- Set up backup strategies for persistent volumes
- Use Docker secrets for sensitive environment variables
- Consider using a Docker registry for image distribution