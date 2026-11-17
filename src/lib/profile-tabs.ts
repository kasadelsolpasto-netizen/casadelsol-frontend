export type ProfileArea = 'cuenta' | 'artista' | 'promotor' | 'socio';

export interface ProfileTabItem {
  key: ProfileArea;
  label: string;
  href: string;
}

export interface ProfileAreas {
  artist: boolean;
  promoter: boolean;
  /** Socio: tiene al menos una habilitación activa. No depende de ser promotor. */
  partner: boolean;
}

/**
 * Qué áreas tiene una persona según su perfil: artista (perfil activo), promotor (al menos un código) y
 * socio (el servidor lo indica en `is_partner`).
 */
export function profileAreas(
  profile: { artist_profile?: { is_active?: boolean } | null; promoter_codes?: unknown[] | null; is_partner?: boolean | null } | null | undefined,
): ProfileAreas {
  return {
    artist: !!profile?.artist_profile?.is_active,
    promoter: Array.isArray(profile?.promoter_codes) && profile.promoter_codes.length > 0,
    partner: profile?.is_partner === true,
  };
}

/**
 * Pestañas de la cuenta: "Mi cuenta" siempre; "Artista", "Promotor" y "Socio" solo si la persona las tiene.
 * Si solo tiene "Mi cuenta" no hay nada que elegir y la lista queda vacía (no se dibujan pestañas).
 */
export function profileTabs(userId: string | null | undefined, areas: { artist: boolean; promoter: boolean; partner?: boolean }): ProfileTabItem[] {
  if (!areas.artist && !areas.promoter && !areas.partner) return [];
  const tabs: ProfileTabItem[] = [{ key: 'cuenta', label: 'Mi cuenta', href: userId ? `/profile/${userId}` : '/' }];
  if (areas.artist) tabs.push({ key: 'artista', label: 'Artista', href: '/profile/artist' });
  if (areas.promoter) tabs.push({ key: 'promotor', label: 'Promotor', href: '/profile/promoter' });
  if (areas.partner) tabs.push({ key: 'socio', label: 'Socio', href: '/profile/socio' });
  return tabs;
}
