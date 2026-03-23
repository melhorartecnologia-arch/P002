'use client';

import { use } from 'react';
import useSWR from 'swr';
import { getEdicao } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, FileText, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export default function EdicaoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useSWR(`edicao-${id}`, () => getEdicao(id));

  const statusConfig = {
    processado: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Processado' },
    processando: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Processando' },
    erro: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Erro' },
    pendente: { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-700', label: 'Pendente' },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-800" />
        <div className="h-32 animate-pulse rounded-xl bg-gray-900" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-900" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Edição não encontrada</p>
      </div>
    );
  }

  const status = statusConfig[data.status as keyof typeof statusConfig] ?? statusConfig.pendente;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/edicoes"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{data.fonte}</h1>
          <p className="mt-1 text-gray-400">
            Detalhes da edição
          </p>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <span className="text-xs font-medium text-gray-500">Data de Publicação</span>
          <div className="mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-200">
              {new Date(data.data_publicacao).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <span className="text-xs font-medium text-gray-500">Esfera</span>
          <p className="mt-1 text-sm font-medium capitalize text-gray-200">
            {data.esfera}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <span className="text-xs font-medium text-gray-500">Total de Atos</span>
          <p className="mt-1 text-sm font-medium text-gray-200">
            {data.total_atos}
          </p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <span className="text-xs font-medium text-gray-500">Status</span>
          <div className="mt-1 flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${status.color}`} />
            <span className={`text-sm font-medium ${status.color}`}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Acts List */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Atos ({data.atos?.length ?? 0})
        </h2>

        {data.atos && data.atos.length > 0 ? (
          <div className="space-y-3">
            {data.atos.map((ato) => (
              <Link
                key={ato.id}
                href={`/atos/${ato.id}`}
                className="block rounded-lg border border-gray-800 p-4 transition-colors hover:border-gray-700 hover:bg-gray-800/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-400" />
                    <span className="text-sm font-semibold text-blue-400">
                      {ato.tipo}
                    </span>
                    <span className="text-xs text-gray-500">{ato.orgao}</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-300 line-clamp-2">
                  {ato.ementa}
                </p>
                {ato.temas.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ato.temas.map((tema) => (
                      <span
                        key={tema}
                        className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                      >
                        {tema}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-gray-500">
            Nenhum ato encontrado nesta edição
          </p>
        )}
      </div>
    </div>
  );
}
