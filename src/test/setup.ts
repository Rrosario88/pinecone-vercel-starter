/**
 * Jest test setup file.
 * Configure global mocks and test environment.
 */

// Mock environment variables for tests
process.env.PINECONE_INDEX = 'test-index';
process.env.PINECONE_API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Silence logger in tests unless debugging
process.env.LOG_LEVEL = process.env.DEBUG === 'true' ? 'debug' : 'silent';

// Increase timeout for async operations
jest.setTimeout(10000);

// Global fetch mock (can be overridden in individual tests)
global.fetch = jest.fn();

// Silence console.log/warn/error in tests unless debugging
// The logger uses these, so we silence them as a fallback
if (process.env.DEBUG !== 'true') {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
}
