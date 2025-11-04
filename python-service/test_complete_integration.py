#!/usr/bin/env python3
"""
Complete AutoGen Integration Test
Tests the full flow from API request to response
"""
import asyncio
import json
import requests
import time
from typing import Dict, Any

class AutoGenIntegrationTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        
    def test_health(self) -> bool:
        """Test health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print("✅ Health Check:")
                print(f"   Status: {data.get('status')}")
                print(f"   Service: {data.get('service')}")
                print(f"   Agents initialized: {data.get('agents_initialized')}")
                print(f"   Pinecone connected: {data.get('pinecone_connected')}")
                return True
            else:
                print(f"❌ Health check failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Health check error: {e}")
            return False
    
    def test_agents_status(self) -> bool:
        """Test agents status endpoint"""
        try:
            response = requests.get(f"{self.base_url}/agents/status", timeout=5)
            if response.status_code == 200:
                status = response.json()
                print("✅ Agents Status:")
                for agent_name, agent_info in status.items():
                    last_used = agent_info.get('last_used', 'Never')
                    message_count = agent_info.get('message_count', 0)
                    active = agent_info.get('active', False)
                    
                    print(f"   {agent_name}: {'🟢' if active else '🔴'} | Messages: {message_count} | Last used: {last_used}")
                return True
            else:
                print(f"❌ Agents status failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Agents status error: {e}")
            return False
    
    def test_chat_completion(self, query: str, use_multi_agent: bool = True) -> Dict[str, Any]:
        """Test chat completion endpoint"""
        try:
            request_data = {
                "messages": [{"role": "user", "content": query}],
                "use_multi_agent": use_multi_agent,
                "agent_config": {
                    "use_researcher": True,
                    "use_critic": True,
                    "use_summarizer": False
                }
            }
            
            print(f"\n🔄 Testing {'Multi-Agent' if use_multi_agent else 'Single-Agent'} Chat:")
            print(f"   Query: {query}")
            
            start_time = time.time()
            response = requests.post(
                f"{self.base_url}/chat",
                json=request_data,
                timeout=60,
                headers={"Content-Type": "application/json"}
            )
            end_time = time.time()
            
            if response.status_code == 200:
                data = response.json()
                processing_time = end_time - start_time
                
                print(f"✅ Response received in {processing_time:.2f}s:")
                print(f"   Messages: {len(data.get('messages', []))}")
                print(f"   Agents involved: {data.get('agents_involved', [])}")
                print(f"   Processing time: {data.get('processing_time', 0):.2f}s")
                print(f"   Response length: {len(data.get('final_response', ''))} chars")
                
                return {
                    "success": True,
                    "data": data,
                    "total_time": processing_time
                }
            else:
                print(f"❌ Chat request failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            print(f"❌ Chat request error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def test_streaming_chat(self, query: str, use_multi_agent: bool = True) -> Dict[str, Any]:
        """Test streaming chat endpoint"""
        try:
            request_data = {
                "messages": [{"role": "user", "content": query}],
                "use_multi_agent": use_multi_agent,
                "agent_config": {
                    "use_researcher": True,
                    "use_critic": True,
                    "use_summarizer": False
                }
            }
            
            print(f"\n🔄 Testing {'Multi-Agent' if use_multi_agent else 'Single-Agent'} Streaming:")
            print(f"   Query: {query}")
            
            start_time = time.time()
            response = requests.post(
                f"{self.base_url}/chat/stream",
                json=request_data,
                stream=True,
                timeout=60,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                agent_messages = []
                final_response = ""
                
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # Remove 'data: ' prefix
                            
                            if data_str == '[DONE]':
                                break
                            
                            try:
                                chunk = json.loads(data_str)
                                chunk_type = chunk.get('type', 'unknown')
                                
                                if chunk_type == 'agent_message':
                                    agent_messages.append(chunk)
                                    agent = chunk.get('agent', 'unknown')
                                    content = chunk.get('content', '')
                                    step = chunk.get('step', 0)
                                    total = chunk.get('total_steps', 0)
                                    
                                    print(f"   🤖 Agent {step}/{total}: {agent}")
                                    print(f"      {content[:80]}...")
                                    
                                elif chunk_type == 'final_response':
                                    final_response = chunk.get('content', '')
                                    processing_time = chunk.get('processing_time', 0)
                                    agents_involved = chunk.get('agents_involved', [])
                                    
                                    print(f"   ✅ Final Response Complete!")
                                    print(f"      Processing time: {processing_time:.2f}s")
                                    print(f"      Agents involved: {', '.join(agents_involved)}")
                                    print(f"      Total agent messages: {len(agent_messages)}")
                                    
                                elif chunk_type == 'error':
                                    print(f"   ❌ Error: {chunk.get('message', 'Unknown error')}")
                                    
                            except json.JSONDecodeError:
                                continue
                
                end_time = time.time()
                total_time = end_time - start_time
                
                return {
                    "success": True,
                    "agent_messages": agent_messages,
                    "final_response": final_response,
                    "total_time": total_time
                }
            else:
                print(f"❌ Streaming request failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return {
                    "success": False,
                    "error": response.text,
                    "status_code": response.status_code
                }
                
        except Exception as e:
            print(f"❌ Streaming request error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def run_comprehensive_tests(self):
        """Run comprehensive tests"""
        print("🚀 AutoGen Integration Test Suite")
        print("=" * 60)
        
        # Test basic connectivity
        if not self.test_health():
            print("❌ Service is not healthy. Exiting.")
            return False
            
        if not self.test_agents_status():
            print("❌ Agents not available. Exiting.")
            return False
        
        print("\n" + "=" * 60)
        print("🧪 Testing Chat Functionality")
        print("=" * 60)
        
        # Test cases
        test_cases = [
            {
                "query": "What is Terraform and how does it work?",
                "use_multi_agent": True,
                "description": "Multi-agent analysis"
            },
            {
                "query": "Explain Kubernetes in simple terms",
                "use_multi_agent": False,
                "description": "Single-agent response"
            },
            {
                "query": "Compare Prometheus and Grafana",
                "use_multi_agent": True,
                "description": "Multi-agent comparison"
            }
        ]
        
        results = []
        
        for i, test_case in enumerate(test_cases, 1):
            print(f"\n{'='*60}")
            print(f"TEST {i}: {test_case['description']}")
            print(f"{'='*60}")
            
            # Test regular chat
            chat_result = self.test_chat_completion(
                test_case["query"], 
                test_case["use_multi_agent"]
            )
            results.append({
                "test": f"{test_case['description']} (Regular)",
                "result": chat_result
            })
            
            # Test streaming chat
            stream_result = self.test_streaming_chat(
                test_case["query"], 
                test_case["use_multi_agent"]
            )
            results.append({
                "test": f"{test_case['description']} (Streaming)",
                "result": stream_result
            })
        
        # Summary
        print(f"\n{'='*60}")
        print("📊 TEST SUMMARY")
        print(f"{'='*60}")
        
        successful_tests = sum(1 for r in results if r["result"]["success"])
        total_tests = len(results)
        
        for result in results:
            status = "✅ PASS" if result["result"]["success"] else "❌ FAIL"
            print(f"{status} - {result['test']}")
        
        print(f"\nOverall: {successful_tests}/{total_tests} tests passed")
        
        if successful_tests == total_tests:
            print("🎉 All tests passed! AutoGen is working correctly.")
            return True
        else:
            print("⚠️  Some tests failed. Check the logs above.")
            return False

def main():
    """Main test function"""
    tester = AutoGenIntegrationTester()
    success = tester.run_comprehensive_tests()
    
    if success:
        print("\n✅ AutoGen integration is ready for production!")
        print("\nNext steps:")
        print("1. Update frontend to call /api/autogen-chat endpoints")
        print("2. Add AutoGen toggle in the UI")
        print("3. Test with real user queries")
    else:
        print("\n❌ AutoGen integration needs fixes before production use.")

if __name__ == "__main__":
    main()