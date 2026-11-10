export type ProfileArea = 'cuenta' | 'artista' | 'promotor';

export interface ProfileTabItem {
  key: ProfileArea;
  label: string;
  href: string;
}

/** Qué áreas tiene una persona según su perfil: ser artista (perfil activo) y/o promotor (al menos un código). */
export function profileAreas(profile: { artist_profile?: { is_active?: boolean } | null; promoter_codes?: unknown[] | null } | null | undefined): {
  artist: boolean;
  promoter: boolean;
} {
  return {
    artist: !!profile?.artist_profile?.is_active,
    promoter: Array.isArray(profile?.promoter_codes) && profile.promoter_codes.length > 0,
  };
}

/**
 * Pestañas de la cuenta: "Mi cuenta" siempre; "Artista" y "Promotor" solo si la persona las tiene.
 * Si solo tiene "Mi cuenta" no hay nada que elegir y la lista queda vacía (no se dibujan pestañas).
 */
export function profileTabs(userId: string | null | undefined, areas: { artist: boolean; promoter: boolean }): ProfileTabItem[] {
  if (!areas.artist && !areas.promoter) return [];
  const tabs: ProfileTabItem[] = [{ key: 'cuenta', label: 'Mi cuenta', href: userId ? `/raves/profile/${userId}` : '/raves' }];
  if (areas.artist) tabs.push({ key: 'artista', label: 'Artista', href: '/raves/profile/artist' });
  if (areas.promoter) tabs.push({ key: 'promotor', label: 'Promotor', href: '/raves/profile/promoter' });
  return tabs;
}
