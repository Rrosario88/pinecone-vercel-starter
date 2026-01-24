/**
 * Unit tests for chunkedUpsert utility.
 */

import { chunkedUpsert, ChunkedUpsertResult } from './chunkedUpsert';
import type { Index, PineconeRecord } from '@pinecone-database/pinecone';

describe('chunkedUpsert', () => {
  // Mock Pinecone index
  const createMockIndex = (upsertFn: jest.Mock) => ({
    namespace: jest.fn().mockReturnValue({
      upsert: upsertFn,
    }),
  }) as unknown as Index;

  const createTestVectors = (count: number): PineconeRecord[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `vec-${i}`,
      values: [0.1, 0.2, 0.3],
      metadata: { text: `test ${i}` },
    }));
  };

  describe('successful upserts', () => {
    it('should upsert all vectors successfully', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(undefined);
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(5);

      const result = await chunkedUpsert(mockIndex, vectors, 'test-ns', 2);

      expect(result.success).toBe(true);
      expect(result.totalVectors).toBe(5);
      expect(result.successfulChunks).toBe(3); // 5 vectors / 2 chunk size = 3 chunks
      expect(result.failedChunks).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty vector array', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(undefined);
      const mockIndex = createMockIndex(mockUpsert);

      const result = await chunkedUpsert(mockIndex, [], 'test-ns', 10);

      expect(result.success).toBe(true);
      expect(result.totalVectors).toBe(0);
      expect(result.successfulChunks).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should use correct namespace', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(undefined);
      const mockNamespace = jest.fn().mockReturnValue({ upsert: mockUpsert });
      const mockIndex = { namespace: mockNamespace } as unknown as Index;
      const vectors = createTestVectors(2);

      await chunkedUpsert(mockIndex, vectors, 'my-namespace', 10);

      expect(mockNamespace).toHaveBeenCalledWith('my-namespace');
    });

    it('should respect chunk size parameter', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(undefined);
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(10);

      await chunkedUpsert(mockIndex, vectors, 'test-ns', 3);

      // 10 vectors / 3 chunk size = 4 chunks (3+3+3+1)
      expect(mockUpsert).toHaveBeenCalledTimes(4);
    });
  });

  describe('error handling', () => {
    it('should throw error if all chunks fail', async () => {
      const mockUpsert = jest.fn().mockRejectedValue(new Error('Pinecone error'));
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(5);

      await expect(chunkedUpsert(mockIndex, vectors, 'test-ns', 2))
        .rejects
        .toThrow('All 3 chunks failed to upsert');
    });

    it('should return partial success if some chunks fail', async () => {
      let callCount = 0;
      const mockUpsert = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Chunk 2 failed'));
        }
        return Promise.resolve(undefined);
      });
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(6);

      const result = await chunkedUpsert(mockIndex, vectors, 'test-ns', 2);

      expect(result.success).toBe(false);
      expect(result.successfulChunks).toBe(2);
      expect(result.failedChunks).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Chunk 2');
    });

    it('should include error messages in result', async () => {
      const mockUpsert = jest.fn().mockRejectedValue(new Error('Network timeout'));
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(2);

      await expect(chunkedUpsert(mockIndex, vectors, 'test-ns', 10))
        .rejects
        .toThrow('Network timeout');
    });
  });

  describe('chunking behavior', () => {
    it('should handle vectors exactly divisible by chunk size', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(undefined);
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(10);

      const result = await chunkedUpsert(mockIndex, vectors, 'test-ns', 5);

      expect(result.successfulChunks).toBe(2);
      expect(mockUpsert).toHaveBeenCalledTimes(2);
    });

    it('should handle single vector', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(undefined);
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(1);

      const result = await chunkedUpsert(mockIndex, vectors, 'test-ns', 10);

      expect(result.success).toBe(true);
      expect(result.successfulChunks).toBe(1);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });

    it('should default to chunk size of 10', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(undefined);
      const mockIndex = createMockIndex(mockUpsert);
      const vectors = createTestVectors(25);

      await chunkedUpsert(mockIndex, vectors, 'test-ns');

      // 25 vectors / 10 default chunk size = 3 chunks
      expect(mockUpsert).toHaveBeenCalledTimes(3);
    });
  });
});
