"use client";
import { formatCOP } from '@/lib/sales-view';
import { balanceInfo } from '@/lib/artists';

const TONE_CLS = { owed: 'text-orange-400', clear: 'text-neon-green', over: 'text-yellow-400' } as const;

/** Resumen en una sola franja delgada: cachets, pagado y saldo (en vez de tres tarjetas grandes). */
/** Saldo en dos líneas pequeñas para el borde derecho de una fila: etiqueta arriba, monto abajo. */
export function BalanceChip({ pending }: { pending: number }) {
  const b = balanceInfo(pending);
  return (
    <span className="block text-right leading-tight shrink-0">
      <span className={`block text-[9px] font-black uppercase tracking-widest opacity-80 ${TONE_CLS[b.tone]}`}>{b.label}</span>
      <span className={`block text-xs font-black ${TONE_CLS[b.tone]}`}>{formatCOP(b.tone === 'clear' ? 0 : b.amount)}</span>
    </span>
  );
}

export default function StatStrip({ fee, paid, pending, paidLabel = 'Pagado' }: { fee: number; paid: number; pending: number; paidLabel?: string }) {
  const b = balanceInfo(pending);
  const cell = 'px-2.5 sm:px-3 py-2.5 min-w-0';
  const label = 'text-[9px] font-black uppercase tracking-widest text-zinc-500 truncate';
  return (
    <div className="grid grid-cols-3 divide-x divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
      <div className={cell}>
        <p className={label}>Cachets</p>
        <p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{formatCOP(fee)}</p>
      </div>
      <div className={cell}>
        <p className={label}>{paidLabel}</p>
        <p className="text-[13px] sm:text-sm font-black text-neon-green whitespace-nowrap">{formatCOP(paid)}</p>
      </div>
      <div className={cell}>
        <p className={label}>{b.label}</p>
        <p className={`text-[13px] sm:text-sm font-black whitespace-nowrap ${TONE_CLS[b.tone]}`}>{b.tone === 'clear' ? formatCOP(0) : formatCOP(b.amount)}</p>
      </div>
    </div>
  );
}
