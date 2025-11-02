#!/bin/bash

# Production Deployment Script for Real AutoGen RAG System
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting Real AutoGen RAG Production Deployment..."

# Configuration
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-your-dockerhub-username}"
FRONTEND_IMAGE="${DOCKER_HUB_USERNAME}/pinecone-vercel-starter-pdf-rag-app:latest"
BACKEND_IMAGE="${DOCKER_HUB_USERNAME}/real-autogen-rag-service:latest"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed or not in PATH"
        exit 1
    fi
    
    # Check .env.prod file
    if [ ! -f ".env.prod" ]; then
        log_warn ".env.prod file not found. Creating from template..."
        cp .env.prod.example .env.prod
        log_warn "Please edit .env.prod with your production values before continuing"
        exit 1
    fi
    
    log_info "Prerequisites check passed ✓"
}

# Build Docker images
build_images() {
    log_info "Building Docker images..."
    
    # Build backend image
    log_info "Building backend AutoGen service..."
    docker build -t ${BACKEND_IMAGE} .
    
    # Build frontend image (if in parent directory)
    if [ -f "../Dockerfile" ]; then
        log_info "Building frontend Next.js application..."
        cd ..
        docker build -t ${FRONTEND_IMAGE} .
        cd python-service
    else
        log_warn "Frontend Dockerfile not found. Skipping frontend build."
    fi
    
    log_info "Docker images built successfully ✓"
}

# Push to Docker Hub (optional)
push_to_docker_hub() {
    if [ "$1" = "--push" ]; then
        log_info "Pushing images to Docker Hub..."
        
        # Push backend image
        docker push ${BACKEND_IMAGE}
        
        # Push frontend image
        docker push ${FRONTEND_IMAGE}
        
        log_info "Images pushed to Docker Hub successfully ✓"
    else
        log_warn "Skipping Docker Hub push. Use --push flag to push images."
    fi
}

# Deploy with Docker Compose
deploy_production() {
    log_info "Deploying to production environment..."
    
    # Stop existing containers
    log_info "Stopping existing containers..."
    docker-compose -f docker-compose.prod.yml down --remove-orphans || true
    
    # Pull latest images (if pushing to hub)
    if [ "$1" = "--push" ]; then
        log_info "Pulling latest images from Docker Hub..."
        docker-compose -f docker-compose.prod.yml pull
    fi
    
    # Start production containers
    log_info "Starting production containers..."
    docker-compose -f docker-compose.prod.yml up -d
    
    log_info "Production deployment completed ✓"
}

# Health check
health_check() {
    log_info "Performing health checks..."
    
    # Wait for services to start
    sleep 30
    
    # Check backend health
    log_info "Checking backend health..."
    if curl -f http://localhost:8000/health > /dev/null 2>&1; then
        log_info "Backend health check passed ✓"
    else
        log_error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend health
    log_info "Checking frontend health..."
    if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        log_info "Frontend health check passed ✓"
    else
        log_error "Frontend health check failed"
        exit 1
    fi
    
    log_info "All health checks passed ✓"
}

# Show deployment status
show_status() {
    log_info "Deployment Status:"
    docker-compose -f docker-compose.prod.yml ps
    
    echo ""
    log_info "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  Backend Health: http://localhost:8000/health"
    echo ""
    log_info "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
}

# Main deployment flow
main() {
    check_prerequisites
    build_images
    push_to_docker_hub "$1"
    deploy_production "$1"
    health_check
    show_status
    
    log_info "🎉 Production deployment completed successfully!"
    log_info "Your Real AutoGen RAG system is now running in production mode."
}

# Script usage
usage() {
    echo "Usage: $0 [--push]"
    echo ""
    echo "Options:"
    echo "  --push    Push images to Docker Hub before deployment"
    echo ""
    echo "Environment Variables:"
    echo "  DOCKER_HUB_USERNAME    Your Docker Hub username (default: your-dockerhub-username)"
    echo ""
    echo "Examples:"
    echo "  $0                    # Local deployment only"
    echo "  $0 --push             # Build, push to Docker Hub, then deploy"
}

# Parse command line arguments
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    usage
    exit 0
fi

# Run main function
main "$1"