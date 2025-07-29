from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

class ChatMessage(BaseModel):
    role: MessageRole
    content: str
    metadata: Optional[Dict[str, Any]] = None

class AgentConfig(BaseModel):
    use_researcher: bool = True
    use_critic: bool = True
    use_summarizer: bool = False
    max_rounds: int = 3
    temperature: float = 0.7
    context_strategy: str = "comprehensive"  # "comprehensive", "focused", "quick"

class DocumentInfo(BaseModel):
    filename: Optional[str] = None
    url: Optional[str] = None
    chunks: int = 0
    type: str = "unknown"
    uploadId: Optional[str] = None

class DocumentInventory(BaseModel):
    totalDocuments: int = 0
    totalChunks: int = 0
    pdfDocuments: List[DocumentInfo] = []
    webDocuments: List[DocumentInfo] = []

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    use_multi_agent: bool = True
    agent_config: Optional[AgentConfig] = None
    stream: bool = False
    namespace: str = ""
    document_inventory: Optional[DocumentInventory] = None
    
class AgentMessage(BaseModel):
    agent_name: str
    role: str
    content: str
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    messages: List[AgentMessage]
    final_response: str
    context_used: List[Dict[str, Any]]
    processing_time: float
    agents_involved: List[str]
    conversation_summary: Optional[str] = None

class ContextResult(BaseModel):
    content: str
    source: str
    score: float
    metadata: Dict[str, Any]

class AgentStatus(BaseModel):
    name: str
    active: bool
    last_used: Optional[str] = None
    message_count: int = 0
    configuration: Dict[str, Any]