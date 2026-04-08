'use client';

import { useState } from 'react';
import { useAnalytics } from '@/lib/hooks';
import { askQuestion, type ChatMessage } from '@/lib/api';
import { Send, BarChart3, TrendingUp, MessageCircle, Bot, User } from 'lucide-react';

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || asking) return;

    const question = input.trim();
    setInput('');

    const userMessage: ChatMessage = { role: 'user', content: question };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setAsking(true);

    try {
      const res = await askQuestion(question, updatedMessages);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente.',
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Análises</h1>
        <p className="mt-1 text-gray-400">
          Explore dados e faça perguntas sobre os diários oficiais
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Q&A Chat */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 flex flex-col" style={{ minHeight: '500px' }}>
          <div className="flex items-center gap-2 border-b border-gray-800 px-5 py-4">
            <MessageCircle className="h-5 w-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              Perguntar sobre os dados
            </h2>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.length === 0 && (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <Bot className="mx-auto h-10 w-10 text-gray-600" />
                  <p className="mt-3 text-sm text-gray-500">
                    Faça perguntas em linguagem natural sobre os diários oficiais.
                  </p>
                  <div className="mt-4 space-y-2">
                    {[
                      'Quantos decretos foram publicados este mês?',
                      'Quais os principais temas de licitação?',
                      'Resumo das portarias do Ministério da Saúde',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="block w-full rounded-lg border border-gray-700 px-3 py-2 text-left text-xs text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-300"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
                    <Bot className="h-4 w-4 text-blue-400" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700">
                    <User className="h-4 w-4 text-gray-300" />
                  </div>
                )}
              </div>
            ))}

            {asking && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600/20">
                  <Bot className="h-4 w-4 text-blue-400" />
                </div>
                <div className="rounded-xl bg-gray-800 px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-gray-500" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={handleAsk}
            className="border-t border-gray-800 p-4"
          >
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Faça uma pergunta..."
                disabled={asking}
                className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-500 outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || asking}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>

        {/* Charts Column */}
        <div className="space-y-6">
          {/* Volume Chart */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">
                Volume Mensal de Publicações
              </h2>
            </div>

            {isLoading ? (
              <div className="h-48 animate-pulse rounded-lg bg-gray-800" />
            ) : (
              <div className="space-y-2">
                {(analytics?.volume_mensal ?? []).slice(-12).map((item) => {
                  const max = Math.max(
                    ...(analytics?.volume_mensal ?? []).map((v) => v.count),
                    1
                  );
                  const pct = (item.count / max) * 100;
                  return (
                    <div key={item.mes} className="flex items-center gap-3">
                      <span className="w-16 text-xs text-gray-500">
                        {item.mes}
                      </span>
                      <div className="flex-1 h-5 rounded bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded bg-blue-600 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right text-xs text-gray-400">
                        {item.count.toLocaleString('pt-BR')}
                      </span>
                    </div>
                  );
                })}
                {(!analytics?.volume_mensal || analytics.volume_mensal.length === 0) && (
                  <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-700">
                    <p className="text-sm text-gray-500">
                      Dados não disponíveis
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Trends */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">
                Tendências por Tema
              </h2>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-gray-800" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(analytics?.tendencias ?? []).map((item) => (
                  <div
                    key={item.tema}
                    className="flex items-center justify-between rounded-lg bg-gray-800/50 px-4 py-2.5"
                  >
                    <span className="text-sm text-gray-300">{item.tema}</span>
                    <span
                      className={`text-sm font-medium ${
                        item.variacao >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {item.variacao >= 0 ? '+' : ''}
                      {item.variacao}%
                    </span>
                  </div>
                ))}
                {(!analytics?.tendencias || analytics.tendencias.length === 0) && (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-700">
                    <p className="text-sm text-gray-500">
                      Dados não disponíveis
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparative Analysis */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-semibold text-white">
              Análise Comparativa
            </h2>
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-gray-700">
              <div className="text-center">
                <BarChart3 className="mx-auto h-8 w-8 text-gray-600" />
                <p className="mt-2 text-xs text-gray-500">
                  Compare períodos, esferas e temas
                </p>
                <p className="mt-1 text-xs text-gray-600">Em breve</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
