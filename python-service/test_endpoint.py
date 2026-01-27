#!/usr/bin/env python3
"""
Test the actual AutoGen endpoint functionality
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
from models.chat_models import ChatMessage, MessageRole

async def test_autogen_endpoint():
    """Test the AutoGen system like the actual endpoint would"""
    print("Testing AutoGen system endpoint functionality...")

    try:
        # Initialize services like the main app does
        pinecone_service = PineconeService()
        await pinecone_service.initialize()

        autogen_system = MultiAgentRAGSystem(pinecone_service)
        await autogen_system.initialize()
        
        # Simulate a request like the endpoint would receive
        messages = [
            ChatMessage(
                role=MessageRole.USER,
                content="What is Prometheus and how do I install it?"
            )
        ]
        
        print(f"📥 Simulated Request:")
        print(f"   Messages: {len(messages)}")
        print(f"   Query: {messages[0].content}")
        print()
        
        # Call the system like the endpoint does
        print("🔄 Processing with AutoGen system...")
        response = await autogen_system.process_chat(messages, True, None)
        
        print("📤 Response received:")
        print(f"   Messages: {len(response.messages)}")
        print(f"   Final response length: {len(response.final_response)} characters")
        print()
        
        # Show the final response
        print("🎯 FINAL RESPONSE:")
        print("-" * 50)
        print(response.final_response)
        print("-" * 50)
        print()
        
        # Check if the response used context properly
        if "Prometheus" in response.final_response and len(response.final_response) > 100:
            print("✅ SUCCESS: AutoGen system provided a substantive response using document context!")
        else:
            print("❌ ISSUE: Response may not be using document context properly.")
            
        # Show agent conversation if available
        if response.messages:
            print("\n🤖 AGENT CONVERSATION:")
            for i, msg in enumerate(response.messages, 1):
                print(f"{i}. {msg.agent_name}: {msg.content[:100]}...")
                
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_autogen_endpoint())