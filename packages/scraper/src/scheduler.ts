import { Queue, type JobsOptions } from "bullmq";

interface FonteConfig {
  id: string;
  cronExpression: string;
  ativo: boolean;
}

interface ScrapingJobData {
  fonteId: string;
  date: string;
  triggeredAt: string;
  manual: boolean;
}

const QUEUE_NAME = "dora:scraping";

/**
 * Manages scheduling of scraping jobs using BullMQ repeatable jobs.
 */
export class ScrapingScheduler {
  private readonly queue: Queue<ScrapingJobData>;

  constructor(redisUrl?: string) {
    const connection = redisUrl
      ? this.parseRedisUrl(redisUrl)
      : { host: "127.0.0.1", port: 6379 };

    this.queue = new Queue<ScrapingJobData>(QUEUE_NAME, { connection });
  }

  /**
   * Schedules repeatable jobs for all active fontes.
   */
  async scheduleAll(fontes: FonteConfig[]): Promise<void> {
    const activeFontes = fontes.filter((f) => f.ativo);

    for (const fonte of activeFontes) {
      await this.scheduleOne(fonte.id, fonte.cronExpression);
    }
  }

  /**
   * Adds a repeatable job for a single fonte with the given cron expression.
   */
  async scheduleOne(fonteId: string, cronExpression: string): Promise<void> {
    const jobName = this.jobName(fonteId);

    await this.queue.add(
      jobName,
      {
        fonteId,
        date: new Date().toISOString(),
        triggeredAt: new Date().toISOString(),
        manual: false,
      },
      {
        repeat: {
          pattern: cronExpression,
        },
        jobId: fonteId,
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      } satisfies JobsOptions,
    );
  }

  /**
   * Removes all repeatable jobs from the queue.
   */
  async cancelAll(): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();

    for (const job of repeatableJobs) {
      await this.queue.removeRepeatableByKey(job.key);
    }
  }

  /**
   * Removes the repeatable job for a specific fonte.
   */
  async cancelOne(fonteId: string): Promise<void> {
    const repeatableJobs = await this.queue.getRepeatableJobs();
    const jobName = this.jobName(fonteId);

    for (const job of repeatableJobs) {
      if (job.name === jobName) {
        await this.queue.removeRepeatableByKey(job.key);
      }
    }
  }

  /**
   * Triggers an immediate scraping job for a specific fonte and date.
   */
  async triggerManual(fonteId: string, date: Date): Promise<void> {
    const jobName = this.jobName(fonteId);

    await this.queue.add(
      jobName,
      {
        fonteId,
        date: date.toISOString(),
        triggeredAt: new Date().toISOString(),
        manual: true,
      },
      {
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    );
  }

  /**
   * Parses a Redis URL into host/port/password connection options.
   */
  private parseRedisUrl(url: string): {
    host: string;
    port: number;
    password?: string;
  } {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
    };
  }

  /**
   * Returns the BullMQ job name for a given fonte ID.
   */
  private jobName(fonteId: string): string {
    return `scrape:${fonteId}`;
  }
}
