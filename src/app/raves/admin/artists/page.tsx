"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Music, Plus, Loader2, X, ChevronRight, UserCheck, Mail, Copy, MessageCircle, RefreshCw, Trash2, Check, AlertTriangle, Search } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import FormModal, { Field, inputCls } from '@/components/ui/FormModal';
import { BalanceChip } from '@/components/artists/StatStrip';
import AccordionRow from '@/components/ui/AccordionRow';
import Pager from '@/components/ui/Pager';
import { paginate } from '@/lib/paging';
import ArtistAvatar from '@/components/artists/ArtistAvatar';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { formatCOP } from '@/lib/sales-view';
import { whatsappLink } from '@/lib/whatsapp';
import { inviteExpiryText, type ArtistCandidate, type ArtistListItem, type InviteResult, type InviteView } from '@/lib/artists';

type SentInfo = { email: string; link: string; emailSent: boolean; renewed: boolean };

export default function AdminArtistsPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistListItem[]>([]);
  const [candidates, setCandidates] = useState<ArtistCandidate[]>([]);
  const [invites, setInvites] = useState<InviteView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState('');
  const [email, setEmail] = useState('');
  const [stageName, setStageName] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [sent, setSent] = useState<SentInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<InviteView | null>(null);
  const [cancelError, setCancelError] = useState('');
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openInv, setOpenInv] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [pageA, setPageA] = useState(1);
  const [pageI, setPageI] = useState(1);
  const needle = q.trim().toLowerCase();
  const filtered = needle ? artists.filter((a) => a.stage_name.toLowerCase().includes(needle) || a.email.toLowerCase().includes(needle)) : artists;
  const pa = paginate(filtered, pageA, 10);
  const pi = paginate(invites, pageI, 5);

  const load = useCallback(async () => {
    try {
      const [a, c, i] = await Promise.all([
        apiFetch<ArtistListItem[]>('/artists'),
        apiFetch<ArtistCandidate[]>('/artists/candidates'),
        apiFetch<InviteView[]>('/artists/invites'),
      ]);
      setArtists(a);
      setCandidates(c);
      setInvites(i);
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'No se pudieron cargar los artistas. Recarga la página.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openForm = () => {
    setPick('');
    setEmail('');
    setStageName('');
    setFormError('');
    setOpen(true);
  };

  const submit = async () => {
    if (!pick && !email.trim()) {
      setFormError('Elige una cuenta del equipo o escribe el correo del artista.');
      return;
    }
    setBusy(true);
    setFormError('');
    try {
      if (pick) {
        const body: Record<string, unknown> = { user_id: pick, remove_staff: true };
        if (stageName.trim()) body.stage_name = stageName.trim();
        const created = await apiFetch<{ id: string }>('/artists', { method: 'POST', body });
        router.push(`/raves/admin/artists/${created.id}`);
        return;
      }
      const body: Record<string, unknown> = { email: email.trim() };
      if (stageName.trim()) body.stage_name = stageName.trim();
      const res = await apiFetch<InviteResult>('/artists/invite', { method: 'POST', body });
      if (res.mode === 'converted') {
        router.push(`/raves/admin/artists/${res.artist.id}`);
        return;
      }
      setOpen(false);
      setCopied(false);
      setSent({ email: res.invite.email, link: res.link, emailSent: res.email_sent, renewed: false });
      await load();
    } catch (e) {
      setFormError(e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const renew = async (inv: InviteView) => {
    setRenewingId(inv.id);
    setLoadError('');
    try {
      const res = await apiFetch<{ invite: InviteView; link: string; email_sent: boolean }>(`/artists/invites/${inv.id}/renew`, { method: 'POST' });
      setCopied(false);
      setSent({ email: res.invite.email, link: res.link, emailSent: res.email_sent, renewed: true });
      await load();
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : 'No se pudo generar el enlace nuevo.');
    } finally {
      setRenewingId(null);
    }
  };

  const cancelInvite = async () => {
    if (!cancelTarget) return;
    setBusy(true);
    setCancelError('');
    try {
      await apiFetch(`/artists/invites/${cancelTarget.id}`, { method: 'DELETE' });
      setCancelTarget(null);
      await load();
    } catch (e) {
      setCancelError(e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    if (!sent) return;
    try {
      await navigator.clipboard.writeText(sent.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // sin permiso para copiar: el enlace sigue visible para seleccionarlo a mano
    }
  };

  const totalPending = artists.reduce((s, a) => s + (a.pending > 0 ? a.pending : 0), 0);

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-5xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">Artistas</h1>
            <p className="text-zinc-500 mt-2 uppercase tracking-widest text-xs font-bold">Eventos en los que tocan, cachet acordado, pagos y lo que se les debe.</p>
          </div>
          <button
            type="button"
            onClick={openForm}
            className="w-full md:w-auto justify-center bg-neon-green text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-white flex items-center gap-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Nuevo artista
          </button>
        </header>

        {loadError && (
          <div role="alert" className="mb-6 p-3 rounded-xl border bg-red-500/10 border-red-500/30 text-red-400 text-xs font-bold flex items-start gap-2">
            <span className="flex-1">{loadError}</span>
            <button type="button" onClick={() => setLoadError('')} aria-label="Cerrar aviso"><X className="w-4 h-4" /></button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 text-neon-purple animate-spin" /></div>
        ) : (
          <>
            {invites.length > 0 && (
              <section className="mb-8" aria-label="Invitaciones pendientes">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Invitaciones pendientes</h2>
                <ul className="space-y-2">
                  {pi.rows.map((inv) => (
                    <AccordionRow
                      key={inv.id}
                      id={`inv-${inv.id}`}
                      open={openInv === inv.id}
                      onToggle={() => setOpenInv(openInv === inv.id ? null : inv.id)}
                      header={
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-neon-purple shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">{inv.email}</p>
                            <p className={`text-[11px] truncate ${inv.expired ? 'text-red-400' : 'text-zinc-500'}`}>
                              {inv.stage_name ? `${inv.stage_name} · ` : ''}{inviteExpiryText(inv.expires_at, inv.expired)}
                            </p>
                          </div>
                        </div>
                      }
                    >
                      <p className="text-[11px] text-zinc-500 mb-3 break-all">{inv.email} · todavía no crea su cuenta.</p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => renew(inv)} disabled={renewingId === inv.id} className="h-9 px-3 rounded-lg border border-zinc-700 text-zinc-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:border-neon-purple disabled:opacity-50">
                          {renewingId === inv.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Enlace nuevo
                        </button>
                        <button type="button" onClick={() => { setCancelError(''); setCancelTarget(inv); }} className="h-9 px-3 rounded-lg border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 hover:border-red-500/50 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </div>
                    </AccordionRow>
                  ))}
                </ul>
                {pi.p.totalPages > 1 && <Pager p={pi.p} onPage={(n) => { setOpenInv(null); setPageI(n); }} />}
              </section>
            )}

            {artists.length > 0 && (
              <div className="mb-4 px-3 py-2.5 rounded-xl border border-zinc-800 bg-zinc-950 flex items-center justify-between gap-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Total que se les debe</span>
                <span className={`text-base font-black ${totalPending > 0 ? 'text-orange-400' : 'text-neon-green'}`}>{formatCOP(totalPending)}</span>
              </div>
            )}

            {artists.length === 0 ? (
              <div className="p-16 text-center border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center">
                <Music className="w-16 h-16 text-zinc-700 mb-4" />
                <p className="text-zinc-500 font-bold uppercase tracking-widest">Todavía no hay artistas</p>
                <p className="text-zinc-600 text-xs mt-2 max-w-sm">Crea el perfil de un artista con el botón de arriba. Si todavía no tiene cuenta, le enviamos un enlace por correo para que la cree.</p>
              </div>
            ) : (
              <>
                {artists.length > 6 && (
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="search"
                      value={q}
                      onChange={(e) => { setQ(e.target.value); setPageA(1); setOpenId(null); }}
                      placeholder="Buscar por nombre o correo"
                      aria-label="Buscar artista"
                      className={`${inputCls} pl-11 h-11`}
                    />
                  </div>
                )}
                {filtered.length === 0 ? (
                  <p className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Ningún artista coincide con esa búsqueda.</p>
                ) : (
                  <>
                    <ul className="space-y-2">
                      {pa.rows.map((a) => (
                        <AccordionRow
                          key={a.id}
                          id={`ar-${a.id}`}
                          open={openId === a.id}
                          onToggle={() => setOpenId(openId === a.id ? null : a.id)}
                          header={
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
                                <ArtistAvatar url={a.photo_url} iconClass="w-4 h-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-black uppercase tracking-wide text-white truncate">
                                  {a.stage_name}
                                  {!a.is_active && <span className="ml-2 text-[9px] align-middle px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 tracking-widest">Inactivo</span>}
                                </p>
                                <p className="text-[11px] text-zinc-500 truncate">{a.events_count} {a.events_count === 1 ? 'evento' : 'eventos'}</p>
                              </div>
                              <BalanceChip pending={a.pending} />
                            </div>
                          }
                        >
                          <p className="text-xs text-zinc-400 break-all mb-3">{a.email}</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Eventos</p><p className="text-sm font-black text-white">{a.events_count}</p></div>
                            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Cachets</p><p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{formatCOP(a.total_fee)}</p></div>
                            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pagado</p><p className="text-[13px] sm:text-sm font-black text-neon-green whitespace-nowrap">{formatCOP(a.total_paid)}</p></div>
                          </div>
                          <Link href={`/raves/admin/artists/${a.id}`} className="mt-3 h-10 w-full rounded-lg bg-neon-green text-black text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
                            Abrir perfil <ChevronRight className="w-4 h-4" />
                          </Link>
                        </AccordionRow>
                      ))}
                    </ul>
                    {pa.p.totalPages > 1 && <Pager p={pa.p} onPage={(n) => { setOpenId(null); setPageA(n); }} />}
                  </>
                )}
              </>
            )}
          </>
        )}

        <FormModal open={open} title="Nuevo artista" submitLabel="Continuar" busy={busy} error={formError} onSubmit={submit} onClose={() => !busy && setOpen(false)}>
          {candidates.length > 0 && (
            <Field label="Pasar una cuenta del equipo" hint="Estas cuentas están como «Artista» en Equipo. Se conservan su cuenta e historial; dejan de ser personal del equipo.">
              <div className="relative">
                <UserCheck className="w-4 h-4 text-zinc-600 absolute left-4 top-1/2 -translate-y-1/2" />
                <select value={pick} onChange={(e) => { setPick(e.target.value); if (e.target.value) setEmail(''); }} className={`${inputCls} pl-11`}>
                  <option value="">— Ninguna —</option>
                  {candidates.map((c) => (
                    <option key={c.user_id} value={c.user_id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
            </Field>
          )}
          {!pick && (
            <Field label="Correo del artista" hint="Si ya tiene cuenta en la página, su perfil normal se convierte en perfil de artista al instante. Si no la tiene, le enviamos un enlace para que cree su cuenta.">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="artista@correo.com" autoComplete="off" />
            </Field>
          )}
          <Field label="Nombre artístico (opcional)" hint="Si lo dejas vacío se usa su nombre de cuenta.">
            <input type="text" value={stageName} onChange={(e) => setStageName(e.target.value)} maxLength={80} className={inputCls} placeholder="Ej. DJ Luna" />
          </Field>
        </FormModal>

        <FormModal
          open={sent !== null}
          title={sent?.renewed ? 'Enlace nuevo' : 'Invitación creada'}
          submitLabel="Listo"
          hideCancel
          onSubmit={() => setSent(null)}
          onClose={() => setSent(null)}
        >
          {sent && (
            <>
              {sent.emailSent ? (
                <p className="text-sm text-zinc-300">Le enviamos el correo a <strong className="text-white break-all">{sent.email}</strong>. Cuando abra el enlace, crea su cuenta y queda directamente como artista.</p>
              ) : (
                <div className="p-3 rounded-xl border border-orange-500/40 bg-orange-500/10 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-orange-300">No pudimos enviar el correo a {sent.email}. La invitación sí quedó creada: copia el enlace y envíaselo tú (por ejemplo por WhatsApp).</p>
                </div>
              )}
              <Field label="Enlace de invitación" hint="Es personal, sirve una sola vez y vence en 7 días. Quien lo tenga puede crear la cuenta, así que envíalo solo al artista.">
                <input readOnly value={sent.link} onFocus={(e) => e.currentTarget.select()} className={`${inputCls} text-xs`} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={copyLink} className="h-11 rounded-xl border border-zinc-700 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:border-neon-purple">
                  {copied ? <><Check className="w-4 h-4 text-neon-green" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
                </button>
                <a
                  href={whatsappLink(null, `Hola, te invitamos como artista a Kasa del Sol. Crea tu cuenta aquí: ${sent.link}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 rounded-xl border border-zinc-700 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:border-neon-green"
                >
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              </div>
            </>
          )}
        </FormModal>

        <ConfirmDialog
          open={cancelTarget !== null}
          title="Cancelar invitación"
          confirmLabel="Cancelar invitación"
          tone="danger"
          busy={busy}
          error={cancelError}
          onConfirm={cancelInvite}
          onCancel={() => !busy && setCancelTarget(null)}
        >
          <p>El enlace enviado a {cancelTarget?.email} deja de funcionar. Si más adelante lo quieres como artista, creas una invitación nueva.</p>
        </ConfirmDialog>
      </div>
    </AdminGuard>
  );
}