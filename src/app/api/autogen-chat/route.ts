import { streamText } from 'ai'
import { Message } from 'ai'
import { openai } from '@ai-sdk/openai'

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
  document_inventory?: any
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
    const body = await req.json()
    const { messages, use_multi_agent = true, agent_config, namespace = '' } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages array is required and cannot be empty' }, { status: 400 })
    }

    console.log('AutoGen request received, processing...')

    // Try to get streaming response from AutoGen service first
    try {
      const autoGenResponse = await fetch(`${AUTOGEN_SERVICE_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((msg: Message) => ({
            id: msg.id,
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
          stream: true,
          namespace
        })
      })

      if (autoGenResponse.ok && autoGenResponse.body) {
        console.log('AutoGen streaming response received')
        
        // Create a transform stream to convert AutoGen streaming format to AI SDK format
        const reader = autoGenResponse.body.getReader()
        const encoder = new TextEncoder()
        const decoder = new TextDecoder()

        const stream = new ReadableStream({
          async start(controller) {
            try {
              let fullResponse = ''
              let agentCount = 0

              while (true) {
                const { done, value } = await reader.read()
                if (done) break

                const chunk = decoder.decode(value, { stream: true })
                const lines = chunk.split('\n')

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6) // Remove 'data: ' prefix
                    
                    if (data === '[DONE]') {
                      // Send the complete response as a single stream chunk
                      const textChunk = `0:"${fullResponse.replace(/"/g, '\\"')}"\n`
                      controller.enqueue(encoder.encode(textChunk))
                      controller.close()
                      return
                    }

                    try {
                      const parsed = JSON.parse(data)
                      const type = parsed.type

                      if (type === 'agent_message') {
                        const agent = parsed.agent || 'unknown'
                        const content = parsed.content || ''
                        
                        // Add agent header and format for streaming
                        const agentName = agent.charAt(0).toUpperCase() + agent.slice(1)
                        const agentHeader = `\n\n🤖 **${agentName} Agent:**\n\n`
                        fullResponse += agentHeader + content
                        agentCount++
                        
                      } else if (type === 'final_response') {
                        const content = parsed.content || ''
                        
                        // Add final response header
                        const finalHeader = `\n\n✅ **Final Response:**\n\n`
                        fullResponse += finalHeader + content
                      }
                    } catch (e) {
                      // Skip invalid JSON
                      continue
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Stream processing error:', error)
              controller.error(error)
            } finally {
              reader.releaseLock()
            }
          }
        })

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        })
      } else {
        console.log('AutoGen streaming service error:', autoGenResponse.status)
      }
    } catch (error) {
      console.error('AutoGen streaming service call failed:', error)
    }

    // Fallback to non-streaming AutoGen service
    try {
      console.log('Trying non-streaming AutoGen service...')
      const autoGenResponse = await fetch(`${AUTOGEN_SERVICE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.map((msg: Message) => ({
            id: msg.id,
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
        })
      })

      if (autoGenResponse.ok) {
        const result: AutoGenResponse = await autoGenResponse.json()
        console.log('AutoGen non-streaming response received, agents involved:', result.agents_involved)
        
        // Create a comprehensive response with all agent messages
        let fullResponse = ''
        
        // Add agent messages with proper formatting
        for (const msg of result.messages) {
          const agentName = msg.agent_name.charAt(0).toUpperCase() + msg.agent_name.slice(1)
          fullResponse += `\n\n🤖 **${agentName} Agent:**\n\n${msg.content}`
        }
        
        // Add final response
        fullResponse += `\n\n✅ **Final Response:**\n\n${result.final_response}`

        // Use streamText to create a proper streaming response from the complete result
        const streamResult = await streamText({
          model: openai('gpt-4.1'),
          messages: [
            {
              role: 'system',
              content: 'You are presenting a multi-agent conversation. Display the conversation exactly as provided, maintaining all formatting, agent names, and content without any changes or summarization.'
            },
            {
              role: 'user',
              content: `Please present this multi-agent conversation exactly as written:\n\n${fullResponse}`
            }
          ],
          temperature: 0
        })

        console.log('Streaming AutoGen response created')
        return streamResult.toDataStreamResponse()
      } else {
        console.log('AutoGen non-streaming service error:', autoGenResponse.status)
      }
    } catch (error) {
      console.error('AutoGen non-streaming service call failed:', error)
    }

    // Fallback to original chat endpoint
    console.log('Falling back to original chat endpoint...')
    return await fallbackToOriginalChat(messages)

  } catch (error) {
    console.error('AutoGen chat error:', error)
    
    // Final fallback
    try {
      const { messages } = await req.json()
      return await fallbackToOriginalChat(messages)
    } catch (fallbackError) {
      console.error('Fallback chat error:', fallbackError)
      return Response.json({ 
        error: 'Both AutoGen and fallback chat failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
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
      model: openai("gpt-4.1"),
      messages: [prompt, ...messages.filter((message: Message) => message.role === 'user')]
    })

    return result.toDataStreamResponse()

  } catch (error) {
    console.error('Fallback error:', error)
    throw error
  }
}
