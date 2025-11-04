#!/usr/bin/env python3
"""
Test script to demonstrate the complete streaming multi-agent solution
"""
import asyncio
import json
import aiohttp
import time

async def test_streaming_multi_agent():
    """Test the streaming multi-agent functionality"""
    
    # Test data
    test_queries = [
        {
            "messages": [{"role": "user", "content": "Explain the key differences between Terraform and Kubernetes"}],
            "use_multi_agent": True,
            "description": "Multi-agent deep analysis"
        },
        {
            "messages": [{"role": "user", "content": "What is container orchestration?"}],
            "use_multi_agent": False,
            "description": "Single-agent quick response"
        }
    ]
    
    async with aiohttp.ClientSession() as session:
        for i, test in enumerate(test_queries, 1):
            print(f"\n{'='*60}")
            print(f"TEST {i}: {test['description']}")
            print(f"Query: {test['messages'][0]['content']}")
            print(f"Multi-agent: {test['use_multi_agent']}")
            print(f"{'='*60}")
            
            start_time = time.time()
            
            try:
                async with session.post(
                    'http://localhost:8000/chat/stream',
                    json=test,
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    
                    if response.status == 200:
                        agent_count = 0
                        final_response = ""
                        
                        async for line in response.content:
                            line = line.decode('utf-8').strip()
                            if line.startswith('data: '):
                                data = line[6:]  # Remove 'data: ' prefix
                                
                                if data == '[DONE]':
                                    break
                                
                                try:
                                    chunk = json.loads(data)
                                    chunk_type = chunk.get('type', 'unknown')
                                    
                                    if chunk_type == 'agent_message':
                                        agent_count += 1
                                        agent = chunk.get('agent', 'unknown')
                                        content = chunk.get('content', '')
                                        step = chunk.get('step', 0)
                                        total = chunk.get('total_steps', 0)
                                        
                                        print(f"\n🤖 Agent {step}/{total}: {agent}")
                                        print(f"   {content[:100]}...")
                                        
                                    elif chunk_type == 'final_response':
                                        final_response = chunk.get('content', '')
                                        processing_time = chunk.get('processing_time', 0)
                                        agents_involved = chunk.get('agents_involved', [])
                                        
                                        print(f"\n✅ Final Response Complete!")
                                        print(f"   Processing time: {processing_time:.2f}s")
                                        print(f"   Agents involved: {', '.join(agents_involved)}")
                                        print(f"   Total agent messages: {agent_count}")
                                        
                                    elif chunk_type == 'error':
                                        print(f"❌ Error: {chunk.get('message', 'Unknown error')}")
                                        
                                except json.JSONDecodeError:
                                    continue
                        
                        end_time = time.time()
                        total_time = end_time - start_time
                        print(f"\n⏱️  Total request time: {total_time:.2f}s")
                        
                    else:
                        print(f"❌ HTTP Error: {response.status}")
                        error_text = await response.text()
                        print(f"   {error_text}")
                        
            except Exception as e:
                print(f"❌ Request failed: {e}")
            
            print(f"\n{'='*60}\n")

async def test_health_and_status():
    """Test health and agent status endpoints"""
    
    print("🔍 Testing Service Health and Status")
    print("="*40)
    
    async with aiohttp.ClientSession() as session:
        # Test health
        try:
            async with session.get('http://localhost:8000/health') as response:
                if response.status == 200:
                    health = await response.json()
                    print("✅ Health Check:")
                    print(f"   Status: {health.get('status')}")
                    print(f"   Service: {health.get('service')}")
                    print(f"   Agents initialized: {health.get('agents_initialized')}")
                    print(f"   Pinecone connected: {health.get('pinecone_connected')}")
                else:
                    print(f"❌ Health check failed: {response.status}")
        except Exception as e:
            print(f"❌ Health check error: {e}")
        
        print()
        
        # Test agents status
        try:
            async with session.get('http://localhost:8000/agents/status') as response:
                if response.status == 200:
                    status = await response.json()
                    print("✅ Agents Status:")
                    for agent_name, agent_info in status.items():
                        last_used = agent_info.get('last_used', 'Never')
                        message_count = agent_info.get('message_count', 0)
                        active = agent_info.get('active', False)
                        
                        print(f"   {agent_name}: {'🟢' if active else '🔴'} | Messages: {message_count} | Last used: {last_used}")
                else:
                    print(f"❌ Agents status failed: {response.status}")
        except Exception as e:
            print(f"❌ Agents status error: {e}")

async def main():
    """Main test function"""
    print("🚀 Testing Complete Streaming Multi-Agent Solution")
    print("=" * 60)
    
    # Test health and status first
    await test_health_and_status()
    
    print("\n" + "="*60)
    print("🔄 Testing Streaming Chat Functionality")
    print("="*60)
    
    # Test streaming functionality
    await test_streaming_multi_agent()
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())