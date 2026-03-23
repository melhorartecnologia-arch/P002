import type { ProcessingStep } from './types';

export const UF_LIST = [
  { sigla: 'AC', nome: 'Acre', regiao: 'Norte' },
  { sigla: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { sigla: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { sigla: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { sigla: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { sigla: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { sigla: 'PA', nome: 'Pará', regiao: 'Norte' },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { sigla: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { sigla: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { sigla: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'Norte' },
] as const;

export const TIPO_ATO_LABELS: Record<string, string> = {
  DECRETO: 'Decreto',
  LEI: 'Lei',
  LEI_COMPLEMENTAR: 'Lei Complementar',
  MEDIDA_PROVISORIA: 'Medida Provisória',
  PORTARIA: 'Portaria',
  RESOLUCAO: 'Resolução',
  INSTRUCAO_NORMATIVA: 'Instrução Normativa',
  ATO_DECLARATORIO: 'Ato Declaratório',
  EDITAL: 'Edital',
  AVISO_LICITACAO: 'Aviso de Licitação',
  CONTRATO: 'Contrato',
  CONVENIO: 'Convênio',
  NOMEACAO: 'Nomeação',
  EXONERACAO: 'Exoneração',
  APOSENTADORIA: 'Aposentadoria',
  RETIFICACAO: 'Retificação',
  DESPACHO: 'Despacho',
  PARECER: 'Parecer',
  OUTRO: 'Outro',
};

export const PROCESSING_STEPS: ProcessingStep[] = [
  'TRANSCRICAO',
  'SEGMENTACAO',
  'NER',
  'CLASSIFICACAO',
  'SUMARIZACAO',
  'EMBEDDING',
  'INDEXACAO',
];

export const RETRY_CONFIG = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
} as const;

export const CLAUDE_MODELS = {
  vision: 'claude-sonnet-4-20250514',
  extraction: 'claude-sonnet-4-20250514',
  classification: 'claude-haiku-4-20250514',
  analysis: 'claude-sonnet-4-20250514',
} as const;

export const MINIO_PATHS = {
  originals: 'originais/',
  transcribed: 'transcritos/',
  processed: 'processados/',
} as const;
