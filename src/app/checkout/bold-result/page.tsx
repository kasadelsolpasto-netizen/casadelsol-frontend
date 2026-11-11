"use client";
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle, AlertTriangle } from 'lucide-react';

type ViewState = 'checking' | 'approved' | 'rejected' | 'review' | 'timeout' | 'auth' | 'error';

const MAX_ATTEMPTS = 45; // ~3 min consultando cada 4 s
const POLL_MS = 4000;

function getToken(): string | null {
  const row = document.cookie.split('; ').find((r) => r.startsWith('kasa_auth_token='));
  return row ? row.split('=')[1] : null;
}

function userIdFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return payload.id || payload.sub || null;
  } catch {
    return null;
  }
}

function BoldResult() {
  const params = useSearchParams();
  // Bold agrega estos parámetros a la URL de redirección
  const orderRef = params.get('bold-order-id') || '';

  const [view, setView] = useState<ViewState>('checking');
  const [kind, setKind] = useState<'ticket' | 'shop' | null>(null);
  const attempts = useRef(0);

  useEffect(() => {
    if (!orderRef) {
      setView('error');
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const tick = async () => {
      const token = getToken();
      if (!token) {
        setView('auth');
        return;
      }

      try {
        const res = await fetch(`${API}/orders/bold/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ orderId: orderRef }),
        });

        if (res.status === 401) {
          if (!cancelled) setView('auth');
          return;
        }

        if (res.ok) {
          const data = await res.json();
          if (cancelled) return;
          setKind(data.kind || null);
          if (data.status === 'APPROVED') return setView('approved');
          if (data.status === 'REJECTED') return setView('rejected');
          if (data.status === 'REVIEW') return setView('review');
        }
      } catch {
        // error de red: seguimos intentando
      }

      attempts.current += 1;
      if (attempts.current >= MAX_ATTEMPTS) {
        if (!cancelled) setView('timeout');
        return;
      }
      timer = setTimeout(tick, POLL_MS);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderRef]);

  const profileHref = (() => {
    const id = typeof document !== 'undefined' ? userIdFromToken(getToken()) : null;
    return id ? `/profile/${id}` : '/';
  })();

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center">
      {view === 'checking' && (
        <>
          <Loader2 className="w-14 h-14 text-neon-purple animate-spin mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-widest mb-2">Confirmando tu pago</h1>
          <p className="text-zinc-400 text-sm max-w-md">
            Estamos verificando el pago con Bold. Puede tardar unos segundos; no cierres esta página.
          </p>
        </>
      )}

      {view === 'approved' && (
        <>
          <CheckCircle2 className="w-16 h-16 text-neon-green mb-6" />
          <h1 className="text-3xl font-black uppercase tracking-widest mb-3">¡Pago confirmado!</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8">
            {kind === 'shop'
              ? 'Recibimos tu pago. Tu pedido ya está en preparación.'
              : 'Recibimos tu pago. Tus entradas ya están disponibles en tu perfil.'}
          </p>
          <Link
            href={kind === 'shop' ? '/shop' : profileHref}
            className="bg-neon-green text-black px-8 py-3 rounded font-black uppercase tracking-widest text-sm"
          >
            {kind === 'shop' ? 'Volver a la tienda' : 'Ver mis entradas'}
          </Link>
        </>
      )}

      {view === 'rejected' && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-3xl font-black uppercase tracking-widest mb-3">Pago no completado</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8">
            Bold no aprobó el pago. No se te cobró nada. Puedes intentarlo de nuevo.
          </p>
          <Link href={kind === 'shop' ? '/shop' : '/events'} className="border border-zinc-600 px-8 py-3 rounded font-black uppercase tracking-widest text-sm">
            Intentar de nuevo
          </Link>
        </>
      )}

      {view === 'review' && (
        <>
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-widest mb-3">Necesitamos revisar tu pago</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8">
            Tu pago fue aprobado pero no coincide con el valor de la orden. Escríbenos por WhatsApp con el código{' '}
            <span className="font-mono text-white">{orderRef}</span> y lo resolvemos de inmediato.
          </p>
          <Link href="/" className="border border-zinc-600 px-8 py-3 rounded font-black uppercase tracking-widest text-sm">
            Ir al inicio
          </Link>
        </>
      )}

      {view === 'timeout' && (
        <>
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-widest mb-3">Aún no vemos tu pago</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8">
            Bold a veces tarda unos minutos en confirmar. Si ya pagaste, tu {kind === 'shop' ? 'pedido' : 'entrada'} se
            registrará automáticamente. Revisa tu perfil en unos minutos o escríbenos con el código{' '}
            <span className="font-mono text-white">{orderRef}</span>.
          </p>
          <Link href={profileHref} className="border border-zinc-600 px-8 py-3 rounded font-black uppercase tracking-widest text-sm">
            Ir a mi perfil
          </Link>
        </>
      )}

      {view === 'auth' && (
        <>
          <AlertTriangle className="w-16 h-16 text-yellow-500 mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-widest mb-3">Tu sesión expiró</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8">
            Inicia sesión de nuevo para confirmar tu pago. Si ya pagaste, tu compra se registrará igualmente.
          </p>
          <Link href="/login" className="bg-neon-purple text-white px-8 py-3 rounded font-black uppercase tracking-widest text-sm">
            Iniciar sesión
          </Link>
        </>
      )}

      {view === 'error' && (
        <>
          <XCircle className="w-16 h-16 text-red-500 mb-6" />
          <h1 className="text-2xl font-black uppercase tracking-widest mb-3">Enlace inválido</h1>
          <p className="text-zinc-400 text-sm max-w-md mb-8">No encontramos la referencia de tu pago en esta dirección.</p>
          <Link href="/" className="border border-zinc-600 px-8 py-3 rounded font-black uppercase tracking-widest text-sm">
            Ir al inicio
          </Link>
        </>
      )}
    </div>
  );
}

export default function BoldResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505]" />}>
      <BoldResult />
    </Suspense>
  );
}
