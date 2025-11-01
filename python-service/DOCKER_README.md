# Real AutoGen RAG Service - Docker Deployment

## Overview
This Docker container provides the Real AutoGen Multi-Agent RAG Service with enhanced collaboration between specialized AI agents.

## Features
- **Real Multi-Agent System**: 4 specialized agents (Researcher, Analyst, Reviewer, Summarizer)
- **Document-Aware Processing**: Integration with Pinecone vector database
- **Quality Assurance**: Built-in review and refinement processes
- **RESTful API**: FastAPI-based service with streaming support
- **Health Monitoring**: Comprehensive health checks and agent status tracking

## Quick Start

### Using Docker (Recommended)

1. **Build and Run with Docker Compose:**
```bash
# Clone the repository
git clone -b feature/implement-real-autogen https://github.com/Rrosario88/pinecone-vercel-starter.git
cd pinecone-vercel-starter/python-service

# Set up environment variables
cp .env.example .env
# Edit .env with your actual API keys

# Run with Docker Compose
docker-compose up -d
```

2. **Build and Run with Docker:**
```bash
# Build the image
docker build -t real-autogen-rag-service .

# Run the container
docker run -d \
  --name real-autogen-rag \
  -p 8000:8000 \
  --env-file .env \
  real-autogen-rag-service
```

### Environment Variables

Create a `.env` file with the following variables:

```bash
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX=your_pinecone_index_name
PINECONE_ENVIRONMENT=us-east-1
PORT=8000
```

## API Endpoints

Once running, the service provides these endpoints:

- **Root**: `GET http://localhost:8000/` - Service information
- **Health**: `GET http://localhost:8000/health` - Health check
- **Chat**: `POST http://localhost:8000/chat` - Multi-agent chat completion
- **Stream**: `POST http://localhost:8000/chat/stream` - Streaming chat
- **WebSocket**: `WS http://localhost:8000/ws/chat` - Real-time chat
- **Agents Status**: `GET http://localhost:8000/agents/status` - Agent statistics
- **Configure Agents**: `POST http://localhost:8000/agents/configure` - Agent configuration

## Example Usage

### Single Agent Request
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is AI?"}],
    "use_multi_agent": false
  }'
```

### Multi-Agent Request
```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Explain quantum computing"}],
    "use_multi_agent": true,
    "agent_config": {
      "use_researcher": true,
      "use_critic": true,
      "use_summarizer": true
    }
  }'
```

### Streaming Request
```bash
curl -X POST http://localhost:8000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Tell me about machine learning"}],
    "use_multi_agent": true
  }'
```

## Agent Configuration

The service supports 4 specialized agents:

1. **Researcher**: Document analysis and context gathering
2. **Analyst**: Comprehensive response generation and synthesis
3. **Reviewer**: Quality assurance and response refinement
4. **Summarizer**: Content clarity and structure improvement

### Agent Configuration Options
```json
{
  "use_researcher": true,    // Enable research phase
  "use_critic": true,        // Enable review/refinement
  "use_summarizer": true    // Enable summarization
}
```

## Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "service": "real-autogen-rag",
  "agents_initialized": true,
  "pinecone_connected": true,
  "autogen_available": true
}
```

### Agent Status
```bash
curl http://localhost:8000/agents/status
```

### Logs
```bash
# View container logs
docker logs real-autogen-rag

# Follow logs in real-time
docker logs -f real-autogen-rag
```

## Development

### Local Development
```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py
```

### Testing
```bash
# Run comprehensive tests
python test_real_system.py

# Run API integration tests
python test_api_integration.py
```

## Performance

- **Single Agent Response**: ~2-5 seconds
- **Multi-Agent Collaboration**: ~20-45 seconds
- **Memory Usage**: ~200-500MB depending on agent count
- **CPU Usage**: Moderate during multi-agent processing

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using port 8000
   lsof -i :8000
   # Kill the process
   kill -9 <PID>
   ```

2. **Environment Variables Not Set**
   ```bash
   # Verify .env file exists
   ls -la .env
   # Check variables are loaded
   docker exec real-autogen-rag env | grep API
   ```

3. **Pinecone Connection Issues**
   ```bash
   # Check Pinecone credentials
   docker exec real-autogen-rag env | grep PINECONE
   # Test connection manually
   curl -X POST https://api.pinecone.io/vectors/query \
     -H "Api-Key: $PINECONE_API_KEY"
   ```

4. **OpenAI API Issues**
   ```bash
   # Verify OpenAI key
   docker exec real-autogen-rag env | grep OPENAI
   # Test API access
   curl -X POST https://api.openai.com/v1/chat/completions \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### Container Restart
```bash
# Restart the service
docker-compose restart

# Rebuild with latest changes
docker-compose up -d --build
```

## Architecture

```
┌─────────────────────────────────────────┐
│           Real AutoGen RAG Service    │
│  FastAPI + OpenAI + Pinecone       │
├─────────────────────────────────────────┤
│  Multi-Agent Collaboration Layer     │
│  ┌─────────┬─────────┬─────────┐ │
│  │Researcher│ Analyst  │ Reviewer│ │
│  └─────────┴─────────┴─────────┘ │
├─────────────────────────────────────────┤
│        Data Layer                  │
│  ┌─────────────┬─────────────┐   │
│  │   OpenAI   │  Pinecone  │   │
│  │   API      │  Vector DB │   │
│  └─────────────┴─────────────┘   │
└─────────────────────────────────────────┘
```

## Version Information
- **Service Version**: 2.0.0
- **AutoGen Implementation**: Real multi-agent system
- **Last Updated**: November 2024

## Support

For issues and questions:
1. Check container logs: `docker logs real-autogen-rag`
2. Verify environment variables in `.env`
3. Test API endpoints individually
4. Check GitHub issues for known problems

---

**Note**: This is the real AutoGen implementation with genuine multi-agent collaboration, not a simulation.