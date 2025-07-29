import os
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, AsyncGenerator

from services.pinecone_service import PineconeService
from models.chat_models import ChatMessage, ChatResponse, AgentMessage, AgentConfig, AgentStatus, DocumentInventory
import openai

logger = logging.getLogger(__name__)

class SimpleMultiAgentRAGSystem:
    """Simplified multi-agent system that simulates agent collaboration using OpenAI calls"""
    
    def __init__(self, pinecone_service: PineconeService):
        self.pinecone_service = pinecone_service
        self.openai_client = None
        self.agent_stats = {
            "researcher": {"message_count": 0, "last_used": None, "active": True},
            "rag_assistant": {"message_count": 0, "last_used": None, "active": True},
            "critic": {"message_count": 0, "last_used": None, "active": True},
            "summarizer": {"message_count": 0, "last_used": None, "active": True},
        }
        
    async def initialize(self):
        """Initialize the multi-agent system"""
        try:
            # Initialize OpenAI client
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            
            self.openai_client = openai.AsyncOpenAI(api_key=api_key)
            
            logger.info("Simple multi-agent system initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize multi-agent system: {e}")
            raise
    
    async def process_chat(
        self,
        messages: List[ChatMessage],
        use_multi_agent: bool = True,
        agent_config: Optional[AgentConfig] = None,
        document_inventory: Optional[DocumentInventory] = None
    ) -> ChatResponse:
        """Process chat with simulated multi-agent collaboration"""
        start_time = datetime.now()
        
        try:
            if not use_multi_agent:
                # Single agent response
                return await self._single_agent_response(messages, agent_config)
            
            # Multi-agent collaboration
            return await self._multi_agent_collaboration(messages, agent_config, document_inventory)
            
        except Exception as e:
            logger.error(f"Chat processing failed: {e}")
            # Fallback to single agent
            return await self._single_agent_response(messages, agent_config)
        finally:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Chat processing completed in {processing_time:.2f} seconds")
    
    async def _single_agent_response(
        self,
        messages: List[ChatMessage],
        agent_config: Optional[AgentConfig]
    ) -> ChatResponse:
        """Generate response using single agent"""
        try:
            last_message = messages[-1] if messages else None
            if not last_message:
                raise ValueError("No messages provided")
            
            # Get context from Pinecone
            context_results = await self.pinecone_service.search_context(
                query=last_message.content,
                namespace="",
                top_k=8,
                min_score=0.3
            )
            
            # Format context
            context_text = self._format_context(context_results)
            
            # Create enhanced system message
            system_message = f"""You are an intelligent RAG assistant. Use the following context to answer the user's question:

CONTEXT:
{context_text}

Provide a well-structured, accurate response based on this context. If the context doesn't contain relevant information, state that clearly."""
            
            # Get response from OpenAI
            chat_messages = [{"role": "system", "content": system_message}]
            for msg in messages:
                chat_messages.append({"role": msg.role.value, "content": msg.content})
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=chat_messages,
                temperature=0.7
            )
            
            response_content = response.choices[0].message.content
            
            # Update statistics
            self.agent_stats["rag_assistant"]["message_count"] += 1
            self.agent_stats["rag_assistant"]["last_used"] = datetime.now().isoformat()
            
            return ChatResponse(
                messages=[
                    AgentMessage(
                        agent_name="rag_assistant",
                        role="assistant", 
                        content=response_content,
                        timestamp=datetime.now().isoformat()
                    )
                ],
                final_response=response_content,
                context_used=context_results,
                processing_time=0.0,
                agents_involved=["rag_assistant"]
            )
            
        except Exception as e:
            logger.error(f"Single agent response failed: {e}")
            raise
    
    async def _multi_agent_collaboration(
        self,
        messages: List[ChatMessage],
        agent_config: Optional[AgentConfig],
        document_inventory: Optional[DocumentInventory] = None
    ) -> ChatResponse:
        """Execute simulated multi-agent collaboration"""
        try:
            config = agent_config or AgentConfig()
            last_message = messages[-1] if messages else None
            if not last_message:
                raise ValueError("No messages provided")
            
            conversation_messages = []
            
            # Phase 1: Research with document awareness
            context_results = []
            document_awareness_text = ""
            
            if document_inventory:
                pdf_names = [doc.filename for doc in document_inventory.pdfDocuments if doc.filename]
                web_names = [doc.url for doc in document_inventory.webDocuments if doc.url]
                document_awareness_text = f"Available Documents: {', '.join(pdf_names + web_names)} ({document_inventory.totalDocuments} total)"
            
            if config.use_researcher:
                context_results = await self._research_phase(last_message.content, config)
                research_msg = f"🔍 Research complete: Found {len(context_results)} relevant context items"
                if document_inventory and document_inventory.totalDocuments > 0:
                    research_msg += f" from {document_inventory.totalDocuments} available documents"
                research_msg += "."
                
                conversation_messages.append(AgentMessage(
                    agent_name="researcher",
                    role="assistant",
                    content=research_msg,
                    timestamp=datetime.now().isoformat()
                ))
            
            # Phase 2: Generate initial response with document awareness
            context_text = self._format_context(context_results)
            initial_response = await self._generate_initial_response(
                messages, context_text, document_awareness_text
            )
            
            conversation_messages.append(AgentMessage(
                agent_name="rag_assistant", 
                role="assistant",
                content="🧠 Generated comprehensive response based on retrieved context.",
                timestamp=datetime.now().isoformat()
            ))
            
            # Phase 3: Critique and improve
            final_response = initial_response
            if config.use_critic:
                final_response = await self._critique_phase(
                    initial_response, context_results, last_message.content
                )
                conversation_messages.append(AgentMessage(
                    agent_name="critic",
                    role="assistant", 
                    content="🎯 Response reviewed and refined for accuracy and completeness.",
                    timestamp=datetime.now().isoformat()
                ))
            
            # Phase 4: Summarize if requested
            if config.use_summarizer:
                final_response = await self._summarize_phase(final_response)
                conversation_messages.append(AgentMessage(
                    agent_name="summarizer",
                    role="assistant", 
                    content="📝 Response summarized for clarity and conciseness.",
                    timestamp=datetime.now().isoformat()
                ))
            
            # Add final response
            conversation_messages.append(AgentMessage(
                agent_name="rag_assistant",
                role="assistant",
                content=final_response,
                timestamp=datetime.now().isoformat()
            ))
            
            return ChatResponse(
                messages=conversation_messages,
                final_response=final_response,
                context_used=context_results,
                processing_time=0.0,
                agents_involved=self._get_active_agents(config)
            )
            
        except Exception as e:
            logger.error(f"Multi-agent collaboration failed: {e}")
            raise
    
    async def _research_phase(self, query: str, config: AgentConfig) -> List[Dict[str, Any]]:
        """Execute research phase to gather context"""
        try:
            # Define search strategies based on config
            strategies = [
                {"name": "primary", "top_k": 5, "min_score": 0.4},
                {"name": "comprehensive", "top_k": 8, "min_score": 0.3},
            ]
            
            if config.context_strategy == "focused":
                strategies = [{"name": "focused", "top_k": 3, "min_score": 0.5}]
            elif config.context_strategy == "comprehensive":
                strategies.extend([
                    {"name": "expanded", "top_k": 10, "min_score": 0.2}
                ])
            
            # Execute multiple search strategies
            strategy_results = await self.pinecone_service.search_multiple_strategies(
                query=query,
                strategies=strategies,
                namespace=""
            )
            
            # Combine and deduplicate results
            all_results = []
            seen_content = set()
            
            for strategy_name, results in strategy_results.items():
                for result in results:
                    content_hash = hash(result["content"])
                    if content_hash not in seen_content:
                        seen_content.add(content_hash)
                        result["strategy"] = strategy_name
                        all_results.append(result)
            
            # Sort by relevance score
            all_results.sort(key=lambda x: x["score"], reverse=True)
            
            # Update statistics
            self.agent_stats["researcher"]["message_count"] += 1
            self.agent_stats["researcher"]["last_used"] = datetime.now().isoformat()
            
            return all_results[:15]  # Limit to top 15 results
            
        except Exception as e:
            logger.error(f"Research phase failed: {e}")
            return []
    
    async def _generate_initial_response(
        self, 
        messages: List[ChatMessage], 
        context_text: str,
        document_awareness: str = ""
    ) -> str:
        """Generate initial response using RAG assistant"""
        try:
            doc_context = f"\n{document_awareness}\n" if document_awareness else ""
            
            system_message = f"""You are an expert document analysis assistant. You have access to uploaded documents and can search through their content to provide accurate answers.

{doc_context}

RELEVANT CONTENT FROM YOUR SEARCH:
{context_text}

INSTRUCTIONS:
- Answer naturally and conversationally using the provided context
- Reference documents by their names when citing information
- Use clear markdown formatting (##, ###, bullet points, **bold**)
- Include specific source citations in the format [Source: filename/URL]
- If the available content doesn't fully answer the question, mention what additional information might be helpful
- Be thorough but concise
- Don't mention technical system details or "document inventory"

Provide a helpful, well-formatted response based on the available information."""
            
            # Prepare message history
            message_history = [{"role": "system", "content": system_message}]
            for msg in messages:
                message_history.append({"role": msg.role.value, "content": msg.content})
            
            # Generate response
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=message_history,
                temperature=0.7
            )
            
            # Update statistics
            self.agent_stats["rag_assistant"]["message_count"] += 1
            self.agent_stats["rag_assistant"]["last_used"] = datetime.now().isoformat()
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Initial response generation failed: {e}")
            raise
    
    async def _critique_phase(
        self, 
        response: str, 
        context_results: List[Dict[str, Any]], 
        original_query: str
    ) -> str:
        """Critique and improve the response"""
        try:
            critic_prompt = f"""Review and improve the following response for accuracy, completeness, and clarity:

ORIGINAL QUERY: {original_query}

RESPONSE TO REVIEW:
{response}

AVAILABLE CONTEXT: {len(context_results)} sources available

EVALUATION CRITERIA:
- Factual accuracy based on provided context
- Completeness of answer
- Clear structure and formatting  
- Proper source citation
- Logical flow and coherence
- Professional tone and readability

If the response is excellent, return it unchanged with "APPROVED:" at the start.
If improvements are needed, provide an enhanced version that addresses any issues while maintaining accuracy."""
            
            critique_response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": critic_prompt}],
                temperature=0.5
            )
            
            critique_content = critique_response.choices[0].message.content
            
            # Update statistics
            self.agent_stats["critic"]["message_count"] += 1
            self.agent_stats["critic"]["last_used"] = datetime.now().isoformat()
            
            # If critic suggests improvements, return the improved version
            if critique_content.startswith("APPROVED:"):
                return response
            else:
                return critique_content
            
        except Exception as e:
            logger.error(f"Critique phase failed: {e}")
            return response  # Return original response if critique fails
    
    async def _summarize_phase(self, response: str) -> str:
        """Create a summarized version of the response"""
        try:
            summary_prompt = f"""Create a concise, well-structured summary of the following response while preserving all key information and actionable insights:

RESPONSE TO SUMMARIZE:
{response}

Requirements:
- Maintain all essential information and conclusions
- Use clear, professional language
- Preserve important details and source citations
- Use bullet points or numbered lists for key points
- Keep the summary comprehensive but more readable

Provide the improved summary now."""
            
            summary_response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": summary_prompt}],
                temperature=0.5
            )
            
            # Update statistics
            self.agent_stats["summarizer"]["message_count"] += 1
            self.agent_stats["summarizer"]["last_used"] = datetime.now().isoformat()
            
            return summary_response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            return response
    
    def _format_context(self, context_results: List[Dict[str, Any]]) -> str:
        """Format context results for agent consumption"""
        if not context_results:
            return "No relevant context found in the knowledge base."
        
        formatted_context = []
        for i, result in enumerate(context_results, 1):
            source = result.get("source", "Unknown source")
            content = result.get("content", "")
            score = result.get("score", 0.0)
            
            formatted_context.append(f"""
[Context {i}] (Relevance: {score:.3f})
Source: {source}
Content: {content}
---""")
        
        return "\n".join(formatted_context)
    
    def _get_active_agents(self, config: AgentConfig) -> List[str]:
        """Get list of active agents based on configuration"""
        active = ["rag_assistant"]
        
        if config.use_researcher:
            active.append("researcher")
        if config.use_critic:
            active.append("critic") 
        if config.use_summarizer:
            active.append("summarizer")
            
        return active
    
    async def process_chat_stream(
        self,
        messages: List[ChatMessage],
        use_multi_agent: bool = True,
        agent_config: Optional[AgentConfig] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Stream multi-agent conversation in real-time"""
        try:
            # For now, process normally and yield final result
            response = await self.process_chat(messages, use_multi_agent, agent_config)
            
            # Yield progress updates
            for i, message in enumerate(response.messages):
                yield {
                    "type": "agent_message",
                    "agent": message.agent_name,
                    "content": message.content,
                    "timestamp": message.timestamp,
                    "step": i + 1,
                    "total_steps": len(response.messages)
                }
            
            # Yield final response
            yield {
                "type": "final_response",
                "content": response.final_response,
                "context_used": len(response.context_used),
                "agents_involved": response.agents_involved,
                "processing_time": response.processing_time
            }
            
        except Exception as e:
            yield {"type": "error", "message": str(e)}
    
    async def process_chat_websocket(
        self,
        messages: List[ChatMessage],
        use_multi_agent: bool = True,
        agent_config: Optional[AgentConfig] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """Process chat for WebSocket streaming"""
        async for item in self.process_chat_stream(messages, use_multi_agent, agent_config):
            yield item
    
    async def get_agents_status(self) -> Dict[str, AgentStatus]:
        """Get status of all agents"""
        status = {}
        for agent_name in ["researcher", "rag_assistant", "critic", "summarizer"]:
            stats = self.agent_stats.get(agent_name, {})
            status[agent_name] = AgentStatus(
                name=agent_name,
                active=stats.get("active", True),
                last_used=stats.get("last_used"),
                message_count=stats.get("message_count", 0),
                configuration={}
            )
        return status
    
    async def configure_agents(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Configure agent parameters"""
        try:
            # Apply configuration changes
            for agent_name, agent_config in config.items():
                if agent_name in self.agent_stats:
                    logger.info(f"Configured agent {agent_name}")
            
            return {"configured_agents": list(config.keys())}
            
        except Exception as e:
            logger.error(f"Agent configuration failed: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            if self.openai_client:
                await self.openai_client.close()
            
            logger.info("Simple multi-agent system cleaned up")
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")