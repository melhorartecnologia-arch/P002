import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { scrapingQueue } from '@dora/queue';
import { verifyToken, requireRole } from '../middleware/auth.js';

const createFonteBody = z.object({
  nome: z.string().min(1).max(300),
  esfera: z.enum(['FEDERAL', 'ESTADUAL', 'MUNICIPAL']),
  uf: z.string().length(2).optional(),
  urlBase: z.string().url(),
  spiderType: z.enum(['CHEERIO', 'PLAYWRIGHT']).default('CHEERIO'),
  cronExpression: z.string().default('0 6 * * 1-5'),
});

const updateFonteBody = z.object({
  nome: z.string().min(1).max(300).optional(),
  esfera: z.enum(['FEDERAL', 'ESTADUAL', 'MUNICIPAL']).optional(),
  uf: z.string().length(2).nullable().optional(),
  urlBase: z.string().url().optional(),
  spiderType: z.enum(['CHEERIO', 'PLAYWRIGHT']).optional(),
  cronExpression: z.string().optional(),
  ativo: z.boolean().optional(),
});

/**
 * Fontes (sources) route plugin.
 * Provides endpoints for listing sources, viewing details, and triggering scraping.
 */
export async function fontesRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/fontes
   * List all sources with their latest edition info.
   */
  app.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const fontes = await app.prisma.fonte.findMany({
      where: { ativo: true },
      orderBy: [{ esfera: 'asc' }, { uf: 'asc' }, { nome: 'asc' }],
      include: {
        edicoes: {
          orderBy: { dataPublicacao: 'desc' },
          take: 1,
          select: {
            id: true,
            numero: true,
            dataPublicacao: true,
            status: true,
          },
        },
        _count: {
          select: { edicoes: true },
        },
      },
    });

    const data = fontes.map((fonte) => ({
      id: fonte.id,
      nome: fonte.nome,
      esfera: fonte.esfera,
      uf: fonte.uf,
      urlBase: fonte.urlBase,
      spiderType: fonte.spiderType,
      cronExpression: fonte.cronExpression,
      ativo: fonte.ativo,
      totalEdicoes: fonte._count.edicoes,
      ultimaEdicao: fonte.edicoes[0] ?? null,
    }));

    return reply.send({
      data,
      meta: { total: data.length },
    });
  });

  /**
   * GET /api/v1/fontes/:id
   * Source detail with recent editions.
   */
  app.get(
    '/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const fonte = await app.prisma.fonte.findUnique({
        where: { id },
        include: {
          edicoes: {
            orderBy: { dataPublicacao: 'desc' },
            take: 20,
            select: {
              id: true,
              numero: true,
              dataPublicacao: true,
              tipo: true,
              status: true,
              totalPaginas: true,
              createdAt: true,
            },
          },
          _count: {
            select: { edicoes: true },
          },
        },
      });

      if (!fonte) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Fonte com ID ${id} não encontrada`,
        });
      }

      return reply.send({
        data: {
          id: fonte.id,
          nome: fonte.nome,
          esfera: fonte.esfera,
          uf: fonte.uf,
          urlBase: fonte.urlBase,
          spiderType: fonte.spiderType,
          cronExpression: fonte.cronExpression,
          ativo: fonte.ativo,
          totalEdicoes: fonte._count.edicoes,
          edicoesRecentes: fonte.edicoes,
        },
      });
    },
  );

  /**
   * POST /api/v1/fontes
   * Create a new source. Requires ADMIN or EDITOR role.
   */
  app.post(
    '/',
    { onRequest: [verifyToken, requireRole('ADMIN', 'EDITOR')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = createFonteBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const { nome, esfera, uf, urlBase, spiderType, cronExpression } = parsed.data;

      const fonte = await app.prisma.fonte.create({
        data: { nome, esfera, uf, urlBase, spiderType, cronExpression },
      });

      return reply.status(201).send({ data: fonte });
    },
  );

  /**
   * PUT /api/v1/fontes/:id
   * Update an existing source. Requires ADMIN or EDITOR role.
   */
  app.put(
    '/:id',
    { onRequest: [verifyToken, requireRole('ADMIN', 'EDITOR')] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const parsed = updateFonteBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Dados inválidos',
          details: parsed.error.flatten(),
        });
      }

      const existing = await app.prisma.fonte.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Fonte com ID ${id} não encontrada`,
        });
      }

      const fonte = await app.prisma.fonte.update({
        where: { id },
        data: parsed.data,
      });

      return reply.send({ data: fonte });
    },
  );

  /**
   * DELETE /api/v1/fontes/:id
   * Soft-delete (deactivate) a source. Requires ADMIN role.
   */
  app.delete(
    '/:id',
    { onRequest: [verifyToken, requireRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const existing = await app.prisma.fonte.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Fonte com ID ${id} não encontrada`,
        });
      }

      await app.prisma.fonte.update({
        where: { id },
        data: { ativo: false },
      });

      return reply.status(204).send();
    },
  );

  /**
   * POST /api/v1/fontes/:id/trigger
   * Manually trigger a scraping job for a specific source.
   * Requires ADMIN or EDITOR role.
   */
  app.post(
    '/:id/trigger',
    { onRequest: [verifyToken, requireRole('ADMIN', 'EDITOR')] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const fonte = await app.prisma.fonte.findUnique({ where: { id } });

      if (!fonte) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Fonte com ID ${id} não encontrada`,
        });
      }

      if (!fonte.ativo) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Fonte está desativada. Ative-a antes de disparar o scraping.',
        });
      }

      const job = await scrapingQueue.add(
        'scrape-fonte',
        {
          fonteId: fonte.id,
          nome: fonte.nome,
          urlBase: fonte.urlBase,
          spiderType: fonte.spiderType,
          manual: true,
          triggeredBy: request.user.sub,
        },
        { priority: 1 },
      );

      return reply.status(202).send({
        message: 'Job de scraping enfileirado com sucesso',
        data: {
          jobId: job.id,
          fonteId: fonte.id,
          fonteNome: fonte.nome,
        },
      });
    },
  );
}
