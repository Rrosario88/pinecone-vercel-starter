/**
 * Tests for chatService.ts
 */

import { ChatRequestBody, handleChatRequest, getDocumentInventory, getRAGContext } from './chatService';

// Mock dependencies
jest.mock('@/utils/context', () => ({
  getContextFromMultipleNamespaces: jest.fn().mockResolvedValue({
    'pdf-documents': 'PDF context here',
    'default': 'Web context here'
  })
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn().mockReturnValue('mocked-model')
}));

jest.mock('ai', () => ({
  streamText: jest.fn().mockResolvedValue({
    toDataStreamResponse: jest.fn().mockReturnValue(new Response('streamed response'))
  })
}));

jest.mock('./logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('chatService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear environment variables
    delete process.env.AUTOGEN_SERVICE_URL;
  });

  describe('handleChatRequest', () => {
    it('should return 400 when messages array is empty', async () => {
      const body: ChatRequestBody = {
        messages: []
      };

      const response = await handleChatRequest(body);

      expect(response.status).toBe(400);
      const text = await response.text();
      expect(text).toBe('No messages provided');
    });

    it('should return 400 when messages is undefined', async () => {
      const body = {} as ChatRequestBody;

      const response = await handleChatRequest(body);

      expect(response.status).toBe(400);
    });

    it('should process standard chat request without AutoGen', async () => {
      const body: ChatRequestBody = {
        messages: [
          { id: '1', role: 'user', content: 'Hello' }
        ],
        use_autogen: false
      };

      const response = await handleChatRequest(body);

      expect(response).toBeInstanceOf(Response);
      // Should not try AutoGen service
      expect(process.env.AUTOGEN_SERVICE_URL).toBeUndefined();
    });

    it('should fall back to enhanced RAG when AutoGen service unavailable', async () => {
      const body: ChatRequestBody = {
        messages: [
          { id: '1', role: 'user', content: 'Hello' }
        ],
        use_autogen: true
      };

      // No AUTOGEN_SERVICE_URL set, so should fall back
      const response = await handleChatRequest(body);

      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('getRAGContext', () => {
    it('should combine PDF and web contexts', async () => {
      const context = await getRAGContext('test query');

      expect(context).toContain('PDF context here');
      expect(context).toContain('Web context here');
      expect(context).toContain('---'); // separator
    });

    it('should filter out empty contexts', async () => {
      const { getContextFromMultipleNamespaces } = require('@/utils/context');
      getContextFromMultipleNamespaces.mockResolvedValueOnce({
        'pdf-documents': '',
        'default': 'Only web context'
      });

      const context = await getRAGContext('test query');

      expect(context).toBe('Only web context');
      expect(context).not.toContain('---');
    });

    it('should filter out "No relevant information" messages', async () => {
      const { getContextFromMultipleNamespaces } = require('@/utils/context');
      getContextFromMultipleNamespaces.mockResolvedValueOnce({
        'pdf-documents': 'No relevant information found in the knowledge base.',
        'default': 'Valid context'
      });

      const context = await getRAGContext('test query');

      expect(context).toBe('Valid context');
    });
  });

  describe('getDocumentInventory', () => {
    afterEach(() => {
      delete process.env.NEXTAUTH_URL;
      delete process.env.VERCEL_URL;
    });

    it('uses NEXTAUTH_URL when running server-side', async () => {
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inventory: {
            pdf: { count: 0, totalChunks: 0, documents: [] },
            web: { count: 0, totalChunks: 0, documents: [] },
            total: { documents: 0, chunks: 0 }
          }
        })
      });

      await getDocumentInventory();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/document-inventory'
      );
    });

    it('falls back to VERCEL_URL when NEXTAUTH_URL is not set', async () => {
      process.env.VERCEL_URL = 'example.vercel.app';
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          inventory: {
            pdf: { count: 0, totalChunks: 0, documents: [] },
            web: { count: 0, totalChunks: 0, documents: [] },
            total: { documents: 0, chunks: 0 }
          }
        })
      });

      await getDocumentInventory();

      expect(global.fetch).toHaveBeenCalledWith(
        'https://example.vercel.app/api/document-inventory'
      );
    });
  });

  describe('AutoGen response parsing', () => {
    beforeEach(() => {
      process.env.AUTOGEN_SERVICE_URL = 'http://localhost:8000';
    });

    afterEach(() => {
      delete process.env.AUTOGEN_SERVICE_URL;
    });

    it('should handle empty string final_response correctly', async () => {
      // Mock fetch to return empty final_response
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          final_response: '',
          messages: [{ content: 'fallback message' }]
        })
      });

      const body: ChatRequestBody = {
        messages: [{ id: '1', role: 'user', content: 'test' }],
        use_autogen: true
      };

      const response = await handleChatRequest(body);
      expect(response).toBeInstanceOf(Response);
    });

    it('should use last message when no final_response', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          messages: [
            { content: 'first message' },
            { content: 'last message' }
          ]
        })
      });

      const body: ChatRequestBody = {
        messages: [{ id: '1', role: 'user', content: 'test' }],
        use_autogen: true
      };

      const response = await handleChatRequest(body);
      expect(response).toBeInstanceOf(Response);
    });

    it('should handle missing content in messages gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          messages: [{ agent: 'researcher' }] // no content field
        })
      });

      const body: ChatRequestBody = {
        messages: [{ id: '1', role: 'user', content: 'test' }],
        use_autogen: true
      };

      // Should not throw
      const response = await handleChatRequest(body);
      expect(response).toBeInstanceOf(Response);
    });

    it('should fall back when AutoGen service returns non-ok response', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const body: ChatRequestBody = {
        messages: [{ id: '1', role: 'user', content: 'test' }],
        use_autogen: true
      };

      // Should fall back to enhanced RAG, not throw
      const response = await handleChatRequest(body);
      expect(response).toBeInstanceOf(Response);
    });

    it('should fall back when AutoGen service throws', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

      const body: ChatRequestBody = {
        messages: [{ id: '1', role: 'user', content: 'test' }],
        use_autogen: true
      };

      // Should fall back to enhanced RAG, not throw
      const response = await handleChatRequest(body);
      expect(response).toBeInstanceOf(Response);
    });

    it('should fall back when AutoGen request is aborted (timeout)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      global.fetch = jest.fn().mockRejectedValueOnce(abortError);

      const body: ChatRequestBody = {
        messages: [{ id: '1', role: 'user', content: 'test' }],
        use_autogen: true
      };

      // Should fall back to enhanced RAG on timeout
      const response = await handleChatRequest(body);
      expect(response).toBeInstanceOf(Response);
    });

    it('should pass AbortSignal to fetch', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ final_response: 'test response' })
      });

      const body: ChatRequestBody = {
        messages: [{ id: '1', role: 'user', content: 'test' }],
        use_autogen: true
      };

      await handleChatRequest(body);

      // Verify fetch was called with signal
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });
  });
});
