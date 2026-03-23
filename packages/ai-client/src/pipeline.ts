import { ClaudeClient } from "./client";
import {
  TRANSCRIPTION_SYSTEM_PROMPT,
  SEGMENTATION_SYSTEM_PROMPT,
  NER_SYSTEM_PROMPT,
  CLASSIFICATION_SYSTEM_PROMPT,
  SUMMARIZATION_SYSTEM_PROMPT,
  QA_SYSTEM_PROMPT,
} from "./prompts";

// ---------------------------------------------------------------------------
// Result interfaces
// ---------------------------------------------------------------------------

export interface TranscriptionResult {
  numero_pagina: number;
  texto_completo: string;
  tabelas: string[][][];
  cabecalhos: string[];
  secao_diario: string;
}

export interface SegmentationActResult {
  tipo_ato: string;
  orgao_emissor: string;
  titulo_ementa: string;
  texto_integral: string;
  pagina_inicio: number;
  pagina_fim: number;
}

export type SegmentationResult = SegmentationActResult[];

export interface PersonEntity {
  nome: string;
  papel: string;
}

export interface OrgEntity {
  nome: string;
  tipo: string;
}

export interface ValorEntity {
  valor: string;
  natureza: string;
}

export interface DataEntity {
  data: string;
  natureza: string;
}

export interface CargoEntity {
  cargo: string;
  nivel: string;
}

export interface LicitacaoEntity {
  modalidade: string;
  numero_processo: string;
}

export interface EntitiesResult {
  pessoas: PersonEntity[];
  orgaos: OrgEntity[];
  cpfs: string[];
  cnpjs: string[];
  valores: ValorEntity[];
  datas: DataEntity[];
  processos: string[];
  cargos: CargoEntity[];
  modalidades_licitacao: LicitacaoEntity[];
}

export interface ClassificationResult {
  area: string;
  subarea: string;
  tema: string;
  score: number;
  justificativa: string;
}

export interface SummaryResult {
  resumo: string;
  pontos_chave: string[];
  publico_alvo: string[];
  implicacoes: string[];
}

export interface QAResult {
  resposta: string;
  fontes: string[];
  confianca: "alto" | "medio" | "baixo";
  observacoes: string;
}

// ---------------------------------------------------------------------------
// Model defaults (overridable via environment variables)
// ---------------------------------------------------------------------------

const MODEL_VISION =
  process.env.CLAUDE_MODEL_VISION ?? "claude-sonnet-4-20250514";
const MODEL_EXTRACTION =
  process.env.CLAUDE_MODEL_EXTRACTION ?? "claude-sonnet-4-20250514";
const MODEL_CLASSIFICATION =
  process.env.CLAUDE_MODEL_CLASSIFICATION ?? "claude-haiku-4-5-20251001";
const MODEL_ANALYSIS =
  process.env.CLAUDE_MODEL_ANALYSIS ?? "claude-opus-4-6";

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class ClaudePipeline {
  private client: ClaudeClient;

  constructor(client: ClaudeClient) {
    this.client = client;
  }

  /**
   * Transcribe an array of page images into structured text.
   * Each image is sent independently and results are returned in order.
   */
  async transcribePages(
    images: Array<{ data: string; mediaType: string }>,
    pageOffset: number = 0
  ): Promise<TranscriptionResult[]> {
    const results = await Promise.all(
      images.map(async (image, index) => {
        const pageNumber = pageOffset + index + 1;
        const prompt = `Transcreva o conteúdo desta página (página ${pageNumber}) do Diário Oficial. Siga rigorosamente as instruções do sistema.`;

        const response = await this.client.sendVision({
          images: [image],
          prompt,
          model: MODEL_VISION,
          maxTokens: 8192,
        });

        const text = this.client.getTextContent(response);
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();

        return JSON.parse(jsonStr) as TranscriptionResult;
      })
    );

    return results;
  }

  /**
   * Segment the full text of a gazette edition into individual normative acts.
   */
  async segmentActs(fullText: string): Promise<SegmentationResult> {
    return this.client.sendWithJsonOutput<SegmentationResult>({
      model: MODEL_EXTRACTION,
      system: SEGMENTATION_SYSTEM_PROMPT,
      prompt: fullText,
      maxTokens: 16384,
    });
  }

  /**
   * Extract named entities from a single normative act.
   */
  async extractEntities(
    actText: string,
    actType: string
  ): Promise<EntitiesResult> {
    const prompt = `Tipo do ato: ${actType}\n\nTexto do ato:\n${actText}`;

    return this.client.sendWithJsonOutput<EntitiesResult>({
      model: MODEL_CLASSIFICATION,
      system: NER_SYSTEM_PROMPT,
      prompt,
      maxTokens: 8192,
    });
  }

  /**
   * Classify a normative act into thematic categories.
   */
  async classifyAct(
    actText: string,
    actTitle: string
  ): Promise<ClassificationResult[]> {
    const prompt = `Título/Ementa: ${actTitle}\n\nTexto do ato:\n${actText}`;

    return this.client.sendWithJsonOutput<ClassificationResult[]>({
      model: MODEL_CLASSIFICATION,
      system: CLASSIFICATION_SYSTEM_PROMPT,
      prompt,
      maxTokens: 4096,
    });
  }

  /**
   * Generate an executive summary for a normative act.
   */
  async summarizeAct(
    actText: string,
    actType: string
  ): Promise<SummaryResult> {
    const prompt = `Tipo do ato: ${actType}\n\nTexto do ato:\n${actText}`;

    return this.client.sendWithJsonOutput<SummaryResult>({
      model: MODEL_EXTRACTION,
      system: SUMMARIZATION_SYSTEM_PROMPT,
      prompt,
      maxTokens: 4096,
    });
  }

  /**
   * Answer a user question using RAG context documents.
   */
  async answerQuestion(
    question: string,
    context: string[]
  ): Promise<QAResult> {
    const contextBlock = context
      .map((doc, i) => `--- Documento ${i + 1} ---\n${doc}`)
      .join("\n\n");

    const prompt = `DOCUMENTOS DE CONTEXTO:\n\n${contextBlock}\n\nPERGUNTA DO USUÁRIO:\n${question}`;

    return this.client.sendWithJsonOutput<QAResult>({
      model: MODEL_ANALYSIS,
      system: QA_SYSTEM_PROMPT,
      prompt,
      maxTokens: 4096,
    });
  }
}
