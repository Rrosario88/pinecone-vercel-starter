#!/usr/bin/env python3
"""
Test AutoGen Multi-Agent Integration
This script tests the multi-agent workflow with document search capabilities.
"""

import asyncio
import json
import os
from pathlib import Path

async def test_document_search_skill():
    """Test the document search skill integration."""
    print("🔍 Testing Document Search Skill")
    print("=" * 40)
    
    # Import the document search skill
    try:
        import sys
        sys.path.append(str(Path(__file__).parent / "autogen_skills"))
        
        from document_search import search_documents, get_document_metadata
        
        # Test basic search functionality
        print("Testing basic search...")
        result = search_documents("test query", max_results=3)
        print(f"Search result type: {type(result)}")
        print(f"Search result preview: {result[:200]}...")
        
        # Test metadata retrieval
        print("\nTesting metadata retrieval...")
        metadata = get_document_metadata()
        print(f"Metadata result: {metadata[:200]}...")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing document search: {e}")
        return False

async def test_workflow_configuration():
    """Test workflow configuration loading."""
    print("\n📋 Testing Workflow Configuration")
    print("=" * 40)
    
    try:
        workflow_path = Path("autogen_workflows/rag_assistant_workflow.json")
        
        if not workflow_path.exists():
            print("❌ Workflow configuration file not found")
            return False
        
        with open(workflow_path) as f:
            workflow = json.load(f)
        
        print(f"✅ Workflow loaded: {workflow['name']}")
        print(f"✅ Agents configured: {len(workflow['agents'])}")
        
        # Validate agent configurations
        required_agents = ["ResearcherAgent", "AnalystAgent", "ReviewerAgent", "UserProxy"]
        configured_agents = [agent["name"] for agent in workflow["agents"]]
        
        for required_agent in required_agents:
            if required_agent in configured_agents:
                print(f"  ✅ {required_agent} configured")
            else:
                print(f"  ❌ {required_agent} missing")
                return False
        
        # Check system messages
        for agent in workflow["agents"]:
            if agent["type"] != "UserProxyAgent" and "system_message" in agent:
                msg_length = len(agent["system_message"])
                print(f"  📝 {agent['name']}: {msg_length} character system message")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing workflow configuration: {e}")
        return False

async def test_service_connectivity():
    """Test connectivity to the document service."""
    print("\n🌐 Testing Service Connectivity")
    print("=" * 40)
    
    try:
        import requests
        
        service_url = os.getenv('AUTOGEN_SERVICE_URL', 'http://localhost:8000')
        print(f"Testing connection to: {service_url}")
        
        # Test health endpoint
        try:
            response = requests.get(f"{service_url}/health", timeout=5)
            if response.ok:
                print("✅ Service health check passed")
                return True
            else:
                print(f"❌ Service health check failed: {response.status_code}")
                return False
        except requests.exceptions.ConnectionError:
            print("❌ Cannot connect to service - ensure it's running")
            return False
        except requests.exceptions.Timeout:
            print("❌ Service connection timed out")
            return False
            
    except Exception as e:
        print(f"❌ Error testing service connectivity: {e}")
        return False

async def create_simple_agent_test():
    """Create a simple test to verify agent functionality."""
    print("\n🤖 Testing Agent System")
    print("=" * 40)
    
    try:
        # This would normally use AutoGen's agent classes
        # For now, we'll just verify the configuration structure
        
        workflow_path = Path("autogen_workflows/rag_assistant_workflow.json")
        with open(workflow_path) as f:
            workflow = json.load(f)
        
        print("Agent Configuration Summary:")
        for agent in workflow["agents"]:
            name = agent["name"]
            agent_type = agent["type"]
            
            if "llm_config" in agent:
                model = agent["llm_config"]["model"]
                temp = agent["llm_config"]["temperature"]
                tokens = agent["llm_config"]["max_tokens"]
                print(f"  🤖 {name} ({agent_type})")
                print(f"     Model: {model}, Temp: {temp}, Tokens: {tokens}")
            else:
                print(f"  👤 {name} ({agent_type})")
        
        print("\nWorkflow Flow:")
        if "workflow" in workflow and "flow" in workflow["workflow"]:
            for step in workflow["workflow"]["flow"]:
                step_num = step["step"]
                agent = step["agent"]
                action = step["action"]
                print(f"  {step_num}. {agent}: {action}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing agent system: {e}")
        return False

async def main():
    """Run all tests."""
    print("🧪 AutoGen Integration Testing")
    print("=" * 50)
    
    tests = [
        ("Workflow Configuration", test_workflow_configuration),
        ("Document Search Skill", test_document_search_skill),
        ("Service Connectivity", test_service_connectivity),
        ("Agent System", create_simple_agent_test),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n📊 Test Summary")
    print("=" * 30)
    
    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    
    print(f"\nResults: {passed}/{len(results)} tests passed")
    
    if passed == len(results):
        print("\n🎉 All tests passed! AutoGen integration is ready.")
        print("\n📝 Next Steps:")
        print("1. Start your document service: python -m uvicorn main:app --reload")
        print("2. Upload some test documents")
        print("3. Test the multi-agent workflow with real queries")
        print("4. Use AutoGen Studio UI for interactive testing (when compatible)")
    else:
        print(f"\n⚠️  Some tests failed. Please resolve issues before proceeding.")

if __name__ == "__main__":
    asyncio.run(main())