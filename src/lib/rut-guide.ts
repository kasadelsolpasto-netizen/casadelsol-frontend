/**
 * Documentos que el artista envía para su pago e instructivo del RUT. Un solo lugar para el panel del artista
 * y para la página /guia-rut. Texto y enlaces; sin lógica de pantalla.
 */

export const ARTIST_DOCS_EMAIL = 'artistas@kasadelsol.co';

/** Lo que se envía al correo de artistas. */
export const ARTIST_DOCS = ['Copia del RUT', 'Copia de la cédula', 'Certificación bancaria de una cuenta a tu nombre'] as const;

export const DIAN_HOME = 'https://www.dian.gov.co';
/** Inscripción en línea del RUT (portal MUISCA de la DIAN). */
export const DIAN_RUT_SIGNUP = 'https://muisca.dian.gov.co/WebRutMuisca/DefInscripcionRutPortal.faces';
/** Ingreso de quien ya tiene usuario en la DIAN (para consultar o actualizar su RUT). */
export const DIAN_LOGIN = 'https://muisca.dian.gov.co/WebIdentidadLogin/';

/** Enlace que abre el correo ya dirigido y con el asunto puesto. */
export function docsMailto(stageName?: string | null, eventTitle?: string | null): string {
  const who = String(stageName ?? '').trim();
  const subject = ['Documentos para pago', who, String(eventTitle ?? '').trim()].filter(Boolean).join(' — ');
  const body = `Adjunto:\n- Copia del RUT\n- Copia de la cédula\n- Certificación bancaria\n\n${who ? `Nombre artístico: ${who}\n` : ''}`;
  return `mailto:${ARTIST_DOCS_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** El aviso de bienvenida se muestra una sola vez por cuenta en cada equipo. */
export const docsSeenKey = (userId: string | null | undefined) => `kasa_artist_docs_seen_${userId || 'anon'}`;
