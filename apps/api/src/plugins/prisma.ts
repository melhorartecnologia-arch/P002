import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@dora/database';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Fastify plugin that decorates the app with a shared Prisma client instance.
 * The client is connected on startup and disconnected on close.
 */
export const prismaPlugin = fp(async (app: FastifyInstance) => {
  const prisma = new PrismaClient();

  await prisma.$connect();

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
