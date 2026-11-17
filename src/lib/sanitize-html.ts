/**
 * Limpieza del HTML que se pinta con dangerouslySetInnerHTML (publicaciones, descripción de eventos,
 * título del inicio). Sin dependencias: funciona igual en el servidor y en el navegador.
 *
 * Es una lista de PERMITIDOS: solo pasan las etiquetas y atributos que produce el editor (negritas, cursivas,
 * títulos, listas, citas, alineación, color, imágenes y enlaces). Todo lo demás se descarta: scripts,
 * manejadores on*, enlaces javascript:, iframes, formularios, estilos arbitrarios.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'del', 'mark', 'sub', 'sup', 'small',
  'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'span', 'div',
]);
const VOID_TAGS = new Set(['br', 'hr', 'img']);
/** Etiquetas cuyo CONTENIDO también se elimina (no solo la etiqueta). */
const DROP_WITH_CONTENT = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'noscript', 'template', 'textarea', 'title', 'head', 'select', 'frameset'];

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR_RE = /([a-zA-Z_:][-\w:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', colon: ':', tab: '\t', newline: '\n' };

/** Convierte entidades (&amp; &#58; &#x3a; …) en su carácter. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);?/gi, (m, code: string) => {
    const c = code.toLowerCase();
    if (c[0] === '#') {
      const n = c[1] === 'x' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return c in NAMED ? NAMED[c] : m;
  });
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Dirección segura para href/src: http(s), correo, teléfono, o relativa al sitio. Nunca javascript: ni data:. */
export function safeHref(raw: string, forImage = false): string | null {
  // Los navegadores ignoran espacios y caracteres de control dentro del esquema: se quitan antes de mirar.
  const url = decodeEntities(raw).replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!forImage && /^(mailto:|tel:)/i.test(url)) return url;
  if (/^(\/(?!\/)|#)/.test(url)) return url;
  return null;
}

/** Del atributo style solo sobreviven la alineación y el color del texto que pone el editor. */
function safeStyle(raw: string): string {
  const out: string[] = [];
  for (const decl of decodeEntities(raw).split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim();
    if (prop === 'text-align' && /^(left|right|center|justify)$/i.test(value)) out.push(`text-align: ${value.toLowerCase()}`);
    if (prop === 'color' && /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\)|[a-z]{3,20})$/i.test(value)) out.push(`color: ${value}`);
  }
  return out.join('; ');
}

function cleanAttrs(tag: string, raw: string): string {
  const out: string[] = [];
  const seen = new Set<string>();
  let blank = false;
  ATTR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ATTR_RE.exec(raw))) {
    const name = m[1].toLowerCase();
    if (seen.has(name)) continue;
    let value = m[2] ?? '';
    if (/^["']/.test(value)) value = value.slice(1, -1);
    let keep: string | null = null;
    if (name === 'class') {
      // Clases de utilidad (incluidas las de valor arbitrario del título del inicio). Sin comillas ni llaves.
      keep = /^[\w\s\-:\[\]#().,/%!*+]*$/.test(value) ? value : null;
    } else if (name === 'style') {
      keep = safeStyle(value) || null;
    } else if (tag === 'a' && name === 'href') {
      keep = safeHref(value);
    } else if (tag === 'a' && name === 'target') {
      if (value === '_blank') blank = true;
      continue;
    } else if (tag === 'img' && name === 'src') {
      keep = safeHref(value, true);
    } else if (tag === 'img' && (name === 'alt' || name === 'title')) {
      keep = decodeEntities(value);
    } else if (tag === 'img' && (name === 'width' || name === 'height')) {
      keep = /^\d{1,4}%?$/.test(value) ? value : null;
    }
    if (keep === null) continue;
    seen.add(name);
    out.push(`${name}="${escAttr(keep)}"`);
  }
  if (tag === 'a') {
    // Un enlace externo abre en otra pestaña y no puede controlar esta (window.opener).
    const href = out.find((a) => a.startsWith('href="http'));
    if (blank || href) out.push('target="_blank"', 'rel="noopener noreferrer nofollow"');
  }
  if (tag === 'img') out.push('loading="lazy"');
  return out.length ? ' ' + out.join(' ') : '';
}

function dropDangerousBlocks(html: string): string {
  let s = html.replace(/<!--[\s\S]*?(-->|$)/g, '').replace(/<!\[CDATA\[[\s\S]*?(\]\]>|$)/gi, '').replace(/<[!?][^>]*>?/g, '');
  for (const t of DROP_WITH_CONTENT) {
    s = s.replace(new RegExp(`<${t}\\b[\\s\\S]*?(<\\/${t}\\s*>|$)`, 'gi'), '');
  }
  return s;
}

/** Devuelve el HTML sin código peligroso. Vacío o null => ''. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return '';
  const src = dropDangerousBlocks(String(html));
  let out = '';
  let last = 0;
  TAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  const text = (t: string) => t.replace(/</g, '&lt;');
  while ((m = TAG_RE.exec(src))) {
    out += text(src.slice(last, m.index));
    last = m.index + m[0].length;
    const tag = m[2].toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) continue; // etiqueta desconocida: se quita, su texto se conserva
    if (m[1]) {
      if (!VOID_TAGS.has(tag)) out += `</${tag}>`;
    } else {
      out += `<${tag}${cleanAttrs(tag, m[3] || '')}>`;
    }
  }
  return out + text(src.slice(last));
}

/**
 * El mismo contenido como TEXTO, para resúmenes y vistas previas: sin etiquetas ni entidades a la vista.
 * Un enlace queda con su texto; un párrafo se separa del siguiente con un espacio.
 */
export function htmlToText(html: string | null | undefined, max = 0): string {
  if (!html) return '';
  const s = decodeEntities(
    dropDangerousBlocks(String(html))
      .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|ul|ol)\s*>|<br\s*\/?>|<hr\s*\/?>/gi, ' ')
      .replace(/<\/?[a-zA-Z][^>]*>/g, ''),
  )
    .replace(/\s+/g, ' ')
    .trim();
  if (max > 0 && s.length > max) return s.slice(0, max).replace(/\s+\S*$/, '') + '…';
  return s;
}

/**
 * Datos estructurados (JSON-LD) dentro de <script type="application/ld+json">.
 * Se escapa "<" para que un título con "</script>" no pueda cerrar la etiqueta e inyectar código.
 */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * Resumen CON formato para las tarjetas del feed: negritas, cursivas y enlaces se ven como tales, pero el
 * enlace se pinta sin ser pulsable (la tarjeta entera ya lleva a la publicación) y sin imágenes ni títulos grandes.
 */
export function excerptHtml(html: string | null | undefined): string {
  return sanitizeHtml(html)
    .replace(/<a\b[^>]*>/g, '<span class="post-link">')
    .replace(/<\/a>/g, '</span>')
    .replace(/<img\b[^>]*>/g, '')
    .replace(/<(\/?)h[1-6]\b[^>]*>/g, '<$1p>')
    .replace(/<hr>/g, '');
}
