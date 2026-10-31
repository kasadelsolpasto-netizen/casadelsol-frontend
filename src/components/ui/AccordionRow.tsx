"use client";
import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Fila de lista que se abre y se cierra. Cerrada solo muestra lo necesario (una línea o dos); al tocarla muestra
 * el detalle y las opciones. Se usa dentro de un <ul>. La fila entera es el botón (cómoda para el pulgar).
 */
export default function AccordionRow({
  id,
  open,
  onToggle,
  header,
  children,
}: {
  id: string;
  open: boolean;
  onToggle: () => void;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={`rounded-xl border bg-zinc-950 overflow-hidden transition-colors ${open ? 'border-zinc-600' : 'border-zinc-800'}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        onClick={onToggle}
        className="w-full min-h-[52px] px-3 py-2 flex items-center gap-3 text-left hover:bg-zinc-900/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-neon-purple"
      >
        <div className="min-w-0 flex-1">{header}</div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={`${id}-panel`} className="px-3 pb-3 pt-3 border-t border-zinc-800">
          {children}
        </div>
      )}
    </li>
  );
}
