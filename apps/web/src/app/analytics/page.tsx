'use client';

import { useState } from 'react';
import { useAnalytics } from '@/lib/hooks';
import { MessageSquare, Send, BarChart3, TrendingUp, Building2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

export default function AnalyticsPage() {
  const { data: overview, isLoading } = useAnalytics();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isAsking) return;

    const question = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setIsAsking(true);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/analytics/ask`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        },
      );
      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Erro ao processar sua pergunta. Tente novamente.' },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Análises e Inteligência</h1>
        <p className="text-gray-400 mt-1">
          Pergunte em linguagem natural sobre o acervo de Diários Oficiais
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-gray-400">Total de Atos</h3>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? '...' : overview?.totalAtos?.toLocaleString('pt-BR') ?? '0'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="h-5 w-5 text-green-400" />
            <h3 className="text-sm font-medium text-gray-400">Edições Processadas</h3>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? '...' : overview?.totalEdicoes?.toLocaleString('pt-BR') ?? '0'}
          </p>
        </div>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-gray-400">Fontes Ativas</h3>
          </div>
          <p className="text-2xl font-bold text-white">
            {isLoading ? '...' : overview?.fontesAtivas ?? '0'}
          </p>
        </div>
      </div>

      {/* Q&A Chat */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[500px]">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Perguntas e Respostas (RAG + Claude AI)
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Faça uma pergunta sobre os Diários Oficiais</p>
              <div className="mt-4 space-y-2 text-sm">
                <p className="text-gray-600">Exemplos:</p>
                <button
                  onClick={() => setInput('Quais foram as maiores licitações publicadas este mês?')}
                  className="block mx-auto text-blue-400 hover:text-blue-300"
                >
                  &quot;Quais foram as maiores licitações publicadas este mês?&quot;
                </button>
                <button
                  onClick={() => setInput('Compare as políticas de saúde entre SP e RJ')}
                  className="block mx-auto text-blue-400 hover:text-blue-300"
                >
                  &quot;Compare as políticas de saúde entre SP e RJ&quot;
                </button>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-xs text-gray-400">Fontes:</p>
                    {msg.sources.map((src, j) => (
                      <p key={j} className="text-xs text-gray-500">{src}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isAsking && (
            <div className="flex justify-start">
              <div className="bg-gray-700 rounded-lg p-3 text-gray-400">
                Analisando...
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleAsk} className="p-4 border-t border-gray-700 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Faça uma pergunta sobre os Diários Oficiais..."
            className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
            disabled={isAsking}
          />
          <button
            type="submit"
            disabled={isAsking || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg transition"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
