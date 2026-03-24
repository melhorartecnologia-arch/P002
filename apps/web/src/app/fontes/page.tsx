'use client';

import { useState } from 'react';
import { useFontes } from '@/lib/hooks';
import { createFonte, updateFonte, deleteFonte, type CreateFonteData, type Fonte } from '@/lib/api';
import {
  Database,
  Plus,
  X,
  Edit2,
  Trash2,
  Globe,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const UF_OPTIONS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
];

const initialForm: CreateFonteData = {
  nome: '',
  esfera: 'FEDERAL',
  uf: undefined,
  urlBase: '',
  spiderType: 'CHEERIO',
  cronExpression: '0 6 * * 1-5',
};

export default function FontesPage() {
  const { data: fontes, isLoading, mutate } = useFontes();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateFonteData>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setForm(initialForm);
    setShowForm(true);
  };

  const openEdit = (fonte: Fonte) => {
    setEditingId(fonte.id);
    setForm({
      nome: fonte.nome,
      esfera: fonte.esfera,
      uf: fonte.uf,
      urlBase: fonte.urlBase,
      spiderType: fonte.spiderType ?? 'CHEERIO',
      cronExpression: fonte.cronExpression ?? '0 6 * * 1-5',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = {
        ...form,
        uf: form.esfera !== 'FEDERAL' ? form.uf : undefined,
      };
      if (editingId) {
        await updateFonte(editingId, data);
      } else {
        await createFonte(data);
      }
      await mutate();
      closeForm();
    } catch (err) {
      console.error('Erro ao salvar fonte:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Desativar a fonte "${nome}"?`)) return;
    try {
      await deleteFonte(id);
      await mutate();
    } catch (err) {
      console.error('Erro ao desativar fonte:', err);
    }
  };

  const esferaLabel = (esfera: string) => {
    switch (esfera) {
      case 'FEDERAL': return 'Federal';
      case 'ESTADUAL': return 'Estadual';
      case 'MUNICIPAL': return 'Municipal';
      default: return esfera;
    }
  };

  const esferaColor = (esfera: string) => {
    switch (esfera) {
      case 'FEDERAL': return 'bg-purple-600/20 text-purple-400';
      case 'ESTADUAL': return 'bg-blue-600/20 text-blue-400';
      case 'MUNICIPAL': return 'bg-green-600/20 text-green-400';
      default: return 'bg-gray-600/20 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fontes</h1>
          <p className="mt-1 text-gray-400">
            Gerencie as fontes de diários oficiais
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openCreate}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancelar' : 'Nova Fonte'}
        </button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">
            {editingId ? 'Editar Fonte' : 'Cadastrar Nova Fonte'}
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Nome da Fonte
              </label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Diário Oficial da União"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Esfera
              </label>
              <select
                value={form.esfera}
                onChange={(e) =>
                  setForm({ ...form, esfera: e.target.value, uf: e.target.value === 'FEDERAL' ? undefined : form.uf })
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="FEDERAL">Federal</option>
                <option value="ESTADUAL">Estadual</option>
                <option value="MUNICIPAL">Municipal</option>
              </select>
            </div>

            {form.esfera !== 'FEDERAL' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">
                  UF
                </label>
                <select
                  value={form.uf ?? ''}
                  onChange={(e) => setForm({ ...form, uf: e.target.value || undefined })}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {UF_OPTIONS.map((uf) => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={form.esfera === 'FEDERAL' ? 'sm:col-span-1' : ''}>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                URL Base
              </label>
              <input
                type="url"
                required
                value={form.urlBase}
                onChange={(e) => setForm({ ...form, urlBase: e.target.value })}
                placeholder="https://www.in.gov.br"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Tipo de Spider
              </label>
              <select
                value={form.spiderType}
                onChange={(e) => setForm({ ...form, spiderType: e.target.value })}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="CHEERIO">Cheerio (HTML estático)</option>
                <option value="PLAYWRIGHT">Playwright (SPA / JS)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Cron (agendamento)
              </label>
              <input
                type="text"
                value={form.cronExpression}
                onChange={(e) => setForm({ ...form, cronExpression: e.target.value })}
                placeholder="0 6 * * 1-5"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Padrão: 06:00 de segunda a sexta
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar Fonte'}
            </button>
          </div>
        </form>
      )}

      {/* Fontes List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-900" />
            ))}
          </div>
        )}

        {!isLoading && fontes?.map((fonte) => (
          <div
            key={fonte.id}
            className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-600/20 p-2.5 text-blue-400">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-200">
                  {fonte.nome}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${esferaColor(fonte.esfera)}`}>
                    <Globe className="h-3 w-3" />
                    {esferaLabel(fonte.esfera)}
                  </span>
                  {fonte.uf && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                      <MapPin className="h-3 w-3" />
                      {fonte.uf}
                    </span>
                  )}
                  {fonte.cronExpression && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {fonte.cronExpression}
                    </span>
                  )}
                  {fonte.totalEdicoes !== undefined && (
                    <span className="text-xs text-gray-500">
                      {fonte.totalEdicoes} edições
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 text-xs ${fonte.ativo ? 'text-green-400' : 'text-red-400'}`}>
                    {fonte.ativo ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {fonte.ativo ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openEdit(fonte)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
                title="Editar"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(fonte.id, fonte.nome)}
                className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-800 hover:text-red-400"
                title="Desativar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {!isLoading && (!fontes || fontes.length === 0) && !showForm && (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-700">
            <Database className="mb-3 h-8 w-8 text-gray-600" />
            <p className="text-gray-500">Nenhuma fonte cadastrada</p>
            <button
              onClick={openCreate}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Cadastrar primeira fonte
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
