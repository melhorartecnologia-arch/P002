import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { verifyToken } from '../middleware/auth.js';

const createAlertaBody = z.object({
  nome: z.string().min(1).max(200),
  tipo: z.enum(['KEYWORD', 'ENTITY', 'TEMA', 'ORGAO', 'SEMANTIC']),
  regras: z.record(z.unknown()),
  promptSemantico: z.string().optional(),
  canais: z.array(z.enum(['EMAIL', 'PUSH', 'WEBHOOK', 'SLACK', 'WHATSAPP'])).min(1),
});

const updateAlertaBody = z.object({
  nome: z.string().min(1).max(200).optional(),
  tipo: z.enum(['KEYWORD', 'ENTITY', 'TEMA', 'ORGAO', 'SEMANTIC']).optional(),
  regras: z.record(z.unknown()).optional(),
  promptSemantico: z.string().nullable().optional(),
  canais: z.array(z.enum(['EMAIL', 'PUSH', 'WEBHOOK', 'SLACK', 'WHATSAPP'])).min(1).optional(),
  ativo: z.boolean().optional(),
});

/**
 * Alertas (alerts) route plugin.
 * Provides CRUD endpoints for user notification alerts, plus a test endpoint.
 * All routes require authentication.
 */
export async function alertasRoutes(app: FastifyInstance): Promise<void> {
  // All alertas routes require authentication
  app.addHook('onRequest', verifyToken);

  /**
   * GET /api/v1/alertas
   * List all alerts belonging to the authenticated user.
   */
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user.sub;

    const alertas = await app.prisma.alerta.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { notificacoes: true } },
      },
    });

    return reply.send({
      data: alertas,
      meta: { total: alertas.length },
    });
  });

  /**
   * POST /api/v1/alertas
   * Create a new alert for the authenticated user.
   * Supported types: KEYWORD, ENTITY, TEMA, ORGAO, SEMANTIC.
   */
  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = createAlertaBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados de alerta inválidos',
        details: parsed.error.flatten(),
      });
    }

    const userId = request.user.sub;
    const { nome, tipo, regras, promptSemantico, canais } = parsed.data;

    const alerta = await app.prisma.alerta.create({
      data: {
        userId,
        nome,
        tipo,
        regras,
        promptSemantico,
        canais,
        ativo: true,
      },
    });

    return reply.status(201).send({ data: alerta });
  });

  /**
   * PUT /api/v1/alertas/:id
   * Update an existing alert. Only the owning user can update.
   */
  app.put('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const parsed = updateAlertaBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados de atualização inválidos',
        details: parsed.error.flatten(),
      });
    }

    const existing = await app.prisma.alerta.findUnique({ where: { id } });

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Alerta com ID ${id} não encontrado`,
      });
    }

    if (existing.userId !== userId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Você não tem permissão para alterar este alerta',
      });
    }

    const alerta = await app.prisma.alerta.update({
      where: { id },
      data: parsed.data,
    });

    return reply.send({ data: alerta });
  });

  /**
   * DELETE /api/v1/alertas/:id
   * Delete an alert. Only the owning user can delete.
   */
  app.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const existing = await app.prisma.alerta.findUnique({ where: { id } });

    if (!existing) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Alerta com ID ${id} não encontrado`,
      });
    }

    if (existing.userId !== userId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Você não tem permissão para excluir este alerta',
      });
    }

    await app.prisma.alerta.delete({ where: { id } });

    return reply.status(204).send();
  });

  /**
   * POST /api/v1/alertas/:id/test
   * Test an alert against the most recent content to see if it would match.
   */
  app.post('/:id/test', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const userId = request.user.sub;

    const alerta = await app.prisma.alerta.findUnique({ where: { id } });

    if (!alerta) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: `Alerta com ID ${id} não encontrado`,
      });
    }

    if (alerta.userId !== userId) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Você não tem permissão para testar este alerta',
      });
    }

    // Fetch recent atos to test the alert against
    const recentAtos = await app.prisma.ato.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        edicao: {
          select: { dataPublicacao: true, fonte: { select: { nome: true, esfera: true, uf: true } } },
        },
      },
    });

    const regras = alerta.regras as Record<string, unknown>;
    let matches: typeof recentAtos = [];

    switch (alerta.tipo) {
      case 'KEYWORD': {
        const keywords = (regras.keywords as string[]) ?? [];
        matches = recentAtos.filter((ato) =>
          keywords.some(
            (kw) =>
              ato.titulo.toLowerCase().includes(kw.toLowerCase()) ||
              ato.conteudoTexto.toLowerCase().includes(kw.toLowerCase()),
          ),
        );
        break;
      }
      case 'ENTITY': {
        const entities = (regras.entities as string[]) ?? [];
        matches = recentAtos.filter((ato) => {
          const entidades = ato.entidades as Record<string, string[]>;
          const allEntities = [
            ...(entidades.pessoas ?? []),
            ...(entidades.orgaos ?? []),
            ...(entidades.cnpjs ?? []),
          ];
          return entities.some((e) =>
            allEntities.some((ae) => ae.toLowerCase().includes(e.toLowerCase())),
          );
        });
        break;
      }
      case 'TEMA': {
        const targetTemas = (regras.temas as string[]) ?? [];
        matches = recentAtos.filter((ato) => {
          const temas = ato.temas as Array<{ tema: string }>;
          return targetTemas.some((t) => temas.some((at) => at.tema.toLowerCase().includes(t.toLowerCase())));
        });
        break;
      }
      case 'ORGAO': {
        const orgaos = (regras.orgaos as string[]) ?? [];
        matches = recentAtos.filter((ato) =>
          orgaos.some((o) => ato.orgaoEmissor.toLowerCase().includes(o.toLowerCase())),
        );
        break;
      }
      case 'SEMANTIC': {
        // For semantic alerts, we would run the semantic prompt against recent content.
        // Simplified: return most recent atos as potential matches.
        matches = recentAtos.slice(0, 5);
        break;
      }
    }

    return reply.send({
      data: {
        alertaId: alerta.id,
        totalTested: recentAtos.length,
        totalMatches: matches.length,
        matches: matches.slice(0, 10).map((ato) => ({
          id: ato.id,
          titulo: ato.titulo,
          tipoAto: ato.tipoAto,
          orgaoEmissor: ato.orgaoEmissor,
          dataPublicacao: ato.edicao.dataPublicacao,
          fonte: ato.edicao.fonte.nome,
        })),
      },
    });
  });
}
