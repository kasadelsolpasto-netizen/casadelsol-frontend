"use client";
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Esta página recibe el token de Google OAuth desde el backend
// y lo guarda en cookie/localStorage igual que el login normal
export default function GoogleCallbackPage() {
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

      // Redirigir según el rol
      if (user.role === 'OWNER') router.replace('/admin');
      else if (user.role === 'STAFF') router.replace('/scanner');
      else router.replace(`/profile/${user.id}`);
    } catch {
      router.push('/login?error=google_failed');
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
      <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">
        Conectando con Google…
      </p>
    </div>
  );
}
