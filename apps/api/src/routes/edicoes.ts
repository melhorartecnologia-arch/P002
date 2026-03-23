import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { verifyToken, requireRole } from '../middleware/auth.js';

const listEdicoesQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  esfera: z.enum(['FEDERAL', 'ESTADUAL', 'MUNICIPAL']).optional(),
  uf: z.string().length(2).optional(),
  dataInicio: z.string().optional(),
  dataFim: z.string().optional(),
  status: z.enum(['PENDENTE', 'PROCESSANDO', 'CONCLUIDO', 'ERRO']).optional(),
});

/**
 * Edicoes (editions) route plugin.
 * Provides endpoints for listing, retrieving, and reprocessing diario oficial editions.
 */
export async function edicoesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/edicoes
   * List editions with pagination and filters (esfera, uf, dataInicio, dataFim, status).
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = listEdicoesQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Parâmetros de consulta inválidos',
        details: parsed.error.flatten(),
      });
    }

    const { page, pageSize, esfera, uf, dataInicio, dataFim, status } = parsed.data;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (esfera || uf) {
      where.fonte = {
        ...(esfera ? { esfera } : {}),
        ...(uf ? { uf } : {}),
      };
    }

    if (dataInicio || dataFim) {
      where.dataPublicacao = {
        ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
        ...(dataFim ? { lte: new Date(dataFim) } : {}),
      };
    }

    const [edicoes, total] = await Promise.all([
      app.prisma.edicao.findMany({
        where,
        include: {
          fonte: {
            select: { nome: true, esfera: true, uf: true },
          },
          _count: { select: { atos: true } },
        },
        orderBy: { dataPublicacao: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      app.prisma.edicao.count({ where }),
    ]);

    return reply.send({
      data: edicoes,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });

  /**
   * GET /api/v1/edicoes/:id
   * Get a single edition by ID, including its related atos (acts).
   */
  app.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;

    const edicao = await app.prisma.edicao.findUnique({
      where: { id },
      include: {
        fonte: true,
        atos: {
          orderBy: { paginaInicio: 'asc' },
        },
        processingJob: true,
      },
    });

    if (!edicao) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Edição com ID ${id} não encontrada`,
      });
    }

    return reply.send({ data: edicao });
  });

  /**
   * POST /api/v1/edicoes/:id/reprocess
   * Trigger reprocessing of an edition. Requires ADMIN or EDITOR role.
   */
  app.post(
    '/:id/reprocess',
    { onRequest: [verifyToken, requireRole('ADMIN', 'EDITOR')] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const edicao = await app.prisma.edicao.findUnique({
        where: { id },
      });

      if (!edicao) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Edição com ID ${id} não encontrada`,
        });
      }

      // Reset status and clear existing processing job
      await app.prisma.$transaction([
        app.prisma.edicao.update({
          where: { id },
          data: { status: 'PENDENTE', processadoEm: null },
        }),
        app.prisma.processingJob.deleteMany({
          where: { edicaoId: id },
        }),
      ]);

      // Enqueue processing job
      const { processingQueue } = await import('@dora/queue');
      await processingQueue.add('process-edicao', {
        edicaoId: id,
        etapa: 'TRANSCRICAO',
        tentativa: 0,
      });

      return reply.status(202).send({
        message: 'Reprocessamento enfileirado com sucesso',
        edicaoId: id,
      });
    },
  );
}
