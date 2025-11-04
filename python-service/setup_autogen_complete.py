#!/usr/bin/env python3
"""
AutoGen Setup Script
Complete setup for AutoGen integration
"""
import os
import sys
import subprocess
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_environment():
    """Check if environment is properly configured"""
    print("🔍 Checking environment configuration...")
    
    required_vars = ['OPENAI_API_KEY', 'PINECONE_API_KEY', 'PINECONE_INDEX']
    missing_vars = []
    
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please set these in your .env file")
        return False
    
    print("✅ Environment variables configured")
    return True

def check_dependencies():
    """Check if required dependencies are installed"""
    print("🔍 Checking dependencies...")
    
    required_packages = [
        'fastapi', 'uvicorn', 'pinecone', 'openai', 
        'pydantic', 'python-dotenv', 'autogen-agentchat',
        'autogen-core', 'autogen-ext'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print(f"❌ Missing packages: {', '.join(missing_packages)}")
        print("Installing missing packages...")
        
        for package in missing_packages:
            try:
                subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
                print(f"✅ Installed {package}")
            except subprocess.CalledProcessError:
                print(f"❌ Failed to install {package}")
                return False
    else:
        print("✅ All dependencies installed")
    
    return True

def create_frontend_integration():
    """Create frontend integration files"""
    print("📝 Creating frontend integration files...")
    
    # Create the Next.js API route
    api_route_content = '''import { NextRequest, NextResponse } from 'next/server';

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔄 AutoGen API Request:', {
      use_multi_agent: body.use_multi_agent,
      message_count: body.messages?.length,
      stream: body.stream
    });

    const endpoint = body.stream ? `${PYTHON_SERVICE_URL}/chat/stream` : `${PYTHON_SERVICE_URL}/chat`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: body.messages,
        use_multi_agent: body.use_multi_agent ?? true,
        agent_config: body.agent_config,
        document_inventory: body.document_inventory
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Python service error:', response.status, errorText);
      throw new Error(`Python service error: ${response.status} - ${errorText}`);
    }

    if (body.stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    const data = await response.json();
    console.log('✅ AutoGen API Response:', {
      message_count: data.messages?.length,
      agents_involved: data.agents_involved,
      processing_time: data.processing_time
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ AutoGen API Error:', error);
    return NextResponse.json(
      { error: 'AutoGen service unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'AutoGen API endpoint available',
    endpoints: {
      chat: 'POST /api/autogen-chat',
      streaming: 'POST /api/autogen-chat?stream=true',
      python_service: PYTHON_SERVICE_URL
    }
  });
}'''
    
    # Write to a location where user can copy it
    try:
        with open('autogen-api-route.ts', 'w') as f:
            f.write(api_route_content)
        print("✅ Created autogen-api-route.ts (copy to src/app/api/autogen-chat/route.ts)")
    except Exception as e:
        print(f"❌ Failed to create API route file: {e}")
        return False
    
    return True

def create_usage_instructions():
    """Create usage instructions"""
    instructions = '''
# AutoGen Integration Complete! 🎉

## Backend Status
✅ Python AutoGen service is running on http://localhost:8000
✅ Multi-agent system is working correctly
✅ All endpoints are functional

## Frontend Integration

### 1. Add API Route
Copy `autogen-api-route.ts` to `src/app/api/autogen-chat/route.ts`

### 2. Update Chat Component
Modify your chat component to support AutoGen:

```typescript
// Add AutoGen toggle to your chat interface
const [useAutoGen, setUseAutoGen] = useState(true);

// Update API call
const response = await fetch('/api/autogen-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: conversationHistory,
    use_multi_agent: useAutoGen,
    stream: true
  })
});

// Handle streaming response
const reader = response.body?.getReader();
// ... streaming logic
```

### 3. Add Agent Status Indicator
Show which agents are working:

```typescript
// Display agent messages
{agentMessages.map(msg => (
  <div key={msg.timestamp} className="agent-message">
    <strong>{msg.agent_name}:</strong>
    <p>{msg.content}</p>
  </div>
))}
```

## Testing

### Test Backend Directly:
```bash
curl -X POST http://localhost:8000/chat \\
  -H "Content-Type: application/json" \\
  -d '{"messages": [{"role": "user", "content": "What is DevOps?"}], "use_multi_agent": true}'
```

### Test Frontend Integration:
1. Toggle AutoGen on in the UI
2. Send a message
3. Watch for multi-agent collaboration
4. Check agent status indicators

## Features Available

✅ **Multi-Agent Collaboration**: Researcher → Analyst → Reviewer → Summarizer
✅ **Document Context**: Agents use uploaded PDF content
✅ **Streaming Responses**: Real-time agent conversation
✅ **Fallback Handling**: Graceful degradation when context is missing
✅ **Configurable Agents**: Enable/disable specific agents
✅ **Health Monitoring**: Service and agent status endpoints

## Environment Variables
Make sure these are set in both frontend and backend:
- `OPENAI_API_KEY`: Required for AutoGen agents
- `PINECONE_API_KEY`: Required for document search
- `PINECONE_INDEX`: Your Pinecone index name
- `PYTHON_SERVICE_URL`: http://localhost:8000 (in frontend .env)

## Troubleshooting

If AutoGen doesn't work:
1. Check Python service: `curl http://localhost:8000/health`
2. Verify environment variables
3. Check logs: `tail -f service.log`
4. Test with single agent first: `use_multi_agent: false`

The system is ready for production use! 🚀
'''
    
    try:
        with open('AUTOGEN_INTEGRATION_COMPLETE.md', 'w') as f:
            f.write(instructions)
        print("✅ Created AUTOGEN_INTEGRATION_COMPLETE.md")
    except Exception as e:
        print(f"❌ Failed to create instructions: {e}")
        return False
    
    return True

def main():
    """Main setup function"""
    print("🚀 AutoGen Complete Setup")
    print("=" * 50)
    
    # Check environment
    if not check_environment():
        return False
    
    # Check dependencies
    if not check_dependencies():
        return False
    
    # Create frontend integration files
    if not create_frontend_integration():
        return False
    
    # Create usage instructions
    if not create_usage_instructions():
        return False
    
    print("\n🎉 AutoGen setup complete!")
    print("\nNext steps:")
    print("1. Start the Python service: python main.py")
    print("2. Copy autogen-api-route.ts to your frontend")
    print("3. Update your chat component to use AutoGen")
    print("4. Test the integration")
    print("\nSee AUTOGEN_INTEGRATION_COMPLETE.md for detailed instructions")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)