// Recaudadores: quién recibe el dinero de cada servicio de pago de la página.
// Funciones PURAS (sin red ni estado) para que el panel y las pruebas compartan la misma lógica.
//
// El backend decide lo mismo en el servidor (src/payments/payment-accounts.ts). Aquí se repite
// la precedencia para poder avisar en el panel qué va a pasar ANTES de guardar.

export type Gateway = 'wompi' | 'bold';
export type GatewayEnvironment = 'sandbox' | 'production';

export interface Recipient {
  id: string;
  name: string;
  gateway: Gateway;
  environment: GatewayEnvironment;
  effectiveEnvironment: GatewayEnvironment;
  usable: boolean;
  archived: boolean;
  missing: string[];
  publicCredentials: Record<string, string>;
  savedSecrets: string[];
}

export interface Routing {
  default: string | null;
  services: Record<string, string | null>;
}

export interface PaymentService {
  key: string;
  label: string;
  description?: string;
}

export const GATEWAY_LABEL: Record<Gateway, string> = {
  wompi: 'Wompi',
  bold: 'Bold',
};

export const GATEWAY_SUBTITLE: Record<Gateway, string> = {
  wompi: 'Widget de pagos (Bancolombia)',
  bold: 'Botón de pagos',
};

export interface CredentialField {
  field: string;
  label: string;
  hint: string;
  secret: boolean;
  required: boolean;
}

/** Llaves que pide cada pasarela, en el orden en que se muestran en el formulario. */
export const CREDENTIAL_FIELDS: Record<Gateway, CredentialField[]> = {
  wompi: [
    {
      field: 'publicKey',
      label: 'Llave pública',
      hint: 'Empieza en pub_test_ (pruebas) o pub_prod_ (producción). El prefijo decide el entorno.',
      secret: false,
      required: true,
    },
    {
      field: 'integritySecret',
      label: 'Secreto de integridad',
      hint: 'Firma el monto del checkout para que no se pueda alterar desde el navegador.',
      secret: true,
      required: false,
    },
    {
      field: 'eventsSecret',
      label: 'Secreto de eventos',
      hint: 'Valida el checksum de los webhooks que envía Wompi.',
      secret: true,
      required: false,
    },
    {
      field: 'privateKey',
      label: 'Llave privada',
      hint: 'Solo si tu comercio la usa. Nunca sale del servidor.',
      secret: true,
      required: false,
    },
  ],
  bold: [
    {
      field: 'apiKey',
      label: 'Llave de identidad',
      hint: 'Identifica tu comercio ante Bold. Es pública.',
      secret: false,
      required: true,
    },
    {
      field: 'secretKey',
      label: 'Llave secreta',
      hint: 'Firma el hash de integridad y valida los webhooks. Solo se usa en el servidor.',
      secret: true,
      required: true,
    },
  ],
};

export function environmentLabel(env: GatewayEnvironment): string {
  return env === 'production' ? 'Producción' : 'Pruebas';
}

export function recipientById(list: readonly Recipient[], id: string | null | undefined): Recipient | null {
  if (!id) return null;
  return list.find((r) => r.id === id) || null;
}

/**
 * Quién cobra un servicio, con la misma precedencia del backend:
 * el asignado al servicio, el de por defecto, y como último recurso cualquiera que pueda cobrar.
 */
export function whoCollects(
  service: string,
  routing: Routing | null | undefined,
  list: readonly Recipient[],
): Recipient | null {
  const candidates = [routing?.services?.[service], routing?.default];
  for (const id of candidates) {
    const recipient = recipientById(list, id);
    if (recipient && recipient.usable && !recipient.archived) return recipient;
  }
  return list.find((r) => r.usable && !r.archived) || null;
}

export interface RoutingWarning {
  service: string;
  label: string;
  text: string;
}

/** Avisos para el panel: servicios que no los cobra quien se asignó, o que no los cobra nadie. */
export function routingWarnings(
  services: readonly PaymentService[],
  routing: Routing | null | undefined,
  list: readonly Recipient[],
): RoutingWarning[] {
  const warnings: RoutingWarning[] = [];
  for (const service of services) {
    const intended = recipientById(list, routing?.services?.[service.key] ?? routing?.default ?? null);
    const effective = whoCollects(service.key, routing, list);

    if (!effective) {
      warnings.push({
        service: service.key,
        label: service.label,
        text: `Nadie puede cobrar ${service.label.toLowerCase()}: configura un recaudador con sus llaves.`,
      });
      continue;
    }
    if (intended && intended.id !== effective.id) {
      warnings.push({
        service: service.key,
        label: service.label,
        text: `${service.label} está asignada a «${intended.name}», pero cobra «${effective.name}» porque a la primera le faltan llaves.`,
      });
      continue;
    }
    if (!intended) {
      warnings.push({
        service: service.key,
        label: service.label,
        text: `${service.label} no tiene recaudador asignado ni hay uno por defecto: está cobrando «${effective.name}».`,
      });
    }
  }
  return warnings;
}

/** Resumen de una línea para la tarjeta del recaudador. */
export function recipientSummary(recipient: Recipient): string {
  const parts = [GATEWAY_LABEL[recipient.gateway], environmentLabel(recipient.effectiveEnvironment)];
  if (recipient.archived) parts.push('archivado');
  else if (!recipient.usable) parts.push('faltan llaves');
  return parts.join(' · ');
}

/** No se puede borrar el último recaudador capaz de cobrar. */
export function canDelete(list: readonly Recipient[], id: string): boolean {
  const remaining = list.filter((r) => r.id !== id);
  return remaining.some((r) => r.usable && !r.archived);
}

/** Nombre legible de una llave que falta, para el aviso del panel. */
export function missingLabel(gateway: Gateway, field: string): string {
  return CREDENTIAL_FIELDS[gateway].find((f) => f.field === field)?.label || field;
}

/** Recaudadores que se pueden elegir para cobrar (los archivados y sin llaves no). */
export function selectableRecipients(list: readonly Recipient[]): Recipient[] {
  return list.filter((r) => r.usable && !r.archived);
}
