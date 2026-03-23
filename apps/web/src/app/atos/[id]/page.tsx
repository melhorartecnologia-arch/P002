'use client';

import { use } from 'react';
import useSWR from 'swr';
import { getAto } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, FileText, Building2, Tag, Users, Lightbulb } from 'lucide-react';

export default function AtoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading } = useSWR(`ato-${id}`, () => getAto(id));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-800" />
        <div className="h-40 animate-pulse rounded-xl bg-gray-900" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-900" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Ato não encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{data.tipo}</h1>
            <span className="rounded-full bg-blue-600/20 px-3 py-0.5 text-sm font-medium text-blue-400">
              {data.tipo}
            </span>
          </div>
          <p className="mt-1 text-gray-400">
            Publicado em {new Date(data.data_publicacao).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Metadata Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Building2 className="h-4 w-4" />
            <span className="text-xs font-medium">Órgão</span>
          </div>
          <p className="mt-1 text-sm font-medium text-gray-200">{data.orgao}</p>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Tag className="h-4 w-4" />
            <span className="text-xs font-medium">Temas</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {data.temas.length > 0 ? (
              data.temas.map((tema) => (
                <span
                  key={tema}
                  className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300"
                >
                  {tema}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="h-4 w-4" />
            <span className="text-xs font-medium">Entidades</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {data.entidades.length > 0 ? (
              data.entidades.map((ent) => (
                <span
                  key={ent}
                  className="rounded-full bg-purple-500/20 px-2 py-0.5 text-xs text-purple-300"
                >
                  {ent}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {data.resumo && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white">Resumo</h2>
          </div>
          <p className="text-sm leading-relaxed text-gray-300">{data.resumo}</p>
        </div>
      )}

      {/* Ementa */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Ementa</h2>
        <p className="text-sm leading-relaxed text-gray-300">{data.ementa}</p>
      </div>

      {/* Full Text */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-3 text-lg font-semibold text-white">Texto Completo</h2>
        <div className="max-h-[600px] overflow-y-auto rounded-lg bg-gray-950 p-5">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-300">
            {data.texto_completo}
          </pre>
        </div>
      </div>

      {/* Related Acts */}
      {data.relacionados && data.relacionados.length > 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Atos Relacionados
          </h2>
          <div className="space-y-3">
            {data.relacionados.map((rel) => (
              <Link
                key={rel.id}
                href={`/atos/${rel.id}`}
                className="block rounded-lg border border-gray-800 p-4 transition-colors hover:border-gray-700 hover:bg-gray-800/50"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400">
                    {rel.tipo}
                  </span>
                  <span className="text-xs text-gray-500">{rel.orgao}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {new Date(rel.data_publicacao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-400 line-clamp-1">
                  {rel.ementa}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
