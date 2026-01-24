/**
 * Chat API endpoint (fixed) - RAG-based chat with optional AutoGen multi-agent support.
 *
 * This route uses the shared chatService for all chat logic.
 * For AutoGen features, set AUTOGEN_SERVICE_URL environment variable.
 *
 * Note: This endpoint is functionally identical to /api/chat.
 * Kept for backward compatibility with existing integrations.
 */

import { handleChatRequest, ChatRequestBody } from '@/utils/chatService';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body: ChatRequestBody = await req.json();
    return await handleChatRequest(body);
  } catch (e) {
    console.error('Chat error:', e);
    throw e;
  }
}
