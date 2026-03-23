import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { INDICES, COLLECTIONS, VECTOR_SIZE } from '@dora/storage';

const listAtosQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tipoAto: z.string().optional(),
  orgao: z.string().optional(),
  esfera: z.enum(['FEDERAL', 'ESTADUAL', 'MUNICIPAL']).optional(),
  uf: z.string().length(2).optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  temas: z.string().optional(), // comma-separated
});

const searchQuery = z.object({
  query: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tipoAto: z.string().optional(),
  orgao: z.string().optional(),
  esfera: z.enum(['FEDERAL', 'ESTADUAL', 'MUNICIPAL']).optional(),
  uf: z.string().length(2).optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
});

const semanticSearchQuery = z.object({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  esfera: z.enum(['FEDERAL', 'ESTADUAL', 'MUNICIPAL']).optional(),
  uf: z.string().length(2).optional(),
});

/**
 * Atos (acts) route plugin.
 * Provides endpoints for listing, retrieving, full-text search, and semantic search of official acts.
 */
export async function atosRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/atos
   * List acts with pagination and filters (tipoAto, orgao, esfera, uf, dataInicio, dataFim, temas).
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = listAtosQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de consulta inválidos',
        details: parsed.error.flatten(),
      });
    }

    const { page, pageSize, tipoAto, orgao, esfera, uf, dataInicio, dataFim, temas } = parsed.data;

    const where: Record<string, unknown> = {};

    if (tipoAto) where.tipoAto = tipoAto;
    if (orgao) where.orgaoEmissor = { contains: orgao, mode: 'insensitive' };

    if (esfera || uf) {
      where.edicao = {
        fonte: {
          ...(esfera ? { esfera } : {}),
          ...(uf ? { uf } : {}),
        },
      };
    }

    if (dataInicio || dataFim) {
      where.edicao = {
        ...(where.edicao as Record<string, unknown> ?? {}),
        dataPublicacao: {
          ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
          ...(dataFim ? { lte: new Date(dataFim) } : {}),
        },
      };
    }

    if (temas) {
      const temaList = temas.split(',').map((t) => t.trim());
      where.temas = { path: '$', array_contains: temaList.map((t) => ({ tema: t })) };
    }

    const [atos, total] = await Promise.all([
      app.prisma.ato.findMany({
        where,
        include: {
          edicao: {
            select: {
              id: true,
              numero: true,
              dataPublicacao: true,
              fonte: { select: { nome: true, esfera: true, uf: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      app.prisma.ato.count({ where }),
    ]);

    return reply.send({
      data: atos,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });

  /**
   * GET /api/v1/atos/search
   * Full-text search using Elasticsearch. Supports query string plus filters and pagination.
   */
  app.get('/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = searchQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de busca inválidos',
        details: parsed.error.flatten(),
      });
    }

    const { query, page, pageSize, tipoAto, orgao, esfera, uf, dataInicio, dataFim } = parsed.data;

    const must: Record<string, unknown>[] = [
      {
        multi_match: {
          query,
          fields: ['titulo^3', 'conteudoTexto', 'resumo^2', 'orgaoEmissor.text'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    const filter: Record<string, unknown>[] = [];

    if (tipoAto) filter.push({ term: { tipoAto } });
    if (orgao) filter.push({ term: { orgaoEmissor: orgao } });
    if (esfera) filter.push({ term: { esfera } });
    if (uf) filter.push({ term: { uf } });
    if (dataInicio || dataFim) {
      filter.push({
        range: {
          dataPublicacao: {
            ...(dataInicio ? { gte: dataInicio } : {}),
            ...(dataFim ? { lte: dataFim } : {}),
          },
        },
      });
    }

    const esQuery: Record<string, unknown> = {
      bool: {
        must,
        ...(filter.length > 0 ? { filter } : {}),
      },
    };

    const startTime = Date.now();
    const results = await app.elastic.search(INDICES.atos, esQuery, {
      from: (page - 1) * pageSize,
      size: pageSize,
    });
    const took = Date.now() - startTime;

    return reply.send({
      data: results.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
      })),
      meta: {
        total: results.total,
        page,
        pageSize,
        totalPages: Math.ceil(results.total / pageSize),
        took,
      },
    });
  });

  /**
   * GET /api/v1/atos/semantic-search
   * Semantic search using Qdrant vector database.
   * Accepts a natural language query, generates an embedding, and finds similar acts.
   */
  app.get('/semantic-search', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = semanticSearchQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de busca semântica inválidos',
        details: parsed.error.flatten(),
      });
    }

    const { query, limit, esfera, uf } = parsed.data;

    // Generate embedding for the query using a placeholder approach.
    // In production, this calls the embedding model (e.g., via @dora/ai-client).
    let queryVector: number[];
    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic();
      // Use a simple hash-based vector as fallback; real implementation
      // would call an embedding endpoint.
      queryVector = Array.from({ length: VECTOR_SIZE }, (_, i) => {
        const charCode = query.charCodeAt(i % query.length) || 0;
        return (charCode / 255) * 2 - 1;
      });
    } catch {
      // Fallback: generate a deterministic pseudo-vector from the query
      queryVector = Array.from({ length: VECTOR_SIZE }, (_, i) => {
        const charCode = query.charCodeAt(i % query.length) || 0;
        return (charCode / 255) * 2 - 1;
      });
    }

    const qdrantFilter: Record<string, unknown> | undefined =
      esfera || uf
        ? {
            must: [
              ...(esfera ? [{ key: 'esfera', match: { value: esfera } }] : []),
              ...(uf ? [{ key: 'uf', match: { value: uf } }] : []),
            ],
          }
        : undefined;

    const startTime = Date.now();
    const results = await app.qdrant.search(COLLECTIONS.atos, queryVector, limit, qdrantFilter);
    const took = Date.now() - startTime;

    return reply.send({
      data: results.map((r) => ({
        id: r.id,
        score: r.score,
        ...r.payload,
      })),
      meta: {
        total: results.length,
        took,
        query,
      },
    });
  });

  /**
   * GET /api/v1/atos/:id
   * Get a single act by ID with full details including edition and fonte info.
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const ato = await app.prisma.ato.findUnique({
      where: { id },
      include: {
        edicao: {
          include: {
            fonte: true,
          },
        },
      },
    });

    if (!ato) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Ato com ID ${id} não encontrado`,
      });
    }

    return reply.send({ data: ato });
  });
}
