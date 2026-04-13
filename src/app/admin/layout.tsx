"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const rawUser = localStorage.getItem('kasa_user');
    if (!rawUser) {
      router.push('/login');
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      // HARD CLIENT-SIDE GUARD: BLOCK EVERYONE EXCEPT OWNER
      if (user.role !== 'OWNER') {
        router.push('/');
        return;
      }
      setIsAuthorized(true);
    } catch {
      router.push('/login');
    }
  }, [router]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-black text-red-600 font-black uppercase tracking-widest flex items-center justify-center animate-pulse">Bloqueo de Seguridad Activado...</div>;
  }

  return <>{children}</>;
}
