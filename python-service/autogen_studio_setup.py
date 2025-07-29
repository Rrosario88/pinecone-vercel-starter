#!/usr/bin/env python3
"""
AutoGen Studio Setup and Testing Script
This script helps set up AutoGen Studio for manual testing and workflow prototyping.
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def install_autogen_studio():
    """Install AutoGen Studio if not already installed."""
    try:
        import autogenstudio
        print("✅ AutoGen Studio is already installed")
        return True
    except ImportError:
        print("📦 Installing AutoGen Studio...")
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "autogenstudio"])
            print("✅ AutoGen Studio installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install AutoGen Studio: {e}")
            return False

def create_sample_workflow():
    """Create a sample workflow configuration for testing."""
    workflow_config = {
        "name": "RAG Document Assistant Workflow",
        "description": "Multi-agent workflow for document analysis and Q&A",
        "agents": [
            {
                "name": "DocumentAnalyst",
                "type": "AssistantAgent",
                "system_message": """You are a document analysis expert. Your role is to:
1. Analyze document content and extract key information
2. Understand user questions about documents
3. Provide detailed, accurate responses based on document content
4. Cite sources and provide page references when available

Always be thorough but concise in your analysis.""",
                "llm_config": {
                    "model": "gpt-4o",
                    "temperature": 0.7,
                    "max_tokens": 1000
                }
            },
            {
                "name": "QualityReviewer", 
                "type": "AssistantAgent",
                "system_message": """You are a quality review specialist. Your role is to:
1. Review responses from the DocumentAnalyst
2. Check for accuracy and completeness
3. Suggest improvements or corrections
4. Ensure proper citation of sources
5. Verify that responses directly address user questions

Provide constructive feedback to improve response quality.""",
                "llm_config": {
                    "model": "gpt-4o",
                    "temperature": 0.5,
                    "max_tokens": 500
                }
            },
            {
                "name": "UserProxy",
                "type": "UserProxyAgent", 
                "human_input_mode": "ALWAYS",
                "code_execution_config": False,
                "system_message": "You represent the user asking questions about documents."
            }
        ],
        "workflow": {
            "type": "sequential",
            "steps": [
                {
                    "agent": "UserProxy",
                    "action": "initiate_conversation",
                    "description": "User asks a question about documents"
                },
                {
                    "agent": "DocumentAnalyst", 
                    "action": "analyze_and_respond",
                    "description": "Analyze documents and provide initial response"
                },
                {
                    "agent": "QualityReviewer",
                    "action": "review_response", 
                    "description": "Review and improve the response"
                },
                {
                    "agent": "DocumentAnalyst",
                    "action": "finalize_response",
                    "description": "Provide final polished response"
                }
            ]
        }
    }
    
    # Save workflow config
    config_path = Path("autogen_workflows/rag_document_workflow.json")
    config_path.parent.mkdir(exist_ok=True)
    
    with open(config_path, 'w') as f:
        json.dump(workflow_config, f, indent=2)
    
    print(f"✅ Sample workflow saved to: {config_path}")
    return config_path

def create_custom_skills():
    """Create custom skills for document processing."""
    skills_dir = Path("autogen_skills")
    skills_dir.mkdir(exist_ok=True)
    
    # Document Search Skill
    search_skill = '''
def search_documents(query: str, max_results: int = 5) -> str:
    """
    Search through uploaded documents for relevant content.
    
    Args:
        query: Search query string
        max_results: Maximum number of results to return
        
    Returns:
        Formatted search results with content and sources
    """
    import requests
    import os
    
    # This would integrate with your Pinecone service
    try:
        response = requests.post(
            f"{os.getenv('AUTOGEN_SERVICE_URL', 'http://localhost:8000')}/context/search",
            params={
                "query": query,
                "top_k": max_results
            }
        )
        
        if response.ok:
            results = response.json()["results"]
            formatted_results = []
            
            for i, result in enumerate(results, 1):
                formatted_results.append(
                    f"Result {i}:\\n"
                    f"Content: {result['content']}\\n"
                    f"Source: {result['source']}\\n"
                    f"Relevance: {result['score']:.3f}\\n"
                )
            
            return "\\n".join(formatted_results)
        else:
            return f"Search failed: {response.text}"
            
    except Exception as e:
        return f"Search error: {str(e)}"
'''
    
    with open(skills_dir / "document_search.py", 'w') as f:
        f.write(search_skill)
    
    # Document Summary Skill
    summary_skill = '''
def summarize_document(document_name: str, max_length: int = 500) -> str:
    """
    Generate a summary of a specific document.
    
    Args:
        document_name: Name of the document to summarize
        max_length: Maximum length of summary in characters
        
    Returns:
        Document summary
    """
    # This would integrate with your document processing service
    # For now, return a placeholder
    return f"Summary of {document_name}: [This would contain actual document summary]"
'''
    
    with open(skills_dir / "document_summary.py", 'w') as f:
        f.write(summary_skill)
    
    print(f"✅ Custom skills created in: {skills_dir}")
    return skills_dir

def start_autogen_studio(port=8081):
    """Start AutoGen Studio on specified port."""
    print(f"🚀 Starting AutoGen Studio on port {port}...")
    print(f"📋 Access the UI at: http://localhost:{port}")
    print("🔧 Use this for:")
    print("   • Workflow Prototyping")
    print("   • Agent Configuration Testing") 
    print("   • Skill Integration")
    print("   • Session Interaction Testing")
    print("\n⚠️  Make sure to set your OPENAI_API_KEY environment variable")
    
    try:
        subprocess.run([
            sys.executable, "-m", "autogenstudio.web.ui", 
            "--port", str(port)
        ])
    except KeyboardInterrupt:
        print("\n👋 AutoGen Studio stopped")
    except Exception as e:
        print(f"❌ Error starting AutoGen Studio: {e}")

def create_testing_guide():
    """Create a testing guide for AutoGen Studio."""
    guide_content = """
# AutoGen Studio Testing Guide

## 1. Setup and Installation

1. Install dependencies:
   ```bash
   cd python-service
   pip install -r requirements.txt
   ```

2. Set environment variables:
   ```bash
   export OPENAI_API_KEY="your-api-key"
   export AUTOGEN_SERVICE_URL="http://localhost:8000"
   ```

3. Start AutoGen Studio:
   ```bash
   python autogen_studio_setup.py
   ```

## 2. Workflow Prototyping

### Build Section:
1. **Create Agents**:
   - DocumentAnalyst (AssistantAgent)
   - QualityReviewer (AssistantAgent)  
   - UserProxy (UserProxyAgent)

2. **Configure System Messages**:
   - Use the provided templates in `autogen_workflows/`
   - Customize for your specific use case

3. **Set LLM Configuration**:
   - Model: gpt-4o
   - Temperature: 0.7 for analysis, 0.5 for review
   - Max tokens: 1000-1500

### Workflow Design:
1. **Sequential Flow**:
   User Question → Document Analysis → Quality Review → Final Response

2. **Test Different Patterns**:
   - Single agent responses
   - Multi-agent collaboration
   - Iterative refinement

## 3. Skill Integration

### Custom Skills Location:
- `autogen_skills/document_search.py`
- `autogen_skills/document_summary.py`

### Testing Skills:
1. Add skills in Studio's Build section
2. Test with sample documents
3. Verify integration with Pinecone service

## 4. Session Interaction Testing

### Playground Testing:
1. **Load Workflow**: Import your JSON configuration
2. **Start Session**: Begin conversation with UserProxy
3. **Test Scenarios**:
   - Simple document questions
   - Complex multi-part queries
   - Source citation requests
   - Error handling

### Test Cases:
1. **Document Analysis**:
   - "What are the key points in document X?"
   - "Compare information between documents A and B"
   - "Find specific data about topic Y"

2. **Quality Verification**:
   - Check response accuracy
   - Verify source citations
   - Test edge cases

## 5. Export and Integration

### Export Workflow:
1. Test successful workflow in Playground
2. Export as JSON from Build section
3. Save to `autogen_workflows/` directory

### Web App Integration:
1. Update `simple_multi_agent_system.py` with new workflows
2. Test API endpoints with exported configuration
3. Verify consistency between Studio and web app

## 6. Best Practices

### Agent Configuration:
- Keep system messages clear and specific
- Use appropriate temperature settings
- Set reasonable token limits

### Testing Strategy:
- Start with simple workflows
- Gradually add complexity
- Test error scenarios
- Validate with real documents

### Documentation:
- Document successful configurations
- Note any limitations or issues
- Keep workflow versions organized

## 7. Troubleshooting

### Common Issues:
- API key not set
- Port conflicts
- Model access issues
- Skill integration problems

### Debug Steps:
1. Check environment variables
2. Verify service connectivity
3. Review agent configurations
4. Test individual components
"""
    
    guide_path = Path("AUTOGEN_STUDIO_TESTING.md")
    with open(guide_path, 'w') as f:
        f.write(guide_content)
    
    print(f"✅ Testing guide created: {guide_path}")
    return guide_path

def main():
    """Main setup function."""
    print("🤖 AutoGen Studio Setup for RAG Document Assistant")
    print("=" * 50)
    
    # Install AutoGen Studio
    if not install_autogen_studio():
        return
    
    # Create sample workflow
    workflow_path = create_sample_workflow()
    
    # Create custom skills
    skills_dir = create_custom_skills()
    
    # Create testing guide
    guide_path = create_testing_guide()
    
    print("\n✅ Setup Complete!")
    print(f"📁 Workflow: {workflow_path}")
    print(f"🛠️  Skills: {skills_dir}")
    print(f"📖 Guide: {guide_path}")
    
    # Ask if user wants to start Studio
    response = input("\n🚀 Start AutoGen Studio now? (y/n): ").lower()
    if response in ['y', 'yes']:
        start_autogen_studio()

if __name__ == "__main__":
    main()