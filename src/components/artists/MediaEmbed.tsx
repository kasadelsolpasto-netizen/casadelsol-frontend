import { ExternalLink } from 'lucide-react';
import { linkHost, mediaEmbed, safeExternalUrl } from '@/lib/embeds';

/**
 * Grabación del artista. Si el enlace es de YouTube o SoundCloud se muestra el reproductor oficial (se carga
 * solo cuando entra en pantalla); cualquier otro enlace se muestra como botón que abre en otra pestaña.
 */
export default function MediaEmbed({ url, title }: { url: string | null | undefined; title?: string }) {
  const embed = mediaEmbed(url);
  if (embed) {
    return (
      <div
        className="w-full overflow-hidden rounded-xl border border-zinc-800 bg-black"
        style={embed.height === null ? { aspectRatio: '16 / 9' } : { height: embed.height }}
      >
        <iframe
          src={embed.src}
          title={title ? `${title} — ${embed.title}` : embed.title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          className="block h-full w-full border-0"
        />
      </div>
    );
  }
  const href = safeExternalUrl(url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="inline-flex max-w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-300 transition-colors hover:border-neon-purple/60 hover:text-white"
    >
      <ExternalLink className="h-4 w-4 shrink-0 text-neon-purple" />
      <span className="truncate">Abrir en {linkHost(href) || 'el sitio'}</span>
    </a>
  );
}
