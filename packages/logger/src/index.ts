import pino from 'pino';
import type { Logger } from 'pino';

export type { Logger };

export function createLogger(name: string): Logger {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(isDevelopment && {
      transport: {
        target: 'pino-pretty',
      },
    }),
    base: { name },
  });
}

export const logger = createLogger('dora');
