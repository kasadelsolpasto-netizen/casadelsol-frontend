"use client";

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatCOP } from '@/lib/sales-view';
import Pager from '@/components/ui/Pager';

type WalkIn = { id: string; name?: string | null; email?: string | null; cedula?: string | null; amount: number; created_at: string };

const PAGE_SIZE = 10;

/** Taquilla en puerta: cerrada por defecto (puede ser larga), con la lista de 10 en 10 al abrirla. */
export default function WalkInList({ walkIns }: { walkIns: WalkIn[] }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const total = walkIns.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(walkIns.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const rows = walkIns.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section aria-label="Taquilla en puerta" className="mb-10 rounded-2xl bg-zinc-950 border border-zinc-900 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-900/40 transition-colors">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black uppercase tracking-widest text-white">Taquilla en puerta</span>
          <span className="block text-[11px] font-bold text-zinc-500">
            {walkIns.length} {walkIns.length === 1 ? 'asistente' : 'asistentes'} · {formatCOP(total)}
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-zinc-900 px-4 pb-4 pt-2">
          {walkIns.length === 0 ? (
            <p className="py-6 text-center text-xs font-bold text-zinc-500">Sin registros de taquilla.</p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-900">
                {rows.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 min-h-[52px]">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white truncate">{s.name || <span className="italic text-zinc-500">Anónimo</span>}</span>
                      <span className="block text-[11px] font-bold text-zinc-500 truncate">
                        {s.cedula ? `CC ${s.cedula}` : 'Sin cédula'}
                        {s.email ? ` · ${s.email}` : ''}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-black text-cyan-300">{formatCOP(s.amount)}</span>
                      <span className="block text-[10px] font-bold text-zinc-600">
                        {new Date(s.created_at).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Pager p={{ page: current, pageSize: PAGE_SIZE, total: walkIns.length, totalPages }} onPage={setPage} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
