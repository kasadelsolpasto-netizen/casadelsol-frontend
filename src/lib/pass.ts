/**
 * Pase permanente (QR identificador) y saldo, del lado del navegador.
 *
 * Sin dependencias de React ni del DOM: todo lo de aquí se puede probar en Node.
 * Las mismas reglas viven en el backend (`src/pass/pass-token.ts` y `src/pass/wallet-math.ts`);
 * se repiten aquí para no depender de una versión vieja del servidor y para que el scanner pueda
 * decidir al instante, sin consultar, si lo que leyó la cámara es un pase.
 */

/** Prefijo del QR del pase. A propósito no es un enlace: una cámara ajena que lo lea no abre nada. */
export const PASS_PREFIX = 'KASA_ID:';

/** Alfabeto del código corto: sin 0/O ni 1/I/L, que se confunden al leerlos de un carné. */
export const PASS_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** Longitud del código corto, sin el prefijo "KS-" ni los guiones. */
export const PASS_CODE_LENGTH = 10;

const CODE_BODY = new RegExp(`^[${PASS_CODE_ALPHABET}]{${PASS_CODE_LENGTH}}$`);

/** true si lo que leyó la cámara es un pase (y no una entrada ni un pedido de barra). */
export function isPassPayload(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  return raw.trim().toUpperCase().startsWith(PASS_PREFIX);
}

/** Saca el token del pase de lo que leyó la cámara, tolerando espacios y minúsculas. */
export function extractPassToken(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const t = raw.trim();
  if (t.toUpperCase().startsWith(PASS_PREFIX)) return t.slice(PASS_PREFIX.length).trim();
  return t;
}

/** Normaliza un código de carné escrito a mano: "ks 7f3k-9qd2-ab" → "7F3K9QD2AB". */
export function normalizePassCode(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const clean = raw
    .trim()
    .toUpperCase()
    .replace(/^KS[\s-]*/, '')
    .replace(/[\s.,\-_]/g, '');
  return CODE_BODY.test(clean) ? clean : '';
}

/** Pinta el código como va impreso bajo el QR: "7F3K9QD2AB" → "KS-7F3K-9QD2-AB". */
export function formatPassCode(code: string): string {
  const clean = String(code || '').toUpperCase().replace(/[\s-]/g, '');
  if (!clean) return '';
  return ['KS', ...(clean.match(/.{1,4}/g) ?? [])].join('-');
}

// ───────────────────────────── plata ─────────────────────────────

/** Pesos colombianos como los lee la gente: 1250000 centavos → "$12.500". */
export function formatCop(cents: number): string {
  const n = Math.round(Number(cents) || 0) / 100;
  const entero = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return '$' + new Intl.NumberFormat('es-CO').format(entero);
}

/**
 * Lee lo que el staff o el usuario teclean como monto y lo devuelve en CENTAVOS enteros.
 * Se escribe en pesos ("25.000", "25000", "12,5") porque es como se habla en la barra.
 * Devuelve 0 si lo escrito no es un monto usable.
 */
export function parsePesosToCents(input: unknown): number {
  if (typeof input === 'number') return Number.isFinite(input) && input > 0 ? Math.round(input * 100) : 0;
  if (typeof input !== 'string') return 0;
  // Los puntos son separadores de miles y la coma es la decimal (formato colombiano).
  const clean = input.trim().replace(/\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!clean || !/^\d+(\.\d{1,2})?$/.test(clean)) return 0;
  const cents = Math.round(Number(clean) * 100);
  return cents > 0 ? cents : 0;
}

/** Nombre en español de cada movimiento del saldo, y si abona o descuenta. */
export const WALLET_ENTRY_LABELS: Record<string, { label: string; sign: 1 | -1 }> = {
  TOPUP_CASH: { label: 'Recarga en taquilla', sign: 1 },
  TOPUP_ONLINE: { label: 'Recarga en línea', sign: 1 },
  CHARGE: { label: 'Consumo en barra', sign: -1 },
  REFUND: { label: 'Devolución', sign: 1 },
  ADJUST_CREDIT: { label: 'Ajuste a favor', sign: 1 },
  ADJUST_DEBIT: { label: 'Ajuste en contra', sign: -1 },
};

/** Cómo se muestra un movimiento: "+ $20.000" o "− $8.000". */
export function describeEntry(kind: string, amountCents: number): { label: string; amount: string; positive: boolean } {
  const meta = WALLET_ENTRY_LABELS[kind] ?? { label: 'Movimiento', sign: 1 as const };
  const positive = meta.sign > 0;
  return { label: meta.label, amount: `${positive ? '+' : '−'} ${formatCop(amountCents)}`, positive };
}

/** Montos sugeridos para recargar, en centavos: los que de verdad se usan en una noche. */
export const TOPUP_PRESETS_CENTS = [20_000_00, 50_000_00, 100_000_00, 200_000_00];
