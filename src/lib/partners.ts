/**
 * SOCIOS: el grado de promotor que el administrador habilita para un evento.
 *
 * Un promotor normal vende con su código. Un socio, además y solo en el evento para el que está aprobado,
 * puede emitir cortesías contra un cupo, ver las métricas del evento y crear boletas privadas.
 * Cada facultad se habilita por separado, así que «socio» no es un rol de la cuenta: es una habilitación que
 * se da y se quita sin tocar al usuario.
 *
 * Sin dependencias de React ni del navegador (se puede probar en Node):  npm run test:scan
 */

export type CourtesyKind = 'PERSONAL' | 'LIBRE';

export interface Grant {
  id: string;
  user_id?: string;
  event_id: string | null;
  can_issue_courtesies: boolean;
  courtesy_quota: number;
  courtesy_issued: number;
  can_set_courtesy_kind: boolean;
  can_view_metrics: boolean;
  can_view_revenue: boolean;
  can_create_private_tickets: boolean;
  private_ticket_min_price: number | null;
  is_active: boolean;
  notes?: string | null;
  user?: { id: string; name: string; email: string } | null;
  event?: { id: string; title: string } | null;
}

/** Cortesías que todavía le quedan a una habilitación. */
export const courtesyRemaining = (g: Pick<Grant, 'courtesy_quota' | 'courtesy_issued'>): number =>
  Math.max(0, (Number(g.courtesy_quota) || 0) - (Number(g.courtesy_issued) || 0));

/** Grado que se muestra junto al promotor. */
export type Grade = 'PROMOTOR' | 'SOCIO' | 'SOCIO_SUSPENDIDO';

export function gradeOf(grant: Grant | null | undefined): Grade {
  if (!grant) return 'PROMOTOR';
  return grant.is_active ? 'SOCIO' : 'SOCIO_SUSPENDIDO';
}

export const GRADE_LABEL: Record<Grade, string> = {
  PROMOTOR: 'Promotor',
  SOCIO: 'Socio',
  SOCIO_SUSPENDIDO: 'Socio suspendido',
};

/**
 * La habilitación que manda en un evento: primero la del evento, y si no hay, la de la casa (sin evento).
 * Misma regla que aplica el servidor, para que la pantalla no prometa algo que el servidor va a negar.
 */
export function grantForEvent(grants: Grant[] | null | undefined, eventId: string): Grant | null {
  const active = (grants ?? []).filter((g) => g.is_active);
  return active.find((g) => g.event_id === eventId) ?? active.find((g) => g.event_id === null) ?? null;
}

export interface FacultyView {
  key: keyof Grant;
  label: string;
  /** Qué significa en la práctica, en una línea. */
  hint: string;
}

/** Las facultades, en el orden en el que se presentan en el panel. */
export const FACULTIES: FacultyView[] = [
  { key: 'can_issue_courtesies', label: 'Emitir cortesías', hint: 'Puede regalar entradas del evento contra el cupo que le asignes.' },
  { key: 'can_set_courtesy_kind', label: 'Decidir cortesías libres', hint: 'Puede emitir cortesías transferibles. Si no, todas las suyas son personales.' },
  { key: 'can_view_metrics', label: 'Ver métricas del evento', hint: 'Aforo, entradas, asistencia y sus propias cortesías.' },
  { key: 'can_view_revenue', label: 'Ver el dinero del evento', hint: 'Ingresos del evento. Aparte de las métricas, por ser información sensible.' },
  { key: 'can_create_private_tickets', label: 'Crear boletas privadas', hint: 'Entradas con precio decidido que solo se venden con su enlace.' },
];

/** Resumen corto de lo que puede hacer un socio, para mostrar en una fila. */
export function facultySummary(g: Grant): string[] {
  const out: string[] = [];
  if (g.can_issue_courtesies) {
    const left = courtesyRemaining(g);
    out.push(`Cortesías ${g.courtesy_issued}/${g.courtesy_quota}${left === 0 ? ' (cupo lleno)' : ''}`);
  }
  if (g.can_set_courtesy_kind) out.push('Puede emitir libres');
  if (g.can_view_metrics) out.push(g.can_view_revenue ? 'Métricas + dinero' : 'Métricas');
  if (g.can_create_private_tickets) {
    out.push(g.private_ticket_min_price ? `Boletas privadas (mín. ${money(g.private_ticket_min_price)})` : 'Boletas privadas');
  }
  return out;
}

/**
 * Avisos de una habilitación que quedaría sin efecto. Se muestran ANTES de guardar, para no dejar un socio
 * habilitado que en la práctica no puede hacer nada (fue justo lo que pasó en el último evento).
 */
export function grantWarnings(f: {
  can_issue_courtesies?: boolean;
  courtesy_quota?: number | string;
  can_set_courtesy_kind?: boolean;
  can_view_metrics?: boolean;
  can_view_revenue?: boolean;
}): string[] {
  const out: string[] = [];
  const quota = Number(f.courtesy_quota ?? 0);
  if (f.can_issue_courtesies && !(quota > 0)) {
    out.push('Le habilitas emitir cortesías pero el cupo queda en 0: no podrá emitir ninguna.');
  }
  if (f.can_set_courtesy_kind && !f.can_issue_courtesies) {
    out.push('Decidir cortesías libres no tiene efecto si no puede emitir cortesías.');
  }
  if (f.can_view_revenue && !f.can_view_metrics) {
    out.push('Ver el dinero no tiene efecto si no puede ver las métricas.');
  }
  return out;
}

export const money = (n: number): string =>
  Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);

// ── Boletas privadas ──

export interface PrivateTicket {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
  sale_start?: string | null;
  sale_end?: string | null;
  access_token: string | null;
  sold?: number;
  revenue?: number;
  mine?: boolean;
}

/** Enlace privado de una boleta: /events/<evento>?pass=<llave>. Sin llave, el enlace está cerrado. */
export function privateLink(origin: string, eventId: string, token: string | null): string | null {
  if (!token) return null;
  return `${String(origin).replace(/\/+$/, '')}/events/${encodeURIComponent(eventId)}?pass=${encodeURIComponent(token)}`;
}

export type PrivateState = 'ABIERTA' | 'AGOTADA' | 'CERRADA' | 'NO_INICIADA' | 'VENCIDA';

export const PRIVATE_STATE_LABEL: Record<PrivateState, string> = {
  ABIERTA: 'Enlace activo',
  AGOTADA: 'Sin cupo',
  CERRADA: 'Enlace cerrado',
  NO_INICIADA: 'Aún no abre',
  VENCIDA: 'Venta cerrada',
};

/** En qué estado está el enlace de una boleta privada, con la misma regla con la que el servidor cobra. */
export function privateState(t: PrivateTicket, now: number = Date.now()): PrivateState {
  if (!t.access_token) return 'CERRADA';
  const start = t.sale_start ? new Date(t.sale_start).getTime() : null;
  const end = t.sale_end ? new Date(t.sale_end).getTime() : null;
  if (start !== null && Number.isFinite(start) && start > now) return 'NO_INICIADA';
  if (end !== null && Number.isFinite(end) && end < now) return 'VENCIDA';
  if ((Number(t.available) || 0) <= 0) return 'AGOTADA';
  return 'ABIERTA';
}

/** Mensaje listo para mandar el enlace privado por WhatsApp. */
export function buildPrivateLinkMessage(p: { eventTitle?: string | null; name: string; price: number; url: string }): string {
  const event = (p.eventTitle ?? '').trim() || 'el evento';
  return (
    `🎶 *Kasa del Sol*\n\n` +
    `Te comparto una entrada reservada para *${event}*.\n\n` +
    `${p.name}: *${money(p.price)}*\n\n` +
    `Este enlace es solo para ti:\n${p.url}\n\n` +
    `¡Nos vemos en la pista!`
  );
}

// ── Denominaciones de cortesía ──

export interface CourtesyType {
  id: string;
  name: string;
  capacity: number;
  available: number;
  unlimited: boolean;
  transferable_default: boolean;
}

/** Cupo de una denominación, en texto. Sin tope no se muestra número: no hay nada que agotar. */
export function courtesyTypeQuota(t: CourtesyType): string {
  if (t.unlimited) return 'Sin tope';
  const used = Math.max(0, (Number(t.capacity) || 0) - (Number(t.available) || 0));
  return `${used}/${t.capacity}`;
}

export const COURTESY_KIND_LABEL: Record<CourtesyKind, string> = {
  PERSONAL: 'Personal',
  LIBRE: 'Libre',
};

export const COURTESY_KIND_HINT: Record<CourtesyKind, string> = {
  PERSONAL: 'Intransferible: en la puerta se exige la cédula del titular.',
  LIBRE: 'Transferible: el titular se la puede pasar a quien quiera.',
};
