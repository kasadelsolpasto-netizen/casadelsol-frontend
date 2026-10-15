/**
 * Enlace de venta ONLINE del promotor: https://<sitio>/events/<evento>?promo=<CODIGO>.
 * Quien lo abre compra en línea y la venta queda a nombre del código del promotor (con su descuento ya aplicado).
 *
 * Sin dependencias de React ni del navegador (se puede probar en Node):  npm run test:scan
 */

export interface LinkCode {
  discount_perc?: number | null;
  ticket_limit?: number | null;
  tickets_sold?: number | null;
  tiers?: unknown[] | null;
  /** Escalón vigente (lo calcula el servidor al devolver el perfil del promotor). */
  current_tier?: { discount_perc: number } | null;
}

export type LinkState =
  | { ok: true; discountPerc: number }
  | { ok: false; reason: 'LIMIT' | 'NO_TIER'; message: string };

/**
 * ¿El enlace de este código deja comprar ahora? Es la misma regla con la que el servidor cobra:
 *  - código con límite de ventas ya alcanzado → rechaza la compra;
 *  - código con escalones y ninguno vigente → rechaza la compra;
 *  - si no, aplica el descuento del escalón vigente (o el del código si no tiene escalones).
 */
export function linkState(c: LinkCode): LinkState {
  if (c.ticket_limit && (c.tickets_sold ?? 0) >= c.ticket_limit) {
    return {
      ok: false,
      reason: 'LIMIT',
      message: 'Tu código ya llegó a su límite de ventas: quien abra este enlace pagará precio completo y la venta no quedará a tu nombre. Habla con el administrador.',
    };
  }
  if ((c.tiers?.length ?? 0) > 0) {
    if (!c.current_tier) {
      return {
        ok: false,
        reason: 'NO_TIER',
        message: 'No tienes descuentos vigentes: quien abra este enlace pagará precio completo y la venta no quedará a tu nombre. Habla con el administrador.',
      };
    }
    return { ok: true, discountPerc: c.current_tier.discount_perc };
  }
  return { ok: true, discountPerc: c.discount_perc ?? 0 };
}

/** Enlace de compra de un evento con el código del promotor. */
export function promoLinkUrl(origin: string, eventId: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/events/${encodeURIComponent(eventId)}?promo=${encodeURIComponent(code)}`;
}

export interface PromoMessageInput {
  eventTitle?: string | null;
  url: string;
  /** Etapa vigente y sus precios YA formateados (ej. "$ 50.000"). Si no hay etapa a la venta se omiten. */
  stageName?: string | null;
  basePrice?: string | null;
  finalPrice?: string | null;
  discountPerc?: number | null;
}

/** Mensaje listo para mandar por WhatsApp: precio tachado + precio con descuento (WhatsApp tacha con ~texto~). */
export function buildPromoLinkMessage({ eventTitle, url, stageName, basePrice, finalPrice, discountPerc }: PromoMessageInput): string {
  const event = (eventTitle ?? '').trim() || 'el evento';
  let priceLine = '';
  if (finalPrice) {
    const stage = (stageName ?? '').trim();
    const where = stage ? ` (${stage})` : '';
    priceLine =
      basePrice && basePrice !== finalPrice && (discountPerc ?? 0) > 0
        ? `Precio ahora${where}: ~${basePrice}~ *${finalPrice}* con mi código (${discountPerc}% de descuento)\n\n`
        : `Precio ahora${where}: *${finalPrice}*\n\n`;
  }
  return (
    `🎶 *Kasa del Sol*\n\n` +
    `Hola, aquí puedes comprar tu entrada para *${event}*.\n\n` +
    priceLine +
    `Cómprala aquí:\n${url}\n\n` +
    `¡Nos vemos en la pista!`
  );
}
