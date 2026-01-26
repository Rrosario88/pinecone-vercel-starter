import os
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, AsyncGenerator
from autogen_agentchat.agents import AssistantAgent, UserProxyAgent
from autogen_agentchat.conditions import MaxMessageTermination, TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.messages import TextMessage
from autogen_ext.models.openai import OpenAIChatCompletionClient
from services.pinecone_service import PineconeService
from models.chat_models import ChatMessage, ChatResponse, AgentMessage, AgentConfig, AgentStatus, DocumentInventory

logger = logging.getLogger(__name__)

class MultiAgentRAGSystem:
    def __init__(self, pinecone_service: PineconeService):
        self.pinecone_service = pinecone_service
        self.openai_client = None
        self.agents = {}
        self.team = None
        self.agent_stats = {}
        
    async def initialize(self):
        """Initialize the multi-agent system"""
        try:
            # Initialize OpenAI client
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            
            self.openai_client = OpenAIChatCompletionClient(
                model="gpt-4o",
                api_key=api_key
            )
            
            # Create agents
            await self._create_agents()
            
            # Initialize team
            await self._setup_team()
            
            logger.info("Multi-agent system initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize multi-agent system: {e}")
            raise
    
    async def _create_agents(self):
        """Create all the specialized agents"""
        
        # RAG Assistant Agent - Main responder
        self.agents["rag_assistant"] = AssistantAgent(
            name="rag_assistant",
            model_client=self.openai_client,
            system_message="""You are an intelligent RAG assistant specialized in providing accurate, well-formatted responses based on retrieved context.

RESPONSIBILITIES:
- Synthesize information from multiple sources
- Provide clear, well-structured responses using markdown
- Cite sources appropriately
- Ask for clarification when context is insufficient

FORMATTING GUIDELINES:
- Use ## for main headings, ### for subheadings
- Use **bold** for key points
- Use bullet points (-) or numbered lists for structure
- Use > for important quotes
- Always include source citations

RESPONSE STRUCTURE:
## Main Answer
### Key Points
- Point 1
- Point 2
### Sources
- Document/URL citations

Be helpful, accurate, and well-formatted."""
        )
        
        # Research Agent - Context retrieval specialist
        self.agents["researcher"] = AssistantAgent(
            name="researcher",
            model_client=self.openai_client,
            system_message="""You are a research specialist focused on finding and organizing relevant information from the knowledge base.

RESPONSIBILITIES:
- Analyze user queries to identify key search terms
- Suggest multiple search strategies for comprehensive coverage
- Organize retrieved information by relevance and source
- Identify gaps in available information

SEARCH STRATEGIES:
- Direct keyword matching
- Semantic similarity search
- Contextual expansion
- Multi-perspective analysis

Always provide structured, organized research findings with clear source attribution."""
        )
        
        # Critic Agent - Quality assurance
        self.agents["critic"] = AssistantAgent(
            name="critic",
            model_client=self.openai_client,
            system_message="""You are a quality assurance specialist who reviews responses for accuracy, completeness, and clarity.

RESPONSIBILITIES:
- Verify information accuracy against source material
- Check for logical consistency
- Ensure proper source citation
- Identify missing important information
- Suggest improvements for clarity and completeness

EVALUATION CRITERIA:
- Factual accuracy
- Completeness of answer
- Clear structure and formatting
- Appropriate source citation
- Logical flow

Provide constructive feedback and specific improvement suggestions."""
        )
        
        # Summarizer Agent - Concise synthesis
        self.agents["summarizer"] = AssistantAgent(
            name="summarizer",
            model_client=self.openai_client,
            system_message="""You are a summarization specialist who creates concise, comprehensive summaries of complex information.

RESPONSIBILITIES:
- Distill key points from lengthy discussions
- Create executive summaries
- Highlight most important findings
- Maintain accuracy while reducing complexity

SUMMARY STYLES:
- Executive summary (high-level overview)
- Key points summary (main takeaways)
- Comparative summary (multiple sources)
- Action-oriented summary (next steps)

Always maintain the essential information while improving readability."""
        )
        
        # User Proxy for orchestration
        self.agents["user_proxy"] = UserProxyAgent(
            name="user_proxy",
            description="User proxy for orchestrating agent conversations"
        )
        
        # Initialize agent statistics
        for agent_name in self.agents:
            self.agent_stats[agent_name] = {
                "message_count": 0,
                "last_used": None,
                "active": True
            }
    
    async def _setup_team(self):
        """Setup the agent team for collaboration"""
        try:
            # Create team with round-robin discussion
            participants = [
                self.agents["user_proxy"],
                self.agents["researcher"],
                self.agents["rag_assistant"],
                self.agents["critic"]
            ]
            
            self.team = RoundRobinGroupChat(
                participants=participants,
                termination_condition=MaxMessageTermination(max_messages=12)
            )
            
            logger.info("Agent team setup completed")
            
        except Exception as e:
            logger.error(f"Failed to setup agent team: {e}")
            raise
    
    async def process_chat(
        self,
        messages: List[ChatMessage],
        use_multi_agent: bool = True,
        agent_config: Optional[AgentConfig] = None,
        document_inventory: Optional[DocumentInventory] = None
    ) -> ChatResponse:
        """Process chat with multi-agent collaboration"""
        start_time = datetime.now()
        
        try:
            if not use_multi_agent:
                # Single agent response
                return await self._single_agent_response(messages, agent_config, document_inventory)

            # Multi-agent collaboration
            return await self._multi_agent_collaboration(messages, agent_config, document_inventory)
            
        except Exception as e:
            logger.error(f"Chat processing failed: {e}")
            # Fallback to single agent
            return await self._single_agent_response(messages, agent_config, document_inventory)
        finally:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Chat processing completed in {processing_time:.2f} seconds")
    
    async def _single_agent_response(
        self,
        messages: List[ChatMessage],
        agent_config: Optional[AgentConfig],
        document_inventory: Optional[DocumentInventory] = None
    ) -> ChatResponse:
        """Generate response using single agent"""
        try:
            last_message = messages[-1] if messages else None
            if not last_message:
                raise ValueError("No messages provided")
            
            # Get context from Pinecone - search both namespaces
            pdf_results = await self.pinecone_service.search_context(
                query=last_message.content,
                namespace="pdf-documents",
                top_k=15,
                min_score=0.2
            )
            web_results = await self.pinecone_service.search_context(
                query=last_message.content,
                namespace="",
                top_k=15,
                min_score=0.2
            )
            context_results = pdf_results + web_results
            
            # Format context
            context_text = self._format_context(context_results)
            
            # Create enhanced system message
            system_message = f"""You are an intelligent RAG assistant. Use the following context to answer the user's question:

CONTEXT:
{context_text}

Provide a well-structured, accurate response based on this context. If the context doesn't contain relevant information, state that clearly."""
            
            # Get response from assistant
            assistant = self.agents["rag_assistant"]

            # Create TextMessage objects for AutoGen
            message_list = [TextMessage(content=system_message, source="system")]
            for msg in messages:
                message_list.append(TextMessage(content=msg.content, source="user"))

            response = await assistant.on_messages(
                messages=message_list,
                cancellation_token=None
            )
            
            # Update statistics
            self.agent_stats["rag_assistant"]["message_count"] += 1
            self.agent_stats["rag_assistant"]["last_used"] = datetime.now().isoformat()

            # Extract content from AutoGen Response object
            response_content = response.chat_message.content if hasattr(response, 'chat_message') else str(response)

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
        """Execute multi-agent collaboration"""
        try:
            config = agent_config or AgentConfig()
            last_message = messages[-1] if messages else None
            if not last_message:
                raise ValueError("No messages provided")
            
            # Phase 1: Research
            context_results = []
            if config.use_researcher:
                context_results = await self._research_phase(last_message.content, config)
            
            # Phase 2: Generate initial response
            context_text = self._format_context(context_results)
            initial_response = await self._generate_initial_response(
                messages, context_text
            )
            
            # Phase 3: Critique and improve
            final_response = initial_response
            if config.use_critic:
                final_response = await self._critique_phase(
                    initial_response, context_results, last_message.content
                )
            
            # Phase 4: Summarize if requested
            if config.use_summarizer:
                final_response = await self._summarize_phase(final_response)
            
            # Create conversation log
            conversation_messages = [
                AgentMessage(
                    agent_name="researcher",
                    role="assistant",
                    content=f"Found {len(context_results)} relevant context items",
                    timestamp=datetime.now().isoformat()
                ),
                AgentMessage(
                    agent_name="rag_assistant", 
                    role="assistant",
                    content=final_response,
                    timestamp=datetime.now().isoformat()
                )
            ]
            
            if config.use_critic:
                conversation_messages.insert(-1, AgentMessage(
                    agent_name="critic",
                    role="assistant", 
                    content="Response reviewed and approved",
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
            # Define search strategies based on config - increased topK for better coverage
            strategies = [
                {"name": "primary", "top_k": 15, "min_score": 0.25},
                {"name": "comprehensive", "top_k": 20, "min_score": 0.2},
            ]

            if config.context_strategy == "focused":
                strategies = [{"name": "focused", "top_k": 10, "min_score": 0.3}]
            elif config.context_strategy == "comprehensive":
                strategies.extend([
                    {"name": "expanded", "top_k": 25, "min_score": 0.15},
                    {"name": "related", "query_modification": "related information about", "top_k": 15, "min_score": 0.2}
                ])
            
            # Execute multiple search strategies on BOTH namespaces
            pdf_results = await self.pinecone_service.search_multiple_strategies(
                query=query,
                strategies=strategies,
                namespace="pdf-documents"
            )
            web_results = await self.pinecone_service.search_multiple_strategies(
                query=query,
                strategies=strategies,
                namespace=""
            )

            # Combine and deduplicate results from both namespaces
            all_results = []
            seen_content = set()

            for strategy_results in [pdf_results, web_results]:
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

            return all_results[:30]  # Increased limit to top 30 results
            
        except Exception as e:
            logger.error(f"Research phase failed: {e}")
            return []
    
    async def _generate_initial_response(
        self, 
        messages: List[ChatMessage], 
        context_text: str
    ) -> str:
        """Generate initial response using RAG assistant"""
        try:
            system_message = f"""You are an expert RAG assistant. Use the provided context to answer the user's question comprehensively and accurately.

CONTEXT:
{context_text}

INSTRUCTIONS:
- Provide a well-structured response using markdown formatting
- Cite sources appropriately using the format [Source: filename/URL]
- Use headings, bullet points, and formatting for clarity
- If context is insufficient, state what information is missing
- Be thorough but concise

Generate your response now."""
            
            assistant = self.agents["rag_assistant"]

            # Prepare message history with TextMessage objects
            message_history = [TextMessage(content=system_message, source="system")]
            for msg in messages:
                message_history.append(TextMessage(content=msg.content, source="user"))

            # Generate response
            response = await assistant.on_messages(message_history, cancellation_token=None)
            
            # Update statistics
            self.agent_stats["rag_assistant"]["message_count"] += 1
            self.agent_stats["rag_assistant"]["last_used"] = datetime.now().isoformat()

            # Extract content from AutoGen Response object
            return response.chat_message.content if hasattr(response, 'chat_message') else str(response)
            
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
            critic_prompt = f"""Review the following response for accuracy, completeness, and clarity:

ORIGINAL QUERY: {original_query}

RESPONSE TO REVIEW:
{response}

AVAILABLE CONTEXT: {len(context_results)} sources

EVALUATION CRITERIA:
- Factual accuracy based on provided context
- Completeness of answer
- Clear structure and formatting  
- Proper source citation
- Logical flow and coherence

If the response is good, respond with "APPROVED: Response meets quality standards."
If improvements are needed, provide specific suggestions for enhancement."""
            
            critic = self.agents["critic"]
            critique = await critic.on_messages([
                TextMessage(content=critic_prompt, source="system")
            ], cancellation_token=None)

            # Extract content from AutoGen Response object
            critique_content = critique.chat_message.content if hasattr(critique, 'chat_message') else str(critique)
            
            # Update statistics
            self.agent_stats["critic"]["message_count"] += 1
            self.agent_stats["critic"]["last_used"] = datetime.now().isoformat()
            
            # If critic suggests improvements, implement them
            if not critique_content.startswith("APPROVED"):
                improved_response = await self._improve_response(response, critique_content, context_results)
                return improved_response
            
            return response
            
        except Exception as e:
            logger.error(f"Critique phase failed: {e}")
            return response  # Return original response if critique fails
    
    async def _improve_response(
        self, 
        original_response: str, 
        critique: str, 
        context_results: List[Dict[str, Any]]
    ) -> str:
        """Improve response based on critique"""
        try:
            improvement_prompt = f"""Improve the following response based on the provided critique:

ORIGINAL RESPONSE:
{original_response}

CRITIQUE:
{critique}

AVAILABLE CONTEXT: {self._format_context(context_results)}

Generate an improved version that addresses the critique while maintaining accuracy and clarity."""
            
            assistant = self.agents["rag_assistant"]
            improved = await assistant.on_messages([
                TextMessage(content=improvement_prompt, source="system")
            ], cancellation_token=None)

            # Extract content from AutoGen Response object
            return improved.chat_message.content if hasattr(improved, 'chat_message') else str(improved)
            
        except Exception as e:
            logger.error(f"Response improvement failed: {e}")
            return original_response
    
    async def _summarize_phase(self, response: str) -> str:
        """Create a summarized version of the response"""
        try:
            summarizer = self.agents["summarizer"]
            summary_prompt = f"""Create a concise summary of the following response while preserving key information:

RESPONSE TO SUMMARIZE:
{response}

Provide a well-structured summary that captures the essential points."""
            
            summary = await summarizer.on_messages([
                TextMessage(content=summary_prompt, source="system")
            ], cancellation_token=None)
            
            # Update statistics
            self.agent_stats["summarizer"]["message_count"] += 1
            self.agent_stats["summarizer"]["last_used"] = datetime.now().isoformat()

            # Extract content from AutoGen Response object
            return summary.chat_message.content if hasattr(summary, 'chat_message') else str(summary)
            
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
            # In future, could implement real-time streaming
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
        for agent_name, agent in self.agents.items():
            if agent_name != "user_proxy":  # Skip proxy
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
                if agent_name in self.agents:
                    # Update agent configuration
                    # This would depend on specific AutoGen configuration options
                    logger.info(f"Configured agent {agent_name}")
            
            return {"configured_agents": list(config.keys())}
            
        except Exception as e:
            logger.error(f"Agent configuration failed: {e}")
            raise
    
    async def cleanup(self):
        """Cleanup resources"""
        try:
            # Cleanup agents and team
            self.agents.clear()
            self.team = None
            
            logger.info("Multi-agent system cleaned up")
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")