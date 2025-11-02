import { Message } from 'ai'
import { getContext } from '@/utils/context'
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { Pinecone } from '@pinecone-database/pinecone';

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { messages, use_autogen = false, agent_config } = await req.json()
    
    // Handle AutoGen requests with a simple working implementation
    if (use_autogen && process.env.AUTOGEN_SERVICE_URL) {
      try {
        console.log('AutoGen requested, calling service...')
        
        const autoGenResponse = await fetch(`${process.env.AUTOGEN_SERVICE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            use_multi_agent: true,
            agent_config: agent_config || {
              use_researcher: true,
              use_critic: true,
              use_summarizer: false,
              context_strategy: 'comprehensive'
            }
          })
        })

        if (autoGenResponse.ok) {
          const result = await autoGenResponse.json()
          console.log('AutoGen response received:', result.agents_involved)
          
          // Create a streaming response using the AutoGen result
          const responseText = result.final_response;
          
          // Use the AI SDK to create a proper streaming response
          const streamResult = await streamText({
            model: openai("gpt-4o"),
            messages: [
              {
                role: 'system',
                content: 'You are a helpful assistant. Return the exact text provided below without any modifications.'
              },
              {
                role: 'user',
                content: responseText
              }
            ],
            temperature: 0
          });

          const response = streamResult.toDataStreamResponse();
          
          // Add custom headers to indicate AutoGen was used
          const headers = new Headers(response.headers);
          headers.set('X-AutoGen-Used', 'true');
          headers.set('X-Agents-Involved', result.agents_involved.join(','));
          
          return new Response(response.body, {
            status: response.status,
            headers
          })
        }
      } catch (error) {
        console.log('AutoGen failed, falling back to standard chat:', error)
      }
    }

    // Standard chat processing
    const lastMessage = messages[messages.length - 1]
    
    const [pdfContext, webContext] = await Promise.all([
      getContext(lastMessage.content, 'pdf-documents', 3000, 0.25, true, 12),
      getContext(lastMessage.content, '', 3000, 0.25, true, 12)
    ]);

    let context = [pdfContext, webContext].filter(c => typeof c === "string" && c.trim() && c !== "No relevant information found in the knowledge base.").join("\n\n---\n\n");
    
    const prompt = [
      {
        role: 'system',
        content: `You are an intelligent document analysis assistant.

CONTEXT FROM YOUR KNOWLEDGE BASE:
${context}

INSTRUCTIONS:
- Answer questions using ONLY the information from the provided context
- Write naturally and conversationally
- Use clear markdown formatting for better readability
- If information isn't in your knowledge base, say so clearly`,
      },
    ]

    const result = await streamText({
      model: openai("gpt-4o"),
      messages: [...prompt, ...messages.filter((message: Message) => message.role === 'user')]
    });

    return result.toDataStreamResponse();
  } catch (e) {
    throw (e)
  }
}