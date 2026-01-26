const MODEL_DIMENSIONS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
};

function parseDimension(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid EMBEDDING_DIMENSION value: "${value}"`);
  }
  return parsed;
}

export function getEmbeddingModel(): string {
  return (
    process.env.EMBEDDING_MODEL ||
    process.env.OPENAI_EMBEDDING_MODEL ||
    'text-embedding-3-small'
  );
}

export function getEmbeddingDimension(model: string = getEmbeddingModel()): number {
  const envDimension = parseDimension(process.env.EMBEDDING_DIMENSION);
  if (envDimension) {
    return envDimension;
  }

  const knownDimension = MODEL_DIMENSIONS[model];
  if (!knownDimension) {
    throw new Error(
      `Unknown embedding model "${model}". Set EMBEDDING_DIMENSION or use a supported model.`
    );
  }

  return knownDimension;
}

