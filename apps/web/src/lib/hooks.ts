'use client';

import useSWR from 'swr';
import {
  getDashboardStats,
  getEdicoes,
  getAtos,
  getAlertas,
  getAnalytics,
  searchAtos,
} from './api';

export function useDashboard() {
  return useSWR('dashboard-stats', getDashboardStats, {
    refreshInterval: 30_000,
  });
}

export function useEdicoes(params?: {
  page?: number;
  per_page?: number;
  esfera?: string;
  uf?: string;
}) {
  const key = params ? ['edicoes', JSON.stringify(params)] : 'edicoes';
  return useSWR(key, () => getEdicoes(params));
}

export function useAtos(params?: {
  page?: number;
  per_page?: number;
  tipo?: string;
  orgao?: string;
}) {
  const key = params ? ['atos', JSON.stringify(params)] : 'atos';
  return useSWR(key, () => getAtos(params));
}

export function useAlertas() {
  return useSWR('alertas', getAlertas);
}

export function useAnalytics() {
  return useSWR('analytics', getAnalytics);
}

export function useSearch(
  query: string,
  filters: {
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
  } = {}
) {
  const shouldFetch = query.length > 0;
  const key = shouldFetch
    ? ['search', query, JSON.stringify(filters)]
    : null;

  return useSWR(key, () => searchAtos({ q: query, ...filters }));
}
