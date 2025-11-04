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

from agents.real_multi_agent_system import RealMultiAgentRAGSystem
from services.pinecone_service import PineconeService
from models.chat_models import ChatMessage

async def test_context_enhancement():
    """Test the enhanced context functionality"""
    print("Testing AutoGen context enhancement...")
    
    try:
        # Initialize Pinecone service
        pinecone_service = PineconeService()
        await pinecone_service.initialize()
        
        # Initialize the multi-agent system
        agent_system = RealMultiAgentRAGSystem(pinecone_service)
        await agent_system.initialize()
        
        # Test the context enhancement function
        test_message = "What are the main benefits of microservices architecture?"
        
        print(f"Testing message: {test_message}")
        enhanced_message = await agent_system._enhance_message_with_context(
            test_message, 
            None  # No document inventory for this test
        )
        
        print("\n=== ENHANCED MESSAGE ===")
        print(enhanced_message)
        print("========================\n")
        
        # Check if the enhanced message contains actual content
        if "CONTEXT:" in enhanced_message and "Content:" in enhanced_message:
            print("✅ SUCCESS: Enhanced message contains proper CONTEXT section with actual content")
        else:
            print("❌ ISSUE: Enhanced message missing proper CONTEXT section or content")
            
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
        
        if "Content:" in formatted_context and len(formatted_context) > 100:
            print("✅ SUCCESS: Formatted context contains actual document content")
        else:
            print("❌ ISSUE: Formatted context missing actual document content")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_context_enhancement())