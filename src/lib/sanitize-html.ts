/**
 * Limpieza del HTML que se pinta con dangerouslySetInnerHTML (publicaciones, descripción de eventos,
 * título del inicio). Quita lo peligroso (scripts, onclick=..., enlaces javascript:, iframes, formularios)
 * y conserva el formato del editor Tiptap: negritas, cursivas, títulos, listas, colores y alineación
 * (atributo style), clases (p. ej. text-neon-green), imágenes y enlaces.
 * Funciona igual en el servidor (Node, con jsdom) y en el navegador.
 */
import DOMPurify from 'isomorphic-dompurify';

// Etiquetas que el editor nunca produce y que solo servirían para engañar o romper la página.
const FORBID_TAGS = ['style', 'form', 'input', 'button', 'textarea', 'select', 'option'];

// Los enlaces que abren en otra pestaña no deben poder controlar esta pestaña (window.opener).
let hooksReady = false;
function ensureHooks() {
  if (hooksReady) return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer nofollow');
    }
  });
  hooksReady = true;
}

/** Devuelve el HTML sin código peligroso. Si llega vacío o null, devuelve ''. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  ensureHooks();
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target'],
    FORBID_TAGS,
  });
}

/**
 * Datos estructurados (JSON-LD) para Google dentro de <script type="application/ld+json">.
 * Se escapa "<" para que un título con "</script>" no pueda cerrar la etiqueta e inyectar código.
 */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
