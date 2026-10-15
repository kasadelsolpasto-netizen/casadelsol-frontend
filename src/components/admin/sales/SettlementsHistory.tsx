"use client";

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { apiFetch, withQuery } from '@/lib/kasa-api';
import { formatCOP, fullDateTime } from '@/lib/sales-view';
import Pager from '@/components/ui/Pager';

type Settlement = {
  id: string;
  created_at: string;
  amount: number;
  orders_count: number;
  promoter: { id: string; name: string | null; email: string | null };
  created_by: string | null;
};

const PAGE_SIZE = 10;

/** Historial de entregas de efectivo: quién entregó, cuánto, cuándo y quién lo registró. Cerrado por defecto. */
export default function SettlementsHistory({ eventId, refreshKey }: { eventId: string; refreshKey: number }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Settlement[] | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setError('');
    apiFetch<Settlement[]>(withQuery('/promoters/settlements', { eventId }))
      .then((d) => alive && setRows(Array.isArray(d) ? d : []))
      .catch((e) => alive && setError(e?.message || 'No se pudo cargar el historial.'));
    return () => {
      alive = false;
    };
  }, [open, eventId, refreshKey]);

  const list = rows ?? [];
  const total = list.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = list.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <section aria-label="Historial de liquidaciones" className="mb-10 rounded-2xl bg-zinc-950 border border-zinc-900 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 p-4 text-left hover:bg-zinc-900/40 transition-colors">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black uppercase tracking-widest text-white">Historial de liquidaciones</span>
          <span className="block text-[11px] font-bold text-zinc-500">
            {rows ? `${list.length} ${list.length === 1 ? 'entrega' : 'entregas'} · ${formatCOP(total)}` : 'Quién entregó efectivo y cuándo'}
          </span>
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-zinc-900 px-4 pb-4 pt-2">
          {error ? (
            <p className="py-6 text-center text-xs font-bold text-red-400">{error}</p>
          ) : rows === null ? (
            <p className="py-6 text-center text-xs font-bold text-zinc-500">Cargando…</p>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-xs font-bold text-zinc-500">Todavía no se ha liquidado efectivo en este evento.</p>
          ) : (
            <>
              <ul className="divide-y divide-zinc-900">
                {shown.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 min-h-[56px]">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white truncate">{r.promoter.name || r.promoter.email || 'Promotor'}</span>
                      <span className="block text-[11px] font-bold text-zinc-500 truncate">
                        {fullDateTime(r.created_at)}
                        {r.created_by ? ` · registró ${r.created_by}` : ''}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-black text-emerald-400">{formatCOP(r.amount)}</span>
                      <span className="block text-[10px] font-bold text-zinc-600">
                        {r.orders_count} {r.orders_count === 1 ? 'venta' : 'ventas'}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Pager p={{ page: current, pageSize: PAGE_SIZE, total: list.length, totalPages }} onPage={setPage} />
            </>
          )}
        </div>
      )}
    </section>
  );
}
