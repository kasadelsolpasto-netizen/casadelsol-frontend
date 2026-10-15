"use client";

import { Banknote, CheckCircle2, ChevronRight } from 'lucide-react';
import { formatCOP, type Summary } from '@/lib/sales-view';

/**
 * Lo primero que ve el promotor: cuánto efectivo debe entregar (grande y en naranja), o que está al día.
 * Debajo, tres cifras cortas: lo que ya entregó, lo online (ya pagado, no se entrega) y las entradas gratis.
 */
export default function PromoterSummary({ totals, onShowPending }: { totals: Summary | null; onShowPending: () => void }) {
  if (!totals) {
    return <div className="h-[156px] rounded-3xl bg-zinc-950 border border-zinc-900 animate-pulse" aria-hidden />;
  }
  const owes = totals.cash_pending.amount > 0;
  const n = totals.cash_pending.orders;

  const mini = 'rounded-2xl bg-zinc-950 border border-zinc-900 px-3 py-3 min-w-0';
  const miniLabel = 'text-[10px] font-black uppercase tracking-widest text-zinc-500 truncate';
  const miniValue = 'mt-0.5 text-sm sm:text-base font-black text-white whitespace-nowrap';

  return (
    <section aria-label="Resumen de tus ventas" className="space-y-2">
      {owes ? (
        <button
          type="button"
          onClick={onShowPending}
          className="w-full text-left rounded-3xl border border-orange-500/40 bg-orange-500/5 p-5 hover:bg-orange-500/10 transition-colors"
        >
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-400">
            <Banknote className="w-4 h-4" /> Por entregar
          </p>
          <p className="mt-1 text-4xl font-black tracking-tight text-orange-400 whitespace-nowrap">{formatCOP(totals.cash_pending.amount)}</p>
          <p className="mt-1 flex items-center justify-between gap-2 text-xs font-bold text-zinc-400">
            <span>
              Efectivo de {n} {n === 1 ? 'venta' : 'ventas'} que aún no le has entregado al administrador
            </span>
            <span className="shrink-0 inline-flex items-center text-orange-400 text-[11px] font-black uppercase tracking-widest">
              Ver <ChevronRight className="w-4 h-4" />
            </span>
          </p>
        </button>
      ) : (
        <div className="rounded-3xl border border-green-500/30 bg-green-500/5 p-5">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-400">
            <CheckCircle2 className="w-4 h-4" /> Estás al día
          </p>
          <p className="mt-1 text-3xl font-black tracking-tight text-white">$ 0</p>
          <p className="mt-1 text-xs font-bold text-zinc-400">No tienes efectivo pendiente por entregar.</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className={mini}>
          <p className={miniLabel}>Entregado</p>
          <p className={miniValue}>{formatCOP(totals.cash_settled.amount)}</p>
        </div>
        <div className={mini}>
          <p className={miniLabel}>Online</p>
          <p className={miniValue}>{formatCOP(totals.online.amount)}</p>
          <p className="text-[10px] font-bold text-zinc-600">ya pagado</p>
        </div>
        <div className={mini}>
          <p className={miniLabel}>Gratis</p>
          <p className={miniValue}>
            {totals.free.tickets} <span className="text-[10px] font-bold text-zinc-600">{totals.free.tickets === 1 ? 'entrada' : 'entradas'}</span>
          </p>
        </div>
      </div>
    </section>
  );
}
