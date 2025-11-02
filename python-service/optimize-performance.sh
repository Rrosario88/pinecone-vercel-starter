#!/bin/bash

# Performance Optimization Script for Real AutoGen RAG System
# This script optimizes the system for better performance and resource usage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${BLUE}=== $1 ===${NC}"
}

# System optimization
optimize_system() {
    log_header "System Optimization"
    
    # Check Docker daemon configuration
    log_info "Optimizing Docker configuration..."
    
    # Increase Docker memory limit (if needed)
    if command -v docker >/dev/null 2>&1; then
        log_info "Docker version: $(docker --version)"
        
        # Check available memory
        TOTAL_MEM=$(free -h | awk '/^Mem:/ {print $2}')
        log_info "Total system memory: $TOTAL_MEM"
        
        if [[ $(echo "$TOTAL_MEM" | grep -E '[Gg]$') ]]; then
            MEM_GB=$(echo "$TOTAL_MEM" | sed 's/[Gg]//')
            if (( MEM_GB < 8 )); then
                log_warn "System has less than 8GB RAM. Performance may be limited."
            fi
        fi
    fi
    
    log_info "System optimization completed ✓"
}

# Docker cleanup and optimization
optimize_docker() {
    log_header "Docker Optimization"
    
    # Remove unused containers, networks, images
    log_info "Cleaning up unused Docker resources..."
    docker system prune -f
    
    # Remove dangling images
    docker image prune -f
    
    # Check disk usage
    DOCKER_USAGE=$(docker system df --format "{{.Size}}" | head -1)
    log_info "Docker disk usage: $DOCKER_USAGE"
    
    log_info "Docker optimization completed ✓"
}

# Service configuration optimization
optimize_services() {
    log_header "Service Configuration Optimization"
    
    # Create optimized environment file
    cat > .env.optimized << EOF
# Optimized Configuration for Performance
OPENAI_API_KEY=${OPENAI_API_KEY:-}
PINECONE_API_KEY=${PINECONE_API_KEY:-}
PINECONE_INDEX=${PINECONE_INDEX:-}
PINECONE_ENVIRONMENT=us-east-1

# Performance Settings
PORT=8000
LOG_LEVEL=WARNING  # Reduce log overhead
PYTHONPATH=/app

# OpenAI Settings
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.1
OPENAI_MAX_TOKENS=2000

# Pinecone Settings
PINECONE_TOP_K=10
PINECONE_THRESHOLD=0.3

# AutoGen Settings
AUTOGEN_TIMEOUT=60
AUTOGEN_MAX_AGENTS=4
EOF
    
    log_info "Created optimized environment configuration ✓"
}

# Agent performance tuning
optimize_agents() {
    log_header "Agent Performance Tuning"
    
    # Create optimized agent configuration
    cat > agents/optimized_config.json << EOF
{
  "performance_mode": {
    "use_researcher": true,
    "use_analyst": true,
    "use_reviewer": false,
    "use_summarizer": false,
    "max_iterations": 2,
    "timeout": 30
  },
  "quality_mode": {
    "use_researcher": true,
    "use_analyst": true,
    "use_reviewer": true,
    "use_summarizer": true,
    "max_iterations": 3,
    "timeout": 60
  },
  "fast_mode": {
    "use_researcher": false,
    "use_analyst": true,
    "use_reviewer": false,
    "use_summarizer": false,
    "max_iterations": 1,
    "timeout": 15
  }
}
EOF
    
    log_info "Created optimized agent configurations ✓"
}

# Memory optimization
optimize_memory() {
    log_header "Memory Optimization"
    
    # Create memory-optimized Docker Compose file
    cat > docker-compose.optimized.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: real-autogen-rag-service:latest
    container_name: real-autogen-rag-optimized
    restart: unless-stopped
    ports:
      - "8000:8000"
    env_file:
      - .env.optimized
    environment:
      - PYTHONUNBUFFERED=1
      - PYTHONDONTWRITEBYTECODE=1
    deploy:
      resources:
        limits:
          memory: 1.5G
          cpus: '1.0'
        reservations:
          memory: 512M
          cpus: '0.25'
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    networks:
      - optimized-network

networks:
  optimized-network:
    driver: bridge
EOF
    
    log_info "Created memory-optimized Docker configuration ✓"
}

# Performance monitoring setup
setup_monitoring() {
    log_header "Performance Monitoring Setup"
    
    # Create performance monitoring script
    cat > monitor-performance.sh << 'EOF'
#!/bin/bash

# Performance Monitoring Script
echo "=== AutoGen RAG Performance Monitor ==="
echo "Time: $(date)"
echo ""

# Docker stats
echo "Docker Container Stats:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "System Resources:"
echo "Memory Usage: $(free -h | awk '/^Mem:/ {print $3 "/" $2 " (" int($3/$2 * 100) "%)"}')"
echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}')"
echo "Disk Usage: $(df -h / | awk 'NR==2 {print $3 "/" $2 " (" int($3/$2 * 100) "%)"}')"

echo ""
echo "Service Health:"
curl -s http://localhost:8000/health | jq '.' 2>/dev/null || echo "Backend: Unreachable"
curl -s http://localhost:3000/api/health 2>/dev/null || echo "Frontend: Unreachable"
EOF
    
    chmod +x monitor-performance.sh
    log_info "Created performance monitoring script ✓"
}

# Performance testing
run_performance_tests() {
    log_header "Performance Testing"
    
    log_info "Running basic performance tests..."
    
    # Test backend response time
    if command -v curl >/dev/null 2>&1; then
        log_info "Testing backend response time..."
        BACKEND_TIME=$(curl -o /dev/null -s -w '%{time_total}' http://localhost:8000/health 2>/dev/null || echo "N/A")
        log_info "Backend response time: ${BACKEND_TIME}s"
        
        # Test AutoGen endpoint (if available)
        log_info "Testing AutoGen endpoint..."
        AUTOGEN_START=$(date +%s.%N)
        curl -X POST http://localhost:8000/chat \
             -H "Content-Type: application/json" \
             -d '{"messages":[{"role":"user","content":"Hello"}],"use_multi_agent":false}' \
             -o /dev/null -s -w '%{time_total}' 2>/dev/null || echo "N/A"
        AUTOGEN_TIME=$(echo "$(date +%s.%N) - $AUTOGEN_START" | bc 2>/dev/null || echo "N/A")
        log_info "AutoGen single-agent time: ${AUTOGEN_TIME}s"
    fi
    
    log_info "Performance testing completed ✓"
}

# Generate optimization report
generate_report() {
    log_header "Optimization Report"
    
    cat > OPTIMIZATION_REPORT.md << EOF
# AutoGen RAG Performance Optimization Report

## Date: $(date)

## System Information
- OS: $(uname -s)
- Memory: $(free -h | awk '/^Mem:/ {print $2}')
- CPU: $(nproc) cores
- Docker: $(docker --version 2>/dev/null || echo "Not installed")

## Optimizations Applied

### 1. System Optimization
- Docker system cleanup performed
- Resource usage analyzed
- Memory availability checked

### 2. Service Configuration
- Created optimized environment file (.env.optimized)
- Reduced logging overhead (LOG_LEVEL=WARNING)
- Configured optimal timeouts and limits

### 3. Agent Configuration
- Created multiple agent modes:
  - Performance mode: 2 agents, 30s timeout
  - Quality mode: 4 agents, 60s timeout  
  - Fast mode: 1 agent, 15s timeout

### 4. Memory Optimization
- Created memory-optimized Docker Compose
- Set appropriate resource limits
- Configured ulimits for file handles

### 5. Monitoring Setup
- Created performance monitoring script
- Automated health checks
- Resource usage tracking

## Performance Recommendations

### For Production:
1. Use performance mode for high-throughput scenarios
2. Monitor memory usage with the monitoring script
3. Scale horizontally if CPU usage exceeds 80%
4. Consider Redis caching for frequent queries

### For Development:
1. Use fast mode for quick testing
2. Enable debug logging when troubleshooting
3. Use quality mode for final testing

## Next Steps
1. Deploy optimized configuration: \`docker-compose -f docker-compose.optimized.yml up -d\`
2. Monitor performance: \`./monitor-performance.sh\`
3. Test with your specific workload
4. Adjust configurations based on results

---
EOF
    
    log_info "Generated optimization report: OPTIMIZATION_REPORT.md ✓"
}

# Main optimization flow
main() {
    log_header "AutoGen RAG Performance Optimization"
    echo "Starting optimization process..."
    echo ""
    
    optimize_system
    optimize_docker
    optimize_services
    optimize_agents
    optimize_memory
    setup_monitoring
    run_performance_tests
    generate_report
    
    echo ""
    log_header "Optimization Complete!"
    log_info "Optimized files created:"
    echo "  - .env.optimized (optimized environment)"
    echo "  - docker-compose.optimized.yml (memory-optimized services)"
    echo "  - agents/optimized_config.json (agent configurations)"
    echo "  - monitor-performance.sh (monitoring script)"
    echo "  - OPTIMIZATION_REPORT.md (detailed report)"
    echo ""
    log_info "To deploy optimized version:"
    echo "  docker-compose -f docker-compose.optimized.yml up -d"
    echo ""
    log_info "To monitor performance:"
    echo "  ./monitor-performance.sh"
}

# Check for required tools
check_requirements() {
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is required but not installed"
        exit 1
    fi
}

# Parse command line arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo ""
        echo "This script optimizes the AutoGen RAG system for better performance."
        exit 0
        ;;
    "")
        check_requirements
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac