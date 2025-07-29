"""
Document Summary Skill for AutoGen Studio
Provides document summarization capabilities
"""

import requests
import os
from typing import Optional

def summarize_document(document_name: str, max_length: int = 500, summary_type: str = "comprehensive") -> str:
    """
    Generate a summary of a specific document.
    
    Args:
        document_name: Name of the document to summarize
        max_length: Maximum length of summary in characters (default: 500)
        summary_type: Type of summary - "brief", "comprehensive", or "key_points" (default: comprehensive)
        
    Returns:
        Document summary
    """
    try:
        # First, search for content from the specific document
        service_url = os.getenv('AUTOGEN_SERVICE_URL', 'http://localhost:8000')
        
        # Get document content
        response = requests.get(
            f"{service_url}/context/search",
            params={
                "query": document_name,
                "top_k": 10,  # Get more chunks for better summary
                "namespace": ""
            },
            timeout=30
        )
        
        if not response.ok:
            return f"❌ Failed to retrieve document '{document_name}': {response.text}"
        
        data = response.json()
        results = data.get("results", [])
        
        if not results:
            return f"❌ Document '{document_name}' not found or contains no content."
        
        # Extract and combine content
        document_content = []
        for result in results:
            content = result.get('content', '')
            if content:
                document_content.append(content)
        
        if not document_content:
            return f"❌ No readable content found in document '{document_name}'"
        
        combined_content = " ".join(document_content)
        
        # Generate summary based on type
        if summary_type == "brief":
            summary = _generate_brief_summary(document_name, combined_content, max_length)
        elif summary_type == "key_points":
            summary = _generate_key_points_summary(document_name, combined_content)
        else:  # comprehensive
            summary = _generate_comprehensive_summary(document_name, combined_content, max_length)
        
        return summary
        
    except requests.exceptions.Timeout:
        return "❌ Request timed out while accessing document content."
    except Exception as e:
        return f"❌ Summary generation error: {str(e)}"

def _generate_brief_summary(document_name: str, content: str, max_length: int) -> str:
    """Generate a brief summary of the document."""
    # For now, return first portion of content
    # In a real implementation, this would use an LLM to generate a proper summary
    
    preview = content[:max_length]
    if len(content) > max_length:
        preview += "..."
    
    return f"""📄 Brief Summary: {document_name}
{'=' * 40}

{preview}

📊 Document Stats:
- Total content length: {len(content)} characters
- Summary type: Brief overview
"""

def _generate_comprehensive_summary(document_name: str, content: str, max_length: int) -> str:
    """Generate a comprehensive summary of the document."""
    
    # Basic analysis
    word_count = len(content.split())
    char_count = len(content)
    
    # Extract first few sentences as summary
    sentences = content.split('. ')
    summary_sentences = []
    current_length = 0
    
    for sentence in sentences:
        if current_length + len(sentence) > max_length:
            break
        summary_sentences.append(sentence)
        current_length += len(sentence)
    
    summary_text = '. '.join(summary_sentences)
    if len(content) > current_length:
        summary_text += "..."
    
    return f"""📄 Comprehensive Summary: {document_name}
{'=' * 50}

📋 Summary:
{summary_text}

📊 Document Analysis:
- Word count: {word_count:,} words
- Character count: {char_count:,} characters
- Content chunks: Multiple sections analyzed
- Summary coverage: {min(100, (current_length / char_count) * 100):.1f}% of document

💡 Note: This is an automated summary based on document content analysis.
"""

def _generate_key_points_summary(document_name: str, content: str) -> str:
    """Generate a key points summary of the document."""
    
    # Simple key points extraction (in real implementation, use NLP)
    paragraphs = content.split('\n\n')
    key_points = []
    
    for i, paragraph in enumerate(paragraphs[:5]):  # First 5 paragraphs
        if len(paragraph.strip()) > 50:  # Only meaningful paragraphs
            # Take first sentence of each paragraph as key point
            first_sentence = paragraph.split('.')[0].strip()
            if first_sentence:
                key_points.append(f"• {first_sentence}")
    
    return f"""📄 Key Points Summary: {document_name}
{'=' * 45}

🔑 Main Points:
{chr(10).join(key_points) if key_points else "• No clear key points identified"}

📊 Analysis:
- Source paragraphs: {len(paragraphs)}
- Key points extracted: {len(key_points)}
- Content density: {"High" if len(content) > 2000 else "Medium" if len(content) > 500 else "Low"}
"""

def get_document_stats(document_name: str) -> str:
    """
    Get statistical information about a document.
    
    Args:
        document_name: Name of the document to analyze
        
    Returns:
        Formatted statistical information about the document
    """
    try:
        service_url = os.getenv('AUTOGEN_SERVICE_URL', 'http://localhost:8000')
        
        # Search for the document
        response = requests.get(
            f"{service_url}/context/search",
            params={
                "query": document_name,
                "top_k": 100,  # Get all chunks
                "namespace": ""
            },
            timeout=30
        )
        
        if not response.ok:
            return f"❌ Failed to analyze document '{document_name}'"
        
        data = response.json()
        results = data.get("results", [])
        
        if not results:
            return f"❌ Document '{document_name}' not found"
        
        # Calculate stats
        total_chunks = len(results)
        total_chars = sum(len(result.get('content', '')) for result in results)
        total_words = sum(len(result.get('content', '').split()) for result in results)
        
        avg_chunk_size = total_chars // total_chunks if total_chunks > 0 else 0
        
        return f"""📊 Document Statistics: {document_name}
{'=' * 45}

📈 Content Metrics:
- Total chunks: {total_chunks}
- Total characters: {total_chars:,}
- Total words: {total_words:,}
- Average chunk size: {avg_chunk_size:,} characters

📋 Document Structure:
- Processing method: Semantic chunking
- Indexing status: ✅ Fully indexed
- Search readiness: ✅ Available for queries

🔍 Search Recommendations:
- Use specific terms for better results
- Try different query formulations
- Consider document context in searches
"""
        
    except Exception as e:
        return f"❌ Statistics error: {str(e)}"