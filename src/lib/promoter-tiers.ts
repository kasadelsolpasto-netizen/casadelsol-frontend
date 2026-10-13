// Escalones de descuento de los códigos de promotor ("10 entradas al 20 % hasta el 15 oct, luego 10 al 10 %").
// El servidor es la fuente de verdad (decide el escalón vigente y cobra); aquí solo hay utilidades de pantalla.
// Pruebas:  npm run test:scan

export interface TierRow {
  id: string;
  position: number;
  quantity: number;
  sold: number;
  discount_perc: number;
  valid_until: string | null;
}

/** Escalón vigente / siguiente tal como los calcula el servidor. */
export interface TierView {
  id: string;
  discount_perc: number;
  remaining: number;
  quantity: number;
  valid_until: string | null;
}

/** Fila del editor del admin (todo como texto para poder escribir libremente en los campos). */
export interface TierDraft {
  id?: string;
  quantity: string;
  discount_perc: string;
  valid_until: string; // YYYY-MM-DD o vacío
  sold?: number;
}

export const MAX_TIERS = 20;
const TZ = 'America/Bogota';

/** ISO → "YYYY-MM-DD" en hora de Colombia, para <input type="date">. */
export function toDateInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** ISO → "15 oct" en hora de Colombia (fijo, no depende del navegador). */
export function formatTierDate(iso: string | null | undefined): string {
  const ymd = toDateInput(iso);
  if (!ymd) return '';
  const [, m, d] = ymd.split('-');
  return `${Number(d)} ${MESES[Number(m) - 1]}`;
}

export function draftsFromTiers(tiers: TierRow[] | null | undefined): TierDraft[] {
  return [...(tiers ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((t) => ({
      id: t.id,
      quantity: String(t.quantity),
      discount_perc: String(t.discount_perc),
      valid_until: toDateInput(t.valid_until),
      sold: t.sold,
    }));
}

/** Lista que se envía al servidor (el orden del arreglo es el orden de uso). */
export function draftsToPayload(drafts: TierDraft[]) {
  return drafts.map((d) => ({
    ...(d.id ? { id: d.id } : {}),
    quantity: Number(d.quantity),
    discount_perc: Number(d.discount_perc),
    valid_until: d.valid_until ? d.valid_until : null,
  }));
}

/** Primer problema que ve el admin antes de guardar (el servidor valida lo mismo). null = todo bien. */
export function validateDrafts(drafts: TierDraft[]): string | null {
  if (drafts.length > MAX_TIERS) return `Máximo ${MAX_TIERS} escalones por código.`;
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    const n = i + 1;
    const q = Number(d.quantity);
    const p = Number(d.discount_perc);
    if (d.quantity.trim() === '' || !Number.isInteger(q) || q < 1) return `Escalón ${n}: escribe cuántas entradas (un número entero desde 1).`;
    if (d.discount_perc.trim() === '' || !Number.isInteger(p) || p < 0 || p > 100) return `Escalón ${n}: el descuento debe ser un número entero entre 0 y 100.`;
    if (d.sold != null && q < d.sold) return `Escalón ${n}: ya vendió ${d.sold}; la cantidad no puede ser menor.`;
  }
  return null;
}

export type TierStatus = 'current' | 'waiting' | 'done' | 'expired';

/** Estado de un escalón para pintarlo: vigente, en espera, agotado o vencido. */
export function tierStatus(t: TierRow, tiers: TierRow[], now: Date = new Date()): TierStatus {
  const expired = t.valid_until != null && new Date(t.valid_until).getTime() < now.getTime();
  if (t.sold >= t.quantity) return 'done';
  if (expired) return 'expired';
  const first = [...tiers]
    .sort((a, b) => a.position - b.position)
    .find((x) => x.sold < x.quantity && !(x.valid_until != null && new Date(x.valid_until).getTime() < now.getTime()));
  return first && first.id === t.id ? 'current' : 'waiting';
}

const untilText = (iso: string | null | undefined) => (iso ? ` hasta el ${formatTierDate(iso)}` : '');
const entradas = (n: number) => (n === 1 ? '1 entrada' : `${n} entradas`);

/** "Te quedan 6 entradas al 20% hasta el 15 oct. Luego 10 entradas al 10%." */
export function tierMessage(current: TierView | null | undefined, next: TierView | null | undefined): string {
  if (!current) return 'Sin descuentos vigentes.';
  const left = current.remaining === 1 ? 'Te queda' : 'Te quedan';
  let msg = `${left} ${entradas(current.remaining)} al ${current.discount_perc}%${untilText(current.valid_until)}.`;
  if (next) msg += ` Luego ${entradas(next.remaining)} al ${next.discount_perc}%${untilText(next.valid_until)}.`;
  return msg;
}

/** Total con descuento redondeado como lo hace el servidor (centavos enteros). */
export function discountedTotal(price: number, discountPerc: number, qty: number): number {
  const p = Math.min(100, Math.max(0, Number(discountPerc) || 0));
  const cents = Math.round(Number(price) * 100) * qty;
  return Math.round(cents * (1 - p / 100)) / 100;
}
