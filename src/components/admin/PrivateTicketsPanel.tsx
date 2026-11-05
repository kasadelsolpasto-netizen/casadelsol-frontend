"use client";
import { useEffect, useState } from 'react';
import { Loader2, Plus, Pencil, Copy, Check, RefreshCw, Lock, X, MessageCircle, EyeOff } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import {
  PRIVATE_STATE_LABEL, buildPrivateLinkMessage, money, privateLink, privateState, type PrivateTicket,
} from '@/lib/partners';
import { whatsappLink } from '@/lib/whatsapp';

/**
 * BOLETAS PRIVADAS: entradas con el precio que se decida, fuera de la página del evento.
 *
 * Resuelve lo de venderle más económico a un público concreto sin que toda la comunidad lo vea: la entrada no
 * aparece en la página y solo la compra quien tenga su enlace. Cerrar el enlace no toca las entradas ya
 * vendidas con él: esas son entradas pagadas.
 */
export default function PrivateTicketsPanel({
  eventId,
  eventTitle,
  minPrice,
}: {
  eventId: string;
  eventTitle?: string | null;
  /** Piso de precio que el administrador le puso al socio. null = sin piso (el dueño). */
  minPrice?: number | null;
}) {
  const [rows, setRows] = useState<PrivateTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PrivateTicket | null>(null);
  const [form, setForm] = useState({ name: '', price: '', capacity: '10', sale_start: '', sale_end: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const load = async () => {
    setLoading(true);
    try {
      setRows(await apiFetch<PrivateTicket[]>(`/partners/me/events/${eventId}/private-tickets`));
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las boletas privadas.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const startCreate = () => {
    setEditing(null);
    setForm({ name: '', price: minPrice ? String(minPrice) : '', capacity: '10', sale_start: '', sale_end: '' });
    setError('');
    setOpen(true);
  };

  const startEdit = (t: PrivateTicket) => {
    setEditing(t);
    setForm({
      name: t.name,
      price: String(t.price),
      capacity: String(t.capacity),
      sale_start: t.sale_start ? String(t.sale_start).slice(0, 16) : '',
      sale_end: t.sale_end ? String(t.sale_end).slice(0, 16) : '',
    });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    const body = {
      name: form.name,
      price: Number(form.price),
      capacity: Number(form.capacity),
      sale_start: form.sale_start || null,
      sale_end: form.sale_end || null,
    };
    try {
      if (editing) await apiFetch(`/partners/me/private-tickets/${editing.id}`, { method: 'PUT', body });
      else await apiFetch(`/partners/me/events/${eventId}/private-tickets`, { method: 'POST', body });
      setOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la boleta privada.');
    }
    setBusy(false);
  };

  const rotate = async (t: PrivateTicket) => {
    if (!confirm(`¿Cambiar el enlace de «${t.name}»?\n\nEl enlace anterior deja de funcionar al instante. Las entradas ya vendidas con él siguen valiendo.`)) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/partners/me/private-tickets/${t.id}/rotate`, { method: 'POST' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el enlace.');
    }
    setBusy(false);
  };

  const close = async (t: PrivateTicket) => {
    if (!confirm(`¿Cerrar el enlace de «${t.name}»?\n\nNadie más podrá comprar con él. Las entradas ya vendidas siguen valiendo.`)) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/partners/me/private-tickets/${t.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cerrar el enlace.');
    }
    setBusy(false);
  };

  const copy = async (t: PrivateTicket) => {
    const url = privateLink(origin, eventId, t.access_token);
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(t.id);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      // Sin permiso para copiar: queda el envío por WhatsApp
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-neon-purple" /> Boletas privadas
          </h2>
          <p className="text-[11px] font-bold text-zinc-500 mt-1 max-w-md">
            Entradas con el precio que decidas, fuera de la página del evento. Solo las compra quien tenga el enlace.
            {minPrice ? ` Tu precio mínimo autorizado es ${money(minPrice)}.` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="shrink-0 flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-neon-purple text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all"
        >
          <Plus className="w-3 h-3" /> Nueva
        </button>
      </div>

      {error && <p className="mb-3 text-xs font-bold text-red-400">{error}</p>}

      {open && (
        <div className="mb-4 bg-black border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neon-purple">
              {editing ? `Editar «${editing.name}»` : 'Nueva boleta privada'}
            </h3>
            <button type="button" onClick={() => { setOpen(false); setEditing(null); }} className="text-zinc-600 hover:text-white" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Lista de amigos, Universitarios"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Precio</label>
              <input
                type="number"
                min={minPrice ?? 0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cantidad</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Abre <span className="text-zinc-700 normal-case">(opcional)</span></label>
              <input
                type="datetime-local"
                value={form.sale_start}
                onChange={(e) => setForm({ ...form, sale_start: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cierra <span className="text-zinc-700 normal-case">(opcional)</span></label>
              <input
                type="datetime-local"
                value={form.sale_end}
                onChange={(e) => setForm({ ...form, sale_end: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={busy || !form.name.trim() || form.price === ''}
            className="w-full bg-white text-black font-black uppercase tracking-widest text-xs py-3 rounded-lg hover:bg-neon-purple hover:text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-xs font-bold text-zinc-500 py-4">
          Todavía no has creado boletas privadas para este evento.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((t) => {
            const state = privateState(t);
            const url = privateLink(origin, eventId, t.access_token);
            const waHref = url
              ? whatsappLink(null, buildPrivateLinkMessage({ eventTitle, name: t.name, price: t.price, url }))
              : null;
            return (
              <div key={t.id} className="bg-black border border-zinc-900 rounded-xl p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-sm">
                      {t.name}
                      <span className={`ml-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                        state === 'ABIERTA' ? 'bg-neon-green/10 text-neon-green' : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {PRIVATE_STATE_LABEL[state]}
                      </span>
                    </p>
                    <p className="text-[11px] font-bold text-zinc-500 mt-0.5">
                      {money(t.price)} · vendidas {t.sold ?? 0}/{t.capacity}
                      {t.revenue ? ` · ${money(t.revenue)} recaudados` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => startEdit(t)} disabled={busy} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-40" title="Editar" aria-label="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => rotate(t)} disabled={busy} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-40" title="Cambiar el enlace" aria-label="Cambiar el enlace">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {t.access_token && (
                      <button type="button" onClick={() => close(t)} disabled={busy} className="p-2 bg-zinc-900 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40" title="Cerrar el enlace" aria-label="Cerrar el enlace">
                        <Lock className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {url ? (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <code className="flex-1 min-w-0 truncate bg-zinc-950 border border-zinc-900 rounded-lg px-3 py-2 text-[11px] text-zinc-400">{url}</code>
                    <button
                      type="button"
                      onClick={() => copy(t)}
                      className={`shrink-0 h-10 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                        copied === t.id ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-900 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {copied === t.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === t.id ? 'Copiado' : 'Copiar'}
                    </button>
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 h-10 px-4 rounded-lg bg-[#25D366] text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#25D366]/90 transition-all"
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mt-3 text-[11px] font-bold text-zinc-600">
                    Enlace cerrado. Las entradas ya vendidas con él siguen valiendo; para volver a vender, crea el enlace de nuevo con «Cambiar el enlace».
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
