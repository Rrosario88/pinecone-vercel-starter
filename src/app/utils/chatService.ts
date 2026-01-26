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

/** Inventory query detection keywords */
const INVENTORY_KEYWORDS = [
  "what documents", "which documents", "list documents", "list all",
  "what files", "which files", "list files", "show documents",
  "show files", "all documents", "all files", "documents do you have",
  "files do you have", "what do you have", "what's in", "what is in",
  "inventory", "available documents", "uploaded documents", "uploaded files",
  "tell me about all", "describe all", "summarize all"
];

/**
 * Detect if a query is asking for document inventory
 */
function isInventoryQuery(query: string): boolean {
  const queryLower = query.toLowerCase();
  return INVENTORY_KEYWORDS.some(keyword => queryLower.includes(keyword));
}

/**
 * Get document inventory from the API
 */
export async function getDocumentInventory(): Promise<string> {
  try {
    const response = await fetch(getDocumentInventoryUrl());
    if (!response.ok) {
      throw new Error(`Failed to fetch inventory: ${response.status}`);
    }
    const data = await response.json();

    if (!data.success || !data.inventory) {
      throw new Error('Invalid inventory response');
    }

    const inventory = data.inventory;
    let result = 'DOCUMENT INVENTORY:\n\n';

    // PDF Documents
    if (inventory.pdf.count > 0) {
      result += `PDF Documents (${inventory.pdf.count} files, ${inventory.pdf.totalChunks} chunks):\n`;
      inventory.pdf.documents.forEach((doc: any, index: number) => {
        result += `${index + 1}. ${doc.name} (${doc.chunks} chunks)\n`;
      });
      result += '\n';
    }

    // Web Documents
    if (inventory.web.count > 0) {
      result += `Web Documents (${inventory.web.count} files, ${inventory.web.totalChunks} chunks):\n`;
      inventory.web.documents.forEach((doc: any, index: number) => {
        result += `${index + 1}. ${doc.name} (${doc.chunks} chunks)\n`;
      });
      result += '\n';
    }

    // Summary
    result += `TOTAL: ${inventory.total.documents} documents, ${inventory.total.chunks} chunks`;

    return result;
  } catch (error) {
    logger.error('Failed to get document inventory:', error);
    return 'Error: Could not retrieve document inventory. Please try again.';
  }
}

function getDocumentInventoryUrl(): string {
  if (typeof window !== 'undefined') {
    return '/api/document-inventory';
  }

  if (process.env.NEXTAUTH_URL) {
    return `${process.env.NEXTAUTH_URL}/api/document-inventory`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/api/document-inventory`;
  }

  return 'http://localhost:3000/api/document-inventory';
}

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

  // Check if this is an inventory query
  if (isInventoryQuery(lastMessage.content)) {
    logger.info('Inventory query detected, fetching document inventory');
    const inventory = await getDocumentInventory();

    const systemPrompt = `You are an intelligent document analysis assistant.

DOCUMENT INVENTORY:
${inventory}

INSTRUCTIONS:
- Provide a clear, comprehensive list of all documents
- Organize by type (PDF and web documents)
- Include relevant details like chunk counts
- Present the information in a well-formatted, easy-to-read way
- Be accurate and complete`;

    const result = await streamText({
      model: openai("gpt-4.1"),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: lastMessage.content }
      ]
    });

    return result.toDataStreamResponse();
  }

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
