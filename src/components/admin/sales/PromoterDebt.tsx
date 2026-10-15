"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { apiFetch, withQuery } from '@/lib/kasa-api';
import {
  formatCOP,
  initialOf,
  kindBadge,
  kindLabel,
  ticketsLabel,
  timeAgo,
  type Pagination,
  type PromoterRow,
  type SaleKind,
} from '@/lib/sales-view';
import Pager from '@/components/ui/Pager';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const PAGE_SIZE = 8;

/**
 * Promotores del evento: lo que cada uno vendió ONLINE (ya pagado), lo que AÚN debe en efectivo y lo que ya entregó.
 * Al abrir un promotor se ven sus ventas por cobrar y se le liquida: las que marques o todo de una vez.
 */
export default function PromoterDebt({
  eventId,
  promoters,
  refreshKey,
  onChanged,
}: {
  eventId: string;
  promoters: PromoterRow[];
  refreshKey: number;
  onChanged: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section aria-label="Promotores" className="mb-10">
      <div className="mb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-white">Promotores</h2>
        <p className="text-xs font-bold text-zinc-500">Toca un promotor para ver sus ventas y liquidarle el efectivo.</p>
      </div>

      {promoters.length === 0 ? (
        <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-6 text-center text-xs font-bold text-zinc-500">
          Ningún promotor ha vendido en este evento todavía.
        </div>
      ) : (
        <div className="space-y-2">
          {promoters.map((p) => (
            <PromoterCard
              key={p.promoter_id}
              eventId={eventId}
              p={p}
              open={openId === p.promoter_id}
              onToggle={() => setOpenId(openId === p.promoter_id ? null : p.promoter_id)}
              refreshKey={refreshKey}
              onChanged={onChanged}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PromoterCard({
  eventId,
  p,
  open,
  onToggle,
  refreshKey,
  onChanged,
}: {
  eventId: string;
  p: PromoterRow;
  open: boolean;
  onToggle: () => void;
  refreshKey: number;
  onChanged: () => void;
}) {
  const debt = p.cash_pending.amount;
  const name = p.promoter_name || p.promoter_email || 'Promotor';
  return (
    <div className={`rounded-2xl bg-zinc-950 border ${debt > 0 ? 'border-orange-500/30' : 'border-zinc-900'} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full p-4 text-left hover:bg-zinc-900/40 transition-colors"
      >
        <span className="flex items-center gap-3">
        <span className="w-10 h-10 shrink-0 rounded-full bg-neon-purple/15 border border-neon-purple/30 text-neon-purple flex items-center justify-center text-sm font-black">
          {initialOf(name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black text-white leading-tight line-clamp-2 break-words">{name}</span>
          <span className="block text-[11px] font-mono font-bold text-zinc-500 truncate">{p.codes.join(' · ')}</span>
        </span>
        <span className="text-right shrink-0">
          {debt > 0 ? (
            <>
              <span className="block text-[10px] font-black uppercase tracking-widest text-orange-400">Debe</span>
              <span className="block text-lg font-black text-orange-400 leading-tight">{formatCOP(debt)}</span>
              <span className="block text-[10px] font-bold text-zinc-500">
                {p.cash_pending.orders} {p.cash_pending.orders === 1 ? 'venta' : 'ventas'}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-green-400">
              <CheckCircle2 className="w-4 h-4" /> Al día
            </span>
          )}
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 pl-[52px] text-[11px] font-bold text-zinc-500">
          <span>
            Online <b className="text-zinc-200">{formatCOP(p.online.amount)}</b>
          </span>
          <span>
            Entregó <b className="text-zinc-200">{formatCOP(p.cash_settled.amount)}</b>
          </span>
          {p.free.tickets > 0 && (
            <span>
              Gratis <b className="text-zinc-200">{p.free.tickets}</b>
            </span>
          )}
        </span>
      </button>

      {open && <PromoterOrders eventId={eventId} p={p} refreshKey={refreshKey} onChanged={onChanged} />}
    </div>
  );
}

type OrderRow = {
  id: string;
  kind: SaleKind;
  total: number;
  created_at: string;
  user?: { name?: string | null; email?: string | null } | null;
  order_items: Array<{ quantity: number }>;
};

function PromoterOrders({
  eventId,
  p,
  refreshKey,
  onChanged,
}: {
  eventId: string;
  p: PromoterRow;
  refreshKey: number;
  onChanged: () => void;
}) {
  const hasDebt = p.cash_pending.orders > 0;
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>(hasDebt ? 'PENDING' : 'ALL');
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<null | 'selected' | 'all'>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch(
        withQuery(`/events/admin/${eventId}/stats`, {
          page,
          pageSize: PAGE_SIZE,
          promoterId: p.promoter_id,
          kind: filter === 'PENDING' ? 'CASH_PENDING' : null,
        }),
      );
      if (id !== reqId.current) return; // llegó una respuesta más vieja: se ignora
      setOrders(data.orders ?? []);
      setPagination(data.pagination ?? null);
    } catch (e: any) {
      if (id === reqId.current) setError(e?.message || 'No se pudieron cargar las ventas.');
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [eventId, p.promoter_id, filter, page]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const pendingHere = orders.filter((o) => o.kind === 'CASH_PENDING');
  const selectedIds = Object.keys(selected);
  const selectedSum = selectedIds.reduce((s, id) => s + Math.round(selected[id] * 100), 0) / 100;
  const allOnPageSelected = pendingHere.length > 0 && pendingHere.every((o) => selected[o.id] !== undefined);

  const toggle = (o: OrderRow) =>
    setSelected((cur) => {
      const next = { ...cur };
      if (next[o.id] !== undefined) delete next[o.id];
      else next[o.id] = o.total;
      return next;
    });
  const togglePage = () =>
    setSelected((cur) => {
      const next = { ...cur };
      if (allOnPageSelected) pendingHere.forEach((o) => delete next[o.id]);
      else pendingHere.forEach((o) => (next[o.id] = o.total));
      return next;
    });

  const doLiquidate = async () => {
    setBusy(true);
    setDialogError('');
    try {
      const body = confirm === 'selected' ? { eventId, orderIds: selectedIds } : { eventId };
      const r = await apiFetch(`/promoters/${p.promoter_id}/liquidate`, { method: 'POST', body });
      setOkMsg(`Liquidado: ${formatCOP(r.amount)} (${r.orders_liquidated} ${r.orders_liquidated === 1 ? 'venta' : 'ventas'}).`);
      setSelected({});
      setConfirm(null);
      setPage(1);
      onChanged();
    } catch (e: any) {
      setDialogError(e?.message || 'No se pudo liquidar.');
    } finally {
      setBusy(false);
    }
  };

  const name = p.promoter_name || p.promoter_email || 'el promotor';

  return (
    <div className="border-t border-zinc-900 px-4 pb-4 pt-3">
      {okMsg && (
        <div className="mb-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-green-400">{okMsg}</p>
        </div>
      )}

      <div className="flex gap-2 mb-3">
        {(['PENDING', 'ALL'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => {
              setFilter(f);
              setPage(1);
            }}
            className={`h-9 px-3 rounded-lg border text-[11px] font-black uppercase tracking-widest transition-colors ${
              filter === f ? 'bg-white text-black border-white' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
            }`}
          >
            {f === 'PENDING' ? `Por cobrar (${p.cash_pending.orders})` : `Todas (${p.total_orders})`}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs font-bold text-red-400">{error}</p>
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      ) : orders.length === 0 ? (
        <p className="py-6 text-center text-xs font-bold text-zinc-500">
          {filter === 'PENDING' ? 'No tiene ventas por cobrar. ¡Está al día!' : 'Sin ventas.'}
        </p>
      ) : (
        <>
          {filter === 'PENDING' && pendingHere.length > 1 && (
            <button type="button" onClick={togglePage} className="mb-2 text-[11px] font-black uppercase tracking-widest text-neon-green hover:underline">
              {allOnPageSelected ? 'Quitar selección de esta página' : 'Marcar todas las de esta página'}
            </button>
          )}
          <ul className={`divide-y divide-zinc-900 rounded-xl border border-zinc-900 overflow-hidden ${loading ? 'opacity-60' : ''}`}>
            {orders.map((o) => {
              const pending = o.kind === 'CASH_PENDING';
              const checked = selected[o.id] !== undefined;
              const qty = o.order_items.reduce((s, i) => s + i.quantity, 0);
              const Row: any = pending ? 'label' : 'div';
              return (
                <li key={o.id}>
                  <Row className={`flex items-center gap-3 px-3 min-h-[56px] py-2 ${pending ? 'cursor-pointer hover:bg-zinc-900/50' : ''} ${checked ? 'bg-neon-green/5' : ''}`}>
                    {pending && (
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(o)}
                        className="w-5 h-5 shrink-0 accent-[#39ff14] [color-scheme:dark]"
                        aria-label={`Marcar la venta de ${o.user?.name || 'cliente'}`}
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-white truncate">{o.user?.name || 'Cliente'}</span>
                      <span className="block text-[11px] font-bold text-zinc-500 truncate">
                        {ticketsLabel(qty)} · {timeAgo(o.created_at)}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-sm font-black text-white">{formatCOP(o.total)}</span>
                      {filter === 'ALL' && (
                        <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[9px] font-black uppercase tracking-widest ${kindBadge(o.kind)}`}>
                          {kindLabel(o.kind, 'admin')}
                        </span>
                      )}
                    </span>
                  </Row>
                </li>
              );
            })}
          </ul>
          <Pager p={pagination} onPage={setPage} busy={loading} />
        </>
      )}

      {hasDebt && (
        <div className="mt-4 rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
          <p className="text-xs font-bold text-zinc-400 mb-3">
            {selectedIds.length > 0
              ? `${selectedIds.length} ${selectedIds.length === 1 ? 'venta marcada' : 'ventas marcadas'} · ${formatCOP(selectedSum)}`
              : 'Marca las ventas que te entregó, o liquida todo de una vez.'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={() => {
                setDialogError('');
                setConfirm('selected');
              }}
              className="h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neon-green/90"
            >
              Liquidar marcadas
            </button>
            <button
              type="button"
              onClick={() => {
                setDialogError('');
                setConfirm('all');
              }}
              className="h-12 rounded-xl border border-orange-500/40 bg-orange-500/10 text-orange-300 text-xs font-black uppercase tracking-widest hover:bg-orange-500/20"
            >
              Liquidar todo · {formatCOP(p.cash_pending.amount)}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={`Liquidar a ${name}`}
        confirmLabel="Sí, ya me entregó"
        busy={busy}
        error={dialogError}
        onConfirm={doLiquidate}
        onCancel={() => setConfirm(null)}
      >
        {confirm === 'selected' ? (
          <p>
            Vas a marcar <span className="text-white">{selectedIds.length} {selectedIds.length === 1 ? 'venta' : 'ventas'}</span> como entregadas, por un total de{' '}
            <span className="text-neon-green">{formatCOP(selectedSum)}</span>.
          </p>
        ) : (
          <p>
            Vas a marcar <span className="text-white">todas sus ventas por cobrar de este evento</span> ({p.cash_pending.orders}) como entregadas, por un total de{' '}
            <span className="text-neon-green">{formatCOP(p.cash_pending.amount)}</span>.
          </p>
        )}
        <p className="text-zinc-400">Confirma solo si ya recibiste ese efectivo. Queda registrado en el historial de liquidaciones.</p>
      </ConfirmDialog>
    </div>
  );
}
