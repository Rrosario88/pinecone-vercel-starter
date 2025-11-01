#!/usr/bin/env python3
"""
Test script for the real AutoGen multi-agent system
"""
import asyncio
import json
import sys
import os
from dotenv import load_dotenv

# Add current directory to path
sys.path.append('agents')

# Load environment variables
load_dotenv()

from services.pinecone_service import PineconeService
from agents.real_multi_agent_system import RealMultiAgentRAGSystem
from models.chat_models import ChatMessage, ChatRequest, AgentConfig

async def test_system():
    """Test the complete system"""
    print("🚀 Initializing Real AutoGen Multi-Agent System...")
    
    # Initialize services
    pinecone_service = PineconeService()
    await pinecone_service.initialize()
    print("✅ Pinecone service initialized")
    
    multi_agent_system = RealMultiAgentRAGSystem(pinecone_service)
    await multi_agent_system.initialize()
    print("✅ Real multi-agent system initialized")
    
    # Test single agent response
    print("\n📝 Testing single agent response...")
    messages = [ChatMessage(role="user", content="What is artificial intelligence?")]
    
    try:
        response = await multi_agent_system.process_chat(
            messages=messages,
            use_multi_agent=False
        )
        print(f"✅ Single agent response: {response.final_response[:100]}...")
        print(f"   Agents involved: {response.agents_involved}")
        print(f"   Processing time: {response.processing_time:.2f}s")
    except Exception as e:
        print(f"❌ Single agent test failed: {e}")
    
    # Test multi-agent response
    print("\n🤝 Testing multi-agent collaboration...")
    agent_config = AgentConfig(
        use_researcher=True,
        use_critic=True,
        use_summarizer=True
    )
    
    try:
        response = await multi_agent_system.process_chat(
            messages=messages,
            use_multi_agent=True,
            agent_config=agent_config
        )
        print(f"✅ Multi-agent response completed")
        print(f"   Number of agent messages: {len(response.messages)}")
        print(f"   Agents involved: {response.agents_involved}")
        print(f"   Processing time: {response.processing_time:.2f}s")
        
        # Show agent conversation flow
        print("\n📊 Agent Conversation Flow:")
        for i, msg in enumerate(response.messages):
            print(f"   {i+1}. {msg.agent_name}: {msg.content[:80]}...")
            
    except Exception as e:
        print(f"❌ Multi-agent test failed: {e}")
        import traceback
        traceback.print_exc()
    
    # Test agents status
    print("\n📈 Testing agents status...")
    try:
        status = await multi_agent_system.get_agents_status()
        for agent_name, agent_status in status.items():
            print(f"   {agent_name}: {agent_status.message_count} messages, active: {agent_status.active}")
    except Exception as e:
        print(f"❌ Agents status test failed: {e}")
    
    # Cleanup
    print("\n🧹 Cleaning up...")
    await multi_agent_system.cleanup()
    await pinecone_service.cleanup()
    print("✅ Cleanup completed")

if __name__ == "__main__":
    asyncio.run(test_system())