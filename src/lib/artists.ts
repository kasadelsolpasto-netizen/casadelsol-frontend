/**
 * Artistas: tipos y funciones puras (sin pantalla ni imports) para poder probarlas con `node --test`.
 * Los montos viajan siempre como números en pesos; aquí solo se interpretan los que escribe una persona.
 */

export interface ArtistListItem {
  id: string;
  user_id: string;
  stage_name: string;
  photo_url: string | null;
  is_active: boolean;
  email: string;
  user_name: string;
  events_count: number;
  total_fee: number;
  total_paid: number;
  pending: number;
}

export interface ArtistCandidate {
  user_id: string;
  name: string;
  email: string;
}

export interface ArtistBookingView {
  id: string;
  event: { id: string; title: string; date: string; venue?: string; status?: string };
  role: string;
  fee: number;
  notes: string | null;
  paid: number;
  pending: number;
  /** Cortesías que puede repartir en este evento y de qué tipo de entrada (lo define la organización). */
  courtesy_quota: number;
  courtesy_ticket_type: { id: string; name: string } | null;
  courtesies: ArtistCourtesyItem[];
}

export interface ArtistCourtesyItem {
  id: string;
  name: string;
  email: string;
  status: 'sent' | 'opened' | 'claimed';
}

export interface ArtistPaymentView {
  id: string;
  booking_id: string | null;
  event_title: string | null;
  amount: number;
  method: string | null;
  note: string | null;
  paid_at: string;
}

/** Código de venta (promotor) que el dueño le dio a un artista. Solo lo ve el dueño. */
export interface ArtistPromoterCode {
  id: string;
  code: string;
  discount_perc: number;
  ticket_limit: number | null;
  tickets_sold: number;
  uses_count: number;
  is_active: boolean;
  event: { id: string; title: string } | null;
}

export interface ArtistDetail {
  id: string;
  user_id: string;
  stage_name: string;
  bio: string | null;
  photo_url: string | null;
  is_active: boolean;
  user: { id?: string; name?: string; email?: string };
  bookings: ArtistBookingView[];
  payments: ArtistPaymentView[];
  promoter_codes?: ArtistPromoterCode[];
  total_fee: number;
  total_paid: number;
  pending: number;
}

export interface EventLineup {
  event: { id: string; title: string };
  artists: Array<{
    booking_id: string;
    artist_id: string;
    stage_name: string;
    email: string;
    is_active: boolean;
    role: string;
    fee: number;
    notes: string | null;
    paid: number;
    pending: number;
    courtesy_quota: number;
    courtesies_used: number;
  }>;
  total_fee: number;
  total_paid: number;
  pending: number;
}

/** Invitación pendiente (no incluye el enlace: solo se muestra al crearla o renovarla). */
export interface InviteView {
  id: string;
  email: string;
  stage_name: string | null;
  created_at: string;
  expires_at: string;
  expired: boolean;
}

export type InviteResult =
  | { mode: 'converted'; artist: { id: string; stage_name: string } }
  | { mode: 'invited'; invite: InviteView; link: string; email_sent: boolean };

export const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Otro'] as const;

/**
 * Lee un monto escrito a mano. Entiende "1500000", "1.500.000", "1,500,000", "$ 1.500.000" y decimales de hasta 2 cifras
 * ("1500.50" / "1500,50"). Un punto o coma seguido de EXACTAMENTE 3 cifras se toma como separador de miles ("1.500" = 1500).
 * Devuelve null si no es un número claro (nunca adivina).
 */
export function parseMoney(input: string): number | null {
  const s = String(input ?? '').trim().replace(/^\$\s*/, '').replace(/\s/g, '');
  if (!s) return null;
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''));
  if (/^\d+$/.test(s)) return Number(s);
  if (/^\d+[.,]\d{1,2}$/.test(s)) return Number(s.replace(',', '.'));
  return null;
}

export type BalanceTone = 'owed' | 'clear' | 'over';

/** Cómo se muestra lo que se le debe a un artista: debemos (naranja), al día (verde) o se le pagó de más (amarillo). */
export function balanceInfo(pending: number): { tone: BalanceTone; label: string; amount: number } {
  const p = Math.round((Number(pending) || 0) * 100) / 100;
  if (p > 0) return { tone: 'owed', label: 'Se le debe', amount: p };
  if (p < 0) return { tone: 'over', label: 'Pagado de más', amount: -p };
  return { tone: 'clear', label: 'Al día', amount: 0 };
}

/** Fecha corta en hora de Colombia ("5 nov 2026"). */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' });
}

/** "Vence en 3 días" / "Vence hoy" / "Venció". */
export function inviteExpiryText(expiresAt: string, expired: boolean, now: number = Date.now()): string {
  if (expired) return 'Venció';
  const ms = new Date(expiresAt).getTime() - now;
  if (!Number.isFinite(ms)) return '';
  const days = Math.ceil(ms / 864e5);
  if (days <= 0) return 'Vence hoy';
  return days === 1 ? 'Vence mañana' : `Vence en ${days} días`;
}

/** Cuántas cortesías le quedan al artista en esa participación. */
export function courtesyRemaining(b: { courtesy_quota: number; courtesies: unknown[] }): number {
  return Math.max(b.courtesy_quota - b.courtesies.length, 0);
}

/** El evento ya pasó (se da un día de margen, igual que el servidor). */
export function isEventOver(dateIso: string, now: number = Date.now()): boolean {
  const t = new Date(dateIso).getTime();
  return Number.isFinite(t) && t < now - 24 * 60 * 60 * 1000;
}

export function courtesyStatusText(s: 'sent' | 'opened' | 'claimed'): string {
  if (s === 'claimed') return 'ya está en su cuenta';
  if (s === 'opened') return 'abrió el enlace, falta reclamarla';
  return 'enviada, sin abrir';
}
