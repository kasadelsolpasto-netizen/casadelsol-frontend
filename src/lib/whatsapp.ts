/**
 * Compartir las entradas de una venta por WhatsApp desde el panel del promotor.
 * Sin dependencias de React ni del navegador (se puede probar en Node).
 */

/**
 * Número en formato internacional SIN "+" (ej. 573001234567), o null si no se puede interpretar.
 *  - Celular colombiano: 10 dígitos que empiezan por 3 → se le antepone 57.
 *  - Ya con 57: se respeta.
 *  - Otro país: solo si lo escribieron con "+" o "00" (ej. +34 612 345 678).
 */
export function normalizeWhatsAppPhone(raw: string): string | null {
  const original = (raw ?? '').trim();
  if (!original) return null;
  const digits = original.replace(/\D/g, '');
  if (/^3\d{9}$/.test(digits)) return '57' + digits;
  if (/^573\d{9}$/.test(digits)) return digits;
  if (/^(\+|00)/.test(original)) {
    const intl = digits.replace(/^00/, '');
    if (/^[1-9]\d{7,14}$/.test(intl)) return intl;
  }
  return null;
}

/** Enlace público de una entrada: es lo mismo que contiene su QR y lo que abre la página /ticket/<token>. */
export function ticketUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/ticket/${token}`;
}

export interface TicketsMessageInput {
  buyerName?: string | null;
  eventTitle?: string | null;
  urls: string[];
}

/** Mensaje listo para mandar al comprador (una entrada o varias). */
export function buildTicketsMessage({ buyerName, eventTitle, urls }: TicketsMessageInput): string {
  const first = (buyerName ?? '').trim().split(/\s+/)[0] || '';
  const greet = first ? `Hola ${first}, ` : 'Hola, ';
  const event = (eventTitle ?? '').trim() || 'el evento';
  const many = urls.length > 1;
  const list = many ? urls.map((u, i) => `Entrada ${i + 1}: ${u}`).join('\n') : `Tu entrada:\n${urls[0] ?? ''}`;
  return (
    `🎶 *Kasa del Sol*\n\n` +
    `${greet}aquí ${many ? 'están tus entradas' : 'está tu entrada'} para *${event}*.\n\n` +
    `${list}\n\n` +
    `Presenta el QR en la puerta. ¡Nos vemos en la pista!`
  );
}

/** Enlace de WhatsApp: con número abre el chat directo; sin número deja elegir el contacto. */
export function whatsappLink(phone: string | null, text: string): string {
  return `https://wa.me/${phone ?? ''}?text=${encodeURIComponent(text)}`;
}
