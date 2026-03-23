import type { ServerlessSpecCloudEnum } from '@pinecone-database/pinecone';
import { getEmbeddingDimension, getEmbeddingModel } from './embeddingConfig';

type PineconeIndexSpecOptions = {
  indexName: string;
  cloudName: ServerlessSpecCloudEnum;
  regionName: string;
  metric?: string;
};

type PineconeCreateIndexRequest = {
  name: string;
  dimension: number;
  metric: 'cosine' | 'dotproduct' | 'euclidean';
  waitUntilReady: boolean;
  spec: {
    serverless: {
      cloud: ServerlessSpecCloudEnum;
      region: string;
    };
  };
};

export class PineconeIndexSpecification {
  private readonly indexName: string;
  private readonly cloudName: ServerlessSpecCloudEnum;
  private readonly regionName: string;
  private readonly metric: 'cosine' | 'dotproduct' | 'euclidean';
  private readonly embeddingModel: string;
  private readonly embeddingDimension: number;

  constructor(options: PineconeIndexSpecOptions) {
    this.indexName = options.indexName;
    this.cloudName = options.cloudName;
    this.regionName = options.regionName;
    this.metric = PineconeIndexSpecification.normalizeMetric(
      options.metric || process.env.PINECONE_METRIC || 'cosine'
    );
    this.embeddingModel = getEmbeddingModel();
    this.embeddingDimension = getEmbeddingDimension(this.embeddingModel);
  }

  getIndexName(): string {
    return this.indexName;
  }

  getMetric(): string {
    return this.metric;
  }

  getEmbeddingModel(): string {
    return this.embeddingModel;
  }

  getEmbeddingDimension(): number {
    return this.embeddingDimension;
  }

  buildCreateIndexRequest(): PineconeCreateIndexRequest {
    return {
      name: this.indexName,
      dimension: this.embeddingDimension,
      metric: this.metric,
      waitUntilReady: true,
      spec: {
        serverless: {
          cloud: this.cloudName,
          region: this.regionName,
        },
      },
    };
  }

  validateExistingIndex(indexDescription: { dimension?: number; metric?: string }): void {
    const indexDimension = indexDescription?.dimension;
    const indexMetric = PineconeIndexSpecification.normalizeMetric(indexDescription?.metric);

    if (indexDimension && indexDimension !== this.embeddingDimension) {
      throw new Error(
        `Pinecone index "${this.indexName}" has dimension ${indexDimension}, but model "${this.embeddingModel}" produces ${this.embeddingDimension}-d vectors. ` +
          `Set EMBEDDING_MODEL/EMBEDDING_DIMENSION to match the index or recreate the index.`
      );
    }

    if (indexMetric && indexMetric !== this.metric) {
      throw new Error(
        `Pinecone index "${this.indexName}" uses metric "${indexMetric}", but this service is configured for "${this.metric}". ` +
          `Set PINECONE_METRIC to match the index or recreate the index.`
      );
    }
  }

  static normalizeMetric(metric?: string): string {
    if (!metric) return '';
    const normalized = metric.toLowerCase();
    const allowed = new Set(['cosine', 'dotproduct', 'euclidean']);
    if (!allowed.has(normalized)) {
      throw new Error(`Invalid Pinecone metric "${metric}". Use cosine, dotproduct, or euclidean.`);
    }
    return normalized;
  }
}

