/**
 * Contratos de artistas: tipos y funciones puras (se prueban con `node --test`).
 */

export type ContractStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'DECLINED' | 'VOID';

export interface ContractSummary {
  id: string;
  number: string;
  title: string;
  status: ContractStatus;
  booking_id: string | null;
  event: { id: string; title: string; date: string; venue?: string | null } | null;
  created_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
}

export interface ContractView extends ContractSummary {
  body: string;
  body_hash: string | null;
  verify_code: string | null;
  org: { name: string | null; signer_name: string | null; signer_doc: string | null; signed_at: string | null };
  signer: { name: string | null; doc_type: string | null; doc_number: string | null; email: string | null } | null;
  evidence_hash: string | null;
  sign_method?: 'CLICK' | 'OTP' | null;
  intact: boolean | null;
  decline_reason: string | null;
  void_reason: string | null;
  missing?: string[];
}

/** Resultado de indicar el contrato al programar al artista. */
export interface BookingContractResult {
  id: string | null;
  number: string | null;
  status: ContractStatus | null;
  sent: boolean;
  email_sent: boolean;
  warning: string | null;
}

export type ContractMode = 'none' | 'template' | 'custom';

const LABELS: Record<ContractStatus, { admin: string; artist: string; tone: 'muted' | 'warn' | 'ok' | 'bad' }> = {
  DRAFT: { admin: 'Borrador sin enviar', artist: 'En preparación', tone: 'muted' },
  SENT: { admin: 'Enviado, sin aceptar', artist: 'Por aceptar', tone: 'warn' },
  SIGNED: { admin: 'Aceptado', artist: 'Aceptado', tone: 'ok' },
  DECLINED: { admin: 'No aceptado por el artista', artist: 'No aceptado', tone: 'bad' },
  VOID: { admin: 'Anulado', artist: 'Anulado', tone: 'muted' },
};

export function contractLabel(status: ContractStatus, who: 'admin' | 'artist'): string {
  return LABELS[status]?.[who] ?? status;
}

export function contractTone(status: ContractStatus): 'muted' | 'warn' | 'ok' | 'bad' {
  return LABELS[status]?.tone ?? 'muted';
}

export const TONE_CLASS: Record<'muted' | 'warn' | 'ok' | 'bad', string> = {
  muted: 'border-zinc-700 text-zinc-400',
  warn: 'border-amber-500/50 text-amber-400',
  ok: 'border-neon-green/50 text-neon-green',
  bad: 'border-red-500/50 text-red-400',
};

/**
 * El contrato que cuenta para una participación: el vigente (borrador o enviado) o, si no hay, el aceptado;
 * y si tampoco, el más reciente de los cerrados (para mostrar que fue rechazado o anulado).
 */
export function contractForBooking<T extends Pick<ContractSummary, 'booking_id' | 'status' | 'created_at'>>(contracts: T[], bookingId: string): T | null {
  const own = contracts.filter((c) => c.booking_id === bookingId);
  const newest = (list: T[]) => [...list].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0] ?? null;
  return newest(own.filter((c) => c.status === 'SENT' || c.status === 'DRAFT')) ?? newest(own.filter((c) => c.status === 'SIGNED')) ?? newest(own);
}

/** Se puede indicar un contrato nuevo si no hay uno vigente ni aceptado. */
export function canAssignContract(current: Pick<ContractSummary, 'status'> | null): boolean {
  return !current || current.status === 'DECLINED' || current.status === 'VOID';
}

/** Contratos que el artista tiene por aceptar. */
export function pendingForArtist<T extends Pick<ContractSummary, 'status'>>(contracts: T[]): T[] {
  return contracts.filter((c) => c.status === 'SENT');
}
