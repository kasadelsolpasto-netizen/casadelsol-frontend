"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, X, Plus, Pencil, Trash2, Banknote, Power } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FormModal, { Field, inputCls } from '@/components/ui/FormModal';
import StatStrip, { BalanceChip } from '@/components/artists/StatStrip';
import AccordionRow from '@/components/ui/AccordionRow';
import Pager from '@/components/ui/Pager';
import { paginate } from '@/lib/paging';
import ArtistAvatar from '@/components/artists/ArtistAvatar';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { formatCOP } from '@/lib/sales-view';
import { PAYMENT_METHODS, fmtDate, parseMoney, type ArtistBookingView, type ArtistDetail, type ArtistPaymentView, type ArtistPromoterCode } from '@/lib/artists';

type Modal =
  | { kind: 'profile' }
  | { kind: 'booking'; booking: ArtistBookingView | null }
  | { kind: 'payment'; bookingId: string }
  | { kind: 'promoter' }
  | null;

type Confirm =
  | { kind: 'removeBooking'; booking: ArtistBookingView }
  | { kind: 'removePayment'; payment: ArtistPaymentView }
  | { kind: 'toggle' }
  | { kind: 'deleteArtist' }
  | null;

const todayInput = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

export default function AdminArtistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [events, setEvents] = useState<Array<{ id: string; title: string; date: string; ticket_types: Array<{ id: string; name: string }> }>>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const [modal, setModal] = useState<Modal>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  // campos de los formularios
  const [fStage, setFStage] = useState('');
  const [fBio, setFBio] = useState('');
  const [fPhoto, setFPhoto] = useState('');
  const [fEvent, setFEvent] = useState('');
  const [fRole, setFRole] = useState('');
  const [fFee, setFFee] = useState('');
  const [fNotes, setFNotes] = useState('');
  const [fQuota, setFQuota] = useState('2');
  const [fType, setFType] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageEv, setPageEv] = useState(1);
  const [pagePay, setPagePay] = useState(1);
  const [pageCode, setPageCode] = useState(1);
  const [openCodeId, setOpenCodeId] = useState<string | null>(null);
  const codePage = paginate(artist?.promoter_codes ?? [], pageCode, 5);
  const [fCode, setFCode] = useState('');
  const [fPromoEvent, setFPromoEvent] = useState('');
  const [fPerc, setFPerc] = useState('0');
  const [fLimit, setFLimit] = useState('');
  const evPage = paginate(artist?.bookings ?? [], pageEv, 8);
  const payPage = paginate(artist?.payments ?? [], pagePay, 8);
  const [fBooking, setFBooking] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fMethod, setFMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [fDate, setFDate] = useState(todayInput());
  const [fNote, setFNote] = useState('');

  const load = useCallback(async () => {
    try {
      const [a, ev] = await Promise.all([apiFetch<ArtistDetail>(`/artists/${id}`), apiFetch<Array<{ id: string; title: string; date: string; ticket_types?: Array<{ id: string; name: string }> }>>('/events/admin/all')]);
      setArtist(a);
      setEvents(ev.map((e) => ({ id: e.id, title: e.title, date: e.date, ticket_types: (e.ticket_types ?? []).map((t) => ({ id: t.id, name: t.name })) })));
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof ApiError ? e.message : 'No se pudo cargar el artista. Recarga la página.' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const bookedIds = useMemo(() => new Set((artist?.bookings ?? []).map((b) => b.event.id)), [artist]);
  const freeEvents = events.filter((e) => !bookedIds.has(e.id));
  const bookingEventId = modal?.kind === 'booking' ? (modal.booking ? modal.booking.event.id : fEvent) : '';
  const typeOptions = events.find((e) => e.id === bookingEventId)?.ticket_types ?? [];

  const closeAll = () => {
    if (busy) return;
    setModal(null);
    setConfirm(null);
    setFormError('');
  };

  /** Ejecuta una acción y, si sale bien, recarga y cierra; si falla muestra el error del servidor dentro de la ventana. */
  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    setFormError('');
    try {
      await fn();
      setModal(null);
      setConfirm(null);
      await load();
      setNotice({ tone: 'ok', text: okText });
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const openProfile = () => {
    if (!artist) return;
    setFStage(artist.stage_name);
    setFBio(artist.bio ?? '');
    setFPhoto(artist.photo_url ?? '');
    setFormError('');
    setModal({ kind: 'profile' });
  };

  const openBooking = (booking: ArtistBookingView | null) => {
    setFEvent('');
    setFRole(booking?.role ?? '');
    setFFee(booking ? String(booking.fee) : '');
    setFNotes(booking?.notes ?? '');
    setFQuota(String(booking?.courtesy_quota ?? 2));
    setFType(booking?.courtesy_ticket_type?.id ?? '');
    setFormError('');
    setModal({ kind: 'booking', booking });
  };

  const openPayment = (booking: ArtistBookingView | null) => {
    setFBooking(booking?.id ?? '');
    setFAmount(booking && booking.pending > 0 ? String(booking.pending) : '');
    setFMethod(PAYMENT_METHODS[0]);
    setFDate(todayInput());
    setFNote('');
    setFormError('');
    setModal({ kind: 'payment', bookingId: booking?.id ?? '' });
  };

  const saveProfile = () =>
    run(
      () =>
        apiFetch(`/artists/${id}`, {
          method: 'PUT',
          body: { stage_name: fStage.trim(), bio: fBio.trim() || null, photo_url: fPhoto.trim() || null },
        }),
      'Perfil actualizado.',
    );

  const saveBooking = () => {
    if (modal?.kind !== 'booking') return;
    const fee = parseMoney(fFee === '' ? '0' : fFee);
    if (fee === null) {
      setFormError('El cachet no es un monto válido. Escribe solo números, por ejemplo 1500000.');
      return;
    }
    const quota = Number(fQuota.trim() === '' ? '0' : fQuota.trim());
    if (!Number.isInteger(quota) || quota < 0 || quota > 20) {
      setFormError('Las cortesías deben ser un número entero entre 0 y 20.');
      return;
    }
    const editing = modal.booking;
    if (!editing && !fEvent) {
      setFormError('Elige el evento.');
      return;
    }
    return run(
      () =>
        editing
          ? apiFetch(`/artists/${id}/bookings/${editing.id}`, { method: 'PUT', body: { role: fRole.trim(), fee, notes: fNotes.trim() || null, courtesy_quota: quota, courtesy_ticket_type_id: fType || null } })
          : apiFetch(`/artists/${id}/bookings`, { method: 'POST', body: { event_id: fEvent, role: fRole.trim(), fee, notes: fNotes.trim() || null, courtesy_quota: quota, courtesy_ticket_type_id: fType || null } }),
      editing ? 'Cachet actualizado.' : 'Artista agregado al evento.',
    );
  };

  const openPromoter = () => {
    setFCode('');
    setFPromoEvent('');
    setFPerc('0');
    setFLimit('');
    setFormError('');
    setModal({ kind: 'promoter' });
  };

  const savePromoter = () => {
    const code = fCode.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      setFormError('El código debe tener de 3 a 30 letras o números, sin espacios.');
      return;
    }
    const perc = fPerc.trim() === '' ? 0 : Number(fPerc.trim());
    if (!Number.isInteger(perc) || perc < 0 || perc > 100) {
      setFormError('El descuento debe ser un número entero entre 0 y 100.');
      return;
    }
    const limit = fLimit.trim() === '' ? null : Number(fLimit.trim());
    if (limit !== null && (!Number.isInteger(limit) || limit < 1)) {
      setFormError('El máximo de entradas debe ser un número entero mayor que 0, o déjalo vacío.');
      return;
    }
    const email = artist?.user?.email;
    if (!email) {
      setFormError('Este artista no tiene correo registrado.');
      return;
    }
    return run(
      () =>
        apiFetch('/promoters', {
          method: 'POST',
          body: { code, promoter_email: email, discount_perc: perc, event_id: fPromoEvent || undefined, ticket_limit: limit ?? undefined },
        }),
      `Código ${code} creado.`,
    );
  };

  const togglePromoter = async (c: ArtistPromoterCode) => {
    setBusy(true);
    try {
      await apiFetch(`/promoters/${c.id}/toggle`, { method: 'PATCH', body: { is_active: !c.is_active } });
      await load();
      setNotice({ tone: 'ok', text: c.is_active ? `Código ${c.code} pausado.` : `Código ${c.code} activado.` });
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setBusy(false);
    }
  };

  const savePayment = () => {
    const amount = parseMoney(fAmount);
    if (amount === null || amount <= 0) {
      setFormError('El monto no es válido. Escribe solo números, por ejemplo 500000.');
      return;
    }
    return run(
      () =>
        apiFetch(`/artists/${id}/payments`, {
          method: 'POST',
          body: {
            amount,
            booking_id: fBooking || null,
            method: fMethod,
            note: fNote.trim() || null,
            paid_at: fDate ? `${fDate}T12:00:00-05:00` : undefined,
          },
        }),
      `Pago de ${formatCOP(amount)} registrado.`,
    );
  };

  const doConfirm = () => {
    if (!confirm) return;
    switch (confirm.kind) {
      case 'removeBooking':
        return run(() => apiFetch(`/artists/${id}/bookings/${confirm.booking.id}`, { method: 'DELETE' }), 'Se quitó el artista de ese evento.');
      case 'removePayment':
        return run(() => apiFetch(`/artists/${id}/payments/${confirm.payment.id}`, { method: 'DELETE' }), 'Pago eliminado.');
      case 'toggle':
        return run(() => apiFetch(`/artists/${id}`, { method: 'PUT', body: { is_active: !artist?.is_active } }), artist?.is_active ? 'Artista desactivado.' : 'Artista activado.');
      case 'deleteArtist':
        setBusy(true);
        setFormError('');
        return apiFetch(`/artists/${id}`, { method: 'DELETE' })
          .then(() => router.push('/raves/admin/artists'))
          .catch((e) => {
            setFormError(e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');
            setBusy(false);
          });
    }
  };

  const hasHistory = !!artist && (artist.bookings.length > 0 || artist.payments.length > 0);

  const confirmText = (() => {
    if (!confirm) return { title: '', body: '', label: '', danger: false };
    switch (confirm.kind) {
      case 'removeBooking':
        return { title: 'Quitar del evento', body: `Se quita a ${artist?.stage_name} de «${confirm.booking.event.title}» y su cachet de ${formatCOP(confirm.booking.fee)} deja de contar.`, label: 'Quitar', danger: true };
      case 'removePayment':
        return { title: 'Eliminar pago', body: `Se elimina el pago de ${formatCOP(confirm.payment.amount)} del ${fmtDate(confirm.payment.paid_at)}. Lo que se le debe al artista vuelve a subir.`, label: 'Eliminar pago', danger: true };
      case 'toggle':
        return artist?.is_active
          ? { title: 'Desactivar artista', body: 'Queda marcado como inactivo. No se borra nada: eventos y pagos se conservan.', label: 'Desactivar', danger: false }
          : { title: 'Activar artista', body: 'Vuelve a quedar como artista activo.', label: 'Activar', danger: false };
      case 'deleteArtist':
        return { title: 'Eliminar perfil de artista', body: 'Se elimina el perfil. La cuenta de usuario NO se borra. Solo se puede si no tiene eventos ni pagos.', label: 'Eliminar perfil', danger: true };
    }
  })();

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto">
        <Link href="/raves/admin/artists" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Artistas
        </Link>

        {notice && (
          <div role="status" className={`mb-6 p-3 rounded-xl border flex items-start gap-2 text-xs font-bold ${notice.tone === 'ok' ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="shrink-0 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 text-neon-purple animate-spin" /></div>
        ) : !artist ? (
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-center p-16">No se encontró el artista.</p>
        ) : (
          <>
            <header className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                <ArtistAvatar url={artist.photo_url} iconClass="w-7 h-7" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-4xl font-black uppercase tracking-wide text-white break-words">{artist.stage_name}</h1>
                <p className="text-xs text-zinc-500 truncate">{artist.user?.name} · {artist.user?.email}</p>
                {!artist.is_active && <span className="inline-block mt-2 text-[9px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-black uppercase tracking-widest">Inactivo</span>}
                {artist.bio && <p className="text-sm text-zinc-400 mt-3 whitespace-pre-line">{artist.bio}</p>}
              </div>
            </header>

            <div className="flex flex-wrap gap-2 mb-6">
              <button type="button" onClick={openProfile} className="h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-zinc-600"><Pencil className="w-3.5 h-3.5" /> Editar perfil</button>
              <button type="button" onClick={() => { setFormError(''); setConfirm({ kind: 'toggle' }); }} className="h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-zinc-600"><Power className="w-3.5 h-3.5" /> {artist.is_active ? 'Desactivar' : 'Activar'}</button>
              {!hasHistory && (
                <button type="button" onClick={() => { setFormError(''); setConfirm({ kind: 'deleteArtist' }); }} className="h-10 px-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-red-500/60"><Trash2 className="w-3.5 h-3.5" /> Eliminar perfil</button>
              )}
            </div>

            <div className="mb-8"><StatStrip fee={artist.total_fee} paid={artist.total_paid} pending={artist.pending} /></div>

            <section className="mb-10">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Eventos</h2>
                <button type="button" onClick={() => openBooking(null)} disabled={freeEvents.length === 0} className="h-10 px-4 rounded-xl bg-neon-green text-black text-[11px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Agregar a un evento</button>
              </div>
              {artist.bookings.length === 0 ? (
                <p className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Todavía no está en ningún evento.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {evPage.rows.map((b) => (
                      <AccordionRow
                        key={b.id}
                        id={`bk-${b.id}`}
                        open={openId === b.id}
                        onToggle={() => setOpenId(openId === b.id ? null : b.id)}
                        header={
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black uppercase tracking-wide text-white truncate">{b.event.title}</p>
                              <p className="text-[11px] text-zinc-500 truncate">{fmtDate(b.event.date)}{b.role ? ` · ${b.role}` : ''}</p>
                            </div>
                            <BalanceChip pending={b.pending} />
                          </div>
                        }
                      >
                        <div className="grid grid-cols-3 gap-3">
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Cachet</p><p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{formatCOP(b.fee)}</p></div>
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pagado</p><p className="text-[13px] sm:text-sm font-black text-neon-green whitespace-nowrap">{formatCOP(b.paid)}</p></div>
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Cortesías</p><p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{b.courtesies.length} de {b.courtesy_quota}</p></div>
                        </div>
                        {b.notes && <p className="text-[11px] text-zinc-400 mt-2">{b.notes}</p>}
                        {b.courtesy_quota > 0 && (
                          <p className="text-[11px] text-zinc-500 mt-2">
                            {b.courtesy_ticket_type ? `Tipo: ${b.courtesy_ticket_type.name}` : 'Falta elegir el tipo de entrada de sus cortesías.'}
                            {b.courtesies.length > 0 ? ` · ${b.courtesies.map((c) => c.name).join(', ')}` : ''}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button type="button" onClick={() => openPayment(b)} className="h-9 px-3 rounded-lg bg-neon-purple/20 border border-neon-purple/40 text-neon-purple text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"><Banknote className="w-3.5 h-3.5" /> Registrar pago</button>
                          <button type="button" onClick={() => openBooking(b)} className="h-9 px-3 rounded-lg border border-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:border-zinc-600"><Pencil className="w-3.5 h-3.5" /> Editar</button>
                          <button type="button" onClick={() => { setFormError(''); setConfirm({ kind: 'removeBooking', booking: b }); }} className="h-9 px-3 rounded-lg border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:border-red-500/50 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /> Quitar</button>
                        </div>
                      </AccordionRow>
                    ))}
                  </ul>
                  {evPage.p.totalPages > 1 && <Pager p={evPage.p} onPage={(n) => { setOpenId(null); setPageEv(n); }} />}
                </>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Pagos</h2>
                <button type="button" onClick={() => openPayment(null)} disabled={artist.bookings.length === 0} className="h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-zinc-600 disabled:opacity-40"><Banknote className="w-3.5 h-3.5" /> Registrar pago</button>
              </div>
              {artist.payments.length === 0 ? (
                <p className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Todavía no se le ha pagado nada.</p>
              ) : (
                <>
                  <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl bg-zinc-950 overflow-hidden">
                    {payPage.rows.map((p) => (
                      <li key={p.id} className="px-3 py-2 flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] text-zinc-400 truncate">{fmtDate(p.paid_at)}{p.method ? ` · ${p.method}` : ''}{p.event_title ? ` · ${p.event_title}` : ''}</p>
                          {p.note && <p className="text-[11px] text-zinc-600 truncate">{p.note}</p>}
                        </div>
                        <p className="text-sm font-black text-neon-green shrink-0">{formatCOP(p.amount)}</p>
                        <button type="button" onClick={() => { setFormError(''); setConfirm({ kind: 'removePayment', payment: p }); }} aria-label="Eliminar pago" className="shrink-0 w-9 h-9 rounded-lg border border-zinc-800 flex items-center justify-center text-zinc-500 hover:border-red-500/50 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </li>
                    ))}
                  </ul>
                  {payPage.p.totalPages > 1 && <Pager p={payPage.p} onPage={setPagePay} />}
                </>
              )}
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Ventas como promotor</h2>
                <button type="button" onClick={openPromoter} className="h-10 px-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-zinc-600"><Plus className="w-3.5 h-3.5" /> Dar código</button>
              </div>
              <p className="text-[11px] text-zinc-500 mb-3">Con un código, {artist.stage_name} puede vender entradas y tiene su panel de ventas en la pestaña Promotor de su cuenta.</p>
              {(artist.promoter_codes ?? []).length === 0 ? (
                <p className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Todavía no tiene códigos de venta.</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {codePage.rows.map((c) => (
                      <AccordionRow
                        key={c.id}
                        id={`pc-${c.id}`}
                        open={openCodeId === c.id}
                        onToggle={() => setOpenCodeId(openCodeId === c.id ? null : c.id)}
                        header={
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-black uppercase tracking-wide text-white truncate">{c.code}</p>
                              <p className="text-[11px] text-zinc-500 truncate">{c.event ? c.event.title : 'Todos los eventos'}</p>
                            </div>
                            <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest ${c.is_active ? 'text-neon-green' : 'text-zinc-500'}`}>{c.is_active ? 'Activo' : 'Pausado'}</span>
                          </div>
                        }
                      >
                        <div className="grid grid-cols-3 gap-3">
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Descuento</p><p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{c.discount_perc}%</p></div>
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Vendidas</p><p className="text-[13px] sm:text-sm font-black text-neon-green whitespace-nowrap">{c.tickets_sold}{c.ticket_limit ? ` de ${c.ticket_limit}` : ''}</p></div>
                          <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Compras</p><p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{c.uses_count}</p></div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <button type="button" onClick={() => togglePromoter(c)} className="h-9 px-3 rounded-lg border border-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:border-zinc-600"><Power className="w-3.5 h-3.5" /> {c.is_active ? 'Pausar' : 'Activar'}</button>
                          <Link href="/raves/admin/promoters" className="h-9 px-3 rounded-lg border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center hover:border-zinc-600 hover:text-white">Ver en Promotores</Link>
                        </div>
                      </AccordionRow>
                    ))}
                  </ul>
                  {codePage.p.totalPages > 1 && <Pager p={codePage.p} onPage={(n) => { setOpenCodeId(null); setPageCode(n); }} />}
                </>
              )}
            </section>

            <FormModal open={modal?.kind === 'promoter'} title="Dar código de venta" submitLabel="Crear código" busy={busy} error={formError} onSubmit={savePromoter} onClose={closeAll}>
              <Field label="Código" hint="Lo que se escribe en el enlace o al vender. Solo letras y números, por ejemplo DJNICO.">
                <input value={fCode} onChange={(e) => setFCode(e.target.value.toUpperCase())} maxLength={30} className={inputCls} placeholder="DJNICO" />
              </Field>
              <Field label="Evento" hint="Si eliges uno, el código solo vale para ese evento.">
                <select value={fPromoEvent} onChange={(e) => setFPromoEvent(e.target.value)} className={inputCls}>
                  <option value="">— Todos los eventos —</option>
                  {events.map((e) => (
                    <option key={e.id} value={e.id}>{e.title} · {fmtDate(e.date)}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Descuento (%)" hint="0 si solo cuenta ventas."><input inputMode="numeric" value={fPerc} onChange={(e) => setFPerc(e.target.value)} className={inputCls} placeholder="0" /></Field>
                <Field label="Máximo de entradas" hint="Vacío = sin límite."><input inputMode="numeric" value={fLimit} onChange={(e) => setFLimit(e.target.value)} className={inputCls} placeholder="50" /></Field>
              </div>
            </FormModal>

            <FormModal open={modal?.kind === 'profile'} title="Editar perfil" submitLabel="Guardar" busy={busy} error={formError} onSubmit={saveProfile} onClose={closeAll}>
              <Field label="Nombre artístico"><input value={fStage} onChange={(e) => setFStage(e.target.value)} maxLength={80} className={inputCls} /></Field>
              <Field label="Descripción (opcional)"><textarea value={fBio} onChange={(e) => setFBio(e.target.value)} maxLength={1000} rows={4} className={`${inputCls} h-auto py-3`} /></Field>
              <Field label="Foto (enlace, opcional)" hint="Enlace https:// de una imagen alojada en Cloudinary o Supabase. Las fotos de otras páginas no se muestran (bloqueo de seguridad). Más adelante se podrá subir la foto directamente."><input value={fPhoto} onChange={(e) => setFPhoto(e.target.value)} className={inputCls} placeholder="https://..." /></Field>
            </FormModal>

            <FormModal
              open={modal?.kind === 'booking'}
              title={modal?.kind === 'booking' && modal.booking ? `Cachet · ${modal.booking.event.title}` : 'Agregar a un evento'}
              submitLabel="Guardar"
              busy={busy}
              error={formError}
              onSubmit={saveBooking}
              onClose={closeAll}
            >
              {modal?.kind === 'booking' && !modal.booking && (
                <Field label="Evento">
                  <select value={fEvent} onChange={(e) => { setFEvent(e.target.value); setFType(''); }} className={inputCls}>
                    <option value="">— Elige un evento —</option>
                    {freeEvents.map((e) => (
                      <option key={e.id} value={e.id}>{e.title} · {fmtDate(e.date)}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Cachet acordado (COP)" hint="Lo que se le paga por este evento. Puedes dejarlo en 0 y definirlo después.">
                <input inputMode="numeric" value={fFee} onChange={(e) => setFFee(e.target.value)} className={inputCls} placeholder="1500000" />
              </Field>
              <Field label="Función (opcional)"><input value={fRole} onChange={(e) => setFRole(e.target.value)} maxLength={80} className={inputCls} placeholder="DJ, Headliner, Invitado…" /></Field>
              <Field label="Nota (opcional)"><input value={fNotes} onChange={(e) => setFNotes(e.target.value)} maxLength={300} className={inputCls} /></Field>
              <Field label="Cortesías del artista" hint="Cuántas entradas gratis puede repartir él mismo en este evento (0 a 20).">
                <input inputMode="numeric" value={fQuota} onChange={(e) => setFQuota(e.target.value)} className={inputCls} placeholder="2" />
              </Field>
              <Field label="Tipo de entrada de esas cortesías" hint="Sin elegir uno, el artista no puede enviarlas. Elige primero el evento.">
                <select value={fType} onChange={(e) => setFType(e.target.value)} className={inputCls} disabled={typeOptions.length === 0}>
                  <option value="">— Sin definir —</option>
                  {typeOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </Field>
            </FormModal>

            <FormModal open={modal?.kind === 'payment'} title="Registrar pago" submitLabel="Registrar" busy={busy} error={formError} onSubmit={savePayment} onClose={closeAll}>
              <Field label="Evento">
                <select
                  value={fBooking}
                  onChange={(e) => {
                    setFBooking(e.target.value);
                    const b = artist.bookings.find((x) => x.id === e.target.value);
                    if (b && b.pending > 0) setFAmount(String(b.pending));
                  }}
                  className={inputCls}
                >
                  <option value="">— Pago general —</option>
                  {artist.bookings.map((b) => (
                    <option key={b.id} value={b.id}>{b.event.title} (pendiente {formatCOP(Math.max(b.pending, 0))})</option>
                  ))}
                </select>
              </Field>
              <Field label="Monto (COP)"><input inputMode="numeric" value={fAmount} onChange={(e) => setFAmount(e.target.value)} className={inputCls} placeholder="500000" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Método">
                  <select value={fMethod} onChange={(e) => setFMethod(e.target.value)} className={inputCls}>
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Fecha"><input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)} className={inputCls} /></Field>
              </div>
              <Field label="Nota (opcional)"><input value={fNote} onChange={(e) => setFNote(e.target.value)} maxLength={300} className={inputCls} placeholder="Ej. Anticipo" /></Field>
            </FormModal>

            <ConfirmDialog
              open={confirm !== null}
              title={confirmText.title}
              confirmLabel={confirmText.label}
              tone={confirmText.danger ? 'danger' : 'primary'}
              busy={busy}
              error={formError}
              onConfirm={doConfirm}
              onCancel={closeAll}
            >
              <p>{confirmText.body}</p>
            </ConfirmDialog>
          </>
        )}
      </div>
    </AdminGuard>
  );
}