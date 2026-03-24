'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { uploadPdf, getFontes, type Fonte } from '@/lib/api';

interface UploadedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}

export function FileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [selectedFonteId, setSelectedFonteId] = useState<string>('');
  const [loadingFontes, setLoadingFontes] = useState(true);

  useEffect(() => {
    getFontes()
      .then((res) => {
        setFontes(res.data);
        if (res.data.length > 0) {
          setSelectedFonteId(res.data[0].id);
        }
      })
      .catch(() => {
        // Fontes may fail if API is down
      })
      .finally(() => setLoadingFontes(false));
  }, []);

  const updateFile = (id: string, updates: Partial<UploadedFile>) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const processUpload = async (uploadFile: UploadedFile) => {
    if (!selectedFonteId) {
      updateFile(uploadFile.id, {
        status: 'error',
        error: 'Selecione uma fonte antes de enviar',
      });
      return;
    }

    updateFile(uploadFile.id, { status: 'uploading', progress: 0 });

    try {
      updateFile(uploadFile.id, { progress: 30 });
      await uploadPdf(uploadFile.file, { fonteId: selectedFonteId });
      updateFile(uploadFile.id, { status: 'processing', progress: 70 });

      setTimeout(() => {
        updateFile(uploadFile.id, { status: 'done', progress: 100 });
      }, 2000);
    } catch (err) {
      updateFile(uploadFile.id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Erro ao enviar arquivo',
      });
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        progress: 0,
        status: 'pending' as const,
      }));

      setFiles((prev) => [...prev, ...newFiles]);
      newFiles.forEach(processUpload);
    },
    [selectedFonteId],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const statusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-400" />;
      case 'done':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-400" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const statusLabel = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
        return 'Enviando...';
      case 'processing':
        return 'Processando...';
      case 'done':
        return 'Concluído';
      case 'error':
        return 'Erro';
      default:
        return 'Pendente';
    }
  };

  return (
    <div className="space-y-6">
      {/* Fonte selector */}
      <div>
        <label
          htmlFor="fonte-select"
          className="mb-2 block text-sm font-medium text-gray-300"
        >
          Fonte (Diário Oficial)
        </label>
        {loadingFontes ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando fontes...
          </div>
        ) : fontes.length === 0 ? (
          <p className="text-sm text-yellow-400">
            Nenhuma fonte cadastrada. Cadastre uma fonte antes de fazer upload.
          </p>
        ) : (
          <select
            id="fonte-select"
            value={selectedFonteId}
            onChange={(e) => setSelectedFonteId(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {fontes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome} ({f.esfera}{f.uf ? ` - ${f.uf}` : ''})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 bg-gray-900 hover:border-gray-600'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mb-4 h-12 w-12 text-gray-500" />
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-400">
            Solte os arquivos aqui...
          </p>
        ) : (
          <>
            <p className="text-lg font-medium text-gray-300">
              Arraste e solte arquivos PDF aqui
            </p>
            <p className="mt-2 text-sm text-gray-500">
              ou clique para selecionar arquivos
            </p>
          </>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-400">
            Arquivos ({files.length})
          </h3>
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-4 rounded-lg border border-gray-800 bg-gray-900 p-4"
            >
              {statusIcon(f.status)}
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-gray-200">
                  {f.file.name}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        f.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {statusLabel(f.status)}
                  </span>
                </div>
                {f.error && (
                  <p className="mt-1 text-xs text-red-400">{f.error}</p>
                )}
              </div>
              <button
                onClick={() => removeFile(f.id)}
                className="text-gray-500 hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
