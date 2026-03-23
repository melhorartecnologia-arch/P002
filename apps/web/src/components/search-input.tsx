'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
}

export function SearchInput({
  placeholder = 'Buscar...',
  value: externalValue,
  onSearch,
  debounceMs = 300,
  className = '',
}: SearchInputProps) {
  const [query, setQuery] = useState(externalValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (externalValue !== undefined) {
      setQuery(externalValue);
    }
  }, [externalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(val);
    }, debounceMs);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timerRef.current) clearTimeout(timerRef.current);
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pl-12 pr-4 text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />
    </form>
  );
}
