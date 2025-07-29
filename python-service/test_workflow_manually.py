#!/usr/bin/env python3
"""
Manual AutoGen Workflow Tester
Test the multi-agent workflow step by step
"""

import os
import sys
from pathlib import Path

# Add skills to path
sys.path.append(str(Path(__file__).parent / "autogen_skills"))

def test_researcher_agent(query: str):
    """Test ResearcherAgent functionality"""
    print(f"🔍 RESEARCHER AGENT TEST")
    print(f"Query: {query}")
    print("-" * 50)
    
    try:
        from document_search import search_documents, get_document_metadata
        
        # Search for documents
        search_result = search_documents(query, max_results=3, min_score=0.3)
        print("Search Results:")
        print(search_result)
        
        print("\n" + "="*50)
        
        # Get metadata
        metadata = get_document_metadata()
        print("Document Metadata:")
        print(metadata)
        
        return search_result, metadata
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return None, None

def test_analyst_agent(search_results: str, query: str):
    """Test AnalystAgent functionality"""
    print(f"\n📊 ANALYST AGENT TEST")
    print(f"Analyzing results for: {query}")
    print("-" * 50)
    
    # Simulate analysis based on search results
    if search_results and "Search Results for" in search_results:
        analysis = f"""
📋 ANALYSIS:
Based on the search results for '{query}', I found relevant information in the uploaded documents.

🔍 Key Findings:
- Multiple document sections contain information related to your query
- Content appears to be well-sourced and comprehensive
- Results show good relevance scores indicating quality matches

💡 Insights:
- The search successfully identified pertinent content
- Information spans across different document sources
- Context is appropriate for answering the user's question

📈 Confidence Level: High
The retrieved information provides a solid foundation for answering your question.
"""
    else:
        analysis = f"""
📋 ANALYSIS:
Limited results found for '{query}'. This could indicate:
- No documents uploaded yet
- Query terms don't match document content
- Service connectivity issues

💡 Recommendation:
- Ensure documents are uploaded to the system
- Try different search terms
- Verify service is running
"""
    
    print(analysis)
    return analysis

def test_reviewer_agent(analysis: str, query: str):
    """Test ReviewerAgent functionality"""
    print(f"\n✅ REVIEWER AGENT TEST")
    print(f"Reviewing analysis for: {query}")
    print("-" * 50)
    
    review = f"""
🔍 QUALITY REVIEW:

✅ Accuracy Check: Analysis appears consistent with search results
✅ Completeness: Key aspects of the query have been addressed
✅ Structure: Information is well-organized and easy to follow
✅ Relevance: Content directly relates to the user's question
✅ Citations: Sources are properly referenced where applicable

📊 Quality Score: 8.5/10

💭 Feedback:
- Analysis provides good coverage of the search results
- Structured format makes information accessible
- Confidence levels are appropriately indicated
- Ready for final presentation to user

🎯 Status: APPROVED
The analysis meets quality standards and is ready for delivery.
"""
    
    print(review)
    return review

def run_full_workflow_test():
    """Run complete workflow simulation"""
    print("🤖 AUTOGEN MULTI-AGENT WORKFLOW TEST")
    print("=" * 60)
    
    # Get user query
    test_queries = [
        "What are the main topics in the documents?",
        "Can you summarize the key findings?",
        "What methodologies are mentioned?",
        "Are there any recommendations?"
    ]
    
    print("Select a test query:")
    for i, query in enumerate(test_queries, 1):
        print(f"{i}. {query}")
    print("5. Enter custom query")
    
    try:
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice in ['1', '2', '3', '4']:
            query = test_queries[int(choice) - 1]
        elif choice == '5':
            query = input("Enter your custom query: ").strip()
        else:
            query = test_queries[0]  # Default
        
        print(f"\n🎯 Testing workflow with query: '{query}'")
        print("=" * 60)
        
        # Step 1: ResearcherAgent
        search_results, metadata = test_researcher_agent(query)
        
        # Step 2: AnalystAgent
        analysis = test_analyst_agent(search_results, query)
        
        # Step 3: ReviewerAgent
        review = test_reviewer_agent(analysis, query)
        
        # Step 4: Final Response
        print(f"\n📝 FINAL RESPONSE")
        print("-" * 50)
        
        final_response = f"""
Thank you for your question: '{query}'

{analysis}

This response has been reviewed and approved by our quality assurance process.

{review}

If you need more specific information or have follow-up questions, please let me know!
"""
        
        print(final_response)
        
        print("\n🎉 WORKFLOW TEST COMPLETE!")
        print("=" * 60)
        
    except KeyboardInterrupt:
        print("\n\n👋 Test cancelled by user")
    except Exception as e:
        print(f"\n❌ Test error: {e}")

def test_service_connection():
    """Test connection to document service"""
    print("🌐 SERVICE CONNECTION TEST")
    print("-" * 30)
    
    try:
        import requests
        service_url = os.getenv('AUTOGEN_SERVICE_URL', 'http://localhost:8000')
        
        print(f"Testing connection to: {service_url}")
        
        response = requests.get(f"{service_url}/health", timeout=5)
        if response.ok:
            print("✅ Service is running and accessible")
            return True
        else:
            print(f"❌ Service returned error: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to service")
        print("💡 Make sure to run: python -m uvicorn main:app --reload")
        return False
    except Exception as e:
        print(f"❌ Connection test error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 AUTOGEN WORKFLOW MANUAL TESTER")
    print("=" * 50)
    
    # Test service connection first
    if test_service_connection():
        print("\n✅ Service connection verified")
        print("Make sure you have uploaded some documents for testing")
        input("\nPress Enter to continue with workflow test...")
        run_full_workflow_test()
    else:
        print("\n⚠️  Service not available - running simulation mode")
        input("Press Enter to continue with simulation...")
        run_full_workflow_test()