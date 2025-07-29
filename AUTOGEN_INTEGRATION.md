# AutoGen Multi-Agent Integration Guide

This document describes the Microsoft AutoGen integration with your Pinecone RAG application, enabling multi-agent collaboration for enhanced AI responses.

## 🚀 Overview

The AutoGen integration adds a sophisticated multi-agent system to your RAG application:

- **Researcher Agent**: Performs comprehensive context retrieval using multiple strategies
- **RAG Assistant Agent**: Synthesizes information and generates well-formatted responses  
- **Critic Agent**: Reviews and improves response quality and accuracy
- **Summarizer Agent**: Creates concise summaries when needed

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │────│  FastAPI Python │────│  Microsoft      │
│   (Frontend)    │    │    Service      │    │   AutoGen       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Chat     │    │   Multi-Agent   │    │   Pinecone      │
│   Interface     │    │  Orchestration  │    │  Vector Store   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
├── python-service/              # AutoGen FastAPI service
│   ├── main.py                  # FastAPI application
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile              # Docker configuration
│   ├── models/
│   │   └── chat_models.py      # Pydantic models
│   ├── agents/
│   │   └── multi_agent_system.py  # AutoGen orchestration
│   ├── services/
│   │   └── pinecone_service.py    # Pinecone integration
│   └── utils/
│       └── helpers.py          # Utility functions
├── src/app/api/
│   ├── chat/route.ts           # Enhanced with AutoGen support
│   └── autogen-chat/route.ts   # Dedicated AutoGen endpoint
└── docker-compose.yml          # Updated with AutoGen service
```

## 🔧 Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```bash
# Existing variables
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_index_name

# AutoGen Service Configuration
AUTOGEN_SERVICE_URL=http://localhost:8000
```

### 2. Docker Setup (Recommended)

Start both services with Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

This will start:
- Next.js app on `http://localhost:3000`
- AutoGen service on `http://localhost:8000`

### 3. Manual Setup (Development)

#### Start the Python Service:

```bash
cd python-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the service
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Start the Next.js App:

```bash
# In the main project directory
npm run dev
```

## 🎯 Usage

### Basic Usage

1. **Enable AutoGen**: In the chat interface, check the "🤖 Multi-Agent AutoGen" checkbox
2. **Configure Agents**: Select which agents to use:
   - 🔍 **Researcher**: Enhanced context retrieval
   - 🎯 **Critic**: Response quality review
   - 📝 **Summarizer**: Concise summaries
3. **Choose Strategy**: Select context strategy (Comprehensive, Focused, or Quick)
4. **Ask Questions**: Send your message - agents will collaborate to provide enhanced responses

### Agent Collaboration Flow

1. **Research Phase**: Researcher agent analyzes your query and retrieves relevant context using multiple strategies
2. **Response Generation**: RAG assistant generates initial response using retrieved context
3. **Quality Review**: Critic agent reviews response for accuracy and completeness
4. **Improvement**: If needed, response is refined based on critique
5. **Summarization**: Optional summarizer creates concise version if requested

### API Endpoints

#### AutoGen Chat Completion
```bash
POST /api/autogen-chat
Content-Type: application/json

{
  "messages": [
    {"role": "user", "content": "What are the key findings in the uploaded research papers?"}
  ],
  "use_multi_agent": true,
  "agent_config": {
    "use_researcher": true,
    "use_critic": true,
    "use_summarizer": false,
    "context_strategy": "comprehensive"
  }
}
```

#### Health Check
```bash
GET http://localhost:8000/health
```

#### Agent Status
```bash
GET http://localhost:8000/agents/status
```

## ⚙️ Configuration Options

### Agent Configuration

| Option | Description | Default |
|--------|-------------|---------|
| `use_researcher` | Enable enhanced context retrieval | `true` |
| `use_critic` | Enable response quality review | `true` |
| `use_summarizer` | Enable response summarization | `false` |
| `max_rounds` | Maximum collaboration rounds | `3` |
| `temperature` | AI creativity level (0-1) | `0.7` |

### Context Strategies

- **Comprehensive**: Multiple search strategies, extensive context retrieval
- **Focused**: Targeted search with high relevance threshold
- **Quick**: Fast response with minimal agent collaboration

## 🔍 Monitoring and Debugging

### Service Health

Check service status:
```bash
curl http://localhost:8000/health
```

### Agent Status

Monitor agent activity:
```bash
curl http://localhost:8000/agents/status
```

### Logs

View service logs:
```bash
# Docker Compose
docker-compose logs autogen-service

# Direct logs
tail -f python-service/logs/app.log
```

## 🚨 Troubleshooting

### Common Issues

1. **AutoGen Service Not Starting**
   - Check environment variables are set
   - Verify Python dependencies installed
   - Ensure port 8000 is available

2. **No Multi-Agent Response**
   - Verify `AUTOGEN_SERVICE_URL` is correctly set
   - Check if AutoGen service is running and healthy
   - System automatically falls back to single-agent mode

3. **Context Not Found**
   - Ensure Pinecone index exists and has data
   - Check API keys are valid
   - Verify namespace configuration

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
```

## 🔄 Fallback Behavior

The system includes robust fallback mechanisms:

1. If AutoGen service is unavailable, requests automatically fall back to the original single-agent system
2. If individual agents fail, the system continues with available agents
3. All errors are gracefully handled with informative messages

## 🎨 Frontend Features

### AutoGen Control Panel

The chat interface includes an AutoGen control panel with:

- **Toggle Switch**: Enable/disable multi-agent mode
- **Agent Selection**: Choose which agents to activate
- **Strategy Selector**: Pick context retrieval strategy
- **Visual Indicators**: See which agents are involved in responses

### Response Indicators

- **Headers**: Special headers indicate when AutoGen was used
- **Agent Attribution**: See which agents contributed to the response
- **Processing Time**: Monitor response generation time

## 📊 Performance Considerations

### Optimization Tips

1. **Agent Selection**: Use only necessary agents for faster responses
2. **Context Strategy**: Choose "Quick" for simple questions, "Comprehensive" for complex research
3. **Caching**: Responses are intelligently cached to improve performance
4. **Resource Limits**: Configure appropriate limits for production use

### Scaling

- Python service can be scaled horizontally
- Consider using Redis for shared agent state in multi-instance deployments
- Monitor resource usage and adjust container limits accordingly

## 🔐 Security

- Environment variables handle sensitive API keys
- Non-root user in Docker containers
- Input validation on all endpoints
- Rate limiting can be added via reverse proxy

## 🤝 Contributing

To extend the AutoGen integration:

1. Add new agents in `agents/multi_agent_system.py`
2. Create new endpoint handlers in `main.py`  
3. Update frontend controls in `Chat/index.tsx`
4. Add configuration options to models

## 📖 Additional Resources

- [Microsoft AutoGen Documentation](https://microsoft.github.io/autogen/stable/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Pinecone Documentation](https://docs.pinecone.io/)

---

🎉 **Congratulations!** Your RAG application now features advanced multi-agent AI collaboration powered by Microsoft AutoGen.