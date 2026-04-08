import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import { createLogger } from '@dora/logger';
import { prismaPlugin } from './plugins/prisma.js';
import { elasticsearchPlugin } from './plugins/elasticsearch.js';
import { registerRoutes } from './routes/index.js';

const logger = createLogger('api');

async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      ...(process.env.NODE_ENV !== 'production' && {
        transport: {
          target: 'pino-pretty',
        },
      }),
    },
    // Allow longer requests for PDF processing via Claude API
    requestTimeout: 5 * 60 * 1000, // 5 minutes
  });

  /** CORS */
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  /** Multipart file uploads (50MB limit) */
  await app.register(multipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
    },
  });

  /** Rate limiting: 100 requests per minute */
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  /** Swagger / OpenAPI documentation */
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'DORA API',
        description: 'API para Diários Oficiais: Rastreamento e Análise',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${process.env.API_PORT ?? 3001}`,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  /** JWT authentication */
  await app.register(jwt, {
    secret: process.env.NEXTAUTH_SECRET ?? 'dev-secret-change-in-production',
  });

  /** WebSocket support */
  await app.register(websocket);

  /** Custom plugins */
  await app.register(prismaPlugin);
  await app.register(elasticsearchPlugin);

  /** Health check */
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  /** Register all route modules */
  await registerRoutes(app);

  return app;
}

async function start() {
  const app = await buildApp();

  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  const host = process.env.API_HOST ?? '0.0.0.0';

  /** Graceful shutdown handler */
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await app.close();
      logger.info('Server closed');
      process.exit(0);
    } catch (err) {
      logger.error(err, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port, host });
    logger.info(`DORA API server listening on ${host}:${port}`);
    logger.info(`Swagger docs available at http://${host}:${port}/docs`);
  } catch (err) {
    logger.error(err, 'Failed to start server');
    process.exit(1);
  }
}

start();
