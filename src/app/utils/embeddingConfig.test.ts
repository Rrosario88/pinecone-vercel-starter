import { getEmbeddingDimension, getEmbeddingModel } from './embeddingConfig';

describe('embeddingConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to text-embedding-3-small', () => {
    delete process.env.EMBEDDING_MODEL;
    delete process.env.OPENAI_EMBEDDING_MODEL;
    delete process.env.EMBEDDING_DIMENSION;

    expect(getEmbeddingModel()).toBe('text-embedding-3-small');
    expect(getEmbeddingDimension()).toBe(1536);
  });

  it('uses EMBEDDING_MODEL when set', () => {
    process.env.EMBEDDING_MODEL = 'text-embedding-3-large';
    delete process.env.EMBEDDING_DIMENSION;

    expect(getEmbeddingModel()).toBe('text-embedding-3-large');
    expect(getEmbeddingDimension()).toBe(3072);
  });

  it('lets EMBEDDING_DIMENSION override the model dimension', () => {
    process.env.EMBEDDING_MODEL = 'text-embedding-3-small';
    process.env.EMBEDDING_DIMENSION = '2048';

    expect(getEmbeddingDimension()).toBe(2048);
  });

  it('throws on invalid EMBEDDING_DIMENSION', () => {
    process.env.EMBEDDING_DIMENSION = 'not-a-number';
    expect(() => getEmbeddingDimension()).toThrow('Invalid EMBEDDING_DIMENSION');
  });
});

