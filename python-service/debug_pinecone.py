#!/usr/bin/env python3

import asyncio
import os
import sys
from dotenv import load_dotenv
from pinecone import Pinecone
from openai import AsyncOpenAI

# Load environment variables
load_dotenv()

async def debug_pinecone():
    print("=== Pinecone Debug Script ===")
    
    # Check environment variables
    pinecone_key = os.getenv("PINECONE_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")
    index_name = os.getenv("PINECONE_INDEX", "pdf-rag")
    
    print(f"Pinecone Key: {'✓' if pinecone_key else '✗'}")
    print(f"OpenAI Key: {'✓' if openai_key else '✗'}")
    print(f"Index Name: {index_name}")
    
    if not pinecone_key or not openai_key:
        print("Missing required environment variables!")
        return
    
    try:
        # Initialize Pinecone
        pc = Pinecone(api_key=pinecone_key)
        print("✓ Pinecone client initialized")
        
        # List indexes
        indexes = pc.list_indexes()
        print(f"Available indexes: {[idx.name for idx in indexes]}")
        
        # Check if our index exists
        if index_name not in [idx.name for idx in indexes]:
            print(f"✗ Index '{index_name}' not found!")
            return
        
        # Get index stats
        index = pc.Index(index_name)
        stats = index.describe_index_stats()
        print(f"Index stats: {stats}")
        
        # Initialize OpenAI
        openai_client = AsyncOpenAI(api_key=openai_key)
        print("✓ OpenAI client initialized")
        
        # Test embedding
        test_text = "Linux operating system"
        embedding_response = await openai_client.embeddings.create(
            input=test_text,
            model="text-embedding-3-small"
        )
        query_embedding = embedding_response.data[0].embedding
        print(f"✓ Generated embedding (dimension: {len(query_embedding)})")
        
        # Test query in different namespaces
        namespaces = ["", "pdf-documents"]
        
        for namespace in namespaces:
            print(f"\n--- Testing namespace: '{namespace}' ---")
            try:
                result = index.query(
                    vector=query_embedding,
                    top_k=5,
                    include_metadata=True,
                    namespace=namespace
                )
                
                matches = result.get('matches', [])
                print(f"Found {len(matches)} matches")
                
                for i, match in enumerate(matches):
                    score = match.get('score', 0)
                    metadata = match.get('metadata', {})
                    print(f"  Match {i+1}: score={score:.4f}")
                    print(f"    Metadata: {metadata}")
                    
            except Exception as e:
                print(f"✗ Query failed: {e}")
        
        # Test direct fetch without query (if possible)
        print(f"\n--- Testing direct vector fetch ---")
        try:
            # Try to get some vectors directly
            result = index.fetch(
                ids=[],  # Empty to get stats
                namespace="pdf-documents"
            )
            print(f"Fetch result: {result}")
        except Exception as e:
            print(f"Direct fetch failed: {e}")
            
    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_pinecone())