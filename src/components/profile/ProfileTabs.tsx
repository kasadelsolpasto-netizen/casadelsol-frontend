"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/kasa-api';
import { profileAreas, profileTabs, type ProfileArea } from '@/lib/profile-tabs';

/**
 * Pestañas de la cuenta: Mi cuenta | Artista | Promotor. Solo aparecen las que la persona tiene.
 * Si la pantalla ya cargó el perfil, pasa `artist` y `promoter` para no pedirlo de nuevo; si no, se consulta aquí.
 * Si falla la consulta simplemente no se dibujan (la pantalla sigue funcionando).
 */
export default function ProfileTabs({
  active,
  userId,
  artist,
  promoter,
}: {
  active: ProfileArea;
  userId: string | null | undefined;
  artist?: boolean;
  promoter?: boolean;
}) {
  const known = artist !== undefined && promoter !== undefined;
  const [fetched, setFetched] = useState<{ artist: boolean; promoter: boolean } | null>(null);

  useEffect(() => {
    if (known || !userId) return;
    let cancelled = false;
    apiFetch<{ artist_profile?: { is_active?: boolean } | null; promoter_codes?: unknown[] | null }>(`/users/${userId}/profile`)
      .then((p) => {
        if (!cancelled) setFetched(profileAreas(p));
      })
      .catch(() => {
        // sin pestañas: la pantalla funciona igual
      });
    return () => {
      cancelled = true;
    };
  }, [known, userId]);

  const areas = known ? { artist: !!artist, promoter: !!promoter } : fetched ? { artist: artist ?? fetched.artist, promoter: promoter ?? fetched.promoter } : null;
  if (!areas) return null;
  const tabs = profileTabs(userId, areas);
  if (tabs.length === 0) return null;

  return (
    <nav aria-label="Áreas de tu cuenta" className={`grid gap-1 p-1 rounded-2xl bg-zinc-950 border border-zinc-900 ${tabs.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? 'page' : undefined}
          className={`h-11 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center transition-colors ${t.key === active ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
