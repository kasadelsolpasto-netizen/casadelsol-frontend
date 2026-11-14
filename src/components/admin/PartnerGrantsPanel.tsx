"use client";
import { useEffect, useMemo, useState } from 'react';
import { Loader2, ShieldCheck, Plus, Pencil, Trash2, PauseCircle, PlayCircle, X, Check, AlertTriangle } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { FACULTIES, GRADE_LABEL, courtesyRemaining, facultySummary, gradeOf, grantWarnings, type Grant } from '@/lib/partners';

/**
 * SOCIOS: el grado de promotor que puede más.
 *
 * Un promotor normal vende con su código. Un socio, en el evento para el que se lo aprueba, además puede
 * emitir cortesías contra un cupo, ver las métricas del evento y crear boletas privadas. Cada facultad se
 * habilita por separado y la habilitación se da y se quita sin tocar la cuenta de la persona.
 */

interface PromoterOption {
  promoter_email?: string;
  promoter_name?: string;
}

type Form = {
  promoter_email: string;
  event_id: string;
  can_issue_courtesies: boolean;
  courtesy_quota: string;
  can_set_courtesy_kind: boolean;
  can_view_metrics: boolean;
  can_view_revenue: boolean;
  can_create_private_tickets: boolean;
  private_ticket_min_price: string;
  notes: string;
};

const EMPTY: Form = {
  promoter_email: '',
  event_id: '',
  can_issue_courtesies: true,
  courtesy_quota: '10',
  can_set_courtesy_kind: false,
  can_view_metrics: true,
  can_view_revenue: false,
  can_create_private_tickets: false,
  private_ticket_min_price: '',
  notes: '',
};

export default function PartnerGrantsPanel({
  events,
  promoters,
}: {
  events: Array<{ id: string; title: string; date?: string | null }>;
  /** Promotores ya existentes, para no tener que escribir el correo a mano. */
  promoters: PromoterOption[];
}) {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Grant | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      setGrants(await apiFetch<Grant[]>('/partners'));
      setError('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los socios.');
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  // Correos de promotores sin repetir, para el selector.
  const emails = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of promoters) {
      const mail = (p.promoter_email ?? '').trim().toLowerCase();
      if (mail && !seen.has(mail)) seen.set(mail, p.promoter_name || mail);
    }
    return Array.from(seen, ([email, name]) => ({ email, name }));
  }, [promoters]);

  const eventTitle = (id: string | null) => (id ? events.find((e) => e.id === id)?.title ?? 'Evento' : 'Todos los eventos (socio de la casa)');

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setError('');
    setNotice([]);
    setOpen(true);
  };

  const startEdit = (g: Grant) => {
    setEditing(g);
    setForm({
      promoter_email: g.user?.email ?? '',
      event_id: g.event_id ?? '',
      can_issue_courtesies: g.can_issue_courtesies,
      courtesy_quota: String(g.courtesy_quota),
      can_set_courtesy_kind: g.can_set_courtesy_kind,
      can_view_metrics: g.can_view_metrics,
      can_view_revenue: g.can_view_revenue,
      can_create_private_tickets: g.can_create_private_tickets,
      private_ticket_min_price: g.private_ticket_min_price === null ? '' : String(g.private_ticket_min_price),
      notes: g.notes ?? '',
    });
    setError('');
    setNotice([]);
    setOpen(true);
  };

  const warnings = grantWarnings({ ...form, courtesy_quota: Number(form.courtesy_quota) });

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<Grant & { warnings?: string[] }>('/partners', {
        method: 'POST',
        body: {
          promoter_email: form.promoter_email.trim(),
          event_id: form.event_id || null,
          can_issue_courtesies: form.can_issue_courtesies,
          courtesy_quota: Number(form.courtesy_quota) || 0,
          can_set_courtesy_kind: form.can_set_courtesy_kind,
          can_view_metrics: form.can_view_metrics,
          can_view_revenue: form.can_view_revenue,
          can_create_private_tickets: form.can_create_private_tickets,
          private_ticket_min_price: form.private_ticket_min_price === '' ? null : Number(form.private_ticket_min_price),
          notes: form.notes,
          is_active: editing ? editing.is_active : true,
        },
      });
      setNotice(res.warnings ?? []);
      setOpen(false);
      setEditing(null);
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la habilitación.');
    }
    setBusy(false);
  };

  const setActive = async (g: Grant, isActive: boolean) => {
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/partners/${g.id}/active`, { method: 'PATCH', body: { is_active: isActive } });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cambiar el estado.');
    }
    setBusy(false);
  };

  const revoke = async (g: Grant) => {
    const who = g.user?.name || g.user?.email || 'esta persona';
    if (!confirm(`¿Quitarle el grado de socio a ${who} en «${eventTitle(g.event_id)}»?\n\nLas cortesías que ya emitió y las boletas privadas que creó NO se tocan.`)) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/partners/${g.id}`, { method: 'DELETE' });
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo quitar la habilitación.');
    }
    setBusy(false);
  };

  const field = (k: keyof Form) => form[k] as boolean;

  return (
    <div className="mb-12">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neon-green" /> Socios
          </h2>
          <p className="text-[11px] font-bold text-zinc-500 mt-1 max-w-xl">
            Grado de promotor que puede emitir cortesías, ver las métricas del evento y crear boletas privadas.
            Se habilita por evento y se quita cuando quieras.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="shrink-0 flex items-center gap-2 bg-neon-green text-black text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:bg-white transition-all"
        >
          <Plus className="w-3 h-3" /> Habilitar socio
        </button>
      </div>

      {error && <p className="mb-3 text-xs font-bold text-red-400">{error}</p>}
      {notice.length > 0 && (
        <div className="mb-3 bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3">
          {notice.map((n, i) => (
            <p key={i} className="text-[11px] font-bold text-yellow-300 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {n}
            </p>
          ))}
        </div>
      )}

      {open && (
        <div className="mb-4 bg-zinc-950 border border-neon-green/30 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-neon-green">
              {editing ? `Editar socio · ${editing.user?.name || editing.user?.email}` : 'Nuevo socio'}
            </h3>
            <button type="button" onClick={() => { setOpen(false); setEditing(null); }} className="text-zinc-600 hover:text-white" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Promotor (correo de su cuenta)</label>
              <input
                type="email"
                list="partner-emails"
                value={form.promoter_email}
                onChange={(e) => setForm({ ...form, promoter_email: e.target.value })}
                disabled={!!editing}
                placeholder="promotor@correo.com"
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green disabled:opacity-60"
              />
              <datalist id="partner-emails">
                {emails.map((e) => (
                  <option key={e.email} value={e.email}>{e.name}</option>
                ))}
              </datalist>
              <p className="text-[10px] font-bold text-zinc-600 mt-1">La persona debe tener cuenta en la página.</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Evento aprobado</label>
              <select
                value={form.event_id}
                onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                disabled={!!editing}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green appearance-none disabled:opacity-60"
              >
                <option value="">Todos los eventos (socio de la casa)</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>{e.title}</option>
                ))}
              </select>
              <p className="text-[10px] font-bold text-zinc-600 mt-1">Solo verá y podrá hacer cosas en este evento.</p>
            </div>
          </div>

          <div className="space-y-2">
            {FACULTIES.map((f) => (
              <label key={String(f.key)} className="flex items-start gap-3 cursor-pointer bg-black border border-zinc-900 rounded-xl px-4 py-3">
                <input
                  type="checkbox"
                  checked={field(f.key as keyof Form)}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.checked } as Form)}
                  className="mt-0.5 accent-neon-green"
                />
                <span>
                  <span className="block text-xs font-black uppercase tracking-widest text-white">{f.label}</span>
                  <span className="block text-[11px] font-bold text-zinc-500">{f.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.can_issue_courtesies && (
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Cupo de cortesías</label>
                <input
                  type="number"
                  min={0}
                  value={form.courtesy_quota}
                  onChange={(e) => setForm({ ...form, courtesy_quota: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green"
                />
                <p className="text-[10px] font-bold text-zinc-600 mt-1">
                  Cuántas cortesías puede emitir en total{editing ? ` (ya emitió ${editing.courtesy_issued})` : ''}.
                </p>
              </div>
            )}
            {form.can_create_private_tickets && (
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Precio mínimo de sus boletas privadas</label>
                <input
                  type="number"
                  min={0}
                  value={form.private_ticket_min_price}
                  onChange={(e) => setForm({ ...form, private_ticket_min_price: e.target.value })}
                  placeholder="Sin mínimo"
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green"
                />
                <p className="text-[10px] font-bold text-zinc-600 mt-1">Por debajo de este precio no podrá crear ninguna.</p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Nota interna <span className="text-zinc-700 normal-case">(opcional)</span></label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej. socio de puerta, responde por la lista de prensa"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-neon-green"
            />
          </div>

          {warnings.length > 0 && (
            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-3 space-y-1">
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] font-bold text-yellow-300 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                </p>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={save}
            disabled={busy || !form.promoter_email.trim()}
            className="w-full bg-neon-green text-black font-black uppercase tracking-widest text-xs py-3.5 rounded-xl hover:bg-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> {editing ? 'Guardar cambios' : 'Habilitar como socio'}</>}
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
      ) : grants.length === 0 ? (
        <div className="text-center py-10 text-zinc-500 border border-dashed border-zinc-800 rounded-xl font-bold uppercase tracking-widest text-xs">
          Todavía no hay socios habilitados.
        </div>
      ) : (
        <div className="space-y-2">
          {grants.map((g) => {
            const grade = gradeOf(g);
            const left = courtesyRemaining(g);
            return (
              <div
                key={g.id}
                className={`flex flex-wrap items-center gap-3 border rounded-xl px-4 py-3 ${
                  g.is_active ? 'border-zinc-800 bg-zinc-900/40' : 'border-zinc-900 bg-black opacity-60'
                }`}
              >
                <div className="flex-1 min-w-[200px]">
                  <p className="font-bold text-white text-sm truncate">
                    {g.user?.name || g.user?.email}
                    <span className={`ml-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      g.is_active ? 'bg-neon-green/10 text-neon-green' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {GRADE_LABEL[grade]}
                    </span>
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">{eventTitle(g.event_id)}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-1">
                    {facultySummary(g).join(' · ') || 'Sin facultades'}
                    {g.can_issue_courtesies && left === 0 && g.courtesy_quota > 0 && (
                      <span className="text-yellow-400"> · súbele el cupo</span>
                    )}
                  </p>
                  {g.notes && <p className="text-[11px] text-zinc-600 italic mt-0.5 truncate">{g.notes}</p>}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button type="button" onClick={() => startEdit(g)} disabled={busy} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-40" title="Editar facultades" aria-label="Editar facultades">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActive(g, !g.is_active)}
                    disabled={busy}
                    className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-40"
                    title={g.is_active ? 'Suspender (sin borrar nada)' : 'Reactivar'}
                    aria-label={g.is_active ? 'Suspender' : 'Reactivar'}
                  >
                    {g.is_active ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                  </button>
                  <button type="button" onClick={() => revoke(g)} disabled={busy} className="p-2 bg-zinc-900 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40" title="Quitar el grado de socio" aria-label="Quitar el grado de socio">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
