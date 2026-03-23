export { ClaudeClient } from "./client";
export type { SendMessageParams, SendVisionParams, SendWithJsonOutputParams } from "./client";

export {
  TRANSCRIPTION_SYSTEM_PROMPT,
  SEGMENTATION_SYSTEM_PROMPT,
  NER_SYSTEM_PROMPT,
  CLASSIFICATION_SYSTEM_PROMPT,
  SUMMARIZATION_SYSTEM_PROMPT,
  QA_SYSTEM_PROMPT,
} from "./prompts";

export { ClaudePipeline } from "./pipeline";
export type {
  TranscriptionResult,
  SegmentationActResult,
  SegmentationResult,
  PersonEntity,
  OrgEntity,
  ValorEntity,
  DataEntity,
  CargoEntity,
  LicitacaoEntity,
  EntitiesResult,
  ClassificationResult,
  SummaryResult,
  QAResult,
} from "./pipeline";
