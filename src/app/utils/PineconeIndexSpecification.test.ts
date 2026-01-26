import { PineconeIndexSpecification } from './PineconeIndexSpecification';

describe('PineconeIndexSpecification', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('defaults to cosine metric', () => {
    delete process.env.PINECONE_METRIC;
    const spec = new PineconeIndexSpecification({
      indexName: 'test-index',
      cloudName: 'aws',
      regionName: 'us-east-1'
    });

    expect(spec.getMetric()).toBe('cosine');
  });

  it('normalizes metric and validates existing index', () => {
    process.env.PINECONE_METRIC = 'DOTPRODUCT';
    const spec = new PineconeIndexSpecification({
      indexName: 'test-index',
      cloudName: 'aws',
      regionName: 'us-east-1'
    });

    expect(spec.getMetric()).toBe('dotproduct');
    expect(() => spec.validateExistingIndex({ metric: 'dotproduct' })).not.toThrow();
  });

  it('throws on invalid metric', () => {
    process.env.PINECONE_METRIC = 'manhattan';
    expect(() => new PineconeIndexSpecification({
      indexName: 'test-index',
      cloudName: 'aws',
      regionName: 'us-east-1'
    })).toThrow('Invalid Pinecone metric');
  });
});

