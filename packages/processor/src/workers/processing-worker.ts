/**
 * Processing Worker
 *
 * BullMQ worker that consumes jobs from the "processing" queue.
 * Each job triggers the full pipeline orchestrator for a gazette edition.
 */

import { Worker, Job } from "bullmq";
import { PipelineOrchestrator } from "../pipeline-orchestrator.js";
import type { PipelineOrchestratorDeps } from "../pipeline-orchestrator.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProcessingJobData {
  /** Database ID of the edicao to process */
  edicaoId: string;
  /** Processing stage hint (e.g., "completo", "reprocessar") */
  etapa: string;
  /** Priority level for ordering */
  prioridade: number;
}

interface ProcessingWorkerOptions {
  /** Redis connection options for BullMQ */
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /** Number of concurrent jobs (default: 3) */
  concurrency?: number;
  /** Dependencies to inject into the PipelineOrchestrator */
  deps: PipelineOrchestratorDeps;
  /**
   * Optional logger — from @dora/logger
   * Expected interface: { info(...), error(...), warn(...), debug(...) }
   */
  logger?: any;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a BullMQ worker that processes gazette editions through the
 * full pipeline (PDF extraction, Claude AI, NER, indexing, etc.).
 *
 * @param options - Worker configuration and injected dependencies
 * @returns The BullMQ Worker instance (call .close() to shut down)
 */
export function createProcessingWorker(options: ProcessingWorkerOptions): Worker {
  const {
    connection,
    concurrency = 3,
    deps,
    logger = console,
  } = options;

  const worker = new Worker<ProcessingJobData>(
    "processing",
    async (job: Job<ProcessingJobData>) => {
      const { edicaoId, etapa } = job.data;

      logger.info(
        `[processing-worker] Starting job ${job.id} — edicao=${edicaoId} etapa=${etapa}`,
      );

      await job.updateProgress(0);

      const orchestrator = new PipelineOrchestrator(deps);

      try {
        await job.updateProgress(10);

        await orchestrator.processEdicao(edicaoId);

        const tokensUsed = orchestrator.getTokensUsed();

        await job.updateProgress(100);

        logger.info(
          `[processing-worker] Completed job ${job.id} — edicao=${edicaoId} tokens=${tokensUsed}`,
        );

        return {
          edicaoId,
          tokensUsed,
          completedAt: new Date().toISOString(),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error(
          `[processing-worker] Failed job ${job.id} — edicao=${edicaoId}: ${message}`,
        );

        throw err;
      }
    },
    {
      connection,
      concurrency,
      // Stalled jobs are retried automatically by BullMQ
      lockDuration: 600_000, // 10 minutes — PDF processing can be slow
      stalledInterval: 120_000,
    },
  );

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  worker.on("completed", (job: Job<ProcessingJobData>) => {
    logger.info(
      `[processing-worker] Job ${job.id} completed for edicao=${job.data.edicaoId}`,
    );
  });

  worker.on("failed", (job: Job<ProcessingJobData> | undefined, err: Error) => {
    logger.error(
      `[processing-worker] Job ${job?.id ?? "unknown"} failed: ${err.message}`,
    );
  });

  worker.on("error", (err: Error) => {
    logger.error(`[processing-worker] Worker error: ${err.message}`);
  });

  return worker;
}
