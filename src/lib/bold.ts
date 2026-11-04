// Integración del Botón de pagos de Bold (modo "Embedded Checkout").
// Doc: https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual
//
// El backend ya devuelve todo firmado (orderId, monto, hash de integridad). Aquí solo se carga el
// script de Bold bajo demanda y se abre el pago en un modal. Bold NO entrega callback de éxito en
// JavaScript: el resultado se confirma en /checkout/bold-result consultando al servidor.

const BOLD_SCRIPT_SRC = 'https://checkout.bold.co/library/boldPaymentButton.js';

export interface BoldCustomerData {
  email?: string;
  fullName?: string;
  phone?: string;
  dialCode?: string;
  documentNumber?: string;
  documentType?: string;
}

/**
 * Lo que devuelve el backend en `bold`. Todo viene ya armado y saneado en el servidor:
 * aquí no se calcula ni se completa nada, solo se traslada a BoldCheckout.
 */
export interface BoldCheckoutData {
  apiKey: string;
  orderId: string;
  amount: string;
  currency: string;
  integritySignature: string;
  description?: string;
  /** Nanosegundos de época: pasado ese momento Bold ya no deja pagar. */
  expirationDate?: string;
  /** Campos del comercio para conciliar; el comprador no los ve. */
  extraData1?: string;
  extraData2?: string;
  customerData?: BoldCustomerData;
}

export interface OpenBoldOptions extends BoldCheckoutData {
  redirectionUrl: string;
  /** A dónde vuelve el comprador si abandona o cancela. Por defecto, la página de resultado. */
  originUrl?: string;
}

function loadBoldScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Bold solo funciona en el navegador.'));
    const w = window as any;
    if (typeof w.BoldCheckout === 'function') return resolve();

    const fail = () => reject(new Error('No se pudo cargar la pasarela Bold. Revisa tu conexión e intenta de nuevo.'));
    const check = () => (typeof w.BoldCheckout === 'function' ? resolve() : fail());

    const timer = setTimeout(fail, 15000);
    const done = () => { clearTimeout(timer); check(); };

    const existing = document.querySelector(`script[src="${BOLD_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => { clearTimeout(timer); fail(); });
      return;
    }

    const script = document.createElement('script');
    script.src = BOLD_SCRIPT_SRC;
    script.async = true;
    script.onload = done;
    script.onerror = () => { clearTimeout(timer); fail(); };
    document.head.appendChild(script);
  });
}

/**
 * A dónde vuelve el comprador que abandona el pago. Lleva la referencia y una marca para que
 * la página de resultado muestre «pago no completado» de una vez, en vez de quedarse
 * consultando un pago que nunca ocurrió.
 */
export function abandonUrl(redirectionUrl: string, orderId: string): string {
  const sep = redirectionUrl.includes('?') ? '&' : '?';
  return `${redirectionUrl}${sep}bold-order-id=${encodeURIComponent(orderId)}&bold-abandoned=1`;
}

export async function openBoldCheckout(opts: OpenBoldOptions): Promise<void> {
  await loadBoldScript();

  const config: Record<string, any> = {
    orderId: opts.orderId,
    currency: opts.currency,
    amount: opts.amount,
    apiKey: opts.apiKey,
    integritySignature: opts.integritySignature,
    redirectionUrl: opts.redirectionUrl,
    originUrl: opts.originUrl || abandonUrl(opts.redirectionUrl, opts.orderId),
    renderMode: 'embedded',
  };
  if (opts.description) config.description = opts.description;
  if (opts.expirationDate) config.expirationDate = opts.expirationDate;
  if (opts.extraData1) config.extraData1 = opts.extraData1;
  if (opts.extraData2) config.extraData2 = opts.extraData2;

  // Bold espera customerData como JSON en texto, no como objeto.
  if (opts.customerData && Object.keys(opts.customerData).length > 0) {
    config.customerData = JSON.stringify(opts.customerData);
  }

  const checkout = new (window as any).BoldCheckout(config);
  checkout.open();
}
