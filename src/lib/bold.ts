// Integración del Botón de pagos de Bold (modo "Embedded Checkout").
// Doc: https://developers.bold.co/pagos-en-linea/boton-de-pagos/integracion-manual
//
// El backend ya devuelve todo firmado (orderId, monto, hash de integridad). Aquí solo se carga el
// script de Bold bajo demanda y se abre el pago en un modal. Bold NO entrega callback de éxito en
// JavaScript: el resultado se confirma en /checkout/bold-result consultando al servidor.

const BOLD_SCRIPT_SRC = 'https://checkout.bold.co/library/boldPaymentButton.js';

export interface BoldCheckoutData {
  apiKey: string;
  orderId: string;
  amount: string;
  currency: string;
  integritySignature: string;
  description?: string;
}

export interface OpenBoldOptions extends BoldCheckoutData {
  redirectionUrl: string;
  customerData?: { email?: string; fullName?: string };
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

export async function openBoldCheckout(opts: OpenBoldOptions): Promise<void> {
  await loadBoldScript();

  const config: Record<string, any> = {
    orderId: opts.orderId,
    currency: opts.currency,
    amount: opts.amount,
    apiKey: opts.apiKey,
    integritySignature: opts.integritySignature,
    redirectionUrl: opts.redirectionUrl,
    renderMode: 'embedded',
  };
  if (opts.description) config.description = opts.description;

  const customer: Record<string, string> = {};
  if (opts.customerData?.email) customer.email = opts.customerData.email;
  if (opts.customerData?.fullName) customer.fullName = opts.customerData.fullName;
  if (Object.keys(customer).length > 0) config.customerData = JSON.stringify(customer);

  const checkout = new (window as any).BoldCheckout(config);
  checkout.open();
}
