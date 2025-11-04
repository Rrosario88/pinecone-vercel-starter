import { Message } from 'ai'
import { getContext } from '@/utils/context'
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { messages, use_autogen = false, agent_config } = await req.json()
    const lastMessage = messages[messages.length - 1]
    
    // Handle AutoGen requests using single-agent backend with multi-agent formatting
    if (use_autogen && process.env.AUTOGEN_SERVICE_URL) {
      console.log('AutoGen requested - using single-agent backend with multi-agent formatting')
      
      try {
        // Call AutoGen service with single-agent mode for reliability
        const autoGenResponse = await fetch(`${process.env.AUTOGEN_SERVICE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages,
            use_multi_agent: false, // Use single-agent for reliability
            agent_config: agent_config || {
              use_researcher: true,
              use_critic: false, // Disable critic to speed up
              use_summarizer: false,
              context_strategy: 'comprehensive'
            }
          })
        })

        if (autoGenResponse.ok) {
          const result = await autoGenResponse.json()
          console.log('Single-agent AutoGen response received')
          
          // Create multi-agent style formatting from single-agent response
          let fullResponse = ''
          
          // Add the agent response with multi-agent formatting
          if (result.messages && result.messages.length > 0) {
            const agentMsg = result.messages[0]
            const agentName = agentMsg.agent_name.charAt(0).toUpperCase() + agentMsg.agent_name.slice(1)
            fullResponse += `\n\n🤖 **${agentName} Agent:**\n\n${agentMsg.content}`
          }
          
          // Add final response
          if (result.final_response) {
            fullResponse += `\n\n✅ **Final Response:**\n\n${result.final_response}`
          }

          // Use streamText to create a proper streaming response
          const streamResult = await streamText({
            model: openai('gpt-4o'),
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

          return streamResult.toDataStreamResponse()
        }
      } catch (error) {
        console.log('AutoGen service failed, using simulated multi-agent response:', error.message)
      }
    }

    // Fallback: Simulated AutoGen response using context
    if (use_autogen) {
      console.log('Using simulated multi-agent response')
      
      const [pdfContext, webContext] = await Promise.all([
        getContext(lastMessage.content, 'pdf-documents', 3000, 0.25, true, 12),
        getContext(lastMessage.content, '', 3000, 0.25, true, 12)
      ]);

      let context = [pdfContext, webContext].filter(c => typeof c === "string" && c.trim() && c !== "No relevant information found in the knowledge base.").join("\n\n---\n\n");
      
      const autoGenPrompt = `You are an AI assistant providing a multi-agent style analysis.

CONTEXT FROM KNOWLEDGE BASE:
${context || "No specific context available."}

USER QUESTION: ${lastMessage.content}

Please provide a response in this multi-agent format:

🤖 **Researcher Agent:**
[Gather and present relevant information]

🤖 **Analyst Agent:**
[Analyze the information and provide insights]

🤖 **Reviewer Agent:**
[Review and validate the analysis]

✅ **Final Response:**
[Provide a clear, comprehensive answer]

Be thorough but concise. Use markdown formatting.`

      const result = await streamText({
        model: openai("gpt-4o"),
        messages: [
          {
            role: 'system',
            content: autoGenPrompt
          },
          {
            role: 'user',
            content: lastMessage.content
          }
        ]
      })

      return result.toDataStreamResponse()
    }

    // Standard chat processing (non-AutoGen)
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
    console.error('Chat error:', e)
    throw (e)
  }
}
