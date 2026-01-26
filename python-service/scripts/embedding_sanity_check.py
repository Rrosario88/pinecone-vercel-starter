import os
import asyncio
from math import sqrt
from typing import List
from openai import AsyncOpenAI


class EmbeddingSanityChecker:
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.client = AsyncOpenAI(api_key=api_key)

    async def get_embedding(self, text: str) -> List[float]:
        response = await self.client.embeddings.create(
            input=text,
            model=self.model
        )
        return response.data[0].embedding

    @staticmethod
    def compute_l2_norm(values: List[float]) -> float:
        return sqrt(sum(value * value for value in values))

    async def run(self, samples: List[str]) -> None:
        for sample in samples:
            embedding = await self.get_embedding(sample)
            norm = self.compute_l2_norm(embedding)
            print(f'Model: {self.model} | Length: {len(embedding)} | L2 norm: {norm:.6f}')


async def main() -> None:
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise RuntimeError('OPENAI_API_KEY is required')

    model = os.getenv('EMBEDDING_MODEL') or os.getenv('OPENAI_EMBEDDING_MODEL') or 'text-embedding-3-small'

    checker = EmbeddingSanityChecker(model=model, api_key=api_key)
    samples = [
        'Quick sanity check for embedding norms.',
        'The quick brown fox jumps over the lazy dog.',
        'Pinecone similarity metrics should align with embedding normalization.'
    ]
    await checker.run(samples)


if __name__ == '__main__':
    asyncio.run(main())

