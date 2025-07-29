import os
import logging
from typing import Dict, Any, List, Optional
import json
from datetime import datetime

logger = logging.getLogger(__name__)

def load_config() -> Dict[str, Any]:
    """Load configuration from environment variables"""
    config = {
        "openai_api_key": os.getenv("OPENAI_API_KEY"),
        "pinecone_api_key": os.getenv("PINECONE_API_KEY"), 
        "pinecone_index": os.getenv("PINECONE_INDEX"),
        "pinecone_environment": os.getenv("PINECONE_ENVIRONMENT"),
        "port": int(os.getenv("PORT", 8000)),
        "log_level": os.getenv("LOG_LEVEL", "INFO"),
        "max_context_length": int(os.getenv("MAX_CONTEXT_LENGTH", 4000)),
        "default_temperature": float(os.getenv("DEFAULT_TEMPERATURE", 0.7)),
    }
    
    # Validate required config
    required_keys = ["openai_api_key", "pinecone_api_key", "pinecone_index"]
    missing_keys = [key for key in required_keys if not config[key]]
    
    if missing_keys:
        raise ValueError(f"Missing required configuration: {', '.join(missing_keys)}")
    
    return config

def setup_logging(level: str = "INFO"):
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
        ]
    )

def format_timestamp() -> str:
    """Get formatted timestamp"""
    return datetime.now().isoformat()

def truncate_text(text: str, max_length: int = 1000) -> str:
    """Truncate text to specified length"""
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."

def extract_code_blocks(text: str) -> List[Dict[str, str]]:
    """Extract code blocks from markdown text"""
    import re
    
    code_blocks = []
    pattern = r'```(\w+)?\n(.*?)\n```'
    
    for match in re.finditer(pattern, text, re.DOTALL):
        language = match.group(1) or "text"
        code = match.group(2)
        code_blocks.append({
            "language": language,
            "code": code.strip()
        })
    
    return code_blocks

def sanitize_filename(filename: str) -> str:
    """Sanitize filename for safe storage"""
    import re
    # Remove or replace unsafe characters
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    return sanitized[:255]  # Limit length

def calculate_similarity_score(text1: str, text2: str) -> float:
    """Calculate basic similarity score between two texts"""
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    
    if not words1 or not words2:
        return 0.0
    
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    
    return len(intersection) / len(union) if union else 0.0

def merge_context_results(
    results_list: List[List[Dict[str, Any]]],
    max_results: int = 20
) -> List[Dict[str, Any]]:
    """Merge and deduplicate context results from multiple searches"""
    all_results = []
    seen_content = set()
    
    for results in results_list:
        for result in results:
            content = result.get("content", "")
            content_hash = hash(content)
            
            if content_hash not in seen_content and content.strip():
                seen_content.add(content_hash)
                all_results.append(result)
    
    # Sort by score
    all_results.sort(key=lambda x: x.get("score", 0), reverse=True)
    
    return all_results[:max_results]

def estimate_tokens(text: str) -> int:
    """Rough estimation of token count"""
    # Approximate: 1 token ≈ 4 characters
    return len(text) // 4

def chunk_text_by_tokens(text: str, max_tokens: int = 1000) -> List[str]:
    """Chunk text to fit within token limits"""
    estimated_tokens = estimate_tokens(text)
    
    if estimated_tokens <= max_tokens:
        return [text]
    
    # Split by sentences or paragraphs
    sentences = text.split('. ')
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        test_chunk = current_chunk + sentence + ". "
        if estimate_tokens(test_chunk) <= max_tokens:
            current_chunk = test_chunk
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
            else:
                # Single sentence too long, force split
                chunks.append(sentence)
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    return chunks

def create_error_response(error: Exception, context: str = "") -> Dict[str, Any]:
    """Create standardized error response"""
    return {
        "error": True,
        "message": str(error),
        "context": context,
        "timestamp": format_timestamp(),
        "type": type(error).__name__
    }

def validate_chat_request(data: Dict[str, Any]) -> List[str]:
    """Validate chat request data"""
    errors = []
    
    if "messages" not in data:
        errors.append("Missing 'messages' field")
    elif not isinstance(data["messages"], list):
        errors.append("'messages' must be a list")
    elif not data["messages"]:
        errors.append("'messages' cannot be empty")
    
    if "use_multi_agent" in data and not isinstance(data["use_multi_agent"], bool):
        errors.append("'use_multi_agent' must be a boolean")
    
    return errors

class ContextManager:
    """Helper class for managing context across agent interactions"""
    
    def __init__(self, max_context_length: int = 4000):
        self.max_context_length = max_context_length
        self.context_history = []
    
    def add_context(self, context: Dict[str, Any]):
        """Add context item"""
        self.context_history.append({
            **context,
            "timestamp": format_timestamp()
        })
    
    def get_relevant_context(self, query: str, max_items: int = 10) -> List[Dict[str, Any]]:
        """Get most relevant context for query"""
        if not self.context_history:
            return []
        
        # Simple relevance scoring based on text similarity
        scored_context = []
        for ctx in self.context_history:
            content = ctx.get("content", "")
            score = calculate_similarity_score(query, content)
            scored_context.append((score, ctx))
        
        # Sort by score and return top items
        scored_context.sort(key=lambda x: x[0], reverse=True)
        return [ctx for score, ctx in scored_context[:max_items]]
    
    def format_context_for_prompt(self, contexts: List[Dict[str, Any]]) -> str:
        """Format context for use in prompts"""
        if not contexts:
            return "No relevant context available."
        
        formatted_parts = []
        total_length = 0
        
        for i, ctx in enumerate(contexts, 1):
            content = ctx.get("content", "")
            source = ctx.get("source", "Unknown")
            score = ctx.get("score", 0.0)
            
            part = f"[Context {i}] (Score: {score:.3f})\nSource: {source}\nContent: {content}\n---"
            
            if total_length + len(part) > self.max_context_length:
                break
                
            formatted_parts.append(part)
            total_length += len(part)
        
        return "\n\n".join(formatted_parts)
    
    def clear_context(self):
        """Clear context history"""
        self.context_history.clear()

def format_agent_response(
    agent_name: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """Format agent response consistently"""
    return {
        "agent_name": agent_name,
        "content": content,
        "timestamp": format_timestamp(),
        "metadata": metadata or {}
    }