import { Message } from 'ai'
import { getContextFromMultipleNamespaces } from '@/utils/context'
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { messages, use_autogen = false, agent_config } = await req.json()
    const lastMessage = messages[messages.length - 1]
    
    // Handle AutoGen requests with immediate simulated response
    if (use_autogen) {
      console.log('AutoGen requested - using enhanced multi-agent simulation')

      // Single embedding for both namespaces (performance optimization)
      const contextMap = await getContextFromMultipleNamespaces(
        lastMessage.content,
        ['pdf-documents', ''],  // PDF and web namespaces
        3000, 0.25, 12
      );

      const context = [contextMap['pdf-documents'], contextMap['default']]
        .filter(c => c && c.trim() && c !== "No relevant information found in the knowledge base.")
        .join("\n\n---\n\n");
      
      // Create enhanced AutoGen-style prompt
      const autoGenPrompt = `You are an AI assistant providing a comprehensive multi-agent analysis.

CONTEXT FROM KNOWLEDGE BASE:
${context || "No specific context available for this query."}

USER QUESTION: ${lastMessage.content}

Please provide a detailed response following this multi-agent format:

🤖 **Researcher Agent:**
[Gather and present relevant information from the context or your knowledge. Focus on facts, data, and key concepts.]

🤖 **Analyst Agent:**
[Analyze the information from multiple perspectives. Provide insights, connections, and deeper understanding.]

🤖 **Reviewer Agent:**
[Review the analysis for accuracy, completeness, and clarity. Highlight key takeaways and implications.]

✅ **Final Response:**
[Provide a clear, comprehensive answer that directly addresses the user's question, incorporating the best insights from all agents.]

Guidelines:
- Be thorough but clear and concise
- Use markdown formatting for readability
- If context is available, prioritize it in your response
- If no relevant context exists, use your general knowledge
- Ensure the final response is practical and helpful`

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
        ],
        temperature: 0.7
      })

      return result.toDataStreamResponse()
    }

    // Standard chat processing (non-AutoGen)
    // Single embedding for both namespaces (performance optimization)
    const contextMap = await getContextFromMultipleNamespaces(
      lastMessage.content,
      ['pdf-documents', ''],  // PDF and web namespaces
      3000, 0.25, 12
    );

    const context = [contextMap['pdf-documents'], contextMap['default']]
      .filter(c => c && c.trim() && c !== "No relevant information found in the knowledge base.")
      .join("\n\n---\n\n");
    
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
