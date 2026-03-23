/**
 * Pipeline Orchestrator
 *
 * Main orchestration class that runs the full processing pipeline
 * for a gazette edition (edicao). Steps include:
 *
 * 1. Fetch edicao from database, update status to PROCESSANDO
 * 2. Download PDF from MinIO
 * 3. Detect native vs. scanned PDF
 * 4. Transcribe (scanned) or extract text (native) via Claude
 * 5. Segment acts via Claude
 * 6. For each act: NER, classification, summarization (Claude)
 * 7. Generate embeddings
 * 8. Index in Elasticsearch
 * 9. Store vectors in Qdrant
 * 10. Persist results to database, mark CONCLUIDO
 */

import {
  isPdfNative,
  extractTextFromPdf,
  convertPdfToImages,
  validatePdf,
} from "./pdf-utils.js";

// ---------------------------------------------------------------------------
// External dependency type aliases
// ---------------------------------------------------------------------------

/**
 * ClaudePipeline — from @dora/ai-client
 * Expected methods:
 *   transcribeImages(images: Array<{data: string, mediaType: string}>): Promise<string>
 *   extractStructuredText(text: string): Promise<string>
 *   segmentActs(text: string): Promise<Array<{titulo: string, conteudo: string}>>
 *   extractEntities(text: string): Promise<Array<{tipo: string, valor: string}>>
 *   classify(text: string): Promise<{categoria: string, subcategoria?: string}>
 *   summarize(text: string): Promise<string>
 *   getTokensUsed(): number
 */
type ClaudePipeline = any;

/**
 * MinioStorage — from @dora/storage
 * Expected methods:
 *   downloadFile(bucket: string, key: string): Promise<Buffer>
 *   uploadFile(bucket: string, key: string, data: Buffer, contentType?: string): Promise<void>
 */
type MinioStorage = any;

/**
 * ElasticService — from @dora/storage
 * Expected methods:
 *   indexAto(ato: object): Promise<void>
 */
type ElasticService = any;

/**
 * QdrantService — from @dora/storage
 * Expected methods:
 *   upsertVector(collection: string, id: string, vector: number[], payload: object): Promise<void>
 */
type QdrantService = any;

/**
 * PrismaClient — from @dora/database
 * Expected models: edicao, ato, entidade
 */
type PrismaClient = any;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Dependencies injected into the orchestrator */
export interface PipelineOrchestratorDeps {
  claudePipeline: ClaudePipeline;
  minioStorage: MinioStorage;
  elasticService: ElasticService;
  qdrantService: QdrantService;
  prisma: PrismaClient;
}

interface SegmentedAct {
  titulo: string;
  conteudo: string;
}

interface ExtractedEntity {
  tipo: string;
  valor: string;
}

interface Classification {
  categoria: string;
  subcategoria?: string;
}

interface ProcessedAct {
  titulo: string;
  conteudo: string;
  entidades: ExtractedEntity[];
  classificacao: Classification;
  resumo: string;
  embedding?: number[];
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

export class PipelineOrchestrator {
  private claudePipeline: ClaudePipeline;
  private minioStorage: MinioStorage;
  private elasticService: ElasticService;
  private qdrantService: QdrantService;
  private prisma: PrismaClient;

  /** Cumulative Claude API token usage across all steps */
  private totalTokensUsed: number = 0;

  constructor(deps: PipelineOrchestratorDeps) {
    this.claudePipeline = deps.claudePipeline;
    this.minioStorage = deps.minioStorage;
    this.elasticService = deps.elasticService;
    this.qdrantService = deps.qdrantService;
    this.prisma = deps.prisma;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Run the full processing pipeline for a gazette edition.
   *
   * @param edicaoId - Database ID of the edicao record
   */
  async processEdicao(edicaoId: string): Promise<void> {
    this.totalTokensUsed = 0;

    try {
      // Step 1 — Fetch edicao and set status to PROCESSANDO
      const edicao = await this.fetchAndLockEdicao(edicaoId);

      // Step 2 — Download PDF from MinIO
      const pdfBuffer = await this.downloadPdf(edicao);

      // Step 3 — Validate PDF integrity
      await this.validatePdfIntegrity(pdfBuffer);

      // Step 4 — Check if native or scanned, then extract/transcribe text
      const fullText = await this.extractOrTranscribeText(pdfBuffer);

      // Step 5 — Segment text into individual acts
      const segments = await this.segmentActs(fullText);

      // Step 6 — Process each act (NER, classification, summarization)
      const processedActs = await this.processActs(segments);

      // Step 7 — Generate embeddings (placeholder)
      const actsWithEmbeddings = await this.generateEmbeddings(processedActs);

      // Step 8 — Index in Elasticsearch
      await this.indexInElasticsearch(edicaoId, actsWithEmbeddings);

      // Step 9 — Store vectors in Qdrant
      await this.storeInQdrant(edicaoId, actsWithEmbeddings);

      // Step 10 — Persist results and mark CONCLUIDO
      await this.persistResults(edicaoId, actsWithEmbeddings);

      await this.updateEdicaoStatus(edicaoId, "CONCLUIDO", {
        totalAtos: actsWithEmbeddings.length,
        tokensUsed: this.totalTokensUsed,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      await this.updateEdicaoStatus(edicaoId, "ERRO", {
        error: message,
        tokensUsed: this.totalTokensUsed,
      }).catch(() => {
        // Swallow update errors so the original error propagates
      });

      throw err;
    }
  }

  /** Returns total tokens consumed in the last processEdicao call */
  getTokensUsed(): number {
    return this.totalTokensUsed;
  }

  // -----------------------------------------------------------------------
  // Private step methods
  // -----------------------------------------------------------------------

  /**
   * Step 1 — Fetch the edicao record from the database and update its
   * status to PROCESSANDO to prevent duplicate processing.
   */
  private async fetchAndLockEdicao(edicaoId: string): Promise<any> {
    const edicao = await this.prisma.edicao.findUniqueOrThrow({
      where: { id: edicaoId },
    });

    await this.prisma.edicao.update({
      where: { id: edicaoId },
      data: { status: "PROCESSANDO", processadoEm: new Date() },
    });

    return edicao;
  }

  /**
   * Step 2 — Download the PDF file from MinIO using the edicao's
   * storage bucket and key.
   */
  private async downloadPdf(edicao: any): Promise<Buffer> {
    const bucket: string = edicao.bucket ?? "diarios";
    const key: string = edicao.arquivoPath ?? edicao.arquivo;

    if (!key) {
      throw new Error(
        `Edicao ${edicao.id} has no file path (arquivoPath/arquivo)`,
      );
    }

    const buffer: Buffer = await this.minioStorage.downloadFile(bucket, key);
    return buffer;
  }

  /**
   * Step 3 — Validate the downloaded PDF to ensure it is structurally sound.
   */
  private async validatePdfIntegrity(buffer: Buffer): Promise<void> {
    const result = await validatePdf(buffer);

    if (!result.valid) {
      throw new Error(`PDF validation failed: ${result.error}`);
    }
  }

  /**
   * Step 4 — Determine whether the PDF is native (selectable text) or
   * scanned (image-only). Scanned PDFs are converted to images and sent
   * to Claude Vision for transcription. Native PDFs have their text
   * extracted directly, with an optional Claude pass for structured output.
   */
  private async extractOrTranscribeText(buffer: Buffer): Promise<string> {
    const isNative = await isPdfNative(buffer);

    if (isNative) {
      // Native PDF — extract text directly
      const rawText = await extractTextFromPdf(buffer);

      // Optionally refine via Claude for better structure
      try {
        const structured =
          await this.claudePipeline.extractStructuredText(rawText);
        this.trackTokens();
        return structured;
      } catch {
        // If Claude structured extraction fails, fall back to raw text
        return rawText;
      }
    } else {
      // Scanned PDF — convert to images and transcribe via Claude Vision
      const images = await convertPdfToImages(buffer, 300);

      const transcription =
        await this.claudePipeline.transcribeImages(images);
      this.trackTokens();

      return transcription;
    }
  }

  /**
   * Step 5 — Use Claude to segment the full gazette text into individual
   * official acts (atos).
   */
  private async segmentActs(fullText: string): Promise<SegmentedAct[]> {
    const segments: SegmentedAct[] =
      await this.claudePipeline.segmentActs(fullText);
    this.trackTokens();
    return segments;
  }

  /**
   * Step 6 — For each segmented act, run NER (entity extraction),
   * classification, and summarization in parallel via Claude.
   */
  private async processActs(
    segments: SegmentedAct[],
  ): Promise<ProcessedAct[]> {
    const results: ProcessedAct[] = [];

    for (const segment of segments) {
      const [entidades, classificacao, resumo] = await Promise.all([
        this.extractEntities(segment.conteudo),
        this.classifyAct(segment.conteudo),
        this.summarizeAct(segment.conteudo),
      ]);

      results.push({
        titulo: segment.titulo,
        conteudo: segment.conteudo,
        entidades,
        classificacao,
        resumo,
      });
    }

    return results;
  }

  /** NER — Extract named entities from an act's text */
  private async extractEntities(text: string): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] =
      await this.claudePipeline.extractEntities(text);
    this.trackTokens();
    return entities;
  }

  /** Classification — Determine the category of an act */
  private async classifyAct(text: string): Promise<Classification> {
    const classification: Classification =
      await this.claudePipeline.classify(text);
    this.trackTokens();
    return classification;
  }

  /** Summarization — Generate a concise summary of an act */
  private async summarizeAct(text: string): Promise<string> {
    const summary: string = await this.claudePipeline.summarize(text);
    this.trackTokens();
    return summary;
  }

  /**
   * Step 7 — Generate vector embeddings for each processed act.
   * Currently a placeholder; real implementation would call an embedding
   * model (e.g., OpenAI text-embedding-3-small or a local model).
   */
  private async generateEmbeddings(
    acts: ProcessedAct[],
  ): Promise<ProcessedAct[]> {
    // TODO: Integrate actual embedding model
    // Example: const vector = await embeddingModel.embed(act.conteudo);
    return acts.map((act) => ({
      ...act,
      embedding: undefined, // Placeholder — no embedding generated yet
    }));
  }

  /**
   * Step 8 — Index each processed act in Elasticsearch for full-text search.
   */
  private async indexInElasticsearch(
    edicaoId: string,
    acts: ProcessedAct[],
  ): Promise<void> {
    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];
      await this.elasticService.indexAto({
        edicaoId,
        index: i,
        titulo: act.titulo,
        conteudo: act.conteudo,
        resumo: act.resumo,
        categoria: act.classificacao.categoria,
        subcategoria: act.classificacao.subcategoria,
        entidades: act.entidades,
      });
    }
  }

  /**
   * Step 9 — Store act vectors in Qdrant for semantic similarity search.
   */
  private async storeInQdrant(
    edicaoId: string,
    acts: ProcessedAct[],
  ): Promise<void> {
    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];

      if (!act.embedding) {
        continue; // Skip acts without embeddings
      }

      const pointId = `${edicaoId}-${i}`;

      await this.qdrantService.upsertVector("atos", pointId, act.embedding, {
        edicaoId,
        titulo: act.titulo,
        resumo: act.resumo,
        categoria: act.classificacao.categoria,
      });
    }
  }

  /**
   * Step 10 — Persist all processed acts to the database.
   * Creates ato records with their entities.
   */
  private async persistResults(
    edicaoId: string,
    acts: ProcessedAct[],
  ): Promise<void> {
    for (const act of acts) {
      const ato = await this.prisma.ato.create({
        data: {
          edicaoId,
          titulo: act.titulo,
          conteudo: act.conteudo,
          resumo: act.resumo,
          categoria: act.classificacao.categoria,
          subcategoria: act.classificacao.subcategoria ?? null,
        },
      });

      // Create entity records linked to the ato
      if (act.entidades.length > 0) {
        await this.prisma.entidade.createMany({
          data: act.entidades.map((ent) => ({
            atoId: ato.id,
            tipo: ent.tipo,
            valor: ent.valor,
          })),
        });
      }
    }
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Update the edicao's processing status in the database.
   */
  private async updateEdicaoStatus(
    edicaoId: string,
    status: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.edicao.update({
      where: { id: edicaoId },
      data: {
        status,
        ...(metadata ? { metadados: metadata } : {}),
        ...(status === "CONCLUIDO" ? { processadoEm: new Date() } : {}),
      },
    });
  }

  /**
   * Track cumulative Claude token usage.
   * Reads from the claudePipeline's token counter if available.
   */
  private trackTokens(): void {
    try {
      const tokens = this.claudePipeline.getTokensUsed?.();
      if (typeof tokens === "number") {
        this.totalTokensUsed = tokens;
      }
    } catch {
      // Token tracking is best-effort
    }
  }
}
