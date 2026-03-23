'use client';

import { useState } from 'react';
import { useAlertas } from '@/lib/hooks';
import { createAlerta, updateAlerta } from '@/lib/api';
import { Bell, Plus, X, Check, Mail, MessageSquare } from 'lucide-react';

interface AlertForm {
  nome: string;
  tipo: 'keyword' | 'entity' | 'topic' | 'semantic';
  consulta: string;
  canal: string;
  ativo: boolean;
}

const initialForm: AlertForm = {
  nome: '',
  tipo: 'keyword',
  consulta: '',
  canal: 'email',
  ativo: true,
};

export default function AlertasPage() {
  const { data: alertas, isLoading, mutate } = useAlertas();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AlertForm>(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createAlerta(form);
      await mutate();
      setForm(initialForm);
      setShowForm(false);
    } catch (err) {
      console.error('Erro ao criar alerta:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAlerta = async (id: string, ativo: boolean) => {
    try {
      await updateAlerta(id, { ativo: !ativo });
      await mutate();
    } catch (err) {
      console.error('Erro ao atualizar alerta:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Alertas</h1>
          <p className="mt-1 text-gray-400">
            Configure alertas para ser notificado sobre novos atos
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Cancelar' : 'Novo Alerta'}
        </button>
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-white">Criar Novo Alerta</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Nome do Alerta
              </label>
              <input
                type="text"
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Licitações de TI"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-400">
                Tipo
              </label>
              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo: e.target.value as AlertForm['tipo'],
                  })
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="keyword">Palavra-chave</option>
                <option value="entity">Entidade</option>
                <option value="topic">Tema</option>
                <option value="semantic">Semântico</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-400">
              Consulta
            </label>
            <input
              type="text"
              required
              value={form.consulta}
              onChange={(e) => setForm({ ...form, consulta: e.target.value })}
              placeholder={
                form.tipo === 'keyword'
                  ? 'Ex: licitação pregão eletrônico'
                  : form.tipo === 'entity'
                  ? 'Ex: Ministério da Saúde'
                  : form.tipo === 'topic'
                  ? 'Ex: saúde pública'
                  : 'Descreva o que deseja monitorar...'
              }
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              {form.tipo === 'semantic'
                ? 'Use linguagem natural para descrever o tipo de ato que deseja monitorar'
                : 'Separe múltiplos termos com espaço'}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-400">
              Canal de Notificação
            </label>
            <div className="flex gap-3">
              {[
                { value: 'email', label: 'E-mail', icon: Mail },
                { value: 'slack', label: 'Slack', icon: MessageSquare },
                { value: 'webhook', label: 'Webhook', icon: Bell },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, canal: value })}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                    form.canal === value
                      ? 'border-blue-500 bg-blue-600/20 text-blue-400'
                      : 'border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Criando...' : 'Criar Alerta'}
            </button>
          </div>
        </form>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-900" />
            ))}
          </div>
        )}

        {!isLoading &&
          alertas?.map((alerta) => (
            <div
              key={alerta.id}
              className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-lg p-2.5 ${
                    alerta.ativo
                      ? 'bg-blue-600/20 text-blue-400'
                      : 'bg-gray-800 text-gray-500'
                  }`}
                >
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-200">
                    {alerta.nome}
                  </h3>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="rounded-full bg-gray-800 px-2.5 py-0.5 text-xs text-gray-400">
                      {alerta.tipo === 'keyword'
                        ? 'Palavra-chave'
                        : alerta.tipo === 'entity'
                        ? 'Entidade'
                        : alerta.tipo === 'topic'
                        ? 'Tema'
                        : 'Semântico'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {alerta.consulta}
                    </span>
                    <span className="text-xs text-gray-600">
                      Canal: {alerta.canal}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => toggleAlerta(alerta.id, alerta.ativo)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  alerta.ativo ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    alerta.ativo ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          ))}

        {!isLoading && (!alertas || alertas.length === 0) && !showForm && (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-700">
            <Bell className="mb-3 h-8 w-8 text-gray-600" />
            <p className="text-gray-500">Nenhum alerta configurado</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Criar primeiro alerta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
