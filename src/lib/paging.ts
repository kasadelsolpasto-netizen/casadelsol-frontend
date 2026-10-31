import type { Pagination } from '@/lib/sales-view';

/** Corta una lista en páginas en el navegador. Si la página pedida ya no existe (se borró algo), cae en la última. */
export function paginate<T>(items: readonly T[], page: number, size: number): { rows: T[]; p: Pagination } {
  const pageSize = Math.max(1, Math.floor(size) || 1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(Math.floor(page) || 1, 1), totalPages);
  return { rows: items.slice((current - 1) * pageSize, current * pageSize), p: { page: current, pageSize, total, totalPages } };
}
