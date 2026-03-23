import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string(),
  ELASTICSEARCH_URL: z.string(),

  MINIO_ENDPOINT: z.string(),
  MINIO_PORT: z.coerce.number(),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string(),
  MINIO_USE_SSL: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),

  QDRANT_URL: z.string(),

  ANTHROPIC_API_KEY: z.string(),
  CLAUDE_MODEL_VISION: z.string(),
  CLAUDE_MODEL_EXTRACTION: z.string(),
  CLAUDE_MODEL_CLASSIFICATION: z.string(),
  CLAUDE_MODEL_ANALYSIS: z.string(),
  CLAUDE_MAX_CONCURRENT_REQUESTS: z.coerce.number().default(50),

  API_PORT: z.coerce.number().default(3001),
  API_HOST: z.string().default('0.0.0.0'),

  LOG_LEVEL: z.enum(['info', 'debug', 'warn', 'error']).default('info'),
});

export type AppConfig = z.infer<typeof configSchema>;

export function loadConfig(): AppConfig {
  return configSchema.parse(process.env);
}
