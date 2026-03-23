import { QdrantClient } from '@qdrant/js-client-rest';

export function createQdrantClient(url?: string): QdrantClient {
  return new QdrantClient({
    url: url ?? process.env.QDRANT_URL ?? 'http://localhost:6333',
  });
}

export class QdrantService {
  constructor(private readonly client: QdrantClient) {}

  async ensureCollection(name: string, vectorSize: number): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some((c) => c.name === name);
    if (!exists) {
      await this.client.createCollection(name, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
    }
  }

  async upsert(
    collection: string,
    points: Array<{ id: string; vector: number[]; payload: Record<string, unknown> }>,
  ): Promise<void> {
    await this.client.upsert(collection, {
      points: points.map((p) => ({
        id: p.id,
        vector: p.vector,
        payload: p.payload,
      })),
    });
  }

  async search(
    collection: string,
    vector: number[],
    limit: number = 10,
    filter?: Record<string, unknown>,
  ): Promise<Array<{ id: string | number; score: number; payload: Record<string, unknown> }>> {
    const results = await this.client.search(collection, {
      vector,
      limit,
      ...(filter ? { filter } : {}),
      with_payload: true,
    });

    return results.map((r) => ({
      id: r.id,
      score: r.score,
      payload: (r.payload ?? {}) as Record<string, unknown>,
    }));
  }

  async delete(collection: string, ids: string[]): Promise<void> {
    await this.client.delete(collection, {
      points: ids,
    });
  }
}

export const COLLECTIONS = {
  atos: 'dora-atos',
} as const;

export const VECTOR_SIZE = 1024;
