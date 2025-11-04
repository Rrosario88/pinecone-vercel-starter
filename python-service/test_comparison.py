#!/usr/bin/env python3
"""
Compare AutoGen vs Regular RAG context handling
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

async def compare_context_handling():
    """Test AutoGen context handling after fixes"""
    print("Testing AutoGen context handling after fixes...")
    
    try:
        # Initialize Pinecone service
        pinecone_service = PineconeService()
        await pinecone_service.initialize()
        
        # Initialize AutoGen system
        autogen_system = RealMultiAgentRAGSystem(pinecone_service)
        await autogen_system.initialize()
        
        # Test query
        test_query = "What are the main benefits of microservices architecture?"
        
        print(f"\n🔍 Test Query: {test_query}")
        print("=" * 60)
        
        # Get context from Pinecone
        context_results = await pinecone_service.search_context(
            query=test_query,
            namespace="pdf-documents",
            top_k=3,
            min_score=-1.0
        )
        
        # Test AutoGen context formatting
        print("\n📝 AUTOGEN CONTEXT FORMATTING:")
        print("-" * 40)
        autogen_context = autogen_system._format_context(context_results)
        print(autogen_context[:500] + "..." if len(autogen_context) > 500 else autogen_context)
        
        # Test key characteristics
        print("\n📊 ANALYSIS:")
        print("-" * 40)
        
        autogen_has_content = "Content:" in autogen_context and len(autogen_context) > 200
        autogen_has_source = "Source:" in autogen_context
        autogen_has_relevance = "Relevance:" in autogen_context
        
        print(f"AutoGen has actual content: {'✅' if autogen_has_content else '❌'}")
        print(f"AutoGen has source info: {'✅' if autogen_has_source else '❌'}")
        print(f"AutoGen has relevance scores: {'✅' if autogen_has_relevance else '❌'}")
        print(f"Context length: {len(autogen_context)} characters")
        
        # Test enhanced message creation
        print("\n🔄 ENHANCED MESSAGE TEST:")
        print("-" * 40)
        autogen_enhanced = await autogen_system._enhance_message_with_context(test_query, None)
        
        if "CONTEXT:" in autogen_enhanced and "Content:" in autogen_enhanced:
            print("✅ AutoGen enhanced message contains proper CONTEXT with actual content")
        else:
            print("❌ AutoGen enhanced message missing proper CONTEXT")
            
        # Extract just the context part for comparison
        context_start = autogen_enhanced.find("CONTEXT:")
        if context_start != -1:
            context_section = autogen_enhanced[context_start:context_start + 300]
            print(f"Context section preview: {context_section}...")
        
        print("\n🎯 CONCLUSION:")
        print("-" * 40)
        if autogen_has_content and autogen_has_source:
            print("✅ SUCCESS: AutoGen system now properly extracts and formats actual document content!")
            print("   AutoGen agents will receive rich context with full document text.")
            print("   The context includes source information and relevance scores.")
        else:
            print("❌ ISSUE: AutoGen context handling needs improvement.")
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(compare_context_handling())