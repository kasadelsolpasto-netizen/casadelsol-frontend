/**
 * Reproductores incrustados de las grabaciones del artista. Funciones puras (se prueban con `node --test`).
 * Solo YouTube y SoundCloud: de un enlace público se arma la dirección del reproductor oficial.
 * Cualquier otro enlace (o uno que no se reconoce) no se incrusta: se muestra como botón.
 */

export type EmbedProvider = 'youtube' | 'soundcloud';

export interface MediaEmbed {
  provider: EmbedProvider;
  /** Dirección del reproductor, lista para el `src` de un iframe. */
  src: string;
  /** Alto fijo en píxeles; null = proporción 16:9 (video). */
  height: number | null;
  title: string;
}

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_LIST = /^[A-Za-z0-9_-]{10,64}$/;

function parseUrl(raw: string | null | undefined): URL | null {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u : null;
  } catch {
    return null;
  }
}

/** "1h2m3s", "90", "1m30s" => segundos. */
function startSeconds(v: string | null): number {
  if (!v) return 0;
  if (/^\d+$/.test(v)) return Number(v);
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(v);
  if (!m) return 0;
  return (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0);
}

function youtube(u: URL): MediaEmbed | null {
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id = '';
  if (host === 'youtu.be') {
    id = u.pathname.split('/')[1] ?? '';
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') id = u.searchParams.get('v') ?? '';
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1] ?? '';
    const list = u.searchParams.get('list') ?? '';
    if (!YT_ID.test(id) && parts[0] === 'playlist' && YT_LIST.test(list)) {
      return { provider: 'youtube', src: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}&rel=0`, height: null, title: 'Lista de YouTube' };
    }
  } else {
    return null;
  }
  if (!YT_ID.test(id)) return null;
  const start = startSeconds(u.searchParams.get('t') ?? u.searchParams.get('start'));
  return {
    provider: 'youtube',
    src: `https://www.youtube-nocookie.com/embed/${id}?rel=0${start > 0 ? `&start=${start}` : ''}`,
    height: null,
    title: 'Video de YouTube',
  };
}

function soundcloud(u: URL): MediaEmbed | null {
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  if (host !== 'soundcloud.com') return null; // los enlaces cortos (on.soundcloud.com) no los abre el reproductor
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;
  const reserved = ['discover', 'search', 'upload', 'you', 'settings', 'stream', 'charts', 'pages', 'terms-of-use', 'signin', 'logout'];
  if (reserved.includes(parts[0].toLowerCase())) return null;
  // Se conserva el token de las pistas privadas compartidas (…/s-XXXX o ?secret_token=…).
  const clean = `https://soundcloud.com/${parts.map(encodeURIComponent).join('/')}`;
  const secret = u.searchParams.get('secret_token');
  const target = secret && /^s-[A-Za-z0-9]+$/.test(secret) ? `${clean}?secret_token=${secret}` : clean;
  // Una pista sola es un reproductor bajo; un perfil o una lista muestran varias pistas.
  const isSet = parts.length === 1 || parts[1] === 'sets' || ['tracks', 'albums', 'popular-tracks', 'reposts', 'likes'].includes(parts[1]);
  const params = 'color=%23bf00ff&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';
  return {
    provider: 'soundcloud',
    src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(target)}&${params}`,
    height: isSet ? 352 : 166,
    title: 'Audio de SoundCloud',
  };
}

/** Reproductor para un enlace de YouTube o SoundCloud; null si el enlace no es de ninguno de los dos. */
export function mediaEmbed(raw: string | null | undefined): MediaEmbed | null {
  const u = parseUrl(raw);
  if (!u) return null;
  return youtube(u) ?? soundcloud(u);
}

/** Dominio legible de un enlace ("soundcloud.com"), para los botones. */
export function linkHost(raw: string | null | undefined): string {
  const u = parseUrl(raw);
  return u ? u.hostname.replace(/^www\./, '') : '';
}

/** Solo se pintan como enlace las direcciones web: nunca javascript: ni data:. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  const u = parseUrl(raw);
  return u && u.protocol === 'https:' ? u.toString() : null;
}

export const LINK_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  soundcloud: 'SoundCloud',
  spotify: 'Spotify',
  youtube: 'YouTube',
  bandcamp: 'Bandcamp',
  mixcloud: 'Mixcloud',
  beatport: 'Beatport',
  apple_music: 'Apple Music',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  x: 'X',
  residentadvisor: 'Resident Advisor',
  whatsapp: 'WhatsApp',
  web: 'Sitio web',
  other: 'Enlace',
};

/** Nombre que se muestra en un enlace del artista: el que él puso, o el de la red. */
export function linkLabel(link: { kind?: string | null; label?: string | null; url?: string | null }): string {
  const own = String(link.label ?? '').trim();
  if (own) return own;
  const kind = String(link.kind ?? '');
  if (kind && kind !== 'web' && kind !== 'other' && LINK_LABELS[kind]) return LINK_LABELS[kind];
  return linkHost(link.url) || LINK_LABELS[kind] || 'Enlace';
}
