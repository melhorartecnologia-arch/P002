'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  FileText,
  Upload,
  Bell,
  BarChart3,
  Settings,
  BookOpen,
  Database,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/busca', label: 'Busca', icon: Search },
  { href: '/edicoes', label: 'Edições', icon: FileText },
  { href: '/fontes', label: 'Fontes', icon: Database },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/alertas', label: 'Alertas', icon: Bell },
  { href: '/analytics', label: 'Análises', icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-gray-800 bg-gray-900">
      <div className="flex h-16 items-center gap-3 border-b border-gray-800 px-6">
        <BookOpen className="h-7 w-7 text-blue-500" />
        <span className="text-xl font-bold tracking-tight text-white">DORA</span>
      </div>

      <nav className="mt-4 flex flex-col gap-1 px-3">
        {navItems.map((item) => {
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute bottom-0 w-full border-t border-gray-800 p-3">
        <Link
          href="/configuracoes"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
        >
          <Settings className="h-5 w-5" />
          Configurações
        </Link>
      </div>
    </aside>
  );
}
