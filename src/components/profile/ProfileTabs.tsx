"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/kasa-api';
import { profileAreas, profileTabs, type ProfileArea, type ProfileAreas } from '@/lib/profile-tabs';

const GRID: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

/**
 * Pestañas de la cuenta: Mi cuenta | Artista | Promotor | Socio. Solo aparecen las que la persona tiene.
 * La pantalla puede pasar lo que ya sabe (`artist`, `promoter`, `partner`); lo que falte se consulta aquí.
 * Si falla la consulta simplemente no se dibujan (la pantalla sigue funcionando).
 */
export default function ProfileTabs({
  active,
  userId,
  artist,
  promoter,
  partner,
}: {
  active: ProfileArea;
  userId: string | null | undefined;
  artist?: boolean;
  promoter?: boolean;
  partner?: boolean;
}) {
  const known = artist !== undefined && promoter !== undefined && partner !== undefined;
  const [fetched, setFetched] = useState<ProfileAreas | null>(null);

  useEffect(() => {
    if (known || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await apiFetch<{ artist_profile?: { is_active?: boolean } | null; promoter_codes?: unknown[] | null; is_partner?: boolean }>(`/users/${userId}/profile`);
        const areas = profileAreas(p);
        // Si el perfil todavía no dice si es socio, se pregunta directamente por sus habilitaciones.
        if (typeof p?.is_partner !== 'boolean' && partner === undefined) {
          try {
            const grants = await apiFetch<unknown[]>('/partners/me');
            areas.partner = Array.isArray(grants) && grants.length > 0;
          } catch {
            // no es socio, o no se pudo consultar
          }
        }
        if (!cancelled) setFetched(areas);
      } catch {
        // sin pestañas: la pantalla funciona igual
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [known, userId, partner]);

  const areas: ProfileAreas | null = known
    ? { artist: !!artist, promoter: !!promoter, partner: !!partner }
    : fetched
      ? { artist: artist ?? fetched.artist, promoter: promoter ?? fetched.promoter, partner: partner ?? fetched.partner }
      : null;
  if (!areas) return null;
  const tabs = profileTabs(userId, areas);
  if (tabs.length === 0) return null;

  return (
    <nav aria-label="Áreas de tu cuenta" className={`grid gap-1 p-1 rounded-2xl bg-zinc-950 border border-zinc-900 ${GRID[tabs.length] ?? 'grid-cols-2'}`}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? 'page' : undefined}
          className={`h-11 px-1 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest flex items-center justify-center text-center transition-colors ${t.key === active ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
