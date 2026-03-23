'use client';

import { useState } from 'react';
import { useEdicoes } from '@/lib/hooks';
import { Pagination } from '@/components/pagination';
import Link from 'next/link';
import { FileText, Calendar } from 'lucide-react';

export default function EdicoesPage() {
  const [page, setPage] = useState(1);
  const [esfera, setEsfera] = useState('');
  const [uf, setUf] = useState('');

  const { data, isLoading } = useEdicoes({
    page,
    per_page: 20,
    esfera: esfera || undefined,
    uf: uf || undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Edições</h1>
        <p className="mt-1 text-gray-400">
          Navegue pelas edições de diários oficiais
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={esfera}
          onChange={(e) => {
            setEsfera(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
        >
          <option value="">Todas as esferas</option>
          <option value="federal">Federal</option>
          <option value="estadual">Estadual</option>
          <option value="municipal">Municipal</option>
        </select>

        <select
          value={uf}
          onChange={(e) => {
            setUf(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500"
        >
          <option value="">Todos os estados</option>
          {[
            'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
            'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
          ].map((u) => (
            <option key={u} value={u}>{u}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-800">
        <table className="w-full">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fonte
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Esfera
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                UF
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Atos
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-gray-900/50">
            {isLoading &&
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 animate-pulse rounded bg-gray-800" />
                    </td>
                  ))}
                </tr>
              ))}

            {!isLoading &&
              data?.items.map((edicao) => (
                <tr
                  key={edicao.id}
                  className="transition-colors hover:bg-gray-800/50"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/edicoes/${edicao.id}`}
                      className="flex items-center gap-2 text-sm font-medium text-blue-400 hover:text-blue-300"
                    >
                      <FileText className="h-4 w-4" />
                      {edicao.fonte}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-300 capitalize">
                    {edicao.esfera}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-300">
                    {edicao.uf ?? '-'}
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-sm text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(edicao.data_publicacao).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-300">
                    {edicao.total_atos}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        edicao.status === 'processado'
                          ? 'bg-green-500/20 text-green-400'
                          : edicao.status === 'processando'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : edicao.status === 'erro'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {edicao.status}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        {!isLoading && (!data?.items || data.items.length === 0) && (
          <div className="flex h-48 items-center justify-center bg-gray-900/50">
            <p className="text-gray-500">Nenhuma edição encontrada</p>
          </div>
        )}
      </div>

      {data && data.total_pages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={data.total_pages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
