import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { createElasticsearchClient, ElasticSearchService, createQdrantClient, QdrantService } from '@dora/storage';

declare module 'fastify' {
  interface FastifyInstance {
    elastic: ElasticSearchService;
    qdrant: QdrantService;
  }
}

/**
 * Fastify plugin that decorates the app with Elasticsearch and Qdrant clients.
 * Both services are initialized from environment variables.
 */
export const elasticsearchPlugin = fp(async (app: FastifyInstance) => {
  const esClient = createElasticsearchClient();
  const elasticService = new ElasticSearchService(esClient);

  const qdrantClient = createQdrantClient();
  const qdrantService = new QdrantService(qdrantClient);

  app.decorate('elastic', elasticService);
  app.decorate('qdrant', qdrantService);
});
