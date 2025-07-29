import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, AsyncGenerator
import json
import logging
from dotenv import load_dotenv

from agents.simple_multi_agent_system import SimpleMultiAgentRAGSystem as MultiAgentRAGSystem
from services.pinecone_service import PineconeService
from models.chat_models import ChatRequest, ChatResponse, AgentMessage

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global services
multi_agent_system: Optional[MultiAgentRAGSystem] = None
pinecone_service: Optional[PineconeService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup and cleanup on shutdown"""
    global multi_agent_system, pinecone_service
    
    try:
        # Initialize Pinecone service
        pinecone_service = PineconeService()
        await pinecone_service.initialize()
        
        # Initialize multi-agent system
        multi_agent_system = MultiAgentRAGSystem(pinecone_service)
        await multi_agent_system.initialize()
        
        logger.info("AutoGen RAG service initialized successfully")
        yield
        
    except Exception as e:
        logger.error(f"Failed to initialize services: {e}")
        raise
    finally:
        # Cleanup
        if multi_agent_system:
            await multi_agent_system.cleanup()
        if pinecone_service:
            await pinecone_service.cleanup()

# Create FastAPI app with lifespan
app = FastAPI(
    title="AutoGen RAG Service",
    description="Multi-agent RAG system using Microsoft AutoGen",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://localhost:3000"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "AutoGen RAG Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "chat": "/chat",
            "chat_stream": "/chat/stream", 
            "agents_status": "/agents/status",
            "agents_configure": "/agents/configure",
            "context_search": "/context/search"
        },
        "documentation": "/docs"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "autogen-rag",
        "agents_initialized": multi_agent_system is not None,
        "pinecone_connected": pinecone_service is not None
    }

@app.post("/chat", response_model=ChatResponse)
async def chat_completion(request: ChatRequest):
    """Single chat completion with multi-agent collaboration"""
    try:
        if not multi_agent_system:
            raise HTTPException(status_code=503, detail="Multi-agent system not initialized")
        
        # Process the chat request
        response = await multi_agent_system.process_chat(
            messages=request.messages,
            use_multi_agent=request.use_multi_agent,
            agent_config=request.agent_config,
            document_inventory=request.document_inventory
        )
        
        return response
        
    except Exception as e:
        logger.error(f"Chat completion error: {e}")
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Streaming chat completion with multi-agent collaboration"""
    try:
        if not multi_agent_system:
            raise HTTPException(status_code=503, detail="Multi-agent system not initialized")
        
        async def generate_stream():
            try:
                async for chunk in multi_agent_system.process_chat_stream(
                    messages=request.messages,
                    use_multi_agent=request.use_multi_agent,
                    agent_config=request.agent_config
                ):
                    yield f"data: {json.dumps(chunk)}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_chunk = {"error": str(e), "type": "stream_error"}
                yield f"data: {json.dumps(error_chunk)}\n\n"
        
        return StreamingResponse(
            generate_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/event-stream",
            }
        )
        
    except Exception as e:
        logger.error(f"Chat stream error: {e}")
        raise HTTPException(status_code=500, detail=f"Stream processing failed: {str(e)}")

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time multi-agent conversations"""
    await websocket.accept()
    
    try:
        if not multi_agent_system:
            await websocket.send_json({"error": "Multi-agent system not initialized"})
            return
        
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_json()
                request = ChatRequest(**data)
                
                # Process with multi-agent system
                async for message in multi_agent_system.process_chat_websocket(
                    messages=request.messages,
                    use_multi_agent=request.use_multi_agent,
                    agent_config=request.agent_config
                ):
                    await websocket.send_json(message)
                    
            except WebSocketDisconnect:
                logger.info("WebSocket client disconnected")
                break
            except Exception as e:
                logger.error(f"WebSocket error: {e}")
                await websocket.send_json({"error": str(e), "type": "websocket_error"})
                
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        await websocket.close()

@app.get("/agents/status")
async def get_agents_status():
    """Get status of all agents in the system"""
    try:
        if not multi_agent_system:
            raise HTTPException(status_code=503, detail="Multi-agent system not initialized")
        
        return await multi_agent_system.get_agents_status()
        
    except Exception as e:
        logger.error(f"Get agents status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/agents/configure")
async def configure_agents(config: Dict[str, Any]):
    """Configure agent parameters and behaviors"""
    try:
        if not multi_agent_system:
            raise HTTPException(status_code=503, detail="Multi-agent system not initialized")
        
        result = await multi_agent_system.configure_agents(config)
        return {"status": "success", "configuration": result}
        
    except Exception as e:
        logger.error(f"Configure agents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/context/search")
async def search_context(query: str, namespace: str = "", top_k: int = 5):
    """Search for context in the knowledge base"""
    try:
        if not pinecone_service:
            raise HTTPException(status_code=503, detail="Pinecone service not initialized")
        
        results = await pinecone_service.search_context(
            query=query,
            namespace=namespace,
            top_k=top_k
        )
        
        return {"results": results}
        
    except Exception as e:
        logger.error(f"Context search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )