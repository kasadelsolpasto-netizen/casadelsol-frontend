"use client";
/**
 * PANTALLA DEL PASE en el scanner (puerta y barra).
 *
 * Se abre cuando la cámara lee un `KASA_ID:` o cuando el staff escribe el código del carné.
 * Leer el pase NO consume nada: aquí se ve quién es, qué entradas tiene para el evento activo,
 * cuánto saldo le queda y qué pedidos tiene abiertos. Admitir y cobrar son dos actos siguientes,
 * que el staff ejecuta con la persona delante.
 */
import { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Loader2, Ticket, Wallet, DoorOpen, ShoppingBag,
  Plus, Minus, X, RefreshCw, Lock, User as UserIcon,
} from 'lucide-react';
import { API_URL as API, getAuthToken, refreshSession } from '@/lib/session';
import { postScan, newScanId, type ScanResult } from '@/lib/scan-client';
import { describeEntry, formatCop, parsePesosToCents } from '@/lib/pass';

export interface PassTicket {
  id: string;
  attendee_name: string;
  ticket_type: string;
  used_at: string | null;
  used_by: string | null;
  is_courtesy: boolean;
  is_own_purchase: boolean;
}

export interface PassShopOrder {
  id: string;
  total_cents: number;
  total_label: string;
  status: 'PENDING' | 'PAID' | 'READY' | string;
  payment_type: string;
  items: Array<{ quantity: number; unit_price: number; product: { name: string } }>;
}

export interface PassResolved {
  pass: { code: string; code_label: string; version: number; is_blocked: boolean };
  user: { id: string; name: string; email: string; avatar?: string | null; tags?: string[] };
  event_id: string | null;
  tickets: PassTicket[];
  available_tickets: number;
  wallet: {
    balance_cents: number;
    balance_label: string;
    entries: Array<{ id: string; kind: string; amount_cents: number; note?: string | null; created_at: string }>;
  };
  shop_orders: PassShopOrder[];
}

type Flash =
  | { kind: 'ok'; title: string; detail?: string }
  | { kind: 'error'; title: string; detail?: string }
  | null;

/** Montos que de verdad se teclean en la barra. */
const QUICK_CENTS = [5_000_00, 10_000_00, 15_000_00, 20_000_00, 30_000_00, 50_000_00];

/** Estado del pedido de barra, dicho en español. */
const SHOP_STATUS: Record<string, string> = {
  PENDING: 'Por pagar',
  PAID: 'Pagado',
  READY: 'Listo para entregar',
  DELIVERED: 'Entregado',
  CANCELED: 'Cancelado',
};

const refreshToken = async () => {
  const r = await refreshSession();
  return r.ok ? r.token : null;
};

/** Texto de un fallo que no es "pase inválido": sesión, límite, red, servidor. */
const problemText = (r: ScanResult): string => {
  switch (r.kind) {
    case 'session_expired': return 'Sesión vencida. Inicia sesión de nuevo.';
    case 'rate_limited': return 'Demasiadas consultas seguidas. Espera unos segundos.';
    case 'forbidden': return r.message;
    case 'server_error': return 'El servidor no respondió. Vuelve a intentarlo.';
    case 'network': return 'Sin conexión con el servidor. Vuelve a intentarlo.';
    default: return r.kind === 'ok' ? '' : (r as any).message || 'No se pudo completar la operación.';
  }
};

export default function PassPanel({
  data,
  passToken,
  eventTitle,
  onClose,
  onSessionExpired,
  onRefreshed,
}: {
  data: PassResolved;
  /** Lo que leyó la cámara (o el código escrito): se reenvía en cada operación. */
  passToken: string;
  eventTitle?: string;
  onClose: () => void;
  onSessionExpired: () => void;
  /** El servidor devolvió una lectura más reciente del pase: la pantalla se actualiza. */
  onRefreshed: (fresh: PassResolved) => void;
}) {
  const [busy, setBusy] = useState<string>('');
  const [flash, setFlash] = useState<Flash>(null);
  const [tab, setTab] = useState<'puerta' | 'barra'>(data.tickets.length > 0 ? 'puerta' : 'barra');
  const [amountText, setAmountText] = useState('');
  const [mode, setMode] = useState<'cobrar' | 'abonar'>('cobrar');

  const typedCents = parsePesosToCents(amountText);
  const free = data.tickets.filter((t) => !t.used_at);

  // Mientras el pase está en pantalla, la página de atrás no se mueve ni se asoma por los bordes.
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previo; };
  }, []);

  /** Vuelve a leer el pase para que la pantalla muestre el estado real tras cada operación. */
  const reload = async () => {
    const r = await postScan({
      url: `${API}/pass/resolve`,
      body: { pass: passToken, event_id: data.event_id || undefined },
      getToken: getAuthToken,
      refreshToken,
    });
    if (r.kind === 'ok') onRefreshed(r.data as PassResolved);
    if (r.kind === 'session_expired') onSessionExpired();
  };

  /** Toda operación del panel pasa por aquí: una llave por intento y reintentos seguros. */
  const run = async (
    label: string,
    url: string,
    body: Record<string, unknown>,
    onOk: (data: any) => Flash,
    opts: { autoRetryUnsafe?: boolean } = {},
  ) => {
    if (busy) return;
    setBusy(label);
    setFlash(null);
    try {
      const r = await postScan({
        url,
        body,
        getToken: getAuthToken,
        refreshToken,
        scanId: newScanId(),
        autoRetryUnsafe: opts.autoRetryUnsafe ?? true,
      });
      if (r.kind === 'ok') {
        setFlash(onOk(r.data));
        try { navigator.vibrate?.(120); } catch { /* no soportado */ }
        await reload();
      } else if (r.kind === 'session_expired') {
        onSessionExpired();
      } else {
        try { navigator.vibrate?.([200, 100, 200]); } catch { /* no soportado */ }
        setFlash({ kind: 'error', title: problemText(r) });
      }
    } finally {
      setBusy('');
    }
  };

  const admit = (qrId?: string) =>
    run(
      qrId ? `admit-${qrId}` : 'admit',
      `${API}/pass/admit`,
      { pass: passToken, event_id: data.event_id, qr_id: qrId },
      (d) => ({
        kind: 'ok',
        title: `ADELANTE, ${String(d.attendee_name || data.user.name).toUpperCase()}`,
        detail: `${d.ticket_type?.name || 'Entrada'}${d.remaining_tickets > 0 ? ` · le quedan ${d.remaining_tickets}` : ''}`,
      }),
    );

  const charge = (cents: number) => {
    if (cents <= 0) return;
    return run(
      'charge',
      `${API}/pass/charge`,
      { pass: passToken, amount_cents: cents, note: `Consumo en barra${eventTitle ? ` · ${eventTitle}` : ''}` },
      (d) => {
        setAmountText('');
        return { kind: 'ok', title: `COBRADO ${formatCop(cents)}`, detail: `Le queda ${formatCop(d.balance_cents)}` };
      },
    );
  };

  const topUp = (cents: number) => {
    if (cents <= 0) return;
    return run(
      'topup',
      `${API}/pass/topup-cash`,
      { pass: passToken, amount_cents: cents, note: 'Efectivo recibido en taquilla' },
      (d) => {
        setAmountText('');
        return { kind: 'ok', title: `ABONADO ${formatCop(cents)}`, detail: `Saldo: ${formatCop(d.balance_cents)}` };
      },
    );
  };

  const payOrder = (order: PassShopOrder) =>
    run(
      `order-${order.id}`,
      `${API}/pass/charge`,
      { pass: passToken, shop_order_id: order.id },
      (d) => ({ kind: 'ok', title: `PEDIDO PAGADO ${order.total_label}`, detail: `Le queda ${formatCop(d.balance_cents)}` }),
    );

  const enough = data.wallet.balance_cents >= typedCents;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505] overflow-y-auto">
      {/* ── Cabecera: quién es ─────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-black border-b border-zinc-800">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neon-purple/15 border border-neon-purple/40 flex items-center justify-center shrink-0">
            <UserIcon className="w-5 h-5 text-neon-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-black uppercase text-sm truncate">{data.user.name}</p>
            <p className="text-zinc-500 text-[10px] font-mono tracking-widest">{data.pass.code_label}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-2" aria-label="Cerrar">
            <X className="w-6 h-6" />
          </button>
        </div>
        {data.pass.is_blocked && (
          <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-widest py-1.5 text-center flex items-center justify-center gap-2">
            <Lock className="w-3 h-3" /> Pase bloqueado
          </div>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-5">
        {/* ── Resultado de la última operación ─────────────── */}
        {flash && (
          <div className={`rounded-xl border px-4 py-4 text-center ${flash.kind === 'ok' ? 'border-neon-green/40 bg-neon-green/10' : 'border-red-600/50 bg-red-950/40'}`}>
            {flash.kind === 'ok'
              ? <CheckCircle className="w-8 h-8 text-neon-green mx-auto mb-2" />
              : <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />}
            <p className={`font-black uppercase text-sm tracking-wide ${flash.kind === 'ok' ? 'text-neon-green' : 'text-red-400'}`}>
              {flash.title}
            </p>
            {flash.detail && <p className="text-zinc-400 text-[11px] font-bold mt-1">{flash.detail}</p>}
          </div>
        )}

        {/* ── Resumen: entradas libres y saldo ─────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
            <Ticket className="w-4 h-4 text-zinc-600 mx-auto mb-1.5" />
            <p className="text-2xl font-black text-white leading-none">{free.length}</p>
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1">Entradas libres</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-center">
            <Wallet className="w-4 h-4 text-zinc-600 mx-auto mb-1.5" />
            <p className="text-2xl font-black text-neon-green leading-none">{data.wallet.balance_label}</p>
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1">Saldo</p>
          </div>
        </div>

        {/* ── Pestañas ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2">
          {(['puerta', 'barra'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest border ${
                tab === t ? 'bg-neon-purple text-white border-neon-purple' : 'border-zinc-800 text-zinc-500'
              }`}
            >
              {t === 'puerta' ? 'Puerta' : 'Barra'}
            </button>
          ))}
        </div>

        {/* ══════════════ PUERTA ══════════════ */}
        {tab === 'puerta' && (
          <div className="space-y-3">
            {!data.event_id && (
              <p className="text-yellow-400 text-[11px] font-bold text-center py-2">
                Elige primero el evento que estás escaneando.
              </p>
            )}

            {data.event_id && data.tickets.length === 0 && (
              <div className="rounded-xl border border-red-600/40 bg-red-950/30 px-4 py-6 text-center">
                <XCircle className="w-9 h-9 text-red-500 mx-auto mb-2" />
                <p className="text-red-400 font-black uppercase text-sm">Sin entradas para este evento</p>
                <p className="text-zinc-500 text-[11px] font-bold mt-1">
                  Puede comprar en taquilla y luego vuelves a leer su pase.
                </p>
              </div>
            )}

            {free.length > 0 && !data.pass.is_blocked && (
              <button
                onClick={() => admit()}
                disabled={!!busy}
                className="w-full flex items-center justify-center gap-3 bg-neon-green text-black py-5 rounded-xl font-black uppercase tracking-widest text-base disabled:opacity-50"
              >
                {busy === 'admit' ? <Loader2 className="w-6 h-6 animate-spin" /> : <DoorOpen className="w-6 h-6" />}
                Admitir
              </button>
            )}

            {data.tickets.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl border p-4 ${t.used_at ? 'border-zinc-900 bg-black opacity-60' : 'border-zinc-800 bg-zinc-950'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">{t.attendee_name}</p>
                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                      {t.ticket_type}
                      {t.is_courtesy && ' · cortesía'}
                      {!t.is_own_purchase && ' · a su nombre'}
                    </p>
                    {t.used_at && (
                      <p className="text-zinc-600 text-[10px] font-bold mt-1">
                        Usada {new Date(t.used_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        {t.used_by ? ` · ${t.used_by}` : ''}
                      </p>
                    )}
                  </div>
                  {t.used_at ? (
                    <span className="text-zinc-600 text-[9px] font-black uppercase tracking-widest shrink-0">Usada</span>
                  ) : (
                    <button
                      onClick={() => admit(t.id)}
                      disabled={!!busy || data.pass.is_blocked}
                      className="shrink-0 border border-neon-green/50 text-neon-green px-4 py-2 rounded-lg font-black uppercase text-[10px] tracking-widest disabled:opacity-40"
                    >
                      {busy === `admit-${t.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Admitir'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ BARRA ══════════════ */}
        {tab === 'barra' && (
          <div className="space-y-4">
            {/* Pedidos abiertos de la tienda */}
            {data.shop_orders.length > 0 && (
              <div className="space-y-2">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Pedidos abiertos</p>
                {data.shop_orders.map((o) => (
                  <div key={o.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <p className="text-white font-black text-sm">{o.total_label}</p>
                        <p className="text-zinc-500 text-[10px] font-bold truncate">
                          {o.items.map((i) => `${i.quantity}× ${i.product.name}`).join(', ')}
                        </p>
                      </div>
                      <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest shrink-0">
                        {SHOP_STATUS[o.status] ?? o.status}
                      </span>
                    </div>
                    {o.status === 'PENDING' && (
                      <button
                        onClick={() => payOrder(o)}
                        disabled={!!busy || data.wallet.balance_cents < o.total_cents || data.pass.is_blocked}
                        className="w-full flex items-center justify-center gap-2 bg-neon-green text-black py-3 rounded-lg font-black uppercase text-[10px] tracking-widest disabled:opacity-40"
                      >
                        {busy === `order-${o.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingBag className="w-3.5 h-3.5" />}
                        {data.wallet.balance_cents < o.total_cents ? 'Saldo insuficiente' : 'Pagar con su saldo'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Cobrar / abonar */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setMode('cobrar'); setFlash(null); }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest border ${
                    mode === 'cobrar' ? 'bg-zinc-800 text-white border-zinc-600' : 'border-zinc-800 text-zinc-500'
                  }`}
                >
                  <Minus className="w-3 h-3" /> Cobrar
                </button>
                <button
                  onClick={() => { setMode('abonar'); setFlash(null); }}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-black uppercase text-[10px] tracking-widest border ${
                    mode === 'abonar' ? 'bg-zinc-800 text-white border-zinc-600' : 'border-zinc-800 text-zinc-500'
                  }`}
                >
                  <Plus className="w-3 h-3" /> Abonar efectivo
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {QUICK_CENTS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAmountText(String(c / 100))}
                    className="border border-zinc-800 text-zinc-300 py-2.5 rounded-lg font-black text-xs"
                  >
                    {formatCop(c)}
                  </button>
                ))}
              </div>

              <input
                value={amountText}
                onChange={(e) => { setAmountText(e.target.value); setFlash(null); }}
                inputMode="numeric"
                placeholder="Monto en pesos"
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white text-center text-xl font-black placeholder:text-zinc-700 placeholder:text-sm focus:border-neon-purple outline-none"
              />

              {mode === 'cobrar' ? (
                <>
                  <button
                    onClick={() => charge(typedCents)}
                    disabled={!!busy || typedCents <= 0 || !enough || data.pass.is_blocked}
                    className="w-full flex items-center justify-center gap-2 bg-neon-purple text-white py-4 rounded-xl font-black uppercase tracking-widest text-sm disabled:opacity-40"
                  >
                    {busy === 'charge' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wallet className="w-5 h-5" />}
                    Cobrar {typedCents > 0 ? formatCop(typedCents) : ''}
                  </button>
                  {typedCents > 0 && !enough && (
                    <p className="text-red-400 text-[11px] font-bold text-center">
                      Le faltan {formatCop(typedCents - data.wallet.balance_cents)}. Puede abonar efectivo y volver a cobrar.
                    </p>
                  )}
                </>
              ) : (
                <button
                  onClick={() => topUp(typedCents)}
                  disabled={!!busy || typedCents <= 0}
                  className="w-full flex items-center justify-center gap-2 bg-neon-green text-black py-4 rounded-xl font-black uppercase tracking-widest text-sm disabled:opacity-40"
                >
                  {busy === 'topup' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Abonar {typedCents > 0 ? formatCop(typedCents) : ''}
                </button>
              )}
            </div>

            {/* Últimos movimientos: para resolver un reclamo en el momento */}
            {data.wallet.entries.length > 0 && (
              <div className="rounded-xl border border-zinc-900 bg-black p-4">
                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest mb-3">Últimos movimientos</p>
                <ul className="divide-y divide-zinc-900">
                  {data.wallet.entries.map((e) => {
                    const d = describeEntry(e.kind, e.amount_cents);
                    return (
                      <li key={e.id} className="flex items-center justify-between py-2">
                        <span className="text-zinc-400 text-[11px] font-bold truncate pr-2">
                          {new Date(e.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {d.label}
                        </span>
                        <span className={`text-[11px] font-black whitespace-nowrap ${d.positive ? 'text-neon-green' : 'text-zinc-400'}`}>
                          {d.amount}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            onClick={reload}
            disabled={!!busy}
            className="flex items-center justify-center gap-2 border border-zinc-800 text-zinc-400 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 bg-zinc-900 text-white py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest"
          >
            Seguir escaneando
          </button>
        </div>
      </div>
    </div>
  );
}
