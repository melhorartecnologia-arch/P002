'use client';

import { useState } from 'react';
import { SearchInput } from '@/components/search-input';
import { Pagination } from '@/components/pagination';
import { useSearch } from '@/lib/hooks';
import Link from 'next/link';
import { FileText, Sparkles, TextSearch } from 'lucide-react';

const UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

export default function BuscaPage() {
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<'fulltext' | 'semantic'>('fulltext');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{
    esfera?: string;
    uf?: string;
    tipo?: string;
    orgao?: string;
    tema?: string;
    data_inicio?: string;
    data_fim?: string;
  }>({});

  const { data, isLoading } = useSearch(query, { ...filters, mode, page, per_page: 20 });

  const updateFilter = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || undefined }));
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Busca</h1>
        <p className="mt-1 text-gray-400">
          Pesquise em diários oficiais de todo o Brasil
        </p>
      </div>

      {/* Search bar and mode toggle */}
      <div className="flex gap-3">
        <SearchInput
          placeholder="Pesquisar atos, editais, decretos..."
          onSearch={(q) => {
            setQuery(q);
            setPage(1);
          }}
          className="flex-1"
        />
        <div className="flex rounded-xl border border-gray-700 bg-gray-800">
          <button
            onClick={() => setMode('fulltext')}
            className={`flex items-center gap-2 rounded-l-xl px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'fulltext'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <TextSearch className="h-4 w-4" />
            Texto
          </button>
          <button
            onClick={() => setMode('semantic')}
            className={`flex items-center gap-2 rounded-r-xl px-4 py-2 text-sm font-medium transition-colors ${
              mode === 'semantic'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Semântica
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Filters Sidebar */}
        <div className="w-64 shrink-0 space-y-5">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">Filtros</h3>

            {/* Esfera */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Esfera
              </label>
              <select
                value={filters.esfera ?? ''}
                onChange={(e) => updateFilter('esfera', e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="">Todas</option>
                <option value="federal">Federal</option>
                <option value="estadual">Estadual</option>
                <option value="municipal">Municipal</option>
              </select>
            </div>

            {/* UF */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                UF
              </label>
              <select
                value={filters.uf ?? ''}
                onChange={(e) => updateFilter('uf', e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="">Todas</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>

            {/* Tipo Ato */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Tipo de Ato
              </label>
              <select
                value={filters.tipo ?? ''}
                onChange={(e) => updateFilter('tipo', e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="">Todos</option>
                <option value="decreto">Decreto</option>
                <option value="portaria">Portaria</option>
                <option value="edital">Edital</option>
                <option value="lei">Lei</option>
                <option value="resolucao">Resolução</option>
                <option value="instrucao_normativa">Instrução Normativa</option>
                <option value="aviso">Aviso</option>
                <option value="contrato">Contrato</option>
              </select>
            </div>

            {/* Orgao */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Órgão
              </label>
              <input
                type="text"
                value={filters.orgao ?? ''}
                onChange={(e) => updateFilter('orgao', e.target.value)}
                placeholder="Nome do órgão"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Data Início
              </label>
              <input
                type="date"
                value={filters.data_inicio ?? ''}
                onChange={(e) => updateFilter('data_inicio', e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Data Fim
              </label>
              <input
                type="date"
                value={filters.data_fim ?? ''}
                onChange={(e) => updateFilter('data_fim', e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
              />
            </div>

            {/* Temas */}
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                Temas
              </label>
              <input
                type="text"
                value={filters.tema ?? ''}
                onChange={(e) => updateFilter('tema', e.target.value)}
                placeholder="Ex: licitação, saúde"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              className="w-full rounded-lg border border-gray-700 px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 space-y-4">
          {!query && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-700">
              <p className="text-gray-500">
                Digite sua busca para ver resultados
              </p>
            </div>
          )}

          {query && isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-900" />
              ))}
            </div>
          )}

          {query && !isLoading && data && (
            <>
              <p className="text-sm text-gray-400">
                {data.total.toLocaleString('pt-BR')} resultado(s) encontrado(s)
              </p>

              <div className="space-y-3">
                {data.items.map((ato) => (
                  <Link
                    key={ato.id}
                    href={`/atos/${ato.id}`}
                    className="block rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-semibold text-blue-400">
                          {ato.tipo}
                        </span>
                        <span className="text-xs text-gray-500">
                          {ato.orgao}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(ato.data_publicacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                      {ato.ementa}
                    </p>
                    {ato.temas.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {ato.temas.map((tema) => (
                          <span
                            key={tema}
                            className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400"
                          >
                            {tema}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>

              {data.total_pages > 1 && (
                <div className="pt-4">
                  <Pagination
                    currentPage={page}
                    totalPages={data.total_pages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}

          {query && !isLoading && data && data.items.length === 0 && (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-700">
              <p className="text-gray-500">
                Nenhum resultado encontrado para &ldquo;{query}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
