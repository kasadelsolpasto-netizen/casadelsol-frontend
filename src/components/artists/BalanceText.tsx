"use client";
import { formatCOP } from '@/lib/sales-view';
import { balanceInfo } from '@/lib/artists';

const TONE_CLS = {
  owed: 'text-orange-400',
  clear: 'text-neon-green',
  over: 'text-yellow-400',
} as const;

/** "Se le debe $X" (naranja), "Al día" (verde) o "Pagado de más $X" (amarillo). */
export default function BalanceText({ pending, className = '' }: { pending: number; className?: string }) {
  const b = balanceInfo(pending);
  return (
    <span className={`${TONE_CLS[b.tone]} ${className}`}>
      {b.label}
      {b.tone !== 'clear' && <> {formatCOP(b.amount)}</>}
    </span>
  );
}