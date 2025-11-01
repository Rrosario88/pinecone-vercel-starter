#!/usr/bin/env python3
"""
Integration test for real AutoGen multi-agent system API
"""
import asyncio
import json
import requests
import time
import subprocess
import sys
import os

def test_api():
    """Test the API endpoints"""
    print("🚀 Starting API Integration Test...")
    
    # Start the server in background
    print("📡 Starting FastAPI server...")
    server_process = subprocess.Popen([
        sys.executable, "main.py"
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    # Wait for server to start
    time.sleep(5)
    
    try:
        # Test root endpoint
        print("\n🏠 Testing root endpoint...")
        response = requests.get("http://localhost:8000")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Root endpoint works: {data['service']} v{data['version']}")
        else:
            print(f"❌ Root endpoint failed: {response.status_code}")
        
        # Test health endpoint
        print("\n💓 Testing health endpoint...")
        response = requests.get("http://localhost:8000/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check: {data['status']}")
            print(f"   Agents initialized: {data['agents_initialized']}")
            print(f"   Pinecone connected: {data['pinecone_connected']}")
        else:
            print(f"❌ Health endpoint failed: {response.status_code}")
        
        # Test chat endpoint
        print("\n💬 Testing chat endpoint...")
        chat_request = {
            "messages": [
                {"role": "user", "content": "What is artificial intelligence?"}
            ],
            "use_multi_agent": True,
            "agent_config": {
                "use_researcher": True,
                "use_critic": False,
                "use_summarizer": False
            }
        }
        
        start_time = time.time()
        response = requests.post(
            "http://localhost:8000/chat",
            json=chat_request,
            headers={"Content-Type": "application/json"}
        )
        end_time = time.time()
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chat completed in {end_time - start_time:.2f}s")
            print(f"   Agents involved: {data.get('agents_involved', [])}")
            print(f"   Number of messages: {len(data.get('messages', []))}")
            print(f"   Processing time: {data.get('processing_time', 0):.2f}s")
            print(f"   Final response preview: {data.get('final_response', '')[:150]}...")
            
            # Show agent conversation
            print("\n🤖 Agent Conversation:")
            for i, msg in enumerate(data.get('messages', [])):
                print(f"   {i+1}. {msg['agent_name']}: {msg['content'][:100]}...")
                
        else:
            print(f"❌ Chat endpoint failed: {response.status_code}")
            print(f"   Error: {response.text}")
        
        # Test agents status endpoint
        print("\n📊 Testing agents status endpoint...")
        response = requests.get("http://localhost:8000/agents/status")
        if response.status_code == 200:
            data = response.json()
            print("✅ Agents status:")
            for agent_name, status in data.items():
                print(f"   {agent_name}: {status['message_count']} messages, active: {status['active']}")
        else:
            print(f"❌ Agents status failed: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up server
        print("\n🧹 Stopping server...")
        server_process.terminate()
        server_process.wait()
        print("✅ Server stopped")

if __name__ == "__main__":
    test_api()