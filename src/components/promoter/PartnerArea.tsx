"use client";
import { useEffect, useMemo, useState } from 'react';
import {
  Loader2, Send, Users, Ticket, CheckCircle, Trash2, Copy, BarChart3, Gift, EyeOff, AlertTriangle,
} from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import {
  COURTESY_KIND_HINT, COURTESY_KIND_LABEL, courtesyRemaining, money,
  type CourtesyKind, type CourtesyType, type Grant,
} from '@/lib/partners';
import PrivateTicketsPanel from '@/components/admin/PrivateTicketsPanel';

/**
 * ÁREA DEL SOCIO.
 *
 * El socio no entra al panel del administrador: trabaja desde aquí y solo ve lo suyo. En el evento para el
 * que está aprobado puede emitir cortesías contra su cupo, ver las métricas del evento y manejar sus boletas
 * privadas. Cada cosa aparece solo si el administrador se la habilitó.
 */

type EventGrant = { event: { id: string; title: string; date: string }; grant: Grant | null; owner: boolean };

type Section = 'cortesias' | 'metricas' | 'privadas';

export default function PartnerArea() {
  const [rows, setRows] = useState<EventGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState('');
  const [section, setSection] = useState<Section>('cortesias');

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<EventGrant[]>('/partners/me/events');
        setRows(res);
        if (res.length > 0) setEventId(res[0].event.id);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu información de socio.');
      }
      setLoading(false);
    })();
  }, []);

  const current = useMemo(() => rows.find((r) => r.event.id === eventId) ?? null, [rows, eventId]);
  const grant = current?.grant ?? null;

  const sections: Array<{ key: Section; label: string; Icon: typeof Gift }> = [];
  if (grant?.can_issue_courtesies) sections.push({ key: 'cortesias', label: 'Cortesías', Icon: Gift });
  if (grant?.can_view_metrics) sections.push({ key: 'metricas', label: 'Métricas', Icon: BarChart3 });
  if (grant?.can_create_private_tickets) sections.push({ key: 'privadas', label: 'Privadas', Icon: EyeOff });

  useEffect(() => {
    if (sections.length > 0 && !sections.some((s) => s.key === section)) setSection(sections[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, sections.length]);

  if (loading) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>;
  }

  if (error) return <p className="text-sm font-bold text-red-400">{error}</p>;

  if (rows.length === 0) {
    return (
      <p className="text-xs font-bold text-zinc-500 py-6">
        Todavía no eres socio de ningún evento. El administrador es quien habilita este grado.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="partner-event" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Evento aprobado</label>
        <select
          id="partner-event"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green appearance-none"
        >
          {rows.map((r) => (
            <option key={r.event.id} value={r.event.id}>
              {r.event.title} · {new Date(r.event.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' })}
            </option>
          ))}
        </select>
      </div>

      {grant && grant.can_issue_courtesies && (
        <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
          Tu cupo de cortesías: <span className="text-white">{grant.courtesy_issued}/{grant.courtesy_quota}</span>
          {courtesyRemaining(grant) === 0 && <span className="text-yellow-400"> · agotado</span>}
        </p>
      )}

      {sections.length === 0 ? (
        <p className="text-xs font-bold text-zinc-500 py-4">
          Eres socio de este evento, pero el administrador todavía no te habilitó ninguna facultad.
        </p>
      ) : (
        <>
          {/* Las clases de Tailwind no se pueden armar con una variable: se eligen de una lista fija. */}
          <div
            role="tablist"
            aria-label="Secciones de socio"
            className={`grid gap-1 p-1 rounded-2xl bg-zinc-950 border border-zinc-900 ${
              sections.length === 3 ? 'grid-cols-3' : sections.length === 2 ? 'grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {sections.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={section === key}
                onClick={() => setSection(key)}
                className={`h-11 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors ${
                  section === key ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {section === 'cortesias' && grant && <PartnerCourtesies eventId={eventId} grant={grant} />}
          {section === 'metricas' && <PartnerMetrics eventId={eventId} />}
          {section === 'privadas' && grant && (
            <PrivateTicketsPanel eventId={eventId} eventTitle={current?.event.title} minPrice={grant.private_ticket_min_price} />
          )}
        </>
      )}
    </div>
  );
}

/** Cortesías del socio: emite contra su cupo y solo ve las que él emitió. */
function PartnerCourtesies({ eventId, grant }: { eventId: string; grant: Grant }) {
  const [types, setTypes] = useState<CourtesyType[]>([]);
  const [mine, setMine] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ name: string; dni: string; email: string; ticket_type_id: string; quantity: string; kind: CourtesyKind }>(
    { name: '', dni: '', email: '', ticket_type_id: '', quantity: '1', kind: 'PERSONAL' },
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ courtesies: any[]; ticketTypes: CourtesyType[] }>(`/courtesies/events/${eventId}`);
      setMine(data.courtesies);
      setTypes(data.ticketTypes);
      setForm((f) => ({
        ...f,
        ticket_type_id: data.ticketTypes.some((t) => t.id === f.ticket_type_id) ? f.ticket_type_id : data.ticketTypes[0]?.id ?? '',
      }));
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus cortesías.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const left = courtesyRemaining(grant);
  const quantity = Number(form.quantity) || 1;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setDone('');
    try {
      const res = await apiFetch<any[]>(`/courtesies/bulk/${eventId}`, {
        method: 'POST',
        body: { courtesies: [{ ...form, quantity }] },
      });
      const failed = (Array.isArray(res) ? res : []).filter((r) => r?.status === 'error');
      const ok = (Array.isArray(res) ? res : []).length - failed.length;
      setDone(ok > 0 ? `${ok} ${ok === 1 ? 'cortesía emitida' : 'cortesías emitidas'}.` : '');
      if (failed.length > 0) setError(failed.map((f) => f.message).join(' '));
      setForm((f) => ({ ...f, name: '', dni: '', email: '', quantity: '1' }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron emitir las cortesías.');
    }
    setSending(false);
  };

  const revoke = async (c: any) => {
    if (!confirm(c.claimed_at
      ? `La cortesía de ${c.name} ya está en su cuenta. Si la revocas, su entrada queda invalidada. ¿Seguro?`
      : `¿Revocar el enlace de cortesía de ${c.name}?`)) return;
    try {
      await apiFetch(`/courtesies/${c.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo revocar la cortesía.');
    }
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/claim-courtesy?token=${token}`);
      setCopied(token);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      // sin permiso para copiar
    }
  };

  const groupSizes: Record<string, number> = {};
  for (const c of mine) if (c.group_id) groupSizes[c.group_id] = (groupSizes[c.group_id] ?? 0) + 1;

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-white">Emitir cortesía</h3>

        {left === 0 && (
          <p className="text-[11px] font-bold text-yellow-300 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            Tu cupo está agotado. Pídele más cupo al administrador.
          </p>
        )}

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nombre completo</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Correo</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cédula <span className="text-zinc-700 normal-case">(opcional)</span></label>
            <input
              type="text"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Denominación</label>
            <select
              value={form.ticket_type_id}
              onChange={(e) => {
                const t = types.find((x) => x.id === e.target.value);
                setForm({ ...form, ticket_type_id: e.target.value, kind: t?.transferable_default && grant.can_set_courtesy_kind ? 'LIBRE' : form.kind });
              }}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green appearance-none"
            >
              {types.length === 0 && <option value="">Cortesía general</option>}
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.name}{t.unlimited ? '' : ` · quedan ${t.available}`}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cantidad</label>
            <input
              type="number"
              min={1}
              max={Math.max(1, Math.min(20, left || 1))}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green"
            />
            <p className="text-[10px] font-bold text-zinc-600 mt-1">Varias a nombre de la misma persona, cada una con su QR.</p>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Clase</label>
          <div className="grid grid-cols-2 gap-2">
            {(['PERSONAL', 'LIBRE'] as CourtesyKind[]).map((k) => (
              <button
                key={k}
                type="button"
                disabled={!grant.can_set_courtesy_kind}
                onClick={() => setForm({ ...form, kind: k })}
                className={`h-11 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
                  (grant.can_set_courtesy_kind ? form.kind : 'PERSONAL') === k
                    ? k === 'LIBRE'
                      ? 'bg-neon-green/10 border-neon-green text-neon-green'
                      : 'bg-neon-purple/10 border-neon-purple text-neon-purple'
                    : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {COURTESY_KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <p className="text-[10px] font-bold text-zinc-600 mt-1">
            {grant.can_set_courtesy_kind
              ? COURTESY_KIND_HINT[form.kind]
              : 'No estás habilitado para emitir cortesías libres: las tuyas son personales e intransferibles.'}
          </p>
        </div>

        {error && <p className="text-[11px] font-bold text-red-400">{error}</p>}
        {done && <p className="text-[11px] font-bold text-neon-green">{done}</p>}

        <button
          type="submit"
          disabled={sending || left === 0}
          className="w-full bg-white text-black font-black uppercase tracking-widest text-xs py-3.5 rounded-xl hover:bg-neon-green transition-all disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Emitir {quantity > 1 ? `${quantity} cortesías` : 'cortesía'}</>}
        </button>
      </form>

      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Mis cortesías</h3>
          {loading && <Loader2 className="w-4 h-4 text-zinc-600 animate-spin" />}
        </div>
        <ul className="divide-y divide-zinc-900">
          {mine.map((c) => (
            <li key={c.id} className="px-5 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {c.name}
                  {c.group_id && (groupSizes[c.group_id] ?? 0) > 1 && (
                    <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">({groupSizes[c.group_id]} juntas)</span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {c.email} · {c.ticket_type?.name}
                  <span className={c.kind === 'LIBRE' ? 'text-neon-green' : 'text-neon-purple'}> · {COURTESY_KIND_LABEL[(c.kind ?? 'PERSONAL') as CourtesyKind]}</span>
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {c.attended ? <span className="text-orange-400">Asistió</span> : c.claimed_at ? <span className="text-neon-green">En bóveda</span> : c.opened_at ? 'Vista' : 'Enviada'}
              </span>
              {!c.claimed_at && (
                <button type="button" onClick={() => copyLink(c.token)} className={`p-2 rounded-lg transition-colors ${copied === c.token ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`} title="Copiar el enlace" aria-label="Copiar el enlace">
                  {copied === c.token ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              <button type="button" onClick={() => revoke(c)} className="p-2 bg-zinc-900 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors" title="Revocar" aria-label="Revocar">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
          {mine.length === 0 && !loading && (
            <li className="px-5 py-6 text-center text-xs font-bold text-zinc-500">Todavía no has emitido cortesías en este evento.</li>
          )}
        </ul>
      </div>
    </div>
  );
}

/** Métricas del evento aprobado. El dinero solo aparece si el administrador lo habilitó. */
function PartnerMetrics({ eventId }: { eventId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiFetch(`/partners/me/events/${eventId}/metrics`)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError('');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ApiError ? e.message : 'No se pudieron cargar las métricas.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>;
  if (error) return <p className="text-sm font-bold text-red-400">{error}</p>;
  if (!data) return null;

  const tile = (label: string, value: string | number, cls = 'text-white') => (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
      <p className={`text-2xl font-black ${cls}`}>{value}</p>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tile('Entradas vendidas', (data.tickets?.PUBLIC ?? 0) + (data.tickets?.PRIVATE ?? 0))}
        {tile('Cortesías', data.tickets?.COURTESY ?? 0, 'text-neon-purple')}
        {tile('Escaneadas en puerta', data.aforo?.scanned ?? 0, 'text-orange-400')}
        {tile('Cupo disponible', data.aforo?.left ?? 0, 'text-neon-green')}
      </div>

      {data.revenue && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {tile('Ingresos públicos', money(data.revenue.public))}
          {tile('Por enlace privado', money(data.revenue.private), 'text-neon-purple')}
          {tile('Total', money(data.revenue.total), 'text-neon-green')}
        </div>
      )}

      <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-900">
          <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
            <Ticket className="w-4 h-4 text-zinc-500" /> Denominaciones
          </h3>
        </div>
        <ul className="divide-y divide-zinc-900">
          {(data.denominations ?? []).map((d: any) => (
            <li key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">
                  {d.name}
                  {d.mine && <span className="ml-2 text-[9px] font-black uppercase tracking-widest text-neon-green">tuya</span>}
                </p>
                <p className="text-[11px] font-bold text-zinc-500">
                  {d.kind === 'COURTESY' ? 'Cortesía' : d.kind === 'PRIVATE' ? 'Privada' : 'Pública'}
                  {d.kind !== 'COURTESY' ? ` · ${money(d.price)}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                {d.unlimited ? 'Sin tope' : `${(d.capacity ?? 0) - (d.available ?? 0)}/${d.capacity ?? 0}`}
              </span>
            </li>
          ))}
          {(data.denominations ?? []).length === 0 && (
            <li className="px-5 py-6 text-center text-xs font-bold text-zinc-500">Este evento no tiene denominaciones todavía.</li>
          )}
        </ul>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tile(data.courtesies?.scope === 'MINE' ? 'Mis cortesías' : 'Cortesías del evento', data.courtesies?.sent ?? 0)}
        {tile('Personales', data.courtesies?.personal ?? 0, 'text-neon-purple')}
        {tile('Libres', data.courtesies?.libre ?? 0, 'text-neon-green')}
        {tile('Asistieron', data.courtesies?.attended ?? 0, 'text-orange-400')}
      </div>

      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 flex items-center gap-2">
        <Users className="w-3.5 h-3.5" /> Aforo tomado {data.aforo?.taken ?? 0} de {data.aforo?.capacity ?? 0}
      </p>
    </div>
  );
}
