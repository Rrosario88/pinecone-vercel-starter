/**
 * Simple API key authentication for destructive endpoints.
 *
 * Set API_SECRET_KEY environment variable to enable protection.
 * If not set, endpoints are unprotected (development mode).
 *
 * Usage in API routes:
 *   const authError = validateApiKey(request);
 *   if (authError) return authError;
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Validates the API key from request headers.
 *
 * @param request - The incoming request
 * @returns NextResponse with error if invalid, null if valid
 */
export function validateApiKey(request: NextRequest): NextResponse | null {
  const apiSecretKey = process.env.API_SECRET_KEY;

  // If no API key is configured, allow all requests (development mode)
  if (!apiSecretKey) {
    return null;
  }

  // Check for API key in Authorization header (Bearer token) or X-API-Key header
  const authHeader = request.headers.get('authorization');
  const apiKeyHeader = request.headers.get('x-api-key');

  let providedKey: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7);
  } else if (apiKeyHeader) {
    providedKey = apiKeyHeader;
  }

  if (!providedKey) {
    return NextResponse.json(
      {
        success: false,
        error: 'Authentication required. Provide API key via Authorization header (Bearer token) or X-API-Key header.'
      },
      { status: 401 }
    );
  }

  // Constant-time comparison to prevent timing attacks
  if (!constantTimeEqual(providedKey, apiSecretKey)) {
    return NextResponse.json(
      { success: false, error: 'Invalid API key' },
      { status: 403 }
    );
  }

  return null; // Authentication successful
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Check if API authentication is enabled.
 */
export function isAuthEnabled(): boolean {
  return !!process.env.API_SECRET_KEY;
}
