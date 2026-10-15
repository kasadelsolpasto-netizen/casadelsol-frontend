"use client";

import { useEffect, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Confirmación antes de una acción que mueve plata o borra algo. En el celular sube desde abajo (cómodo para el pulgar);
 * en pantalla grande sale centrada. Mientras `busy` no se puede cerrar para no dejar la acción a medias en pantalla.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  tone = 'primary',
  busy = false,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  busy?: boolean;
  /** Deja el botón de confirmar apagado (por ejemplo hasta que escriban el nombre del evento). */
  confirmDisabled?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;
  const confirmCls =
    tone === 'danger'
      ? 'bg-red-500 hover:bg-red-500/90 text-white'
      : 'bg-neon-green hover:bg-neon-green/90 text-black';
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full sm:max-w-md bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl">
        <h3 className="text-lg font-black uppercase text-white mb-3">{title}</h3>
        <div className="text-sm font-bold text-zinc-300 space-y-2">{children}</div>
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-12 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:border-zinc-600 disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className={`h-12 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 ${confirmCls}`}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
