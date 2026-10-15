"use client";

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { rangeLabel, type Pagination } from '@/lib/sales-view';

/** Paginación simple y cómoda en el celular: Anterior · Página X de Y · Siguiente (botones de 44 px). */
export default function Pager({ p, onPage, busy }: { p: Pagination | null | undefined; onPage: (page: number) => void; busy?: boolean }) {
  if (!p || p.total === 0) return null;
  const btn =
    'h-11 min-w-[44px] px-3 sm:px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1 transition-colors hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-zinc-800';
  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-3 pt-4">
      <button type="button" className={btn} disabled={busy || p.page <= 1} onClick={() => onPage(p.page - 1)} aria-label="Página anterior">
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Anterior</span>
      </button>
      <div className="text-center min-w-0">
        <p className="text-xs font-black text-white">
          Página {p.page} de {p.totalPages}
        </p>
        <p className="text-[11px] font-bold text-zinc-500">{rangeLabel(p)}</p>
      </div>
      <button type="button" className={btn} disabled={busy || p.page >= p.totalPages} onClick={() => onPage(p.page + 1)} aria-label="Página siguiente">
        <span className="hidden sm:inline">Siguiente</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
}
