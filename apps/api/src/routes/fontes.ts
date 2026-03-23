import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { scrapingQueue } from '@dora/queue';
import { verifyToken, requireRole } from '../middleware/auth.js';

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
