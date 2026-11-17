"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
import ProfileTabs from '@/components/profile/ProfileTabs';
import PartnerArea from '@/components/promoter/PartnerArea';
import { apiFetch, ApiError, authToken } from '@/lib/kasa-api';
import { type Grant } from '@/lib/partners';

/**
 * Perfil de SOCIO: el acceso ampliado que el administrador autoriza para un evento determinado (o para la casa).
 * Es un área propia de la cuenta: no hace falta ser promotor para tenerla. Quien no tiene ninguna habilitación
 * activa vuelve a su cuenta.
 */
export default function PartnerProfilePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
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
    (async () => {
      try {
        const grants = await apiFetch<Grant[]>('/partners/me');
        if (!Array.isArray(grants) || grants.length === 0) {
          router.push(uid ? `/profile/${uid}` : '/');
          return;
        }
        setState('ready');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          router.push('/login');
          return;
        }
        setError(e instanceof ApiError ? e.message : 'No se pudo cargar tu información de socio. Intenta de nuevo.');
        setState('error');
      }
    })();
  }, [router]);

  if (state === 'loading') {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 text-neon-purple animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen pb-24 bg-[#050505]">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
        <div className="mb-3"><ProfileTabs active="socio" userId={userId} partner /></div>
        <header className="mb-5">
          <Link href={userId ? `/profile/${userId}` : '/'} className="inline-flex items-center gap-1 min-h-[44px] text-[11px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Mi cuenta
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white leading-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-neon-green shrink-0" /> Socio
          </h1>
          <p className="text-xs font-bold text-zinc-500">Acceso autorizado por evento</p>
        </header>
        {state === 'error' ? (
          <p role="alert" className="text-center text-sm font-bold text-red-400 p-10">{error}</p>
        ) : (
          <PartnerArea />
        )}
      </main>
    </div>
  );
}
