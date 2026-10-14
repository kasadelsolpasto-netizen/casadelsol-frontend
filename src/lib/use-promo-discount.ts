"use client";
import { useEffect, useState } from 'react';

export interface PromoDiscount {
  code: string;
  perc: number;
}

/**
 * Código de promotor que trae el visitante: el ?ref= / ?promo= del enlace que le mandó el promotor,
 * o el que quedó guardado al entrar antes con ese enlace (PromoTracker). Es la misma fuente que usa el checkout.
 */
function readPromoCode(): string {
  try {
    const sp = new URLSearchParams(window.location.search);
    const fromUrl = sp.get('ref') || sp.get('promo');
    if (fromUrl) return fromUrl.trim().toUpperCase();
    return (localStorage.getItem('kasa_promo_code') || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

/**
 * Descuento del promotor para este evento, solo para MOSTRAR el precio tachado y el precio final en la lista de entradas.
 * El cobro real lo calcula siempre el servidor al pagar. Devuelve null si no hay código, no es válido, no aplica al evento
 * o no da descuento.
 */
export function usePromoDiscount(eventId: string | undefined): PromoDiscount | null {
  const [promo, setPromo] = useState<PromoDiscount | null>(null);

  useEffect(() => {
    if (!eventId) return;
    const code = readPromoCode();
    if (!code) {
      setPromo(null);
      return;
    }
    let cancelled = false;
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    fetch(`${API}/promoters/validate/${encodeURIComponent(code)}?eventId=${encodeURIComponent(eventId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const perc = Number(d?.discount_perc);
        setPromo(d && Number.isFinite(perc) && perc > 0 ? { code: String(d.code ?? code), perc } : null);
      })
      .catch(() => {
        if (!cancelled) setPromo(null);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return promo;
}
