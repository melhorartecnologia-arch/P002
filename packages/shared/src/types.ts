export interface FonteConfig {
  id: string;
  nome: string;
  esfera: string;
  uf?: string;
  urlBase: string;
  spiderType: string;
  cronExpression: string;
}

export interface EdicaoMetadata {
  id: string;
  fonteId: string;
  numero: string;
  dataPublicacao: string;
  tipo: string;
  hashConteudo: string;
  urlOriginal: string;
  totalPaginas: number;
}

export interface AtoExtraido {
  tipoAto: string;
  orgaoEmissor: string;
  titulo: string;
  conteudoTexto: string;
  resumo?: string;
  dataAssinatura?: string;
  paginaInicio: number;
  paginaFim: number;
  temas: Array<{
    area: string;
    subarea: string;
    tema: string;
    score: number;
  }>;
  entidades: {
    pessoas: string[];
    orgaos: string[];
    cpfs: string[];
    cnpjs: string[];
    valores: string[];
    datas: string[];
    processos: string[];
  };
}

export interface TranscricaoResultado {
  numeroPagina: number;
  textoCompleto: string;
  tabelas: string[][][];
  cabecalhos: string[];
  secaoDiario: string;
}

export interface SegmentacaoResultado {
  atos: AtoExtraido[];
}

export interface AlertaConfig {
  id: string;
  userId: string;
  nome: string;
  tipo: string;
  regras: Record<string, unknown>;
  promptSemantico?: string;
  canais: string[];
  ativo: boolean;
}

export type ProcessingStep =
  | 'TRANSCRICAO'
  | 'SEGMENTACAO'
  | 'NER'
  | 'CLASSIFICACAO'
  | 'SUMARIZACAO'
  | 'EMBEDDING'
  | 'INDEXACAO';

export interface JobPayload {
  edicaoId: string;
  etapa: ProcessingStep;
  tentativa: number;
  prioridade?: number;
}

export interface SearchQuery {
  query: string;
  filtros: {
    esfera?: string;
    uf?: string;
    tipoAto?: string;
    orgao?: string;
    dataInicio?: string;
    dataFim?: string;
    temas?: string[];
  };
  page: number;
  pageSize: number;
  sort?: string;
}

export interface SearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  took: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
