"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
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
      // HARD CLIENT-SIDE GUARD: BLOCK LOGICALLY EXCEPT OWNER AND STAFF
      if (user.role !== 'OWNER' && user.role !== 'STAFF') {
        router.push('/');
        return;
      }
      setIsAuthorized(true);

      // ASYNC VERIFICATION WITH DB: IN CASE THEY WERE TOGGLED TO "DESCANSO"
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      if (token) {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${user.id}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.role === 'USER') {
            // Re-sync local storage to downgrade them
            user.role = 'USER';
            localStorage.setItem('kasa_user', JSON.stringify(user));
            window.dispatchEvent(new Event('storage'));
            router.push('/profile/' + user.id); // Kick them to their personal vault
          }
        })
        .catch(() => {});
      }
    } catch {
      router.push('/login');
    }
  }, [router]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-black text-red-600 font-black uppercase tracking-widest flex items-center justify-center animate-pulse">Bloqueo de Seguridad Activado...</div>;
  }

  return <>{children}</>;
}
