import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import { defaultConnection } from './connection';

export const QUEUE_NAMES = {
  SCRAPING: 'scraping',
  PROCESSING: 'processing',
  NOTIFICATION: 'notification',
  ANALYSIS: 'analysis',
} as const;

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

export function createQueue(name: string, connection: IORedis): Queue {
  return new Queue(name, {
    connection,
    defaultJobOptions,
  });
}

export const scrapingQueue = createQueue(QUEUE_NAMES.SCRAPING, defaultConnection);
export const processingQueue = createQueue(QUEUE_NAMES.PROCESSING, defaultConnection);
export const notificationQueue = createQueue(QUEUE_NAMES.NOTIFICATION, defaultConnection);
export const analysisQueue = createQueue(QUEUE_NAMES.ANALYSIS, defaultConnection);
