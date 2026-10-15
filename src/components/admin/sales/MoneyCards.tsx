"use client";

import { Banknote, CheckCircle2, DoorOpen, Globe } from 'lucide-react';
import { formatCOP, ticketsLabel, type Summary } from '@/lib/sales-view';

/**
 * El dinero del evento, SEPARADO: lo que ya llegó pagado (online), el efectivo que los promotores aún deben entregar,
 * el efectivo que ya entregaron y lo de la taquilla en puerta. Nada se mezcla con otra cosa.
 */
export default function MoneyCards({
  summary,
  walkInTotal,
  walkInCount,
  scanned,
}: {
  summary: Summary;
  walkInTotal: number;
  walkInCount: number;
  scanned: number;
}) {
  const grandTotal = summary.all.amount + walkInTotal;
  const owes = summary.cash_pending.amount > 0;

  const card = 'rounded-2xl bg-zinc-950 border border-zinc-900 p-4 sm:p-5 min-w-0';
  const label = 'flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2';
  const amount = 'text-xl sm:text-2xl font-black tracking-tight text-white whitespace-nowrap';
  const sub = 'mt-1 text-[11px] font-bold text-zinc-500';

  return (
    <section aria-label="Dinero del evento" className="mb-8">
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <div className={`${card} border-t-2 border-t-blue-500`}>
          <p className={`${label} text-blue-400`}>
            <Globe className="w-4 h-4 shrink-0" /> Online
          </p>
          <p className={amount}>{formatCOP(summary.online.amount)}</p>
          <p className={sub}>
            Ya pagado · {summary.online.orders} {summary.online.orders === 1 ? 'venta' : 'ventas'}
          </p>
        </div>

        <div className={`${card} border-t-2 border-t-orange-500 ${owes ? 'ring-1 ring-orange-500/40 bg-orange-500/5' : ''}`}>
          <p className={`${label} text-orange-400`}>
            <Banknote className="w-4 h-4 shrink-0" /> Por cobrar
          </p>
          <p className={amount}>{formatCOP(summary.cash_pending.amount)}</p>
          <p className={sub}>
            {owes
              ? `Efectivo en manos de promotores · ${summary.cash_pending.orders} ${summary.cash_pending.orders === 1 ? 'venta' : 'ventas'}`
              : 'Todo el efectivo está al día'}
          </p>
        </div>

        <div className={`${card} border-t-2 border-t-green-500`}>
          <p className={`${label} text-green-400`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Liquidado
          </p>
          <p className={amount}>{formatCOP(summary.cash_settled.amount)}</p>
          <p className={sub}>
            Efectivo ya entregado · {summary.cash_settled.orders} {summary.cash_settled.orders === 1 ? 'venta' : 'ventas'}
          </p>
        </div>

        <div className={`${card} border-t-2 border-t-cyan-400`}>
          <p className={`${label} text-cyan-300`}>
            <DoorOpen className="w-4 h-4 shrink-0" /> Taquilla
          </p>
          <p className={amount}>{formatCOP(walkInTotal)}</p>
          <p className={sub}>Venta en puerta · {walkInCount} {walkInCount === 1 ? 'asistente' : 'asistentes'}</p>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 rounded-2xl bg-zinc-950/60 border border-zinc-900 px-4 py-3">
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total vendido</dt>
          <dd className="text-sm font-black text-white">{formatCOP(grandTotal)}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entradas</dt>
          <dd className="text-sm font-black text-white">{summary.all.tickets}</dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Escaneadas</dt>
          <dd className="text-sm font-black text-white">
            {scanned} <span className="text-zinc-500">/ {summary.all.tickets}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Gratis</dt>
          <dd className="text-sm font-black text-white">{summary.free.tickets > 0 ? ticketsLabel(summary.free.tickets) : '—'}</dd>
        </div>
      </dl>
    </section>
  );
}
