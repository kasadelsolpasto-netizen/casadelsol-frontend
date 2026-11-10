"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Music, Plus, ChevronRight } from 'lucide-react';
import FormModal, { Field, inputCls } from '@/components/ui/FormModal';
import StatStrip, { BalanceChip } from '@/components/artists/StatStrip';
import AccordionRow from '@/components/ui/AccordionRow';
import Pager from '@/components/ui/Pager';
import { paginate } from '@/lib/paging';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { formatCOP } from '@/lib/sales-view';
import { parseMoney, type ArtistListItem, type EventLineup } from '@/lib/artists';

/** Pestaña "Artistas" de un evento: quiénes tocan, cachet de cada uno, lo pagado y lo pendiente. */
export default function EventArtists({ eventId }: { eventId: string }) {
  const [lineup, setLineup] = useState<EventLineup | null>(null);
  const [all, setAll] = useState<ArtistListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pg = paginate(lineup?.artists ?? [], page, 8);

  const [open, setOpen] = useState(false);
  const [artistId, setArtistId] = useState('');
  const [role, setRole] = useState('');
  const [fee, setFee] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async () => {
    try {
      const [l, a] = await Promise.all([apiFetch<EventLineup>(`/artists/event/${eventId}`), apiFetch<ArtistListItem[]>('/artists')]);
      setLineup(l);
      setAll(a);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'No se pudieron cargar los artistas del evento.');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  const inEvent = new Set((lineup?.artists ?? []).map((a) => a.artist_id));
  const available = all.filter((a) => a.is_active && !inEvent.has(a.id));

  const openForm = () => {
    setArtistId('');
    setRole('');
    setFee('');
    setFormError('');
    setOpen(true);
  };

  const submit = async () => {
    if (!artistId) {
      setFormError('Elige el artista.');
      return;
    }
    const amount = parseMoney(fee === '' ? '0' : fee);
    if (amount === null) {
      setFormError('El cachet no es un monto válido. Escribe solo números, por ejemplo 1500000.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      await apiFetch(`/artists/${artistId}/bookings`, { method: 'POST', body: { event_id: eventId, role: role.trim(), fee: amount } });
      setOpen(false);
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 text-neon-purple animate-spin" /></div>;

  return (
    <div>
      {loadError && <p role="alert" className="mb-4 text-xs font-bold text-red-400">{loadError}</p>}

      {lineup && lineup.artists.length > 0 && (
        <div className="mb-4"><StatStrip fee={lineup.total_fee} paid={lineup.total_paid} pending={lineup.pending} /></div>
      )}

      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-white">Artistas del evento</h2>
        <button type="button" onClick={openForm} disabled={available.length === 0} className="h-10 px-4 rounded-xl bg-neon-green text-black text-[11px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {!lineup || lineup.artists.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl">
          <Music className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-xs text-zinc-500">Todavía no hay artistas en este evento.</p>
          {all.length === 0 && (
            <p className="text-xs text-zinc-600 mt-2">Primero crea el perfil del artista en <Link href="/raves/admin/artists" className="text-neon-purple underline">Artistas</Link>.</p>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {pg.rows.map((a) => (
              <AccordionRow
                key={a.booking_id}
                id={`ea-${a.booking_id}`}
                open={openId === a.booking_id}
                onToggle={() => setOpenId(openId === a.booking_id ? null : a.booking_id)}
                header={
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-wide text-white truncate">{a.stage_name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">{a.role || 'Artista'} · Cortesías {a.courtesies_used}/{a.courtesy_quota}</p>
                    </div>
                    <BalanceChip pending={a.pending} />
                  </div>
                }
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Cachet</p><p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{formatCOP(a.fee)}</p></div>
                  <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pagado</p><p className="text-[13px] sm:text-sm font-black text-neon-green whitespace-nowrap">{formatCOP(a.paid)}</p></div>
                </div>
                <Link href={`/raves/admin/artists/${a.artist_id}`} className="mt-3 h-10 w-full rounded-lg border border-zinc-700 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:border-neon-purple">
                  Abrir artista <ChevronRight className="w-4 h-4" />
                </Link>
              </AccordionRow>
            ))}
          </ul>
          {pg.p.totalPages > 1 && <Pager p={pg.p} onPage={(n) => { setOpenId(null); setPage(n); }} />}
        </>
      )}
      <p className="mt-4 text-[11px] text-zinc-600">Para registrar pagos o cambiar el cachet, abre al artista.</p>

      <FormModal open={open} title="Agregar artista al evento" submitLabel="Agregar" busy={busy} error={formError} onSubmit={submit} onClose={() => !busy && setOpen(false)}>
        <Field label="Artista">
          <select value={artistId} onChange={(e) => setArtistId(e.target.value)} className={inputCls}>
            <option value="">— Elige un artista —</option>
            {available.map((a) => <option key={a.id} value={a.id}>{a.stage_name}</option>)}
          </select>
        </Field>
        <Field label="Cachet acordado (COP)" hint="Puedes dejarlo en 0 y definirlo después.">
          <input inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} placeholder="1500000" />
        </Field>
        <Field label="Función (opcional)"><input value={role} onChange={(e) => setRole(e.target.value)} maxLength={80} className={inputCls} placeholder="DJ, Headliner, Invitado…" /></Field>
      </FormModal>
    </div>
  );
}