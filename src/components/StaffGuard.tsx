"use client";
import { useEffect, useState } from 'react';

export function StaffGuard({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(true);

  useEffect(() => {
    const rawUser = localStorage.getItem('kasa_user');
    if (!rawUser) {
      window.location.href = '/login';
      return;
    }
    try {
      const user = JSON.parse(rawUser);
      if (user.role !== 'OWNER' && user.role !== 'STAFF') {
        window.location.href = '/';
        return;
      }
      setLocked(false);
    } catch {
      window.location.href = '/login';
    }
  }, []);

  if (locked) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black flex flex-col items-center justify-center p-6">
        <div className="text-red-600 font-black uppercase text-2xl tracking-[0.3em] animate-pulse text-center">ÁREA RESTRINGIDA AL STAFF</div>
      </div>
    );
  }

  return <>{children}</>;
}
