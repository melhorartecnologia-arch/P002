import { Client } from '@elastic/elasticsearch';

export function createElasticsearchClient(url?: string): Client {
  return new Client({
    node: url ?? process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
  });
}

export class ElasticSearchService {
  constructor(private readonly client: Client) {}

  async createIndex(name: string, mappings: Record<string, unknown>): Promise<void> {
    const exists = await this.client.indices.exists({ index: name });
    if (!exists) {
      await this.client.indices.create({
        index: name,
        body: { mappings },
      });
    }
  }

  async index(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
    await this.client.index({
      index: indexName,
      id,
      document,
    });
  }

  async bulkIndex(
    indexName: string,
    documents: Array<{ id: string; document: Record<string, unknown> }>,
  ): Promise<void> {
    const operations = documents.flatMap(({ id, document }) => [
      { index: { _index: indexName, _id: id } },
      document,
    ]);
    const response = await this.client.bulk({ operations });
    if (response.errors) {
      const errors = response.items
        .filter((item) => item.index?.error)
        .map((item) => item.index?.error);
      throw new Error(`Bulk index errors: ${JSON.stringify(errors)}`);
    }
  }

  async search(
    indexName: string,
    query: Record<string, unknown>,
    options?: { from?: number; size?: number; sort?: unknown[] },
  ): Promise<{ hits: Array<{ _id: string; _score: number | null; _source: Record<string, unknown> }>; total: number }> {
    const response = await this.client.search({
      index: indexName,
      body: {
        query,
        from: options?.from ?? 0,
        size: options?.size ?? 10,
        ...(options?.sort ? { sort: options.sort } : {}),
      },
    });

    const total =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    return {
      hits: response.hits.hits.map((hit) => ({
        _id: hit._id!,
        _score: hit._score ?? null,
        _source: hit._source as Record<string, unknown>,
      })),
      total,
    };
  }

  async delete(indexName: string, id: string): Promise<void> {
    await this.client.delete({
      index: indexName,
      id,
    });
  }
}

export const INDICES = {
  atos: 'dora-atos',
  edicoes: 'dora-edicoes',
} as const;

export const ATO_MAPPINGS = {
  properties: {
    tipoAto: { type: 'keyword' },
    orgaoEmissor: {
      type: 'keyword',
      fields: {
        text: { type: 'text', analyzer: 'portuguese' },
      },
    },
    titulo: { type: 'text', analyzer: 'portuguese' },
    conteudoTexto: { type: 'text', analyzer: 'portuguese' },
    resumo: { type: 'text', analyzer: 'portuguese' },
    dataPublicacao: { type: 'date' },
    dataAssinatura: { type: 'date' },
    esfera: { type: 'keyword' },
    uf: { type: 'keyword' },
    temas: {
      type: 'nested',
      properties: {
        area: { type: 'keyword' },
        subarea: { type: 'keyword' },
        tema: { type: 'keyword' },
        score: { type: 'float' },
      },
    },
    entidades: {
      properties: {
        pessoas: { type: 'text' },
        orgaos: { type: 'text' },
        cnpjs: { type: 'keyword' },
        valores: { type: 'float' },
      },
    },
  },
} as const;
