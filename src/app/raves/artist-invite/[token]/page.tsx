"use client";
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Music, AlertTriangle, CheckCircle2, LogIn } from 'lucide-react';
import { apiFetch, ApiError, authToken } from '@/lib/kasa-api';
import { setAuthCookie } from '@/lib/session';

type Preview = { email: string; stage_name: string | null; account_exists: boolean };

const inputCls = 'w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm focus:border-neon-purple outline-none';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2';

/** Página del enlace de invitación para artistas: crear la cuenta (o activar el perfil si ya tiene cuenta). */
export default function ArtistInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoggedIn(!!authToken());
    (async () => {
      try {
        const p = await apiFetch<Preview>(`/artists/invite/${token}`);
        setPreview(p);
      } catch (e) {
        setFatal(e instanceof ApiError ? e.message : 'No se pudo abrir la invitación. Revisa tu conexión e intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Escribe tu nombre.');
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (password !== password2) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      const res = await apiFetch<{ access_token: string; user: { id: string; role: string } }>(`/artists/invite/${token}/accept`, {
        method: 'POST',
        body: { name: name.trim(), password, hp },
      });
      setAuthCookie(res.access_token);
      localStorage.setItem('kasa_user', JSON.stringify(res.user));
      // Recarga completa para que el menú de arriba ya muestre la sesión iniciada.
      window.location.assign('/raves/profile/artist');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión. Intenta de nuevo.');
      setBusy(false);
    }
  };

  const claim = async () => {
    setError('');
    setBusy(true);
    try {
      await apiFetch(`/artists/invite/${token}/claim`, { method: 'POST' });
      router.push('/raves/profile/artist');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error de conexión. Intenta de nuevo.');
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-neon-purple/10 border border-neon-purple/30 flex items-center justify-center shrink-0"><Music className="w-5 h-5 text-neon-purple" /></div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neon-purple">Kasa del Sol</p>
            <h1 className="text-xl font-black uppercase text-white leading-tight">Perfil de artista</h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 text-neon-purple animate-spin" /></div>
        ) : fatal || !preview ? (
          <div role="alert" className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-red-300">{fatal || 'Esta invitación no es válida.'}</p>
          </div>
        ) : preview.account_exists ? (
          <div>
            <p className="text-sm text-zinc-300 mb-5">
              Te invitaron como artista{preview.stage_name ? <> (<strong className="text-white">{preview.stage_name}</strong>)</> : null}. Ya existe una cuenta con <strong className="text-white break-all">{preview.email}</strong>.
            </p>
            {loggedIn ? (
              <>
                <p className="text-xs text-zinc-500 mb-4">Si estás conectado con esa cuenta, activa tu perfil de artista con un clic.</p>
                <button type="button" onClick={claim} disabled={busy} className="w-full h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Activar mi perfil de artista</>}
                </button>
              </>
            ) : (
              <Link href={`/raves/login?redirect=${encodeURIComponent(`/raves/artist-invite/${token}`)}`} className="w-full h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Iniciar sesión para continuar
              </Link>
            )}
            {error && <p role="alert" className="mt-4 text-xs font-bold text-red-400">{error}</p>}
          </div>
        ) : (
          <form onSubmit={create} className="space-y-4">
            <p className="text-sm text-zinc-300">
              Te invitaron como artista{preview.stage_name ? <> (<strong className="text-white">{preview.stage_name}</strong>)</> : null}. Crea tu cuenta para ver tus eventos y lo registrado a tu favor.
            </p>
            <div>
              <label className={labelCls}>Correo</label>
              <input value={preview.email} readOnly className={`${inputCls} text-zinc-400`} />
            </div>
            <div>
              <label className={labelCls}>Tu nombre</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputCls} autoComplete="name" />
            </div>
            <div>
              <label className={labelCls}>Contraseña (mínimo 8 caracteres)</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} autoComplete="new-password" />
            </div>
            <div>
              <label className={labelCls}>Repite la contraseña</label>
              <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} className={inputCls} autoComplete="new-password" />
            </div>
            <input type="text" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />
            {error && (
              <div role="alert" className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-red-300">{error}</p>
              </div>
            )}
            <button type="submit" disabled={busy} className="w-full h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear mi cuenta de artista'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}