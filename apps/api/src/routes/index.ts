import type { FastifyInstance } from 'fastify';
import { edicoesRoutes } from './edicoes.js';
import { atosRoutes } from './atos.js';
import { uploadRoutes } from './upload.js';
import { alertasRoutes } from './alertas.js';
import { fontesRoutes } from './fontes.js';
import { analyticsRoutes } from './analytics.js';
import { authRoutes } from './auth.js';

/**
 * Registers all route modules under the /api/v1 prefix.
 */
export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(edicoesRoutes, { prefix: '/edicoes' });
      await api.register(atosRoutes, { prefix: '/atos' });
      await api.register(uploadRoutes, { prefix: '/upload' });
      await api.register(alertasRoutes, { prefix: '/alertas' });
      await api.register(fontesRoutes, { prefix: '/fontes' });
      await api.register(analyticsRoutes, { prefix: '/analytics' });
    },
    { prefix: '/api/v1' },
  );
}
