'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages: (number | '...')[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} className="px-2 text-gray-600">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`min-w-[36px] rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              page === currentPage
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:opacity-40 disabled:pointer-events-none"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
