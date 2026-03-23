'use client';

import { FileUpload } from '@/components/file-upload';

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Upload de Diários</h1>
        <p className="mt-1 text-gray-400">
          Envie arquivos PDF de diários oficiais para processamento
        </p>
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <FileUpload />
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Informações sobre o processamento
        </h2>
        <div className="space-y-3 text-sm text-gray-400">
          <p>
            Após o upload, cada arquivo PDF passará pelas seguintes etapas:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li>
              <strong className="text-gray-300">Extração de texto</strong> - O conteúdo
              do PDF é extraído usando OCR quando necessário
            </li>
            <li>
              <strong className="text-gray-300">Segmentação</strong> - O texto é
              dividido em atos individuais
            </li>
            <li>
              <strong className="text-gray-300">Classificação</strong> - Cada ato é
              classificado por tipo e tema
            </li>
            <li>
              <strong className="text-gray-300">Extração de entidades</strong> - Nomes,
              órgãos, valores e datas são identificados
            </li>
            <li>
              <strong className="text-gray-300">Indexação</strong> - O conteúdo é
              indexado para busca textual e semântica
            </li>
          </ol>
          <p className="mt-4 text-gray-500">
            Formatos aceitos: PDF. Tamanho máximo por arquivo: 500 MB.
          </p>
        </div>
      </div>
    </div>
  );
}
