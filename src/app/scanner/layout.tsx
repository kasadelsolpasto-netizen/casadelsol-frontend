"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken, refreshSession } from '@/lib/session';

const isStaffRole = (role?: string) => role === 'STAFF' || role === 'OWNER';

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!getAuthToken()) {
        router.push('/login?redirect=/scanner');
        return;
      }

      // La BASE DE DATOS manda: se renueva la sesión y se trae el rol REAL.
      //  - Un usuario ascendido a STAFF entra sin tener que cerrar sesión (antes lo rebotaba a la home
      //    porque su cookie/localStorage seguían diciendo USER).
      //  - Quien está en "descanso" (rol USER) sale a su perfil.
      //  - La sesión del staff se extiende cada vez que abre el scanner.
      const result = await refreshSession();
      if (cancelled) return;

      if (result.ok) {
        if (isStaffRole(result.user.role)) {
          setIsAuthorized(true);
        } else {
          router.push(result.user.id ? '/profile/' + result.user.id : '/'); // descanso
        }
        return;
      }

      if (result.reason === 'expired') {
        router.push('/login?redirect=/scanner');
        return;
      }

      // Sin red o servidor dormido (Render): no se deja al staff afuera; se usa lo último que se sabe de su cuenta.
      try {
        const cached = JSON.parse(localStorage.getItem('kasa_user') || 'null');
        if (cached && isStaffRole(cached.role)) {
          setIsAuthorized(true);
          return;
        }
      } catch {
        /* sin datos locales */
      }
      router.push('/login?redirect=/scanner');
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-black text-neon-green font-black uppercase tracking-widest flex items-center justify-center animate-pulse">Verificando acceso...</div>;
  }

  return <>{children}</>;
}
