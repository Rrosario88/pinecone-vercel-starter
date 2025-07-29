"""
Document Search Skill for AutoGen Studio
Integrates with Pinecone service for semantic document search
"""

import requests
import os
from typing import List, Dict, Any, Optional

def search_documents(query: str, max_results: int = 5, min_score: float = 0.3) -> str:
    """
    Search through uploaded documents for relevant content using semantic search.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return (default: 5)
        min_score: Minimum relevance score threshold (default: 0.3)
        
    Returns:
        Formatted search results with content, sources, and relevance scores
    """
    try:
        service_url = os.getenv('AUTOGEN_SERVICE_URL', 'http://localhost:8000')
        
        response = requests.get(
            f"{service_url}/context/search",
            params={
                "query": query,
                "top_k": max_results,
                "namespace": ""
            },
            timeout=30
        )
        
        if response.ok:
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                return f"No relevant documents found for query: '{query}'"
            
            formatted_results = []
            formatted_results.append(f"🔍 Search Results for: '{query}'")
            formatted_results.append("=" * 50)
            
            for i, result in enumerate(results, 1):
                content = result.get('content', 'No content available')
                source = result.get('source', 'Unknown source')
                score = result.get('score', 0.0)
                
                # Truncate long content
                if len(content) > 300:
                    content = content[:297] + "..."
                
                formatted_results.append(f"\n📄 Result {i} (Relevance: {score:.3f})")
                formatted_results.append(f"Source: {source}")
                formatted_results.append(f"Content: {content}")
                formatted_results.append("-" * 30)
            
            return "\n".join(formatted_results)
            
        else:
            return f"❌ Search failed (Status: {response.status_code}): {response.text}"
            
    except requests.exceptions.Timeout:
        return "❌ Search request timed out. Please try again."
    except requests.exceptions.ConnectionError:
        return "❌ Cannot connect to document service. Ensure the service is running."
    except Exception as e:
        return f"❌ Search error: {str(e)}"

def get_document_metadata(document_name: Optional[str] = None) -> str:
    """
    Get metadata about uploaded documents.
    
    Args:
        document_name: Specific document name (optional, returns all if None)
        
    Returns:
        Formatted document metadata information
    """
    try:
        service_url = os.getenv('AUTOGEN_SERVICE_URL', 'http://localhost:8000')
        
        # This would be a new endpoint to get document inventory
        response = requests.get(
            f"{service_url}/documents/inventory",
            timeout=10
        )
        
        if response.ok:
            data = response.json()
            
            total_docs = data.get('totalDocuments', 0)
            total_chunks = data.get('totalChunks', 0)
            pdf_docs = data.get('pdfDocuments', [])
            web_docs = data.get('webDocuments', [])
            
            formatted_info = []
            formatted_info.append("📊 Document Inventory")
            formatted_info.append("=" * 30)
            formatted_info.append(f"Total Documents: {total_docs}")
            formatted_info.append(f"Total Content Chunks: {total_chunks}")
            
            if pdf_docs:
                formatted_info.append(f"\n📄 PDF Documents ({len(pdf_docs)}):")
                for doc in pdf_docs:
                    name = doc.get('filename', 'Unknown')
                    chunks = doc.get('chunks', 0)
                    formatted_info.append(f"  • {name} ({chunks} chunks)")
            
            if web_docs:
                formatted_info.append(f"\n🌐 Web Documents ({len(web_docs)}):")
                for doc in web_docs:
                    url = doc.get('url', 'Unknown')
                    chunks = doc.get('chunks', 0)
                    formatted_info.append(f"  • {url} ({chunks} chunks)")
            
            return "\n".join(formatted_info)
            
        else:
            return f"❌ Failed to get document metadata: {response.text}"
            
    except Exception as e:
        return f"❌ Metadata error: {str(e)}"

def search_by_document(document_name: str, query: str, max_results: int = 3) -> str:
    """
    Search within a specific document.
    
    Args:
        document_name: Name of the specific document to search
        query: Search query
        max_results: Maximum results to return
        
    Returns:
        Formatted search results from the specific document
    """
    try:
        # Use the general search but filter by document name
        all_results = search_documents(f"{query} {document_name}", max_results)
        
        if "No relevant documents found" in all_results:
            return f"❌ No relevant content found in document '{document_name}' for query: '{query}'"
        
        return f"🔍 Results from '{document_name}':\n{all_results}"
        
    except Exception as e:
        return f"❌ Document-specific search error: {str(e)}"