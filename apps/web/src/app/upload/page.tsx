'use client';

import { FileUpload } from '@/components/file-upload';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload de Diários</h1>
        <p className="mt-1 text-gray-400">
          Envie arquivos PDF de diários oficiais para análise direta via IA
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <FileUpload />
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Como funciona
        </h2>
        <div className="space-y-3 text-sm text-gray-400">
          <p>
            O PDF é enviado diretamente para a API da Anthropic (Claude) que
            realiza toda a análise em uma única etapa:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>
              <strong className="text-gray-300">Leitura do PDF</strong> - Claude
              lê o documento inteiro nativamente
            </li>
            <li>
              <strong className="text-gray-300">Extração de atos</strong> - Cada
              ato normativo é identificado e separado
            </li>
            <li>
              <strong className="text-gray-300">Classificação e resumo</strong>{' '}
              - Tipo, órgão, tema e resumo executivo de cada ato
            </li>
            <li>
              <strong className="text-gray-300">Extração de entidades</strong>{' '}
              - Pessoas, órgãos, valores e datas relevantes
            </li>
          </ol>
          <p className="mt-4 text-gray-500">
            Formatos aceitos: PDF. Tamanho máximo: 50 MB. O processamento
            pode levar de 30 segundos a alguns minutos dependendo do tamanho.
          </p>
        </div>
      </div>
    </div>
  );
}
