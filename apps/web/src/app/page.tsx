'use client';

import { FileText, Gavel, Radio, Bell, BarChart3 } from 'lucide-react';
import { StatsCard } from '@/components/stats-card';
import { useDashboard } from '@/lib/hooks';
import Link from 'next/link';

export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-gray-400">
          Visão geral dos diários oficiais monitorados
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total de Edições"
          value={isLoading ? '...' : (data?.total_edicoes?.toLocaleString('pt-BR') ?? '0')}
          icon={<FileText className="h-5 w-5" />}
          trend={{ value: 12, direction: 'up' }}
        />
        <StatsCard
          label="Total de Atos"
          value={isLoading ? '...' : (data?.total_atos?.toLocaleString('pt-BR') ?? '0')}
          icon={<Gavel className="h-5 w-5" />}
          trend={{ value: 8, direction: 'up' }}
        />
        <StatsCard
          label="Fontes Ativas"
          value={isLoading ? '...' : (data?.fontes_ativas ?? '0')}
          icon={<Radio className="h-5 w-5" />}
        />
        <StatsCard
          label="Alertas Ativos"
          value={isLoading ? '...' : (data?.alertas_ativos ?? '0')}
          icon={<Bell className="h-5 w-5" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Editions */}
        <div className="lg:col-span-2 rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Edições Recentes</h2>
            <Link
              href="/edicoes"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Ver todas
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-800" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(data?.edicoes_recentes ?? []).slice(0, 8).map((edicao) => (
                <Link
                  key={edicao.id}
                  href={`/edicoes/${edicao.id}`}
                  className="flex items-center justify-between rounded-lg px-4 py-3 transition-colors hover:bg-gray-800"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-200">
                      {edicao.fonte}
                    </span>
                    <span className="ml-3 text-xs text-gray-500">
                      {edicao.esfera} {edicao.uf ? `- ${edicao.uf}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {edicao.total_atos} atos
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(edicao.data_publicacao).toLocaleDateString('pt-BR')}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        edicao.status === 'processado'
                          ? 'bg-green-500/20 text-green-400'
                          : edicao.status === 'processando'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {edicao.status}
                    </span>
                  </div>
                </Link>
              ))}
              {(!data?.edicoes_recentes || data.edicoes_recentes.length === 0) && (
                <p className="py-8 text-center text-sm text-gray-500">
                  Nenhuma edição encontrada
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Volume Chart Placeholder */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Volume Mensal
            </h2>
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-700">
              <div className="text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-gray-600" />
                <p className="mt-2 text-xs text-gray-500">
                  Gráfico de volume
                </p>
              </div>
            </div>
          </div>

          {/* Top Temas */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Principais Temas
            </h2>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-6 animate-pulse rounded bg-gray-800" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(data?.top_temas ?? []).slice(0, 7).map((tema, idx) => (
                  <div key={tema.tema} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">
                        {idx + 1}.
                      </span>
                      <span className="text-sm text-gray-300">{tema.tema}</span>
                    </div>
                    <span className="text-xs font-medium text-gray-500">
                      {tema.count.toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
                {(!data?.top_temas || data.top_temas.length === 0) && (
                  <p className="text-center text-sm text-gray-500">
                    Nenhum tema encontrado
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
