/**
 * Unit tests for context retrieval utilities.
 */

import { ScoredPineconeRecord } from '@pinecone-database/pinecone';

// Mock dependencies before importing the module
jest.mock('./pinecone', () => ({
  getMatchesFromEmbeddings: jest.fn(),
}));

jest.mock('./embeddings', () => ({
  getEmbeddings: jest.fn(),
}));

import { getContext, getContextFromMultipleNamespaces, getContextWithEmbedding } from './context';
import { getMatchesFromEmbeddings } from './pinecone';
import { getEmbeddings } from './embeddings';

const mockGetMatchesFromEmbeddings = getMatchesFromEmbeddings as jest.Mock;
const mockGetEmbeddings = getEmbeddings as jest.Mock;

describe('context utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmbeddings.mockResolvedValue([0.1, 0.2, 0.3]);
  });

  const createMockMatch = (
    score: number,
    text: string,
    metadata: Record<string, unknown> = {}
  ): ScoredPineconeRecord => ({
    id: `match-${Math.random()}`,
    score,
    metadata: {
      text,
      chunk: text,
      ...metadata,
    },
    values: [],
  });

  describe('getContext', () => {
    it('should return formatted context for qualifying matches', async () => {
      mockGetMatchesFromEmbeddings.mockResolvedValue([
        createMockMatch(0.9, 'High relevance content', { url: 'https://example.com' }),
        createMockMatch(0.7, 'Medium relevance content', { filename: 'doc.pdf', pageNumber: 1 }),
      ]);

      const result = await getContext('test query', 'test-ns', 4000, 0.5);

      expect(result).toContain('High relevance content');
      expect(result).toContain('Medium relevance content');
      expect(result).toContain('[Source: https://example.com]');
      expect(result).toContain('[Source: doc.pdf, Page 1]');
    });

    it('should filter out low-scoring matches', async () => {
      mockGetMatchesFromEmbeddings.mockResolvedValue([
        createMockMatch(0.9, 'High score'),
        createMockMatch(0.3, 'Low score - should be filtered'),
      ]);

      const result = await getContext('test query', '', 4000, 0.5);

      expect(result).toContain('High score');
      expect(result).not.toContain('Low score');
    });

    it('should return message when no qualifying docs found', async () => {
      mockGetMatchesFromEmbeddings.mockResolvedValue([
        createMockMatch(0.2, 'Too low score'),
      ]);

      const result = await getContext('test query', '', 4000, 0.5);

      expect(result).toBe('No relevant information found in the knowledge base.');
    });

    it('should respect maxTokens limit', async () => {
      const longContent = 'A'.repeat(5000);
      mockGetMatchesFromEmbeddings.mockResolvedValue([
        createMockMatch(0.9, longContent),
        createMockMatch(0.8, 'Second chunk that might not fit'),
      ]);

      const result = await getContext('test query', '', 1000, 0.5);

      // Result should be truncated based on token limit
      expect(typeof result).toBe('string');
      // The first long content should cause the second to be excluded
    });

    it('should return raw matches when getOnlyText is false', async () => {
      const matches = [
        createMockMatch(0.9, 'Content 1'),
        createMockMatch(0.8, 'Content 2'),
      ];
      mockGetMatchesFromEmbeddings.mockResolvedValue(matches);

      const result = await getContext('test query', '', 4000, 0.5, false);

      expect(Array.isArray(result)).toBe(true);
      expect((result as ScoredPineconeRecord[]).length).toBe(2);
    });

    it('should handle errors gracefully', async () => {
      mockGetEmbeddings.mockRejectedValue(new Error('API error'));

      const result = await getContext('test query');

      expect(result).toBe('Error retrieving context from knowledge base.');
    });
  });

  describe('getContextFromMultipleNamespaces', () => {
    it('should generate single embedding for multiple namespaces', async () => {
      mockGetMatchesFromEmbeddings.mockResolvedValue([]);

      await getContextFromMultipleNamespaces('test query', ['ns1', 'ns2', 'ns3']);

      // Should only call getEmbeddings once
      expect(mockGetEmbeddings).toHaveBeenCalledTimes(1);
      expect(mockGetEmbeddings).toHaveBeenCalledWith('test query');
    });

    it('should query all namespaces with same embedding', async () => {
      mockGetMatchesFromEmbeddings.mockResolvedValue([]);

      await getContextFromMultipleNamespaces('test query', ['pdf-documents', '']);

      expect(mockGetMatchesFromEmbeddings).toHaveBeenCalledTimes(2);
      expect(mockGetMatchesFromEmbeddings).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        expect.any(Number),
        'pdf-documents'
      );
      expect(mockGetMatchesFromEmbeddings).toHaveBeenCalledWith(
        [0.1, 0.2, 0.3],
        expect.any(Number),
        ''
      );
    });

    it('should return context keyed by namespace', async () => {
      mockGetMatchesFromEmbeddings
        .mockResolvedValueOnce([createMockMatch(0.9, 'PDF content')])
        .mockResolvedValueOnce([createMockMatch(0.8, 'Web content')]);

      const result = await getContextFromMultipleNamespaces('test', ['pdf-documents', '']);

      expect(result['pdf-documents']).toContain('PDF content');
      expect(result['default']).toContain('Web content');
    });

    it('should use "default" key for empty namespace', async () => {
      mockGetMatchesFromEmbeddings.mockResolvedValue([]);

      const result = await getContextFromMultipleNamespaces('test', ['']);

      expect(result).toHaveProperty('default');
    });
  });

  describe('getContextWithEmbedding', () => {
    it('should use pre-computed embedding', async () => {
      const precomputedEmbedding = [0.5, 0.6, 0.7];
      mockGetMatchesFromEmbeddings.mockResolvedValue([
        createMockMatch(0.9, 'Content'),
      ]);

      await getContextWithEmbedding(precomputedEmbedding, 'test-ns');

      expect(mockGetEmbeddings).not.toHaveBeenCalled();
      expect(mockGetMatchesFromEmbeddings).toHaveBeenCalledWith(
        precomputedEmbedding,
        expect.any(Number),
        'test-ns'
      );
    });

    it('should handle errors gracefully', async () => {
      mockGetMatchesFromEmbeddings.mockRejectedValue(new Error('Query failed'));

      const result = await getContextWithEmbedding([0.1, 0.2], 'test-ns');

      expect(result).toBe('Error retrieving context from knowledge base.');
    });
  });
});
