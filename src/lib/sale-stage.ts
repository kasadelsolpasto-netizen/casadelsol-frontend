/**
 * Etapa de venta vigente de un evento.
 *
 * Cada "etapa" es un tipo de boleto con su propio precio, cupos y ventana de venta (sale_start / sale_end).
 * El promotor NO elige boleto: se toma la etapa que está a la venta ahora. La regla de ventana es la misma
 * que aplica el servidor al cobrar (orders.service › prepareLines), para que lo que se ve sea lo que se puede vender.
 *
 * Sin dependencias de React ni del navegador (se puede probar en Node).
 */

export interface StageTicket {
  id: string;
  name: string;
  price: number;
  available: number;
  sale_start?: string | null;
  sale_end?: string | null;
}

const toMs = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const n = new Date(v).getTime();
  return Number.isFinite(n) ? n : null;
};

/** Ventana abierta: no "no iniciada" (sale_start > ahora) ni "finalizada" (sale_end < ahora), igual que el servidor. */
export function isWindowOpen(t: StageTicket, now: number = Date.now()): boolean {
  const start = toMs(t.sale_start);
  const end = toMs(t.sale_end);
  if (start !== null && start > now) return false;
  if (end !== null && end < now) return false;
  return true;
}

/** Orden de preferencia si hubiera varias abiertas a la vez: la que cierra primero, luego la que abrió primero, luego la más barata. */
function byStage(a: StageTicket, b: StageTicket): number {
  const ea = toMs(a.sale_end) ?? Number.POSITIVE_INFINITY;
  const eb = toMs(b.sale_end) ?? Number.POSITIVE_INFINITY;
  if (ea !== eb) return ea < eb ? -1 : 1;
  const sa = toMs(a.sale_start) ?? Number.NEGATIVE_INFINITY;
  const sb = toMs(b.sale_start) ?? Number.NEGATIVE_INFINITY;
  if (sa !== sb) return sa < sb ? -1 : 1;
  if (a.price !== b.price) return a.price - b.price;
  return a.name.localeCompare(b.name) || a.id.localeCompare(b.id);
}

export interface StageView<T extends StageTicket> {
  /** Etapa a la venta ahora (con ventana abierta y cupos), o null. */
  current: T | null;
  /** Próxima etapa que todavía no abre (para avisar cuándo), o null. */
  next: T | null;
  /** true si hay etapa abierta pero sin cupos. */
  soldOut: boolean;
}

/** Solo boletos de pago: el cobro en efectivo no aplica a cortesías/gratis. */
export function pickStage<T extends StageTicket>(
  tickets: T[] | null | undefined,
  now: number = Date.now(),
): StageView<T> {
  const paid = (tickets ?? []).filter((t) => Number(t.price) > 0);
  const open = paid.filter((t) => isWindowOpen(t, now));
  const current = open.filter((t) => t.available > 0).sort(byStage)[0] ?? null;
  const upcoming = paid
    .filter((t) => {
      const s = toMs(t.sale_start);
      return s !== null && s > now && t.available > 0;
    })
    .sort((a, b) => (toMs(a.sale_start) as number) - (toMs(b.sale_start) as number) || byStage(a, b));
  return { current, next: upcoming[0] ?? null, soldOut: current === null && open.length > 0 };
}

/**
 * Orden de lectura de las etapas en pantalla: la que abre primero va primero (luego cierre, precio y nombre).
 * La base de datos las devuelve en cualquier orden y cambia cada vez que se vende una entrada.
 */
export function sortStages<T extends StageTicket>(tickets: T[] | null | undefined): T[] {
  const cmp = (x: number | null, y: number | null, nullsFirst: boolean): number => {
    if (x === y) return 0;
    if (x === null) return nullsFirst ? -1 : 1;
    if (y === null) return nullsFirst ? 1 : -1;
    return x < y ? -1 : 1;
  };
  return [...(tickets ?? [])].sort(
    (a, b) =>
      cmp(toMs(a.sale_start), toMs(b.sale_start), true) ||
      cmp(toMs(a.sale_end), toMs(b.sale_end), false) ||
      a.price - b.price ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}

/** Margen después de la fecha del evento en el que todavía se vende (mismo valor por defecto que el servidor: 12 h). */
export const SALES_GRACE_MS = 12 * 60 * 60 * 1000;

/** true si el evento ya terminó para efectos de venta (el servidor rechaza esas ventas con "Este evento ya finalizó"). */
export function isEventSalesClosed(eventDate: string | null | undefined, now: number = Date.now()): boolean {
  const t = toMs(eventDate);
  return t !== null && t + SALES_GRACE_MS < now;
}
