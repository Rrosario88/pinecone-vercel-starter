import type { ScoredPineconeRecord } from '@pinecone-database/pinecone';
import { buildDocumentInventory } from './documentInventory';

const makeMatch = (metadata: Record<string, unknown>): ScoredPineconeRecord =>
  ({
    id: 'id',
    score: 0.42,
    metadata,
  }) as ScoredPineconeRecord;

describe('buildDocumentInventory', () => {
  it('aggregates PDF and web documents with chunk counts', () => {
    const pdfMatches = [
      makeMatch({ filename: 'a.pdf', uploadId: 'u1' }),
      makeMatch({ filename: 'a.pdf', uploadId: 'u1' }),
      makeMatch({ filename: 'b.pdf', uploadId: 'u2' }),
    ];

    const webMatches = [
      makeMatch({ url: 'https://example.com' }),
      makeMatch({ url: 'https://example.com' }),
      makeMatch({ url: 'https://other.com' }),
    ];

    const inventory = buildDocumentInventory(pdfMatches, webMatches);

    expect(inventory.pdf.count).toBe(2);
    expect(inventory.pdf.totalChunks).toBe(3);
    expect(inventory.web.count).toBe(2);
    expect(inventory.web.totalChunks).toBe(3);
    expect(inventory.total.documents).toBe(4);
    expect(inventory.total.chunks).toBe(6);
  });

  it('skips matches without expected metadata', () => {
    const inventory = buildDocumentInventory(
      [makeMatch({}), makeMatch({ filename: 'a.pdf' })],
      [makeMatch({}), makeMatch({ url: 'https://example.com' })]
    );

    expect(inventory.pdf.count).toBe(1);
    expect(inventory.web.count).toBe(1);
  });
});

