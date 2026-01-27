/**
 * Chat API endpoint - RAG-based chat with optional AutoGen multi-agent support.
 *
 * This route uses the shared chatService for all chat logic.
 * For AutoGen features, set AUTOGEN_SERVICE_URL environment variable.
 */

import { handleChatRequest, ChatRequestBody } from '@/utils/chatService';
import { checkRateLimit, rateLimiters } from '@/utils/rateLimit';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // Apply rate limiting (20 requests per minute for chat)
  const rateLimitResponse = checkRateLimit(req, rateLimiters.chat);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body: ChatRequestBody = await req.json();
    return await handleChatRequest(body);
  } catch (e) {
    console.error('Chat error:', e);
    throw e;
  }
}
