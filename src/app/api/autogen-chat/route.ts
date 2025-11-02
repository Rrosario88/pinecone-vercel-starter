import { NextResponse } from 'next/server'
import { Message } from 'ai'

export const runtime = 'nodejs'

interface AutoGenRequest {
  messages: Message[]
  use_multi_agent?: boolean
  agent_config?: {
    use_researcher?: boolean
    use_critic?: boolean
    use_summarizer?: boolean
    max_rounds?: number
    temperature?: number
    context_strategy?: 'comprehensive' | 'focused' | 'quick'
  }
  stream?: boolean
  namespace?: string
}

interface AutoGenResponse {
  messages: Array<{
    agent_name: string
    role: string
    content: string
    timestamp: string
    metadata?: any
  }>
  final_response: string
  context_used: Array<any>
  processing_time: number
  agents_involved: string[]
  conversation_summary?: string
}

const AUTOGEN_SERVICE_URL = process.env.AUTOGEN_SERVICE_URL || 'http://localhost:8000'

export async function POST(req: Request) {
  try {
    const { messages, use_multi_agent = true, agent_config, namespace = '' } = await req.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty' },
        { status: 400 }
      )
    }

    // Prepare request for AutoGen service
    const autoGenRequest: AutoGenRequest = {
      messages: messages.map((msg: Message) => ({

        role: msg.role,
        content: msg.content
      })),
      use_multi_agent,
      agent_config: {
        use_researcher: agent_config?.use_researcher ?? true,
        use_critic: agent_config?.use_critic ?? true,
        use_summarizer: agent_config?.use_summarizer ?? false,
        max_rounds: agent_config?.max_rounds ?? 3,
        temperature: agent_config?.temperature ?? 0.7,
        context_strategy: agent_config?.context_strategy ?? 'comprehensive'
      },
      stream: false,
      namespace
    }

    // Call AutoGen service
    const response = await fetch(`${AUTOGEN_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(autoGenRequest)
    })

    if (!response.ok) {
      console.error(`AutoGen service error: ${response.status} ${response.statusText}`)
      
      // Fallback to original chat endpoint
      console.log('Falling back to original chat endpoint...')
      return await fallbackToOriginalChat(messages)
    }

    const result: AutoGenResponse = await response.json()

    // Format response to match expected structure
    return NextResponse.json({
      success: true,
      response: result.final_response,
      agents_involved: result.agents_involved,
      context_used: result.context_used.length,
      processing_time: result.processing_time,
      conversation: result.messages,
      multi_agent_enabled: use_multi_agent
    })

  } catch (error) {
    console.error('AutoGen chat error:', error)
    
    // Fallback to original chat endpoint on any error
    try {
      const { messages } = await req.json()
      return await fallbackToOriginalChat(messages)
    } catch (fallbackError) {
      console.error('Fallback chat error:', fallbackError)
      return NextResponse.json(
        { 
          error: 'Both AutoGen and fallback chat failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
}

async function fallbackToOriginalChat(messages: Message[]) {
  try {
    // Import and use the original chat logic
    const { getContext } = await import('@/utils/context')
    const { openai } = await import('@ai-sdk/openai')
    const { streamText } = await import('ai')

    if (!messages || messages.length === 0) {
      throw new Error('No messages provided')
    }

    const lastMessage = messages[messages.length - 1]

    // Get context using existing system
    const [pdfContext, webContext] = await Promise.all([
      getContext(
        lastMessage.content, 
        'pdf-documents',
        2000,
        0.3,
        true,
        8
      ),
      getContext(
        lastMessage.content, 
        '',
        2000,
        0.3,
        true,
        8
      )
    ])

    const context = [pdfContext, webContext].filter(c => typeof c === "string" && c.trim()).join("\n\n---\n\n")

    const prompt = {
      role: 'system' as const,
      content: `You are an intelligent document analysis assistant. Use the provided context to answer questions accurately.

CONTEXT BLOCK:
${context}
END OF CONTEXT BLOCK

Format your responses using clear markdown for excellent readability. Only answer based on the provided context.`
    }

    const result = await streamText({
      model: openai("gpt-4o"),
      messages: [prompt, ...messages.filter((message: Message) => message.role === 'user')]
    })

    // Since we're in a fallback, return a simple response
    const chunks: string[] = []
    for await (const chunk of result.textStream) {
      chunks.push(chunk)
    }

    const finalResponse = chunks.join('')

    return NextResponse.json({
      success: true,
      response: finalResponse,
      agents_involved: ['rag_assistant'],
      context_used: context ? 1 : 0,
      processing_time: 0,
      conversation: [
        {
          agent_name: 'rag_assistant',
          role: 'assistant',
          content: finalResponse,
          timestamp: new Date().toISOString()
        }
      ],
      multi_agent_enabled: false,
      fallback_used: true
    })

  } catch (error) {
    console.error('Fallback error:', error)
    throw error
  }
}