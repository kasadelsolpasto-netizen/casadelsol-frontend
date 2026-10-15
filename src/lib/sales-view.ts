/**
 * Piezas comunes de las pantallas de ventas (admin del evento y panel del promotor): tipos de lo que responde el
 * servidor, etiquetas, colores, formatos y CSV. Sin dependencias de React ni del navegador (se prueba en Node):
 *   npm run test:scan
 */

export type SaleKind = 'ONLINE' | 'CASH_PENDING' | 'CASH_SETTLED' | 'FREE';
export const SALE_KINDS: SaleKind[] = ['ONLINE', 'CASH_PENDING', 'CASH_SETTLED', 'FREE'];

export interface Bucket {
  orders: number;
  tickets: number;
  amount: number;
}

export interface Summary {
  online: Bucket;
  cash_pending: Bucket;
  cash_settled: Bucket;
  free: Bucket;
  all: Bucket;
}

export interface PromoterRow {
  promoter_id: string;
  promoter_name: string | null;
  promoter_email: string | null;
  codes: string[];
  online: Bucket;
  cash_pending: Bucket;
  cash_settled: Bucket;
  free: Bucket;
  total_orders: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type Audience = 'admin' | 'promoter';

/** Nombre de cada tipo de venta. El admin "cobra/liquida"; el promotor "entrega". */
export function kindLabel(kind: SaleKind, audience: Audience): string {
  switch (kind) {
    case 'ONLINE':
      return 'Online';
    case 'CASH_PENDING':
      return audience === 'admin' ? 'Por cobrar' : 'Por entregar';
    case 'CASH_SETTLED':
      return audience === 'admin' ? 'Liquidado' : 'Entregado';
    case 'FREE':
      return 'Gratis';
  }
}

/** Clases de Tailwind de la etiqueta de cada tipo (siempre las mismas en todas las pantallas). */
export function kindBadge(kind: SaleKind): string {
  switch (kind) {
    case 'ONLINE':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    case 'CASH_PENDING':
      return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    case 'CASH_SETTLED':
      return 'bg-green-500/10 text-green-400 border-green-500/30';
    case 'FREE':
      return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  }
}

export function formatCOP(n: number | null | undefined): string {
  const v = Number(n);
  return Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(
    Number.isFinite(v) ? v : 0,
  );
}

export function ticketsLabel(n: number): string {
  return n === 1 ? '1 entrada' : `${n} entradas`;
}

const TZ = 'America/Bogota';

/** "hace 5 min", "hace 3 h", "ayer", o la fecha corta si ya pasó más de un día y medio. */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  if (h < 48) return 'ayer';
  return shortDate(iso);
}

export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO', { timeZone: TZ, day: 'numeric', month: 'short' });
}

export function fullDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-CO', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
}

/** Rango "26–50 de 163" de una página (o "0 resultados"). */
export function rangeLabel(p: Pagination): string {
  if (!p.total) return '0 resultados';
  const from = (p.page - 1) * p.pageSize + 1;
  const to = Math.min(p.total, p.page * p.pageSize);
  return `${from}–${to} de ${p.total}`;
}

/** Lo que hay que mostrar de una referencia de pago larga (Wompi/Bold) sin romper la pantalla. */
export function shortRef(ref: string | null | undefined, max = 18): string {
  const r = String(ref ?? '').trim();
  if (!r) return '—';
  return r.length > max ? r.slice(0, max - 1) + '…' : r;
}

/** Primera letra del nombre, para el círculo de cada promotor. */
export function initialOf(name: string | null | undefined): string {
  const c = String(name ?? '').trim().charAt(0);
  return c ? c.toUpperCase() : '?';
}

// --- CSV --------------------------------------------------------------------------------------------

/** Celda de CSV: comillas si hace falta y sin fórmulas peligrosas al abrirlo en Excel (=, +, -, @). */
export function csvCell(v: unknown): string {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvOrder {
  id: string;
  kind: SaleKind;
  total: number;
  created_at: string;
  payment_ref?: string | null;
  user?: { name?: string | null; email?: string | null } | null;
  order_items?: Array<{ quantity: number }>;
  promoter_code?: { code?: string | null; promoter?: { name?: string | null } | null } | null;
}

export function buildOrdersCsv(orders: CsvOrder[]): string {
  const head = ['Fecha', 'Comprador', 'Correo', 'Tipo', 'Estado', 'Entradas', 'Total', 'Promotor', 'Codigo', 'Referencia'];
  const rows = orders.map((o) => {
    const tickets = (o.order_items ?? []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    return [
      fullDateTime(o.created_at),
      o.user?.name ?? '',
      o.user?.email ?? '',
      o.kind === 'ONLINE' ? 'Online' : o.kind === 'FREE' ? 'Gratis' : 'Efectivo promotor',
      kindLabel(o.kind, 'admin'),
      tickets,
      o.total,
      o.promoter_code?.promoter?.name ?? '',
      o.promoter_code?.code ?? '',
      o.payment_ref ?? '',
    ]
      .map(csvCell)
      .join(';');
  });
  return [head.join(';'), ...rows].join('\r\n');
}
