/**
 * Scraping Worker
 *
 * BullMQ worker that consumes jobs from the "scraping" queue.
 * Each job triggers a spider to crawl a gazette source for a given date,
 * then downloads, deduplicates, and enqueues editions for processing.
 */

import { Worker, Job, Queue } from "bullmq";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScrapingJobData {
  /** Database ID of the fonte (gazette source) */
  fonteId: string;
  /** Date to crawl in ISO format (YYYY-MM-DD) */
  date: string;
}

interface CrawlResult {
  /** Display name or title of the edition */
  titulo: string;
  /** URL where the PDF was downloaded from */
  url: string;
  /** Raw PDF file bytes */
  buffer: Buffer;
  /** Publication date */
  dataPublicacao: string;
  /** Optional metadata from the spider */
  metadata?: Record<string, unknown>;
}

/**
 * Spider — from @dora/scraper
 * Expected interface:
 *   crawl(date: string): AsyncGenerator<CrawlResult> | Promise<CrawlResult[]>
 */
type Spider = any;

/**
 * SpiderRegistry — from @dora/scraper
 * Expected interface:
 *   getSpider(fonteId: string): Spider
 */
type SpiderRegistry = any;

/**
 * MinioStorage — from @dora/storage
 * Expected methods:
 *   uploadFile(bucket: string, key: string, data: Buffer, contentType?: string): Promise<void>
 */
type MinioStorage = any;

/**
 * PrismaClient — from @dora/database
 * Expected models: edicao, fonte
 */
type PrismaClient = any;

interface ScrapingWorkerOptions {
  /** Redis connection options for BullMQ */
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /** Number of concurrent scraping jobs (default: 2) */
  concurrency?: number;
  /** Spider registry to look up spiders by fonteId */
  spiderRegistry: SpiderRegistry;
  /** MinIO storage for uploading PDFs */
  minioStorage: MinioStorage;
  /** Prisma client for database operations */
  prisma: PrismaClient;
  /**
   * Optional logger — from @dora/logger
   * Expected interface: { info(...), error(...), warn(...), debug(...) }
   */
  logger?: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 hash of a buffer for deduplication.
 */
function computeHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Generate a storage key for an edition's PDF.
 */
function makeStorageKey(fonteId: string, date: string, hash: string): string {
  return `diarios/${fonteId}/${date}/${hash}.pdf`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a BullMQ worker that scrapes gazette sources and enqueues
 * downloaded editions for processing.
 *
 * @param options - Worker configuration and injected dependencies
 * @returns The BullMQ Worker instance (call .close() to shut down)
 */
export function createScrapingWorker(options: ScrapingWorkerOptions): Worker {
  const {
    connection,
    concurrency = 2,
    spiderRegistry,
    minioStorage,
    prisma,
    logger = console,
  } = options;

  // Queue reference for enqueuing processing jobs
  const processingQueue = new Queue("processing", { connection });

  const worker = new Worker<ScrapingJobData>(
    "scraping",
    async (job: Job<ScrapingJobData>) => {
      const { fonteId, date } = job.data;

      logger.info(
        `[scraping-worker] Starting job ${job.id} — fonte=${fonteId} date=${date}`,
      );

      await job.updateProgress(0);

      // Get the appropriate spider for this source
      const spider: Spider = spiderRegistry.getSpider(fonteId);

      if (!spider) {
        throw new Error(`No spider registered for fonte ${fonteId}`);
      }

      let downloadedCount = 0;
      let skippedCount = 0;
      let enqueuedCount = 0;

      try {
        // Crawl the source for the given date
        const results: CrawlResult[] = await spider.crawl(date);

        const totalResults = results.length;
        await job.updateProgress(10);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          downloadedCount++;

          // Compute hash for deduplication
          const hash = computeHash(result.buffer);

          // Check if we already have this exact file
          const existing = await prisma.edicao.findFirst({
            where: { hash },
          });

          if (existing) {
            logger.info(
              `[scraping-worker] Duplicate detected (hash=${hash.slice(0, 12)}…), skipping`,
            );
            skippedCount++;
            await job.updateProgress(
              10 + Math.round(((i + 1) / totalResults) * 80),
            );
            continue;
          }

          // Upload PDF to MinIO
          const storageKey = makeStorageKey(fonteId, date, hash);
          await minioStorage.uploadFile(
            "diarios",
            storageKey,
            result.buffer,
            "application/pdf",
          );

          // Create edicao record in the database
          const edicao = await prisma.edicao.create({
            data: {
              fonteId,
              titulo: result.titulo,
              dataPublicacao: new Date(result.dataPublicacao),
              arquivoPath: storageKey,
              bucket: "diarios",
              hash,
              tamanhoBytes: result.buffer.length,
              urlOrigem: result.url,
              status: "PENDENTE",
              metadados: result.metadata ?? {},
            },
          });

          // Enqueue processing job
          await processingQueue.add(
            "process-edicao",
            {
              edicaoId: edicao.id,
              etapa: "completo",
              prioridade: 0,
            },
            {
              priority: 0,
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 30_000,
              },
            },
          );

          enqueuedCount++;

          await job.updateProgress(
            10 + Math.round(((i + 1) / totalResults) * 80),
          );
        }

        await job.updateProgress(100);

        logger.info(
          `[scraping-worker] Completed job ${job.id} — ` +
            `downloaded=${downloadedCount} skipped=${skippedCount} enqueued=${enqueuedCount}`,
        );

        return {
          fonteId,
          date,
          downloadedCount,
          skippedCount,
          enqueuedCount,
          completedAt: new Date().toISOString(),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error(
          `[scraping-worker] Failed job ${job.id} — fonte=${fonteId} date=${date}: ${message}`,
        );

        throw err;
      }
    },
    {
      connection,
      concurrency,
      lockDuration: 300_000, // 5 minutes for scraping
      stalledInterval: 60_000,
    },
  );

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  worker.on("completed", (job: Job<ScrapingJobData>) => {
    logger.info(
      `[scraping-worker] Job ${job.id} completed for fonte=${job.data.fonteId} date=${job.data.date}`,
    );
  });

  worker.on("failed", (job: Job<ScrapingJobData> | undefined, err: Error) => {
    logger.error(
      `[scraping-worker] Job ${job?.id ?? "unknown"} failed: ${err.message}`,
    );
  });

  worker.on("error", (err: Error) => {
    logger.error(`[scraping-worker] Worker error: ${err.message}`);
  });

  return worker;
}
