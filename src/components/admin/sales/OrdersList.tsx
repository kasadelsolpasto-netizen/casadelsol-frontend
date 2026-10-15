"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Loader2, Search } from 'lucide-react';
import { apiFetch, withQuery } from '@/lib/kasa-api';
import {
  formatCOP,
  fullDateTime,
  kindBadge,
  kindLabel,
  shortRef,
  ticketsLabel,
  timeAgo,
  type Pagination,
  type PromoterRow,
  type SaleKind,
  type Summary,
} from '@/lib/sales-view';
import Pager from '@/components/ui/Pager';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const PAGE_SIZE = 25;

type Order = {
  id: string;
  kind: SaleKind;
  total: number;
  created_at: string;
  payment_ref?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
  order_items: Array<{ quantity: number; ticket_type?: { name?: string } | null }>;
  qr_codes: Array<{ id: string; attendee_name?: string | null; used_at?: string | null }>;
  promoter_code?: { code?: string | null; promoter?: { name?: string | null } | null } | null;
};

/**
 * Compradores del evento: una lista corta, con filtros, búsqueda y paginación de 25. Cada fila muestra solo lo
 * necesario (quién, cuánto, de qué tipo); al tocarla se abre con el detalle y las acciones.
 */
export default function OrdersList({
  eventId,
  summary,
  promoters,
  refreshKey,
  onChanged,
}: {
  eventId: string;
  summary: Summary;
  promoters: PromoterRow[];
  refreshKey: number;
  onChanged: () => void;
}) {
  const [kind, setKind] = useState<'ALL' | SaleKind>('ALL');
  const [promoterId, setPromoterId] = useState('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Order | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
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
        withQuery(`/events/admin/${eventId}/stats`, {
          page,
          pageSize: PAGE_SIZE,
          kind: kind === 'ALL' ? null : kind,
          promoterId: promoterId || null,
          q: q || null,
        }),
      );
      if (id !== reqId.current) return;
      setOrders(data.orders ?? []);
      setPagination(data.pagination ?? null);
    } catch (e: any) {
      if (id === reqId.current) setError(e?.message || 'No se pudieron cargar las compras.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [eventId, page, kind, promoterId, q]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const chips: Array<{ key: 'ALL' | SaleKind; label: string; count: number }> = [
    { key: 'ALL', label: 'Todas', count: summary.all.orders },
    { key: 'ONLINE', label: 'Online', count: summary.online.orders },
    { key: 'CASH_PENDING', label: 'Por cobrar', count: summary.cash_pending.orders },
    { key: 'CASH_SETTLED', label: 'Liquidadas', count: summary.cash_settled.orders },
    { key: 'FREE', label: 'Gratis', count: summary.free.orders },
  ];

  const doRevoke = async () => {
    if (!revoking) return;
    setBusy(true);
    setDialogError('');
    try {
      await apiFetch(`/promoters/orders/${revoking.id}/revoke`, { method: 'POST' });
      setRevoking(null);
      setOpenId(null);
      onChanged();
    } catch (e: any) {
      setDialogError(e?.message || 'No se pudo revocar la orden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Compradores" className="mb-10">
      <div className="mb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-white">Compradores</h2>
        <p className="text-xs font-bold text-zinc-500">Toca una compra para ver el detalle.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              setKind(c.key);
              setPage(1);
            }}
            className={`h-10 shrink-0 px-3.5 rounded-full border text-[11px] font-black uppercase tracking-widest transition-colors ${
              kind === c.key ? 'bg-white text-black border-white' : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {c.label} <span className={kind === c.key ? 'text-black/60' : 'text-zinc-600'}>{c.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="relative block">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Buscar por nombre, correo o cédula"
            className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 focus:border-neon-purple outline-none"
          />
        </label>
        <select
          value={promoterId}
          onChange={(e) => {
            setPromoterId(e.target.value);
            setPage(1);
          }}
          className="w-full h-11 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-sm text-white focus:border-neon-purple outline-none"
          aria-label="Filtrar por promotor"
        >
          <option value="">Todos los promotores</option>
          {promoters.map((p) => (
            <option key={p.promoter_id} value={p.promoter_id}>
              {p.promoter_name || p.promoter_email}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-red-400">{error}</p>
        </div>
      )}

      <div className="mt-3">
        {loading && orders.length === 0 ? (
          <div className="py-10 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-8 text-center text-xs font-bold text-zinc-500">
            {q || promoterId || kind !== 'ALL' ? 'No hay compras con esos filtros.' : 'Todavía no hay compras en este evento.'}
          </div>
        ) : (
          <ul className={`rounded-2xl bg-zinc-950 border border-zinc-900 divide-y divide-zinc-900 overflow-hidden ${loading ? 'opacity-60' : ''}`}>
            {orders.map((o) => (
              <OrderItem key={o.id} o={o} open={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)} onRevoke={() => { setDialogError(''); setRevoking(o); }} />
            ))}
          </ul>
        )}
        <Pager p={pagination} onPage={setPage} busy={loading} />
      </div>

      <ConfirmDialog
        open={revoking !== null}
        title="Revocar esta venta"
        confirmLabel="Sí, revocar"
        tone="danger"
        busy={busy}
        error={dialogError}
        onConfirm={doRevoke}
        onCancel={() => setRevoking(null)}
      >
        <p>
          Se eliminarán los QR de <span className="text-white">{revoking?.user?.name || 'este cliente'}</span> ({revoking ? formatCOP(revoking.total) : ''}) y las entradas
          volverán a estar disponibles.
        </p>
        <p className="text-zinc-400">No se puede deshacer. Si el cliente ya tiene el QR, dejará de servir.</p>
      </ConfirmDialog>
    </section>
  );
}

function OrderItem({ o, open, onToggle, onRevoke }: { o: Order; open: boolean; onToggle: () => void; onRevoke: () => void }) {
  const qty = o.order_items.reduce((s, i) => s + i.quantity, 0);
  const promoter = o.promoter_code?.promoter?.name || o.promoter_code?.code || '';
  const anyUsed = o.qr_codes.some((q) => q.used_at);
  const types = o.order_items.map((i) => `${i.quantity}× ${i.ticket_type?.name ?? 'Entrada'}`).join(', ');
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full flex items-center gap-3 px-4 min-h-[60px] py-2.5 text-left hover:bg-zinc-900/40 transition-colors">
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-white truncate">{o.user?.name || 'Invitado'}</span>
          <span className="block text-[11px] font-bold text-zinc-500 truncate">
            {ticketsLabel(qty)} · {timeAgo(o.created_at)}
            {promoter ? ` · ${promoter}` : ''}
          </span>
        </span>
        <span className="text-right shrink-0">
          <span className="block text-sm font-black text-white">{formatCOP(o.total)}</span>
          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${kindBadge(o.kind)}`}>
            {kindLabel(o.kind, 'admin')}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 bg-zinc-900/30 text-xs">
          <dl className="grid grid-cols-[88px_1fr] gap-x-3 gap-y-1.5">
            <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Correo</dt>
            <dd className="font-bold text-zinc-200 break-all">{o.user?.email || '—'}</dd>
            <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Fecha</dt>
            <dd className="font-bold text-zinc-200">{fullDateTime(o.created_at)}</dd>
            <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Entradas</dt>
            <dd className="font-bold text-zinc-200">{types || '—'}</dd>
            {promoter && (
              <>
                <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Promotor</dt>
                <dd className="font-bold text-zinc-200">
                  {promoter}
                  {o.promoter_code?.code ? <span className="font-mono text-zinc-500"> · {o.promoter_code.code}</span> : null}
                </dd>
              </>
            )}
            <dt className="font-black uppercase tracking-widest text-[10px] text-zinc-500 pt-0.5">Pago</dt>
            <dd className="font-mono text-zinc-400 break-all" title={o.payment_ref ?? ''}>{shortRef(o.payment_ref, 28)}</dd>
          </dl>

          {o.qr_codes.length > 0 && (
            <ul className="mt-3 space-y-1">
              {o.qr_codes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-2">
                  <span className="font-bold text-zinc-300 truncate">{q.attendee_name || 'Asistente'}</span>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${q.used_at ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                    {q.used_at ? 'Ya entró' : 'Sin usar'}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {o.kind === 'CASH_PENDING' && (
            <div className="mt-3">
              {anyUsed ? (
                <p className="text-[11px] font-bold text-zinc-500">No se puede revocar: el cliente ya entró con este QR.</p>
              ) : (
                <button
                  type="button"
                  onClick={onRevoke}
                  className="h-10 px-4 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 text-[11px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors"
                >
                  Revocar venta
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
