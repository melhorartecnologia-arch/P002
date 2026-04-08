const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function fetchApi<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { params, ...init } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`API error ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
}

// --- Typed API functions ---

export interface Edicao {
  id: string;
  data_publicacao: string;
  esfera: string;
  uf?: string;
  municipio?: string;
  fonte: string;
  total_atos: number;
  status: string;
}

export interface Ato {
  id: string;
  edicao_id: string;
  tipo: string;
  orgao: string;
  ementa: string;
  texto_completo: string;
  temas: string[];
  entidades: string[];
  resumo?: string;
  data_publicacao: string;
}

export interface Alerta {
  id: string;
  nome: string;
  tipo: 'keyword' | 'entity' | 'topic' | 'semantic';
  consulta: string;
  ativo: boolean;
  canal: string;
  criado_em: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface DashboardStats {
  total_edicoes: number;
  total_atos: number;
  fontes_ativas: number;
  alertas_ativos: number;
  edicoes_recentes: Edicao[];
  top_temas: { tema: string; count: number }[];
}

export interface SearchResult {
  items: Ato[];
  total: number;
  page: number;
  total_pages: number;
}

export interface AnalyticsData {
  volume_mensal: { mes: string; count: number }[];
  tendencias: { tema: string; variacao: number }[];
}

export interface Fonte {
  id: string;
  nome: string;
  esfera: string;
  uf?: string;
  urlBase: string;
  spiderType?: string;
  cronExpression?: string;
  ativo: boolean;
  totalEdicoes?: number;
}

export interface CreateFonteData {
  nome: string;
  esfera: string;
  uf?: string;
  urlBase: string;
  spiderType?: string;
  cronExpression?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function getDashboardStats() {
  return fetchApi<DashboardStats>('/api/v1/dashboard/stats');
}

export function getEdicoes(params?: {
  page?: number;
  per_page?: number;
  esfera?: string;
  uf?: string;
}) {
  return fetchApi<PaginatedResponse<Edicao>>('/api/v1/edicoes', { params });
}

export function getEdicao(id: string) {
  return fetchApi<Edicao & { atos: Ato[] }>(`/api/v1/edicoes/${id}`);
}

export function getAtos(params?: {
  page?: number;
  per_page?: number;
  tipo?: string;
  orgao?: string;
}) {
  return fetchApi<PaginatedResponse<Ato>>('/api/v1/atos', { params });
}

export function getAto(id: string) {
  return fetchApi<Ato & { relacionados: Ato[] }>(`/api/v1/atos/${id}`);
}

export function searchAtos(params: {
  q: string;
  mode?: 'fulltext' | 'semantic';
  esfera?: string;
  uf?: string;
  tipo?: string;
  orgao?: string;
  tema?: string;
  data_inicio?: string;
  data_fim?: string;
  page?: number;
  per_page?: number;
}) {
  return fetchApi<SearchResult>('/api/v1/search', { params });
}

export function getFontes() {
  return fetchApi<{ data: Fonte[]; meta: { total: number } }>('/api/v1/fontes');
}

export function createFonte(data: CreateFonteData) {
  return fetchApi<{ data: Fonte }>('/api/v1/fontes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateFonte(id: string, data: Partial<CreateFonteData & { ativo: boolean }>) {
  return fetchApi<{ data: Fonte }>(`/api/v1/fontes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteFonte(id: string) {
  return fetchApi<void>(`/api/v1/fontes/${id}`, { method: 'DELETE' });
}

export async function uploadPdf(
  file: File,
  fields: { fonteId: string; numero?: string; dataPublicacao?: string; tipo?: string },
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('fonteId', fields.fonteId);
  if (fields.numero) formData.append('numero', fields.numero);
  if (fields.dataPublicacao) formData.append('dataPublicacao', fields.dataPublicacao);
  if (fields.tipo) formData.append('tipo', fields.tipo);

  const res = await fetch(`${BASE_URL}/api/v1/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Upload error ${res.status}: ${body}`);
  }

  return res.json();
}

export function getAlertas() {
  return fetchApi<Alerta[]>('/api/v1/alertas');
}

export function createAlerta(data: Omit<Alerta, 'id' | 'criado_em'>) {
  return fetchApi<Alerta>('/api/v1/alertas', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAlerta(id: string, data: Partial<Alerta>) {
  return fetchApi<Alerta>(`/api/v1/alertas/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function getAnalytics() {
  return fetchApi<AnalyticsData>('/api/v1/analytics');
}

export function askQuestion(question: string, history: ChatMessage[]) {
  return fetchApi<{ answer: string }>('/api/v1/analytics/ask', {
    method: 'POST',
    body: JSON.stringify({ question, history }),
  });
}
