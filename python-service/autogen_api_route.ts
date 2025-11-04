"""
Next.js API Route for AutoGen Chat Integration
This file should be placed in src/app/api/autogen-chat/route.ts
"""

import { NextRequest, NextResponse } from 'next/server';

// Python service configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🔄 AutoGen API Request:', {
      use_multi_agent: body.use_multi_agent,
      message_count: body.messages?.length,
      stream: body.stream
    });

    // Forward the request to the Python AutoGen service
    const endpoint = body.stream ? `${PYTHON_SERVICE_URL}/chat/stream` : `${PYTHON_SERVICE_URL}/chat`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: body.messages,
        use_multi_agent: body.use_multi_agent ?? true, // Default to true for AutoGen
        agent_config: body.agent_config,
        document_inventory: body.document_inventory
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Python service error:', response.status, errorText);
      throw new Error(`Python service error: ${response.status} - ${errorText}`);
    }

    // Handle streaming response
    if (body.stream) {
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Handle regular response
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
}