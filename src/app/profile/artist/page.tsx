"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Music, Loader2, CalendarDays, Banknote, UserRound, ChevronLeft, CheckCircle2, Globe } from 'lucide-react';
import ImageUpload from '@/components/artists/ImageUpload';
import ArtistPageEditor from '@/components/artists/ArtistPageEditor';
import ArtistDocsNotice, { DocsReminder } from '@/components/artists/ArtistDocsNotice';
import ArtistContracts from '@/components/artists/ArtistContracts';
import { isEventOver } from '@/lib/artists';
import StatStrip, { BalanceChip } from '@/components/artists/StatStrip';
import ProfileTabs from '@/components/profile/ProfileTabs';
import AccordionRow from '@/components/ui/AccordionRow';
import Pager from '@/components/ui/Pager';
import { paginate } from '@/lib/paging';
import ArtistAvatar from '@/components/artists/ArtistAvatar';
import ArtistCourtesies from '@/components/artists/ArtistCourtesies';
import { apiFetch, ApiError, authToken } from '@/lib/kasa-api';
import { formatCOP } from '@/lib/sales-view';
import { courtesyRemaining, fmtDate, type ArtistDetail } from '@/lib/artists';

type Tab = 'eventos' | 'pagos' | 'pagina' | 'perfil';
const TABS: { key: Tab; label: string; Icon: typeof Music }[] = [
  { key: 'eventos', label: 'Mis eventos', Icon: CalendarDays },
  { key: 'pagos', label: 'Pagos', Icon: Banknote },
  { key: 'pagina', label: 'Mi página', Icon: Globe },
  { key: 'perfil', label: 'Mi perfil', Icon: UserRound },
];

const inputCls = 'w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm focus:border-neon-purple outline-none';

/** Vista del artista: lo que se le debe, los eventos en los que participa y sus pagos. Solo lectura salvo su perfil público. */
export default function ArtistProfilePage() {
  const router = useRouter();
  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('eventos');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageEv, setPageEv] = useState(1);
  const [pagePay, setPagePay] = useState(1);
  const evPage = paginate(artist?.bookings ?? [], pageEv, 8);
  const payPage = paginate(artist?.payments ?? [], pagePay, 10);

  const [stage, setStage] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState('');
  const [legalName, setLegalName] = useState('');
  const [docType, setDocType] = useState('cédula de ciudadanía');
  const [docNumber, setDocNumber] = useState('');
  const [address, setAddress] = useState('');
  const [contractId, setContractId] = useState<string | null>(null);

  // El correo del contrato trae ?contrato=<id>: se abre de entrada.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('contrato');
    if (id && /^[0-9a-f-]{8,64}$/i.test(id)) setContractId(id);
  }, []);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const fill = (a: ArtistDetail) => {
    setStage(a.stage_name);
    setBio(a.bio ?? '');
    setPhoto(a.photo_url ?? '');
    setLegalName(a.legal_name ?? '');
    setDocType(a.doc_type || 'cédula de ciudadanía');
    setDocNumber(a.doc_number ?? '');
    setAddress(a.address ?? '');
  };

  const load = useCallback(async () => {
    if (!authToken()) {
      router.push('/login');
      return;
    }
    let uid: string | null = null;
    try {
      const raw = localStorage.getItem('kasa_user');
      uid = raw ? JSON.parse(raw).id : null;
    } catch {
      uid = null;
    }
    setUserId(uid);
    try {
      const a = await apiFetch<ArtistDetail>('/artists/me');
      setArtist(a);
      fill(a);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // No es artista: su cuenta normal.
        router.push(uid ? `/profile/${uid}` : '/');
        return;
      }
      if (e instanceof ApiError && e.status === 401) {
        router.push('/login');
        return;
      }
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu perfil de artista. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg(null);
    try {
      await apiFetch('/artists/me', { method: 'PUT', body: {
          stage_name: stage.trim(), bio: bio.trim() || null, photo_url: photo.trim() || null,
          // Los datos del contrato solo viajan si cambiaron: con un contrato por aceptar no se pueden modificar,
          // y eso no debe impedir guardar la imagen o la descripción.
          ...((legalName.trim() || null) !== (artist?.legal_name ?? null) ? { legal_name: legalName.trim() || null } : {}),
          ...((docNumber.trim() || null) !== (artist?.doc_number ?? null) ? { doc_number: docNumber.trim() || null, doc_type: docType } : {}),
          ...(docType !== (artist?.doc_type || 'cédula de ciudadanía') && docNumber.trim() ? { doc_type: docType } : {}),
          ...((address.trim() || null) !== (artist?.address ?? null) ? { address: address.trim() || null } : {}),
        },
      });
      await load();
      setSaveMsg({ tone: 'ok', text: 'Perfil guardado.' });
    } catch (err) {
      setSaveMsg({ tone: 'error', text: err instanceof ApiError ? err.message : 'Error de conexión. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-neon-purple animate-spin" /></div>;

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-3xl mx-auto">
      <Link href={userId ? `/profile/${userId}` : '/'} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-6">
        <ChevronLeft className="w-4 h-4" /> Mi cuenta
      </Link>

      {error || !artist ? (
        <p role="alert" className="text-center text-sm font-bold text-red-400 p-10">{error || 'No se encontró tu perfil de artista.'}</p>
      ) : (
        <>
          <div className="mb-5"><ProfileTabs active="artista" userId={userId} artist /></div>

          <header className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center shrink-0">
              <ArtistAvatar url={artist.photo_url} iconClass="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-neon-purple">Perfil de artista</p>
              <h1 className="text-2xl md:text-4xl font-black uppercase tracking-wide text-white break-words">{artist.stage_name}</h1>
            </div>
          </header>

          <ArtistContracts openId={contractId} onChanged={load} />
          <ArtistDocsNotice userId={userId} stageName={artist.stage_name} upcoming={artist.bookings.filter((b) => !isEventOver(b.event.date)).map((b) => ({ id: b.id, title: b.event.title }))} />

          <div className="mb-5"><StatStrip fee={artist.total_fee} paid={artist.total_paid} pending={artist.pending} paidLabel="Recibido" /></div>

          <div role="tablist" aria-label="Secciones del artista" className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl bg-zinc-950 border border-zinc-900">
            {TABS.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`h-11 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors ${tab === key ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
              >
                <Icon className="w-4 h-4 shrink-0 hidden min-[400px]:block" /> <span>{label}</span>
              </button>
            ))}
          </div>

          {tab === 'eventos' && (
            artist.bookings.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Todavía no tienes eventos registrados.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {evPage.rows.map((b) => (
                    <AccordionRow
                      key={b.id}
                      id={`ev-${b.id}`}
                      open={openId === b.id}
                      onToggle={() => setOpenId(openId === b.id ? null : b.id)}
                      header={
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-black uppercase tracking-wide text-white truncate">{b.event.title}</p>
                            <p className="text-[11px] text-zinc-500 truncate">
                              {fmtDate(b.event.date)}
                              {b.courtesy_quota > 0 ? (courtesyRemaining(b) > 0 ? ` · ${courtesyRemaining(b)} ${courtesyRemaining(b) === 1 ? 'cortesía libre' : 'cortesías libres'}` : ' · cortesías agotadas') : ''}
                            </p>
                          </div>
                          <BalanceChip pending={b.pending} />
                        </div>
                      }
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Cachet</p><p className="text-[13px] sm:text-sm font-black text-white whitespace-nowrap">{formatCOP(b.fee)}</p></div>
                        <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Recibido</p><p className="text-[13px] sm:text-sm font-black text-neon-green whitespace-nowrap">{formatCOP(b.paid)}</p></div>
                      </div>
                      {b.role && <p className="text-[11px] text-zinc-500 mt-2">{b.role}</p>}
                      {!isEventOver(b.event.date) && <DocsReminder stageName={artist.stage_name} eventTitle={b.event.title} />}
                      <ArtistCourtesies booking={b} onChanged={load} />
                    </AccordionRow>
                  ))}
                </ul>
                {evPage.p.totalPages > 1 && <Pager p={evPage.p} onPage={(n) => { setOpenId(null); setPageEv(n); }} />}
              </>
            )
          )}

          {tab === 'pagos' && (
            artist.payments.length === 0 ? (
              <p className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Todavía no hay pagos registrados.</p>
            ) : (
              <>
                <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl bg-zinc-950 overflow-hidden">
                  {payPage.rows.map((p) => (
                    <li key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] text-zinc-400 truncate">{fmtDate(p.paid_at)}{p.method ? ` · ${p.method}` : ''}{p.event_title ? ` · ${p.event_title}` : ''}</p>
                        {p.note && <p className="text-[11px] text-zinc-600 truncate">{p.note}</p>}
                      </div>
                      <p className="text-sm font-black text-neon-green shrink-0">{formatCOP(p.amount)}</p>
                    </li>
                  ))}
                </ul>
                {payPage.p.totalPages > 1 && <Pager p={payPage.p} onPage={setPagePay} />}
              </>
            )
          )}

          {tab === 'pagina' && <ArtistPageEditor />}

          {tab === 'perfil' && (
            <form onSubmit={save} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Nombre artístico</label>
                <input value={stage} onChange={(e) => setStage(e.target.value)} maxLength={80} className={inputCls} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Descripción</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} rows={4} className={`${inputCls} h-auto py-3`} />
              </div>
              <ImageUpload value={photo} onChange={setPhoto} folder="artists/photos" label="Tu imagen" shape="round" maxSide={1600} hint="Es la imagen que te identifica en tu página y en el cartel de los eventos. Guarda el perfil para aplicarla." />
              <fieldset className="rounded-2xl border border-zinc-800 p-4 space-y-4">
                <legend className="px-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">Datos para tu contrato</legend>
                <p className="text-[11px] font-bold text-zinc-500">Son privados: solo los ve la organización y figuran en tu contrato. No aparecen en tu página.</p>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2" htmlFor="legal-name">Nombre legal completo</label>
                  <input id="legal-name" value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={120} autoComplete="name" className={inputCls} />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2" htmlFor="doc-type">Tipo de documento</label>
                    <select id="doc-type" value={docType} onChange={(e) => setDocType(e.target.value)} className={inputCls}>
                      {['cédula de ciudadanía', 'cédula de extranjería', 'pasaporte', 'NIT', 'permiso por protección temporal'].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2" htmlFor="doc-number">Número de documento</label>
                    <input id="doc-number" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} maxLength={30} inputMode="numeric" className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2" htmlFor="legal-address">Domicilio</label>
                  <input id="legal-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={200} autoComplete="street-address" className={inputCls} />
                </div>
              </fieldset>
              {saveMsg && (
                <p role="status" className={`text-xs font-bold flex items-center gap-1.5 ${saveMsg.tone === 'ok' ? 'text-neon-green' : 'text-red-400'}`}>
                  {saveMsg.tone === 'ok' && <CheckCircle2 className="w-4 h-4" />} {saveMsg.text}
                </p>
              )}
              <button type="submit" disabled={saving} className="w-full h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar perfil'}
              </button>
              <p className="text-[11px] text-zinc-600">Los cachets y los pagos los registra el equipo de Kasa del Sol; aquí solo los puedes consultar.</p>
            </form>
          )}
        </>
      )}
    </div>
  );
}