import os
import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional, AsyncGenerator

from services.pinecone_service import PineconeService
from models.chat_models import ChatMessage, ChatResponse, AgentMessage, AgentConfig, AgentStatus, DocumentInventory
import openai
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

class RealMultiAgentRAGSystem:
    """Enhanced multi-agent system with real agent collaboration patterns"""
    
    def __init__(self, pinecone_service: PineconeService):
        self.pinecone_service = pinecone_service
        self.openai_client = None
        self.agent_stats = {
            "researcher": {"message_count": 0, "last_used": None, "active": True},
            "analyst": {"message_count": 0, "last_used": None, "active": True},
            "reviewer": {"message_count": 0, "last_used": None, "active": True},
            "summarizer": {"message_count": 0, "last_used": None, "active": True},
        }
        
    async def initialize(self):
        """Initialize enhanced multi-agent system"""
        try:
            # Initialize OpenAI client
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise ValueError("OPENAI_API_KEY environment variable is required")
            
            self.openai_client = openai.AsyncOpenAI(api_key=api_key)
            
            logger.info("Enhanced multi-agent system initialized successfully")
            
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
        """Process chat using enhanced multi-agent collaboration"""
        start_time = datetime.now()
        
        try:
            if not use_multi_agent:
                return await self._single_agent_response(messages, agent_config, document_inventory)
            
            # Get latest user message
            last_message = messages[-1] if messages else None
            if not last_message:
                raise ValueError("No messages provided")
            
            # Process with enhanced multi-agent collaboration
            conversation_messages = await self._process_with_enhanced_collaboration(
                last_message.content, agent_config, document_inventory
            )
            
            # Extract final response
            final_response = self._extract_final_response(conversation_messages)
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return ChatResponse(
                messages=conversation_messages,
                final_response=final_response,
                context_used=[],  # Handled internally
                processing_time=processing_time,
                agents_involved=self._get_active_agents(agent_config)
            )
            
        except Exception as e:
            logger.error(f"Multi-agent chat processing failed: {e}")
            # Fallback to single agent
            return await self._single_agent_response(messages, agent_config, document_inventory)
        finally:
            processing_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"Multi-agent chat processing completed in {processing_time:.2f} seconds")
    
    async def _process_with_enhanced_collaboration(
        self, 
        message: str, 
        agent_config: Optional[AgentConfig],
        document_inventory: Optional[DocumentInventory]
    ) -> List[AgentMessage]:
        """Enhanced multi-agent collaboration with real agent interactions"""
        try:
            config = agent_config or AgentConfig()
            conversation_messages = []
            
            # Phase 1: Research with document awareness
            research_context = await self._enhance_message_with_context(
                message, document_inventory
            )
            
            if config.use_researcher:
                research_response = await self._agent_research_phase(research_context)
                conversation_messages.append(research_response)
                
                # Analyst responds to research
                analyst_response_to_research = await self._agent_analyze_research(
                    message, research_response.content
                )
                conversation_messages.append(analyst_response_to_research)
            
            # Phase 2: Generate comprehensive response
            comprehensive_response = await self._agent_comprehensive_analysis(
                message, research_context, conversation_messages
            )
            conversation_messages.append(comprehensive_response)
            
            # Phase 3: Review and refine
            review_response = None
            refined_response = None
            if config.use_critic:
                review_response = await self._agent_review_phase(
                    comprehensive_response.content, message
                )
                conversation_messages.append(review_response)
                
                # If review suggests changes, analyst incorporates feedback
                if not review_response.content.startswith("APPROVED:"):
                    refined_response = await self._agent_refine_response(
                        comprehensive_response.content, review_response.content, message
                    )
                    conversation_messages.append(refined_response)
            
            # Phase 4: Summarize if requested
            final_agent_message = comprehensive_response
            if config.use_summarizer:
                # Determine which content to summarize
                if config.use_critic and review_response and not review_response.content.startswith("APPROVED:") and refined_response:
                    content_to_summarize = refined_response.content
                else:
                    content_to_summarize = final_agent_message.content
                
                summary_response = await self._agent_summarize_phase(content_to_summarize)
                conversation_messages.append(summary_response)
                final_agent_message = summary_response
            
            return conversation_messages
            
        except Exception as e:
            logger.error(f"Enhanced collaboration failed: {e}")
            return [AgentMessage(
                agent_name="system",
                role="assistant",
                content=f"Multi-agent processing failed: {str(e)}",
                timestamp=datetime.now().isoformat()
            )]
    
    async def _enhance_message_with_context(
        self, 
        message: str, 
        document_inventory: Optional[DocumentInventory]
    ) -> str:
        """Enhance user message with document context"""
        try:
            context_info = ""
            
            if document_inventory and document_inventory.totalDocuments > 0:
                pdf_names = [doc.filename for doc in document_inventory.pdfDocuments if doc.filename]
                web_names = [doc.url for doc in document_inventory.webDocuments if doc.url]
                
                context_info = f"\n\nAvailable Documents: {len(pdf_names + web_names)} total"
                if pdf_names:
                    context_info += f"\nPDFs: {', '.join(pdf_names[:5])}"
                if web_names:
                    context_info += f"\nWeb Sources: {', '.join(web_names[:5])}"
            
            # Get relevant context from Pinecone
            context_results = await self.pinecone_service.search_context(
                query=message,
                namespace="",
                top_k=5,
                min_score=0.3
            )
            
            if context_results:
                context_info += f"\n\nRelevant Context Found: {len(context_results)} sources"
                for i, result in enumerate(context_results[:3], 1):
                    source = result.get("source", "Unknown")
                    content = result.get("content", "")[:200]
                    context_info += f"\n{i}. {source}: {content}..."
            
            enhanced_message = f"User Query: {message}{context_info}"
            
            # Update researcher stats
            self.agent_stats["researcher"]["message_count"] += 1
            self.agent_stats["researcher"]["last_used"] = datetime.now().isoformat()
            
            return enhanced_message
            
        except Exception as e:
            logger.error(f"Failed to enhance message with context: {e}")
            return message
    
    async def _agent_research_phase(self, enhanced_message: str) -> AgentMessage:
        """Research agent phase - gather and present context"""
        try:
            # Extract just the context part for the researcher
            context_part = enhanced_message.replace("User Query:", "").split("Available Documents:")[0].strip()
            
            research_prompt = f"""You are a Researcher Agent specializing in document analysis and information retrieval.

{enhanced_message}

Your task:
1. Analyze the available documents and context
2. Identify the most relevant information sources
3. Provide a comprehensive research summary
4. Cite sources using [Source: filename] format
5. Focus on accuracy and completeness

Provide a thorough research summary that will help the Analyst agent provide a complete response."""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a meticulous researcher specializing in document analysis."},
                    {"role": "user", "content": research_prompt}
                ],
                temperature=0.3
            )
            
            research_content = response.choices[0].message.content
            
            self.agent_stats["researcher"]["message_count"] += 1
            self.agent_stats["researcher"]["last_used"] = datetime.now().isoformat()
            
            return AgentMessage(
                agent_name="researcher",
                role="assistant",
                content=research_content,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Research phase failed: {e}")
            return AgentMessage(
                agent_name="researcher",
                role="assistant",
                content=f"Research encountered an error: {str(e)}",
                timestamp=datetime.now().isoformat()
            )
    
    async def _agent_analyze_research(self, original_query: str, research_findings: str) -> AgentMessage:
        """Analyst agent responds to research findings"""
        try:
            analysis_prompt = f"""You are an Analyst Agent. Review the research findings and prepare for comprehensive analysis.

ORIGINAL QUERY: {original_query}

RESEARCH FINDINGS:
{research_findings}

Your task:
1. Acknowledge the research findings
2. Identify key insights from the research
3. Prepare for generating a comprehensive response
4. Note any gaps or areas needing clarification

Provide a brief analysis of the research and your approach for the comprehensive response."""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an analytical agent preparing to synthesize information."},
                    {"role": "user", "content": analysis_prompt}
                ],
                temperature=0.5
            )
            
            analysis_content = response.choices[0].message.content
            
            self.agent_stats["analyst"]["message_count"] += 1
            self.agent_stats["analyst"]["last_used"] = datetime.now().isoformat()
            
            return AgentMessage(
                agent_name="analyst",
                role="assistant",
                content=analysis_content,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Research analysis failed: {e}")
            return AgentMessage(
                agent_name="analyst",
                role="assistant",
                content=f"Analysis of research encountered an error: {str(e)}",
                timestamp=datetime.now().isoformat()
            )
    
    async def _agent_comprehensive_analysis(
        self, 
        original_query: str, 
        research_context: str,
        previous_messages: List[AgentMessage]
    ) -> AgentMessage:
        """Generate comprehensive response based on all available information"""
        try:
            # Build context from previous messages
            conversation_context = ""
            for msg in previous_messages:
                conversation_context += f"{msg.agent_name.upper()}:\n{msg.content}\n\n"
            
            comprehensive_prompt = f"""You are an Analyst Agent generating a comprehensive response.

ORIGINAL QUERY: {original_query}

{conversation_context}

Your task:
1. Synthesize all available information
2. Generate a well-structured, comprehensive response
3. Use clear markdown formatting (headers, bullet points, bold text)
4. Include specific source citations
5. Address the original query completely
6. Ensure professional tone and readability

Provide a complete, well-formatted response based on all available information."""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an expert analyst specializing in comprehensive response generation."},
                    {"role": "user", "content": comprehensive_prompt}
                ],
                temperature=0.7
            )
            
            response_content = response.choices[0].message.content
            
            self.agent_stats["analyst"]["message_count"] += 1
            self.agent_stats["analyst"]["last_used"] = datetime.now().isoformat()
            
            return AgentMessage(
                agent_name="analyst",
                role="assistant",
                content=response_content,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Comprehensive analysis failed: {e}")
            return AgentMessage(
                agent_name="analyst",
                role="assistant",
                content=f"Comprehensive analysis encountered an error: {str(e)}",
                timestamp=datetime.now().isoformat()
            )
    
    async def _agent_review_phase(self, response: str, original_query: str) -> AgentMessage:
        """Review agent phase - quality assurance"""
        try:
            review_prompt = f"""You are a Reviewer Agent specializing in quality assurance and response refinement.

ORIGINAL QUERY: {original_query}

RESPONSE TO REVIEW:
{response}

Evaluation Criteria:
- Factual accuracy based on provided context
- Completeness of answer
- Clear structure and formatting  
- Proper source citation
- Logical flow and coherence
- Professional tone and readability

If the response is excellent and meets all criteria, return "APPROVED:" followed by the original response.
If improvements are needed, provide constructive feedback and specific suggestions for enhancement."""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a quality assurance reviewer with high standards."},
                    {"role": "user", "content": review_prompt}
                ],
                temperature=0.5
            )
            
            review_content = response.choices[0].message.content
            
            self.agent_stats["reviewer"]["message_count"] += 1
            self.agent_stats["reviewer"]["last_used"] = datetime.now().isoformat()
            
            return AgentMessage(
                agent_name="reviewer",
                role="assistant",
                content=review_content,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Review phase failed: {e}")
            return AgentMessage(
                agent_name="reviewer",
                role="assistant",
                content=f"Review encountered an error: {str(e)}",
                timestamp=datetime.now().isoformat()
            )
    
    async def _agent_refine_response(
        self, 
        original_response: str, 
        review_feedback: str, 
        original_query: str
    ) -> AgentMessage:
        """Refine response based on review feedback"""
        try:
            refine_prompt = f"""You are an Analyst Agent refining a response based on reviewer feedback.

ORIGINAL QUERY: {original_query}

ORIGINAL RESPONSE:
{original_response}

REVIEWER FEEDBACK:
{review_feedback}

Your task:
1. Address all concerns raised by the reviewer
2. Incorporate constructive feedback
3. Maintain the core information and accuracy
4. Improve structure and clarity as suggested
5. Ensure all source citations remain accurate

Provide an enhanced response that addresses the reviewer's feedback while maintaining quality."""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are an analyst skilled at incorporating feedback to improve responses."},
                    {"role": "user", "content": refine_prompt}
                ],
                temperature=0.6
            )
            
            refined_content = response.choices[0].message.content
            
            self.agent_stats["analyst"]["message_count"] += 1
            self.agent_stats["analyst"]["last_used"] = datetime.now().isoformat()
            
            return AgentMessage(
                agent_name="analyst",
                role="assistant",
                content=refined_content,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Refinement failed: {e}")
            return AgentMessage(
                agent_name="analyst",
                role="assistant",
                content=f"Refinement encountered an error: {str(e)}",
                timestamp=datetime.now().isoformat()
            )
    
    async def _agent_summarize_phase(self, response: str) -> AgentMessage:
        """Summarize response for clarity"""
        try:
            summary_prompt = f"""You are a Summarizer Agent creating a concise, well-structured summary.

RESPONSE TO SUMMARIZE:
{response}

Requirements:
- Maintain all essential information and conclusions
- Use clear, professional language
- Preserve important details and source citations
- Use bullet points or numbered lists for key points
- Keep summary comprehensive but more readable
- Improve structure and flow

Provide an improved summary that enhances clarity and readability."""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a summarizer expert at improving clarity and structure."},
                    {"role": "user", "content": summary_prompt}
                ],
                temperature=0.5
            )
            
            summary_content = response.choices[0].message.content
            
            self.agent_stats["summarizer"]["message_count"] += 1
            self.agent_stats["summarizer"]["last_used"] = datetime.now().isoformat()
            
            return AgentMessage(
                agent_name="summarizer",
                role="assistant",
                content=summary_content,
                timestamp=datetime.now().isoformat()
            )
            
        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            return AgentMessage(
                agent_name="summarizer",
                role="assistant",
                content=f"Summarization encountered an error: {str(e)}",
                timestamp=datetime.now().isoformat()
            )
    
    async def _single_agent_response(
        self,
        messages: List[ChatMessage],
        agent_config: Optional[AgentConfig],
        document_inventory: Optional[DocumentInventory]
    ) -> ChatResponse:
        """Single agent response using analyst only"""
        try:
            last_message = messages[-1] if messages else None
            if not last_message:
                raise ValueError("No messages provided")
            
            # Get enhanced context
            enhanced_message = await self._enhance_message_with_context(
                last_message.content, document_inventory
            )
            
            # Extract just the context part for the system message
            context_part = enhanced_message.replace(f"User Query: {last_message.content}", "")
            
            system_message = f"""You are an expert document analysis assistant. Use the following context to answer the user's question:

{context_part}

Provide a well-structured, accurate response based on this context. If context doesn't contain relevant information, state that clearly."""
            
            response = await self.openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": last_message.content}
                ],
                temperature=0.7
            )
            
            response_content = response.choices[0].message.content
            
            # Update stats
            self.agent_stats["analyst"]["message_count"] += 1
            self.agent_stats["analyst"]["last_used"] = datetime.now().isoformat()
            
            return ChatResponse(
                messages=[
                    AgentMessage(
                        agent_name="analyst",
                        role="assistant",
                        content=response_content,
                        timestamp=datetime.now().isoformat()
                    )
                ],
                final_response=response_content,
                context_used=[],
                processing_time=0.0,
                agents_involved=["analyst"]
            )
            
        except Exception as e:
            logger.error(f"Single agent response failed: {e}")
            raise
    
    def _extract_final_response(self, conversation_messages: List[AgentMessage]) -> str:
        """Extract the final response from conversation"""
        try:
            # Look for the last analyst or summarizer message as the final response
            for msg in reversed(conversation_messages):
                if msg.agent_name in ["analyst", "summarizer"]:
                    return msg.content
            
            # Fallback to last message
            if conversation_messages:
                return conversation_messages[-1].content
            
            return "No response generated."
            
        except Exception as e:
            logger.error(f"Failed to extract final response: {e}")
            return "Error extracting response."
    
    def _get_active_agents(self, config: Optional[AgentConfig]) -> List[str]:
        """Get list of active agents based on configuration"""
        if not config:
            return ["analyst"]
            
        active = ["analyst"]
        
        if config.use_researcher:
            active.append("researcher")
        if config.use_critic:
            active.append("reviewer") 
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
            # Process normally and yield results
            response = await self.process_chat(messages, use_multi_agent, agent_config)
            
            # Yield each agent message
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
        for agent_name in ["researcher", "analyst", "reviewer", "summarizer"]:
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
            # No cleanup needed for legacy OpenAI API
            logger.info("Enhanced multi-agent system cleaned up")
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")