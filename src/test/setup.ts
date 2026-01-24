/**
 * Jest test setup file.
 * Configure global mocks and test environment.
 */

// Mock environment variables for tests
process.env.PINECONE_INDEX = 'test-index';
process.env.PINECONE_API_KEY = 'test-api-key';
process.env.OPENAI_API_KEY = 'test-openai-key';

// Increase timeout for async operations
jest.setTimeout(10000);

// Global fetch mock (can be overridden in individual tests)
global.fetch = jest.fn();

// Silence console.log in tests unless debugging
if (process.env.DEBUG !== 'true') {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
}

// Keep console.error visible for debugging test failures
// jest.spyOn(console, 'error').mockImplementation(() => {});
