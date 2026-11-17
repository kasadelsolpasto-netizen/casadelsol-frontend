/**
 * Cuenta de cobro del artista: se arma en el navegador con los datos de su participación y sale dirigida al
 * correo de la Fundación. Funciones puras (se prueban con `node --test`). No usa el servidor ni envía nada sola.
 */



// ───────── Monto en letras ─────────

const UNIDADES = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
const ESPECIALES: Record<number, string> = {
  10: 'diez', 11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete',
  18: 'dieciocho', 19: 'diecinueve', 20: 'veinte', 21: 'veintiún', 22: 'veintidós', 23: 'veintitrés', 24: 'veinticuatro',
  25: 'veinticinco', 26: 'veintiséis', 27: 'veintisiete', 28: 'veintiocho', 29: 'veintinueve',
};
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

/** 0..999 en letras, en la forma que antecede a un sustantivo masculino ("veintiún mil", "un millón"). */
function hasta999(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'cien';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  let out = CENTENAS[c];
  let parte = '';
  if (resto > 0) {
    if (resto < 10) parte = UNIDADES[resto];
    else if (resto < 30) parte = ESPECIALES[resto];
    else {
      const d = Math.floor(resto / 10);
      const u = resto % 10;
      parte = DECENAS[d] + (u ? ` y ${UNIDADES[u]}` : '');
    }
  }
  if (out && parte) out += ' ';
  return out + parte;
}

/** Entero no negativo (hasta 999.999.999.999) en letras. */
export function numeroEnLetras(valor: number): string {
  const n = Math.floor(Math.abs(Number(valor) || 0));
  if (n === 0) return 'cero';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones > 0) {
    if (millones === 1) partes.push('un millón');
    else {
      const milDeMillones = Math.floor(millones / 1000);
      const soloMillones = millones % 1000;
      let t = '';
      if (milDeMillones > 0) t += milDeMillones === 1 ? 'mil' : `${hasta999(milDeMillones)} mil`;
      if (soloMillones > 0) t += (t ? ' ' : '') + hasta999(soloMillones);
      partes.push(`${t} millones`);
    }
  }
  if (miles > 0) partes.push(miles === 1 ? 'mil' : `${hasta999(miles)} mil`);
  if (resto > 0) partes.push(hasta999(resto));
  return partes.join(' ');
}

/** "un millón quinientos mil pesos moneda corriente". Los millones exactos llevan "de" ("dos millones de pesos"). */
export function montoEnLetras(valor: number): string {
  const n = Math.floor(Math.abs(Number(valor) || 0));
  const letras = numeroEnLetras(n);
  const de = n >= 1_000_000 && n % 1_000_000 === 0 ? ' de' : '';
  return `${letras}${de} ${n === 1 ? 'peso' : 'pesos'} moneda corriente`;
}

const cop = (n: number) => `$${Math.round(Number(n) || 0).toLocaleString('es-CO')}`;

function fechaLarga(d: Date | string): string {
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });
}

// ───────── Cuenta de cobro ─────────

/** A quién se le cobra y a qué correo se dirige. */
export const CUENTA_COBRO_DEUDOR = { nombre: 'FUNDACIÓN KASA DEL SOL', nit: '902.014.359-1' };
export const CUENTA_COBRO_EMAIL = 'artistas@kasadelsol.co';

export interface CuentaCobroInput {
  numero: string;
  ciudad: string;
  /** Fecha de expedición (por defecto, hoy). */
  fecha?: Date | string;
  nombreLegal: string;
  docTipo: string;
  docNumero: string;
  nombreArtistico: string;
  evento: string;
  eventoFecha: string;
  eventoLugar?: string | null;
  valor: number;
  datosPago: string;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
}

/** Lo que le falta a la cuenta de cobro para poder enviarse, en palabras del artista. */
export function cuentaCobroFaltantes(i: CuentaCobroInput): string[] {
  const out: string[] = [];
  if (!i.nombreLegal.trim()) out.push('tu nombre legal');
  if (!i.docNumero.trim()) out.push('tu número de documento');
  if (!(Number(i.valor) > 0)) out.push('el valor acordado');
  if (!i.datosPago.trim()) out.push('los datos de la cuenta para el pago');
  if (!i.numero.trim()) out.push('el número de la cuenta de cobro');
  if (!i.ciudad.trim()) out.push('la ciudad');
  return out;
}

/** Texto completo de la cuenta de cobro. */
export function cuentaCobroTexto(i: CuentaCobroInput, now: number = Date.now()): string {
  const fecha = fechaLarga(i.fecha ?? new Date(now));
  const t = new Date(i.eventoFecha).getTime();
  const pasado = Number.isFinite(t) && t < now;
  const lugar = String(i.eventoLugar ?? '').trim();
  const nombre = i.nombreLegal.trim().toUpperCase();
  const docRaw = `${i.docTipo.trim() || 'cédula de ciudadanía'} n.º ${i.docNumero.trim()}`;
  const doc = docRaw.charAt(0).toUpperCase() + docRaw.slice(1);
  const contacto = [
    i.telefono?.trim() ? `Teléfono: ${i.telefono.trim()}` : '',
    i.correo?.trim() ? `Correo electrónico: ${i.correo.trim()}` : '',
    i.direccion?.trim() ? `Dirección: ${i.direccion.trim()}` : '',
  ].filter(Boolean);
  return [
    `${i.ciudad.trim()}, ${fecha}`,
    '',
    `CUENTA DE COBRO N.º ${i.numero.trim()}`,
    '',
    CUENTA_COBRO_DEUDOR.nombre,
    `NIT ${CUENTA_COBRO_DEUDOR.nit}`,
    '',
    'DEBE A:',
    '',
    nombre,
    doc,
    '',
    `LA SUMA DE: ${cop(i.valor)} (${montoEnLetras(i.valor)}).`,
    '',
    `POR CONCEPTO DE: Presentación artística de «${i.nombreArtistico.trim()}» en el evento «${i.evento.trim()}», ${pasado ? 'realizado' : 'que se realiza'} el ${fechaLarga(i.eventoFecha)}${lugar ? ` en ${lugar}` : ''}.`,
    '',
    'Declaro que soy persona natural no responsable del impuesto sobre las ventas (IVA), en los términos del parágrafo 3 del artículo 437 del Estatuto Tributario.',
    '',
    'El pago se recibe en:',
    i.datosPago.trim(),
    '',
    'Atentamente,',
    '',
    '',
    nombre,
    doc,
    ...contacto,
  ].join('\n');
}

export function cuentaCobroAsunto(i: Pick<CuentaCobroInput, 'numero' | 'nombreArtistico' | 'evento'>): string {
  return `Cuenta de cobro n.º ${i.numero.trim()} — ${i.nombreArtistico.trim()} — ${i.evento.trim()}`;
}

/** Enlace que abre el correo del artista con la cuenta de cobro ya escrita y dirigida a la Fundación. */
export function cuentaCobroMailto(i: CuentaCobroInput, now: number = Date.now()): string {
  return `mailto:${CUENTA_COBRO_EMAIL}?subject=${encodeURIComponent(cuentaCobroAsunto(i))}&body=${encodeURIComponent(cuentaCobroTexto(i, now))}`;
}

/** Número sugerido: consecutivo del año según el orden de sus presentaciones ("2026-03"). */
export function cuentaCobroNumeroSugerido(eventoFecha: string, posicion: number): string {
  const d = new Date(eventoFecha);
  const year = Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  return `${year}-${String(Math.max(1, posicion)).padStart(2, '0')}`;
}
