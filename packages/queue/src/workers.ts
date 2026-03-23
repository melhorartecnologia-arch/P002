import { Worker, Job } from 'bullmq';
import type IORedis from 'ioredis';

export function createWorker(
  name: string,
  processor: (job: Job) => Promise<void>,
  connection: IORedis,
  concurrency: number = 5,
): Worker {
  const worker = new Worker(name, processor, {
    connection,
    concurrency,
    limiter: {
      max: 100,
      duration: 60000,
    },
  });

  worker.on('completed', (job: Job) => {
    console.log(`[${name}] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job | undefined, error: Error) => {
    console.error(`[${name}] Job ${job?.id} failed:`, error.message);
  });

  return worker;
}
