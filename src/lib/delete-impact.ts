/**
 * Textos de las confirmaciones al borrar (un evento con órdenes, una orden suelta). Son funciones puras para poder
 * probarlas sin pantalla. Lo que se muestra sale SIEMPRE de lo que dice el servidor (`impact`), nunca de lo que
 * recuerde la lista, para que el administrador vea las cifras reales antes de confirmar.
 */

export interface ImpactBucket {
  orders: number;
  tickets: number;
  amount: number;
}

export interface DeleteImpact {
  orders: number;
  not_completed: number;
  scanned: number;
  summary: {
    online: ImpactBucket;
    cash_pending: ImpactBucket;
    cash_settled: ImpactBucket;
    free: ImpactBucket;
    all: ImpactBucket;
  };
  walk_in: { count: number; amount: number };
  courtesies: number;
  promoter_codes: number;
}

const cop = (n: number) => {
  const v = Number(n);
  return Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** ¿Lo que escribió la persona es el nombre del evento? (sin importar mayúsculas ni espacios de más; igual que el servidor) */
export function titleMatches(typed: string, title: string): boolean {
  const t = String(typed ?? '').trim().toLowerCase();
  return t !== '' && t === String(title ?? '').trim().toLowerCase();
}

/** Una línea por cada cosa que se perdería. Solo salen las que existen. */
export function impactLines(i: DeleteImpact): string[] {
  const s = i.summary;
  const lines: string[] = [];
  if (s.online.orders > 0) {
    lines.push(`${plural(s.online.orders, 'compra online', 'compras online')} (${plural(s.online.tickets, 'entrada', 'entradas')}, ${cop(s.online.amount)} pagados por la pasarela)`);
  }
  if (s.cash_pending.orders > 0) {
    lines.push(`${plural(s.cash_pending.orders, 'venta de promotor en efectivo sin entregar', 'ventas de promotores en efectivo sin entregar')} (${plural(s.cash_pending.tickets, 'entrada', 'entradas')}, ${cop(s.cash_pending.amount)})`);
  }
  if (s.cash_settled.orders > 0) {
    lines.push(`${plural(s.cash_settled.orders, 'venta de promotor en efectivo ya entregada', 'ventas de promotores en efectivo ya entregadas')} (${plural(s.cash_settled.tickets, 'entrada', 'entradas')}, ${cop(s.cash_settled.amount)})`);
  }
  if (s.free.orders > 0) {
    lines.push(`${plural(s.free.orders, 'orden gratis', 'órdenes gratis')} (${plural(s.free.tickets, 'entrada', 'entradas')})`);
  }
  if (i.not_completed > 0) {
    lines.push(`${plural(i.not_completed, 'orden sin completar', 'órdenes sin completar')} (pendientes o fallidas)`);
  }
  if (i.walk_in.count > 0) {
    lines.push(`${plural(i.walk_in.count, 'venta en puerta', 'ventas en puerta')} (${cop(i.walk_in.amount)})`);
  }
  if (i.courtesies > 0) {
    lines.push(plural(i.courtesies, 'cortesía', 'cortesías'));
  }
  if (i.promoter_codes > 0) {
    lines.push(`${plural(i.promoter_codes, 'código de promotor', 'códigos de promotor')} de este evento`);
  }
  return lines;
}

/** Avisos aparte, para resaltarlos: entradas ya usadas en puerta y plata que no se devuelve sola. */
export function impactWarnings(i: DeleteImpact): string[] {
  const w: string[] = [];
  if (i.scanned > 0) {
    w.push(`${plural(i.scanned, 'entrada ya se escaneó', 'entradas ya se escanearon')} en la puerta; quedará sin registro de ingreso.`);
  }
  if (i.summary.online.amount > 0) {
    w.push('Los pagos online NO se devuelven solos: si hay que reembolsarlos, hazlo desde la pasarela (Wompi / Bold).');
  }
  return w;
}

/** Avisos al quitar UNA orden, según de qué tipo es y si ya se usó. */
export function orderDeleteNotes(o: { kind: string; status?: string; scanned?: number }): string[] {
  const n: string[] = [];
  const completed = !o.status || o.status === 'COMPLETED';
  if ((o.scanned ?? 0) > 0) {
    n.push(`${plural(o.scanned as number, 'entrada de esta orden ya se escaneó', 'entradas de esta orden ya se escanearon')} en la puerta; quedará sin registro de ingreso.`);
  }
  if (o.kind === 'ONLINE' && completed) {
    n.push('El pago online NO se devuelve solo: si hay que reembolsarlo, hazlo desde la pasarela (Wompi / Bold).');
  }
  if (o.kind === 'CASH_PENDING') {
    n.push('Ya no se le cobrará al promotor el efectivo de esta venta.');
  }
  if (o.kind === 'CASH_SETTLED') {
    n.push('Este efectivo ya se había entregado: el historial de liquidaciones se conserva tal cual, ajústalo a mano si hace falta.');
  }
  if (completed) {
    n.push('Las entradas vuelven a quedar disponibles para la venta y se descuentan las ventas del código del promotor.');
  }
  return n;
}
