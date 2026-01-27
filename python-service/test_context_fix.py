#!/usr/bin/env python3
"""
Test script to verify the AutoGen context enhancement changes
"""
import asyncio
import os
import sys
from pathlib import Path

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from agents.multi_agent_system import MultiAgentRAGSystem
from services.pinecone_service import PineconeService
from models.chat_models import ChatMessage

async def test_context_enhancement():
    """Test the context retrieval and formatting functionality"""
    print("Testing AutoGen context handling...")

    try:
        # Initialize Pinecone service
        pinecone_service = PineconeService()
        await pinecone_service.initialize()

        # Initialize the multi-agent system
        agent_system = MultiAgentRAGSystem(pinecone_service)
        await agent_system.initialize()

        # Test the context retrieval function
        test_message = "What are the main benefits of microservices architecture?"

        print(f"Testing message: {test_message}")

        # Test the _format_context method directly
        context_results = await pinecone_service.search_context(
            query=test_message,
            namespace="pdf-documents",
            top_k=3,
            min_score=-1.0
        )

        formatted_context = agent_system._format_context(context_results)
        print("\n=== FORMATTED CONTEXT ===")
        print(formatted_context)
        print("==========================\n")

        if len(formatted_context) > 100:
            print("✅ SUCCESS: Formatted context contains document content")
        else:
            print("❌ ISSUE: Formatted context missing actual document content")

        # Test a chat request to verify end-to-end context flow
        print("\n=== TESTING CHAT WITH CONTEXT ===")
        messages = [ChatMessage(role="user", content=test_message)]
        response = await agent_system.process_chat(messages=messages, use_multi_agent=False)

        if response.final_response and len(response.final_response) > 50:
            print("✅ SUCCESS: Chat response generated with context")
            print(f"Response preview: {response.final_response[:200]}...")
        else:
            print("❌ ISSUE: Chat response seems empty or too short")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_context_enhancement())