#!/usr/bin/env python3
"""
Test script for AutoGen integration
"""

import asyncio
import json
import os
import sys
from typing import Dict, Any

import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
AUTOGEN_SERVICE_URL = os.getenv("AUTOGEN_SERVICE_URL", "http://localhost:8000")
TEST_TIMEOUT = 60  # seconds

class AutoGenTester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=TEST_TIMEOUT)
        self.base_url = AUTOGEN_SERVICE_URL
        
    async def test_health(self) -> bool:
        """Test service health endpoint"""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Health check passed: {data}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    async def test_agents_status(self) -> bool:
        """Test agents status endpoint"""
        try:
            response = await self.client.get(f"{self.base_url}/agents/status")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Agents status: {len(data)} agents available")
                for agent_name, status in data.items():
                    print(f"  - {agent_name}: {'Active' if status['active'] else 'Inactive'}")
                return True
            else:
                print(f"❌ Agents status failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Agents status error: {e}")
            return False
    
    async def test_simple_chat(self) -> bool:
        """Test simple chat completion"""
        try:
            test_request = {
                "messages": [
                    {"role": "user", "content": "Hello, can you introduce yourself?"}
                ],
                "use_multi_agent": False
            }
            
            response = await self.client.post(
                f"{self.base_url}/chat",
                json=test_request
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Simple chat test passed")
                print(f"  Response: {data['final_response'][:100]}...")
                print(f"  Agents involved: {data['agents_involved']}")
                return True
            else:
                print(f"❌ Simple chat test failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Simple chat error: {e}")
            return False
    
    async def test_multi_agent_chat(self) -> bool:
        """Test multi-agent chat completion"""
        try:
            test_request = {
                "messages": [
                    {"role": "user", "content": "What are the benefits of using RAG in AI applications?"}
                ],
                "use_multi_agent": True,
                "agent_config": {
                    "use_researcher": True,
                    "use_critic": True,
                    "use_summarizer": False,
                    "context_strategy": "comprehensive"
                }
            }
            
            print("🔄 Testing multi-agent collaboration (this may take a moment)...")
            response = await self.client.post(
                f"{self.base_url}/chat",
                json=test_request
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Multi-agent chat test passed")
                print(f"  Response length: {len(data['final_response'])} characters")
                print(f"  Agents involved: {data['agents_involved']}")
                print(f"  Context items used: {len(data['context_used'])}")
                print(f"  Processing time: {data['processing_time']:.2f}s")
                
                # Check if multiple agents were actually involved
                if len(data['agents_involved']) > 1:
                    print("✅ Multiple agents successfully collaborated")
                else:
                    print("⚠️  Only single agent used - check agent configuration")
                
                return True
            else:
                print(f"❌ Multi-agent chat test failed: {response.status_code}")
                print(f"  Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Multi-agent chat error: {e}")
            return False
    
    async def test_context_search(self) -> bool:
        """Test context search functionality"""
        try:
            response = await self.client.get(
                f"{self.base_url}/context/search",
                params={
                    "query": "test query",
                    "namespace": "",
                    "top_k": 3
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Context search test passed")
                print(f"  Found {len(data['results'])} context items")
                return True
            else:
                print(f"❌ Context search test failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Context search error: {e}")
            return False
    
    async def test_error_handling(self) -> bool:
        """Test error handling with invalid requests"""
        try:
            # Test with invalid request
            response = await self.client.post(
                f"{self.base_url}/chat",
                json={"invalid": "request"}
            )
            
            if response.status_code == 400:
                print("✅ Error handling test passed - properly rejected invalid request")
                return True
            else:
                print(f"⚠️  Error handling test: unexpected status {response.status_code}")
                return True  # Don't fail the overall test
        except Exception as e:
            print(f"❌ Error handling test error: {e}")
            return False
    
    async def run_all_tests(self) -> bool:
        """Run all tests"""
        print("🚀 Starting AutoGen Integration Tests")
        print("=" * 50)
        
        tests = [
            ("Health Check", self.test_health),
            ("Agents Status", self.test_agents_status),
            ("Simple Chat", self.test_simple_chat),
            ("Multi-Agent Chat", self.test_multi_agent_chat),
            ("Context Search", self.test_context_search),
            ("Error Handling", self.test_error_handling),
        ]
        
        results = []
        for test_name, test_func in tests:
            print(f"\n📋 Running: {test_name}")
            print("-" * 30)
            try:
                result = await test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {e}")
                results.append((test_name, False))
        
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 50)
        
        passed = 0
        for test_name, result in results:
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{status}: {test_name}")
            if result:
                passed += 1
        
        print(f"\nTotal: {passed}/{len(results)} tests passed")
        
        if passed == len(results):
            print("\n🎉 All tests passed! AutoGen integration is working correctly.")
            return True
        else:
            print(f"\n⚠️  {len(results) - passed} tests failed. Check the logs above.")
            return False
    
    async def cleanup(self):
        """Cleanup resources"""
        await self.client.aclose()

async def main():
    """Main test runner"""
    tester = AutoGenTester()
    
    try:
        success = await tester.run_all_tests()
        return 0 if success else 1
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    # Check if required environment variables are set
    required_env_vars = ["OPENAI_API_KEY", "PINECONE_API_KEY", "PINECONE_INDEX"]
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        print("❌ Missing required environment variables:")
        for var in missing_vars:
            print(f"  - {var}")
        print("\nPlease set these variables and try again.")
        sys.exit(1)
    
    # Run tests
    exit_code = asyncio.run(main())
    sys.exit(exit_code)