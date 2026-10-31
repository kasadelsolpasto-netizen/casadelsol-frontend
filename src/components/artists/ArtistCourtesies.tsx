"use client";
import { useState } from 'react';
import { Ticket, Plus, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pager from '@/components/ui/Pager';
import { paginate } from '@/lib/paging';
import FormModal, { Field, inputCls } from '@/components/ui/FormModal';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { courtesyStatusText, courtesyRemaining, isEventOver, type ArtistBookingView, type ArtistCourtesyItem } from '@/lib/artists';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cortesías del artista para UN evento: cuántas le quedan, a quién se las mandó y cómo van.
 * El cupo y el tipo de entrada los define la organización; aquí solo se escribe a quién se le manda.
 */
export default function ArtistCourtesies({ booking, onChanged }: { booking: ArtistBookingView; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dni, setDni] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [revoking, setRevoking] = useState<ArtistCourtesyItem | null>(null);
  const [gPage, setGPage] = useState(1);
  const gp = paginate(booking.courtesies, gPage, 5);

  if (booking.courtesy_quota <= 0) return null;

  const remaining = courtesyRemaining(booking);
  const over = isEventOver(booking.event.date);
  const hasType = !!booking.courtesy_ticket_type;
  const canSend = remaining > 0 && !over && hasType;

  const openForm = () => {
    setName('');
    setEmail('');
    setDni('');
    setError('');
    setNotice(null);
    setOpen(true);
  };

  const send = async () => {
    const n = name.trim();
    const em = email.trim();
    if (n.length < 2) return setError('Escribe el nombre de tu invitado.');
    if (!EMAIL_RE.test(em)) return setError('Escribe un correo válido: ahí le llega la entrada.');
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch<{ results: Array<{ status: string; message?: string; email_sent?: boolean }> }>(`/artists/me/bookings/${booking.id}/courtesies`, {
        method: 'POST',
        body: { courtesies: [{ name: n, email: em, dni: dni.trim() }] },
      });
      const r = res.results?.[0];
      if (!r || r.status === 'error') {
        setError(r?.message || 'No se pudo enviar. Inténtalo de nuevo.');
        return;
      }
      setOpen(false);
      setNotice({ tone: 'ok', text: r.email_sent === false ? `Cortesía creada para ${n}, pero el correo no salió. Avísale que revise su cuenta o pídele ayuda a la organización.` : `Cortesía enviada a ${em}.` });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/artists/me/courtesies/${revoking.id}`, { method: 'DELETE' });
      setRevoking(null);
      setNotice({ tone: 'ok', text: 'Cortesía anulada. Ya puedes usar ese cupo otra vez.' });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Error de conexión. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5"><Ticket className="w-3.5 h-3.5" /> Tus cortesías</p>
          <p className="text-xs text-white font-bold mt-0.5">
            Te quedan {remaining} de {booking.courtesy_quota}
            {booking.courtesy_ticket_type ? <span className="text-zinc-500 font-normal"> · {booking.courtesy_ticket_type.name}</span> : null}
          </p>
        </div>
        {canSend && (
          <button type="button" onClick={openForm} className="shrink-0 h-10 px-3 rounded-lg bg-neon-green text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Enviar
          </button>
        )}
      </div>

      {!hasType && <p className="text-[11px] text-zinc-500 mt-2">La organización todavía no define el tipo de entrada de tus cortesías. Cuando lo haga, aquí podrás enviarlas.</p>}
      {hasType && over && <p className="text-[11px] text-zinc-500 mt-2">Este evento ya pasó.</p>}
      {hasType && !over && remaining <= 0 && <p className="text-[11px] text-zinc-500 mt-2">Ya usaste todas. Si te equivocaste con alguien, anula esa cortesía y el cupo se libera.</p>}

      {notice && <p role="status" className={`text-xs font-bold mt-2 ${notice.tone === 'ok' ? 'text-neon-green' : 'text-red-400'}`}>{notice.text}</p>}

      {booking.courtesies.length > 0 && (
        <>
        <ul className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-black/30">
          {gp.rows.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{c.name}</p>
                <p className="text-[11px] text-zinc-500 truncate">{c.email} · {courtesyStatusText(c.status)}</p>
              </div>
              {!over && (
                <button type="button" onClick={() => { setError(''); setRevoking(c); }} aria-label={`Anular la cortesía de ${c.name}`} className="shrink-0 w-9 h-9 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-red-500/50 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
        {gp.p.totalPages > 1 && <Pager p={gp.p} onPage={setGPage} />}
        </>
      )}

      <FormModal open={open} title={`Cortesía · ${booking.event.title}`} submitLabel="Enviar cortesía" busy={busy} error={error} onSubmit={send} onClose={() => { if (!busy) setOpen(false); }}>
        <p className="text-[11px] text-zinc-500">Le llega un correo con su entrada. Si todavía no tiene cuenta, la crea desde ese correo.</p>
        <Field label="Nombre de tu invitado"><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputCls} autoComplete="off" /></Field>
        <Field label="Correo"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} className={inputCls} autoComplete="off" /></Field>
        <Field label="Cédula (opcional)"><input value={dni} onChange={(e) => setDni(e.target.value)} maxLength={20} className={inputCls} inputMode="numeric" autoComplete="off" /></Field>
      </FormModal>

      <ConfirmDialog open={revoking !== null} title="¿Anular esta cortesía?" confirmLabel="Sí, anular" tone="danger" busy={busy} error={error} onConfirm={revoke} onCancel={() => { if (!busy) setRevoking(null); }}>
        <p>Se anula la entrada de {revoking?.name}. Si ya la tenía en su cuenta, deja de servir. Tu cupo queda libre otra vez.</p>
      </ConfirmDialog>
    </div>
  );
}
