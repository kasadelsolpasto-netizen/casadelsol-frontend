"use client";

import { useEffect, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

/**
 * Formulario en ventana: en el celular sube desde abajo, en pantalla grande sale centrada. Mientras `busy` no se puede
 * cerrar (para no dejar un guardado a medias). Los errores del servidor salen dentro de la misma ventana.
 */
export default function FormModal({
  open,
  title,
  submitLabel,
  busy = false,
  hideCancel = false,
  error,
  onSubmit,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  busy?: boolean;
  /** Solo botón principal (pantallas informativas). */
  hideCancel?: boolean;
  error?: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  if (!open) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onSubmit();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={submit} className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl">
        <h3 className="text-lg font-black uppercase text-white mb-4">{title}</h3>
        <div className="space-y-4">{children}</div>
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
        )}
        <div className={`mt-6 grid gap-3 ${hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="h-12 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:border-zinc-600 disabled:opacity-40"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Etiqueta + campo con el estilo de los formularios del administrador. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] font-bold text-zinc-500">{hint}</p>}
    </div>
  );
}

export const inputCls =
  'w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm focus:border-neon-purple outline-none';