/**
 * Shared chat service logic for RAG-based chat endpoints.
 * Consolidates duplicate code from /api/chat and /api/chat-fixed routes.
 */

import { Message } from 'ai';
import { getContextFromMultipleNamespaces } from '@/utils/context';
import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { logger } from './logger';

/** RAG retrieval configuration */
const RAG_CONFIG = {
  /** Maximum tokens to retrieve from context */
  maxTokens: 5000,
  /** Minimum similarity score threshold */
  minScore: 0.2,
  /** Number of top results to retrieve per namespace */
  topK: 25,
  /** Namespaces to search */
  namespaces: ['pdf-documents', ''] as const,
} as const;

/** AutoGen service configuration */
const AUTOGEN_CONFIG = {
  /** Request timeout in milliseconds */
  timeoutMs: 30000,
} as const;

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
    [...RAG_CONFIG.namespaces],
    RAG_CONFIG.maxTokens,
    RAG_CONFIG.minScore,
    RAG_CONFIG.topK
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTOGEN_CONFIG.timeoutMs);

  try {
    logger.info('AutoGen requested - using real Microsoft AutoGen multi-agent collaboration');

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
      }),
      signal: controller.signal
    });

    if (!autoGenResponse.ok) return null;

    const result = await autoGenResponse.json();
    logger.info('AutoGen response received');

    // Extract the final response content without agent labels
    let fullResponse = '';

    if (typeof result.final_response === 'string') {
      fullResponse = result.final_response;
    } else if (result.messages?.length > 0) {
      // Use the last message content if no final_response
      fullResponse = result.messages[result.messages.length - 1]?.content ?? '';
    }

    // Stream the formatted response
    const streamResult = await streamText({
      model: openai('gpt-4.1-mini'),
      messages: [{ role: 'user', content: fullResponse }],
      temperature: 0
    });

    return streamResult.toDataStreamResponse();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('aborted')) {
      logger.warn('AutoGen service timed out');
    } else {
      logger.warn('AutoGen service failed:', errorMessage);
    }
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate an enhanced response using GPT-4 with RAG context.
 */
export async function generateEnhancedRAGResponse(
  query: string,
  context: string
): Promise<Response> {
  logger.info('Using enhanced RAG response');

  const systemPrompt = `You are an intelligent document analysis assistant with comprehensive analytical capabilities.

CONTEXT FROM KNOWLEDGE BASE:
${context || "No specific context available."}

INSTRUCTIONS:
- Provide thorough, well-researched answers based on the context
- Structure your response clearly with headers and sections when appropriate
- Include relevant details and insights from the provided context
- If the context doesn't contain relevant information, say so clearly
- Use markdown formatting for readability
- Be comprehensive but concise`;

  const result = await streamText({
    model: openai("gpt-4.1"),
    messages: [
      { role: 'system', content: systemPrompt },
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
    model: openai("gpt-4.1"),
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

  // Validate messages array
  if (!messages || messages.length === 0) {
    return new Response('No messages provided', { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];

  // Try real AutoGen service first if requested
  if (use_autogen) {
    const realAutoGenResponse = await tryRealAutoGenService(messages, agent_config);
    if (realAutoGenResponse) {
      return realAutoGenResponse;
    }

    // Fallback to enhanced RAG response
    const context = await getRAGContext(lastMessage.content);
    return generateEnhancedRAGResponse(lastMessage.content, context);
  }

  // Standard RAG chat
  const context = await getRAGContext(lastMessage.content);
  return generateStandardChatResponse(messages, context);
}
