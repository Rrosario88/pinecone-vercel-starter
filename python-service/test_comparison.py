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

from agents.multi_agent_system import MultiAgentRAGSystem
from services.pinecone_service import PineconeService

async def compare_context_handling():
    """Test AutoGen context handling"""
    print("Testing AutoGen context handling...")

    try:
        # Initialize Pinecone service
        pinecone_service = PineconeService()
        await pinecone_service.initialize()

        # Initialize AutoGen system
        autogen_system = MultiAgentRAGSystem(pinecone_service)
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

        has_content = len(autogen_context) > 200
        has_source = "Source:" in autogen_context or "source" in autogen_context.lower()
        has_score = "score" in autogen_context.lower() or "relevance" in autogen_context.lower()

        print(f"AutoGen has actual content: {'✅' if has_content else '❌'}")
        print(f"AutoGen has source info: {'✅' if has_source else '❌'}")
        print(f"AutoGen has relevance scores: {'✅' if has_score else '❌'}")
        print(f"Context length: {len(autogen_context)} characters")

        print("\n🎯 CONCLUSION:")
        print("-" * 40)
        if has_content:
            print("✅ SUCCESS: AutoGen system properly extracts and formats document content!")
            print("   AutoGen agents will receive rich context with document text.")
        else:
            print("❌ ISSUE: AutoGen context handling needs improvement.")

    except Exception as e:
        print(f"❌ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(compare_context_handling())