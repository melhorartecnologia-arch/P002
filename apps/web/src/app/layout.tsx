import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/sidebar';

export const metadata: Metadata = {
  title: 'DORA - Diários Oficiais',
  description: 'Plataforma de busca e análise de diários oficiais brasileiros',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
