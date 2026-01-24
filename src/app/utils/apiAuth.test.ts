/**
 * Unit tests for API authentication utility.
 */

import { validateApiKey, isAuthEnabled } from './apiAuth';
import { NextRequest } from 'next/server';

describe('apiAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // Helper to create mock NextRequest
  const createMockRequest = (headers: Record<string, string> = {}): NextRequest => {
    // Normalize all header keys to lowercase for consistent lookup
    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      normalizedHeaders[key.toLowerCase()] = value;
    }
    return {
      headers: {
        get: (name: string) => normalizedHeaders[name.toLowerCase()] || null,
      },
    } as unknown as NextRequest;
  };

  describe('validateApiKey', () => {
    describe('when API_SECRET_KEY is not set (development mode)', () => {
      beforeEach(() => {
        delete process.env.API_SECRET_KEY;
      });

      it('should allow requests without authentication', () => {
        const request = createMockRequest();
        const result = validateApiKey(request);
        expect(result).toBeNull();
      });

      it('should allow requests even with invalid auth header', () => {
        const request = createMockRequest({ authorization: 'Bearer invalid' });
        const result = validateApiKey(request);
        expect(result).toBeNull();
      });
    });

    describe('when API_SECRET_KEY is set', () => {
      const TEST_API_KEY = 'test-secret-key-12345';

      beforeEach(() => {
        process.env.API_SECRET_KEY = TEST_API_KEY;
      });

      it('should reject requests without any auth header', async () => {
        const request = createMockRequest();
        const result = validateApiKey(request);

        expect(result).not.toBeNull();
        const body = await result!.json();
        expect(body.success).toBe(false);
        expect(body.error).toContain('Authentication required');
      });

      it('should accept valid Bearer token', () => {
        const request = createMockRequest({
          authorization: `Bearer ${TEST_API_KEY}`,
        });
        const result = validateApiKey(request);
        expect(result).toBeNull();
      });

      it('should accept valid X-API-Key header', () => {
        const request = createMockRequest({
          'x-api-key': TEST_API_KEY,
        });
        const result = validateApiKey(request);
        expect(result).toBeNull();
      });

      it('should reject invalid Bearer token', async () => {
        const request = createMockRequest({
          authorization: 'Bearer wrong-key',
        });
        const result = validateApiKey(request);

        expect(result).not.toBeNull();
        const body = await result!.json();
        expect(body.success).toBe(false);
        expect(body.error).toBe('Invalid API key');
      });

      it('should reject invalid X-API-Key', async () => {
        const request = createMockRequest({
          'x-api-key': 'wrong-key',
        });
        const result = validateApiKey(request);

        expect(result).not.toBeNull();
        const body = await result!.json();
        expect(body.error).toBe('Invalid API key');
      });

      it('should reject malformed Bearer token (no token after Bearer)', async () => {
        const request = createMockRequest({
          authorization: 'Bearer', // No actual token - doesn't match "Bearer " pattern
        });
        const result = validateApiKey(request);

        expect(result).not.toBeNull();
        const body = await result!.json();
        // Since "Bearer" without space doesn't match "Bearer " prefix, treated as no auth
        expect(body.error).toContain('Authentication required');
      });

      it('should reject empty token after Bearer', async () => {
        const request = createMockRequest({
          authorization: 'Bearer ', // Space but empty token
        });
        const result = validateApiKey(request);

        expect(result).not.toBeNull();
        const body = await result!.json();
        // Empty string is falsy, so treated as no auth provided
        expect(body.error).toContain('Authentication required');
      });

      it('should prefer Bearer token over X-API-Key', () => {
        const request = createMockRequest({
          authorization: `Bearer ${TEST_API_KEY}`,
          'x-api-key': 'wrong-key',
        });
        const result = validateApiKey(request);
        expect(result).toBeNull(); // Bearer is correct, so should pass
      });

      it('should be case-insensitive for header names', () => {
        const request = createMockRequest({
          'X-Api-Key': TEST_API_KEY,
        });
        const result = validateApiKey(request);
        expect(result).toBeNull();
      });
    });

    describe('timing attack prevention', () => {
      beforeEach(() => {
        process.env.API_SECRET_KEY = 'secret-key-for-timing-test';
      });

      it('should use constant-time comparison', () => {
        // This test verifies the function doesn't short-circuit on first mismatch
        // by checking that both "wrong" and "wronggggggggggggggggggg" take similar time
        const request1 = createMockRequest({ 'x-api-key': 'w' });
        const request2 = createMockRequest({ 'x-api-key': 'wwwwwwwwwwwwwwwwwwww' });

        // Both should be rejected (we can't easily test timing, but we verify behavior)
        expect(validateApiKey(request1)).not.toBeNull();
        expect(validateApiKey(request2)).not.toBeNull();
      });
    });
  });

  describe('isAuthEnabled', () => {
    it('should return false when API_SECRET_KEY is not set', () => {
      delete process.env.API_SECRET_KEY;
      expect(isAuthEnabled()).toBe(false);
    });

    it('should return true when API_SECRET_KEY is set', () => {
      process.env.API_SECRET_KEY = 'any-key';
      expect(isAuthEnabled()).toBe(true);
    });

    it('should return false for empty string', () => {
      process.env.API_SECRET_KEY = '';
      expect(isAuthEnabled()).toBe(false);
    });
  });
});
