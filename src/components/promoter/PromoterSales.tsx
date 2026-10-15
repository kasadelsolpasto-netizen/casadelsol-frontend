"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2, MessageCircle, Search } from 'lucide-react';
import { apiFetch, withQuery } from '@/lib/kasa-api';
import {
  formatCOP,
  fullDateTime,
  kindBadge,
  kindLabel,
  ticketsLabel,
  timeAgo,
  type Pagination,
  type SaleKind,
  type Summary,
} from '@/lib/sales-view';
import { buildTicketsMessage, ticketUrl, whatsappLink } from '@/lib/whatsapp';
import Pager from '@/components/ui/Pager';

export type SalesFilter = 'ALL' | SaleKind;

const PAGE_SIZE = 10;

type Sale = {
  id: string;
  created_at: string;
  kind: SaleKind;
  total: number;
  tickets: number;
  event: { id: string; title: string; date: string } | null;
  buyer: { name: string | null; email: string | null };
  attendees: Array<{ name: string | null; used: boolean; token?: string }>;
};

/**
 * "Mis ventas": lo que el promotor vendió, en una lista corta de 10 en 10. Cada fila muestra solo quién, cuántas
 * entradas y cuánto; al tocarla se abre con el detalle (y, en las ventas en efectivo, reenviar las entradas por WhatsApp).
 */
export default function PromoterSales({
  totals,
  eventOptions,
  kind,
  onKindChange,
  refreshKey,
}: {
  totals: Summary | null;
  eventOptions: Array<{ id: string; title: string }>;
  kind: SalesFilter;
  onKindChange: (k: SalesFilter) => void;
  refreshKey: number;
}) {
  const [eventId, setEventId] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Sale[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const reqId = useRef(0);

  // La búsqueda espera a que termines de escribir (el servidor limita las consultas por minuto).
  useEffect(() => {
    const t = setTimeout(() => {
      setQ((cur) => {
        if (cur === qInput.trim()) return cur;
        setPage(1);
        return qInput.trim();
      });
    }, 450);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(
        withQuery('/promoters/me/sales', {
          page,
          pageSize: PAGE_SIZE,
          kind: kind === 'ALL' ? null : kind,
          eventId: eventId || null,
          q: q || null,
        }),
      );
      if (id !== reqId.current) return;
      setItems(data.items ?? []);
      setPagination(data.pagination ?? null);
    } catch (e: any) {
      if (id === reqId.current) setError(e?.message || 'No se pudieron cargar tus ventas.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [page, kind, eventId, q]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const chips: Array<{ key: SalesFilter; label: string; count: number | null }> = [
    { key: 'ALL', label: 'Todas', count: totals?.all.orders ?? null },
    { key: 'CASH_PENDING', label: 'Por entregar', count: totals?.cash_pending.orders ?? null },
    { key: 'CASH_SETTLED', label: 'Entregadas', count: totals?.cash_settled.orders ?? null },
    { key: 'ONLINE', label: 'Online', count: totals?.online.orders ?? null },
    { key: 'FREE', label: 'Gratis', count: totals?.free.orders ?? null },
  ];

  const filtered = !!(q || eventId || kind !== 'ALL');

  return (
    <section aria-label="Mis ventas">
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              onKindChange(c.key);
              setPage(1);
            }}
            className={`h-10 shrink-0 px-3.5 rounded-full border text-[11px] font-black uppercase tracking-widest transition-colors ${
              kind === c.key ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {c.label}
            {c.count !== null && <span className={`ml-1 ${kind === c.key ? 'text-black/60' : 'text-zinc-600'}`}>{c.count}</span>}
          </button>
        ))}
      </div>

      <div className={`mt-2 grid grid-cols-1 gap-2 ${eventOptions.length > 1 ? 'sm:grid-cols-2' : ''}`}>
        <label className="relative block">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Buscar por nombre o correo"
            className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-neon-purple outline-none"
          />
        </label>
        {eventOptions.length > 1 && (
          <select
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              setPage(1);
            }}
            className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-sm text-white focus:border-neon-purple outline-none"
            aria-label="Filtrar por evento"
          >
            <option value="">Todos los eventos</option>
            {eventOptions.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-3">
        {loading && items.length === 0 ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-8 text-center text-xs font-bold text-zinc-500">
            {filtered ? 'No hay ventas con esos filtros.' : 'Todavía no tienes ventas. Cuando vendas, aparecerán aquí.'}
          </div>
        ) : (
          <ul className={`rounded-2xl bg-zinc-950 border border-zinc-900 divide-y divide-zinc-900 overflow-hidden ${loading ? 'opacity-60' : ''}`}>
            {items.map((s) => (
              <SaleRow key={s.id} s={s} showEvent={eventOptions.length > 1} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} />
            ))}
          </ul>
        )}
        <Pager p={pagination} onPage={setPage} busy={loading} />
      </div>
    </section>
  );
}

function SaleRow({ s, showEvent, open, onToggle }: { s: Sale; showEvent: boolean; open: boolean; onToggle: () => void }) {
  const isCash = s.kind === 'CASH_PENDING' || s.kind === 'CASH_SETTLED';
  const tokens = s.attendees.map((a) => a.token).filter((t): t is string => !!t);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const waHref =
    isCash && tokens.length > 0
      ? whatsappLink(
          null,
          buildTicketsMessage({
            buyerName: s.buyer.name || '',
            eventTitle: s.event?.title || '',
            urls: tokens.map((t) => ticketUrl(origin, t)),
          }),
        )
      : null;

  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 px-4 min-h-[60px] py-2.5 text-left hover:bg-zinc-900/40 transition-colors">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-white truncate">{s.buyer.name || 'Comprador'}</span>
          <span className="block text-[11px] font-bold text-zinc-500 truncate">
            {ticketsLabel(s.tickets)} · {timeAgo(s.created_at)}
            {showEvent && s.event ? ` · ${s.event.title}` : ''}
          </span>
        </span>
        <span className="text-right shrink-0">
          <span className="block text-sm font-black text-white">{s.total > 0 ? formatCOP(s.total) : 'Gratis'}</span>
          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${kindBadge(s.kind)}`}>
            {kindLabel(s.kind, 'promoter')}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-zinc-900/30 text-xs">
          <dl className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-1.5">
            {s.event && (
              <>
                <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Evento</dt>
                <dd className="font-bold text-zinc-200">{s.event.title}</dd>
              </>
            )}
            <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Fecha</dt>
            <dd className="font-bold text-zinc-200">{fullDateTime(s.created_at)}</dd>
            {s.buyer.email && (
              <>
                <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Correo</dt>
                <dd className="font-bold text-zinc-200 break-all">{s.buyer.email}</dd>
              </>
            )}
          </dl>

          {s.attendees.length > 0 && (
            <ul className="mt-3 space-y-1">
              {s.attendees.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-300 truncate">{a.name || `Entrada ${i + 1}`}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${a.used ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {a.used ? 'Ya entró' : 'Sin usar'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-black text-[11px] font-black uppercase tracking-widest hover:bg-[#25D366]/90 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Reenviar por WhatsApp
            </a>
          )}
          {s.kind === 'CASH_PENDING' && (
            <p className="mt-3 text-[11px] font-bold text-orange-300/80">Este efectivo aún lo debes entregar al administrador.</p>
          )}
        </div>
      )}
    </li>
  );
}
