"use client";
import { useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function PromoTrackerLogic() {
  const searchParams = useSearchParams();
  const hasTracked = useRef(false);

  useEffect(() => {
    const promo = searchParams?.get('ref') || searchParams?.get('promo');
    if (promo && !hasTracked.current) {
      hasTracked.current = true;
      // Guardar en localStorage para que se aplique automáticamente al checkout
      localStorage.setItem('kasa_promo_code', promo.toUpperCase());
      
      // Registrar la visita en el backend solo una vez por sesión
      const trackedKey = `kasa_tracked_${promo.toUpperCase()}`;
      if (!sessionStorage.getItem(trackedKey)) {
        sessionStorage.setItem(trackedKey, 'true');
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        fetch(`${API_URL}/promoters/click/${promo}`, { method: 'POST' }).catch(() => {});
      }
    }
  }, [searchParams]);

  return null;
}

export function PromoTracker() {
  return (
    <Suspense fallback={null}>
      <PromoTrackerLogic />
    </Suspense>
  );
}
