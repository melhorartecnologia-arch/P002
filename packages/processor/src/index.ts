/**
 * @dora/processor
 *
 * Orchestrates the full gazette processing pipeline:
 * PDF conversion, Claude AI transcription, segmentation,
 * NER, classification, summarization, embedding, and indexing.
 */

export {
  isPdfNative,
  getPdfPageCount,
  extractTextFromPdf,
  convertPdfToImages,
  validatePdf,
} from "./pdf-utils.js";

export { PipelineOrchestrator } from "./pipeline-orchestrator.js";
export type { PipelineOrchestratorDeps } from "./pipeline-orchestrator.js";

export { createProcessingWorker } from "./workers/processing-worker.js";
export { createScrapingWorker } from "./workers/scraping-worker.js";
export { createNotificationWorker } from "./workers/notification-worker.js";
