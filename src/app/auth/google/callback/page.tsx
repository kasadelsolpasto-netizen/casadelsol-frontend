"use client";
import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Componente interno que maneja la lógica
function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userRaw = searchParams.get('user');

    if (!token || !userRaw) {
      router.push('/login?error=google_failed');
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userRaw));

      // Guardar igual que el login normal
      document.cookie = `kasa_auth_token=${token}; path=/; max-age=86400;`;
      localStorage.setItem('kasa_user', JSON.stringify(user));

      // Redirigir según el rol con recarga completa para que el Navbar global detecte el usuario
      if (user.role === 'OWNER') window.location.href = '/admin';
      else if (user.role === 'STAFF') window.location.href = '/scanner';
      else window.location.href = `/profile/${user.id}`;
    } catch {
      router.push('/login?error=google_failed');
    }
  }, [searchParams, router]);

  return null;
}

// Embalaje principal con Suspense obligatorio de Next.js
export default function GoogleCallbackPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
      <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">
        Conectando con Google…
      </p>
      
      {/* Suspense es requerido por Next.js al usar useSearchParams */}
      <Suspense fallback={null}>
        <CallbackContent />
      </Suspense>
    </div>
  );
}
