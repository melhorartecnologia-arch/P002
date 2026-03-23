import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { verifyToken } from '../middleware/auth.js';

const askBody = z.object({
  question: z.string().min(1).max(2000),
});

/**
 * Analytics route plugin.
 * Provides aggregate stats, timeline data, top entities, and a Q&A endpoint.
 */
export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/v1/analytics/overview
   * Aggregate stats: total edicoes, total atos, counts by esfera.
   */
  app.get('/overview', async (_request: FastifyRequest, reply: FastifyReply) => {
    const [totalEdicoes, totalAtos, edicoesPorStatus, atosPorTipo] = await Promise.all([
      app.prisma.edicao.count(),
      app.prisma.ato.count(),
      app.prisma.edicao.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      app.prisma.ato.groupBy({
        by: ['tipoAto'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
    ]);

    // Count edicoes by esfera via fontes
    const fontesByEsfera = await app.prisma.fonte.findMany({
      select: {
        esfera: true,
        _count: { select: { edicoes: true } },
      },
    });

    const edicoesByEsfera: Record<string, number> = {};
    for (const f of fontesByEsfera) {
      edicoesByEsfera[f.esfera] = (edicoesByEsfera[f.esfera] ?? 0) + f._count.edicoes;
    }

    return reply.send({
      data: {
        totalEdicoes,
        totalAtos,
        edicoesPorStatus: edicoesPorStatus.map((g) => ({
          status: g.status,
          count: g._count.id,
        })),
        edicoesByEsfera,
        atosPorTipo: atosPorTipo.map((g) => ({
          tipo: g.tipoAto,
          count: g._count.id,
        })),
      },
    });
  });

  /**
   * GET /api/v1/analytics/timeline
   * Edicoes count grouped by month.
   * Query params: ?months=12 (default 12)
   */
  app.get(
    '/timeline',
    async (
      request: FastifyRequest<{ Querystring: { months?: string } }>,
      reply: FastifyReply,
    ) => {
      const months = Math.min(parseInt(request.query.months ?? '12', 10) || 12, 60);
      const since = new Date();
      since.setMonth(since.getMonth() - months);

      const edicoes = await app.prisma.edicao.findMany({
        where: { dataPublicacao: { gte: since } },
        select: { dataPublicacao: true },
        orderBy: { dataPublicacao: 'asc' },
      });

      // Group by YYYY-MM
      const grouped: Record<string, number> = {};
      for (const e of edicoes) {
        const key = e.dataPublicacao.toISOString().slice(0, 7);
        grouped[key] = (grouped[key] ?? 0) + 1;
      }

      const timeline = Object.entries(grouped).map(([month, count]) => ({
        month,
        count,
      }));

      return reply.send({
        data: timeline,
        meta: { months, since: since.toISOString() },
      });
    },
  );

  /**
   * GET /api/v1/analytics/top-orgaos
   * Top 20 orgaos (issuing bodies) by ato count.
   */
  app.get('/top-orgaos', async (_request: FastifyRequest, reply: FastifyReply) => {
    const orgaos = await app.prisma.ato.groupBy({
      by: ['orgaoEmissor'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });

    return reply.send({
      data: orgaos.map((g) => ({
        orgao: g.orgaoEmissor,
        count: g._count.id,
      })),
    });
  });

  /**
   * GET /api/v1/analytics/top-temas
   * Top temas by occurrence. Placeholder implementation.
   */
  app.get('/top-temas', async (_request: FastifyRequest, reply: FastifyReply) => {
    // Temas are stored as JSON arrays inside each ato.
    // A full implementation would use a raw SQL query or Elasticsearch aggregation.
    // For now, sample recent atos and aggregate in memory.
    const recentAtos = await app.prisma.ato.findMany({
      take: 500,
      orderBy: { createdAt: 'desc' },
      select: { temas: true },
    });

    const temaCounts: Record<string, number> = {};
    for (const ato of recentAtos) {
      const temas = ato.temas as Array<{ tema: string }>;
      if (Array.isArray(temas)) {
        for (const t of temas) {
          const nome = t.tema ?? String(t);
          temaCounts[nome] = (temaCounts[nome] ?? 0) + 1;
        }
      }
    }

    const sorted = Object.entries(temaCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([tema, count]) => ({ tema, count }));

    return reply.send({
      data: sorted,
      meta: { note: 'Baseado nos 500 atos mais recentes' },
    });
  });

  /**
   * POST /api/v1/analytics/ask
   * Q&A endpoint: takes a question and returns an answer with sources.
   * Requires authentication.
   */
  app.post(
    '/ask',
    { onRequest: [verifyToken] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = askBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Campo question é obrigatório',
          details: parsed.error.flatten(),
        });
      }

      const { question } = parsed.data;

      // Placeholder: In production this would:
      // 1. Generate embedding for the question
      // 2. Query Qdrant for similar ato vectors
      // 3. Retrieve the matching atos from Prisma
      // 4. Send context + question to Claude for answer generation
      // For now, search atos by keyword match as a basic fallback.

      const keywords = question
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);

      const atos = keywords.length > 0
        ? await app.prisma.ato.findMany({
            where: {
              OR: keywords.map((kw) => ({
                conteudoTexto: { contains: kw, mode: 'insensitive' as const },
              })),
            },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              titulo: true,
              tipoAto: true,
              orgaoEmissor: true,
              resumo: true,
              edicao: {
                select: {
                  dataPublicacao: true,
                  fonte: { select: { nome: true, esfera: true, uf: true } },
                },
              },
            },
          })
        : [];

      return reply.send({
        data: {
          question,
          answer: atos.length > 0
            ? `Encontrei ${atos.length} ato(s) relacionado(s) à sua pergunta. Veja as fontes abaixo.`
            : 'Nenhum resultado encontrado para a pergunta. Tente reformular com termos mais específicos.',
          sources: atos.map((ato) => ({
            id: ato.id,
            titulo: ato.titulo,
            tipoAto: ato.tipoAto,
            orgaoEmissor: ato.orgaoEmissor,
            resumo: ato.resumo,
            dataPublicacao: ato.edicao.dataPublicacao,
            fonte: ato.edicao.fonte.nome,
          })),
          meta: {
            note: 'Resposta baseada em busca por palavras-chave. Integração com embeddings pendente.',
          },
        },
      });
    },
  );
}
