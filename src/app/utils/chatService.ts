/**
 * Shared chat service logic for RAG-based chat endpoints.
 * Consolidates duplicate code from /api/chat and /api/chat-fixed routes.
 */

import { Message } from 'ai';
import { getContextFromMultipleNamespaces } from '@/utils/context';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export interface ChatRequestBody {
  messages: Message[];
  use_autogen?: boolean;
  agent_config?: {
    use_researcher?: boolean;
    use_critic?: boolean;
    use_summarizer?: boolean;
    context_strategy?: string;
  };
}

/**
 * Retrieves context from both PDF and web namespaces using a single embedding.
 */
export async function getRAGContext(query: string): Promise<string> {
  const contextMap = await getContextFromMultipleNamespaces(
    query,
    ['pdf-documents', ''],  // PDF and web namespaces
    3000, 0.25, 12
  );

  return [contextMap['pdf-documents'], contextMap['default']]
    .filter(c => c && c.trim() && c !== "No relevant information found in the knowledge base.")
    .join("\n\n---\n\n");
}

/**
 * Try to call the real AutoGen service if available.
 * Returns null if service is unavailable or fails.
 */
export async function tryRealAutoGenService(
  messages: Message[],
  agentConfig?: ChatRequestBody['agent_config']
): Promise<Response | null> {
  const serviceUrl = process.env.AUTOGEN_SERVICE_URL;
  if (!serviceUrl) return null;

  try {
    console.log('AutoGen requested - using real Microsoft AutoGen multi-agent collaboration');

    const autoGenResponse = await fetch(`${serviceUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        use_multi_agent: true,
        agent_config: agentConfig || {
          use_researcher: true,
          use_critic: true,
          use_summarizer: false,
          context_strategy: 'comprehensive'
        }
      })
    });

    if (!autoGenResponse.ok) return null;

    const result = await autoGenResponse.json();
    console.log('Multi-agent AutoGen response received');

    // Format multi-agent response from real AutoGen
    let fullResponse = '';

    if (result.messages && result.messages.length > 0) {
      const agentMsg = result.messages[0];
      const agentName = agentMsg.agent_name.charAt(0).toUpperCase() + agentMsg.agent_name.slice(1);
      fullResponse += `\n\n🤖 **${agentName} Agent:**\n\n${agentMsg.content}`;
    }

    if (result.final_response) {
      fullResponse += `\n\n✅ **Final Response:**\n\n${result.final_response}`;
    }

    // Stream the formatted response
    const streamResult = await streamText({
      model: openai('gpt-4o-mini'),
      messages: [{ role: 'user', content: fullResponse }],
      temperature: 0
    });

    return streamResult.toDataStreamResponse();
  } catch (error) {
    console.log('AutoGen service failed:', (error as Error).message);
    return null;
  }
}

/**
 * Generate a simulated multi-agent response using GPT-4.
 */
export async function generateSimulatedAutoGenResponse(
  query: string,
  context: string
): Promise<Response> {
  console.log('Using simulated multi-agent response');

  const autoGenPrompt = `You are an AI assistant providing a multi-agent style analysis.

CONTEXT FROM KNOWLEDGE BASE:
${context || "No specific context available."}

USER QUESTION: ${query}

Please provide a response in this multi-agent format:

🤖 **Researcher Agent:**
[Gather and present relevant information from the context or your knowledge]

🤖 **Analyst Agent:**
[Analyze the information and provide insights]

🤖 **Reviewer Agent:**
[Review and validate the analysis]

✅ **Final Response:**
[Provide a clear, comprehensive answer]

Be thorough but concise. Use markdown formatting.`;

  const result = await streamText({
    model: openai("gpt-4o"),
    messages: [
      { role: 'system', content: autoGenPrompt },
      { role: 'user', content: query }
    ]
  });

  return result.toDataStreamResponse();
}

/**
 * Generate a standard RAG chat response.
 */
export async function generateStandardChatResponse(
  messages: Message[],
  context: string
): Promise<Response> {
  const systemPrompt = `You are an intelligent document analysis assistant.

CONTEXT FROM YOUR KNOWLEDGE BASE:
${context}

INSTRUCTIONS:
- Answer questions using ONLY the information from the provided context
- Write naturally and conversationally
- Use clear markdown formatting for better readability
- If information isn't in your knowledge base, say so clearly`;

  const result = await streamText({
    model: openai("gpt-4o"),
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.filter((message: Message) => message.role === 'user')
    ]
  });

  return result.toDataStreamResponse();
}

/**
 * Main chat handler that processes all chat requests.
 * Supports both AutoGen (real + simulated) and standard RAG chat.
 */
export async function handleChatRequest(body: ChatRequestBody): Promise<Response> {
  const { messages, use_autogen = false, agent_config } = body;
  const lastMessage = messages[messages.length - 1];

  // Try real AutoGen service first if requested
  if (use_autogen) {
    const realAutoGenResponse = await tryRealAutoGenService(messages, agent_config);
    if (realAutoGenResponse) {
      return realAutoGenResponse;
    }

    // Fallback to simulated AutoGen
    const context = await getRAGContext(lastMessage.content);
    return generateSimulatedAutoGenResponse(lastMessage.content, context);
  }

  // Standard RAG chat
  const context = await getRAGContext(lastMessage.content);
  return generateStandardChatResponse(messages, context);
}
