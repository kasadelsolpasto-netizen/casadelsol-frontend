// Página pública de un artista: imagen, redes, grabaciones con reproductor y presentaciones.
// Todo lo que escribe el artista se pinta como TEXTO (nunca como HTML) y sus enlaces solo si son https.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, ExternalLink, MapPin, Music, Pin } from 'lucide-react';
import MediaEmbed from '@/components/artists/MediaEmbed';
import { linkLabel, mediaEmbed, safeExternalUrl } from '@/lib/embeds';
import { toJsonLd } from '@/lib/sanitize-html';

export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const SITE_URL = 'https://kasadelsol.co';

type ArtistLink = { kind?: string; label?: string | null; url: string };
type ArtistPost = { id: string; kind: 'ARTICLE' | 'MUSIC' | 'LINK'; title: string; body: string | null; url: string | null; cover_url: string | null; is_pinned: boolean; created_at: string };
type ArtistEvent = { id: string; title: string; date: string; venue: string | null; flyer_url: string | null; seo_slug: string | null; role: string | null };
type ArtistPublic = {
  slug: string;
  stage_name: string;
  bio: string | null;
  photo_url: string | null;
  cover_url: string | null;
  tagline: string | null;
  genres: string[];
  city: string | null;
  links: ArtistLink[];
  posts: ArtistPost[];
  upcoming_events: ArtistEvent[];
  past_events: ArtistEvent[];
};

async function getArtist(slug: string): Promise<ArtistPublic | null> {
  try {
    const res = await fetch(`${API}/artists/public/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await getArtist(params.slug);
  if (!a) return { title: 'Artista no encontrado | Kasa del Sol' };
  const title = `${a.stage_name} | Kasa del Sol`;
  const description = (a.tagline || a.bio || `${a.stage_name} en Kasa del Sol.`).replace(/\s+/g, ' ').trim().slice(0, 160);
  const canonical = `${SITE_URL}/artistas/${a.slug}`;
  const image = a.cover_url || a.photo_url || undefined;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, siteName: 'Kasa del Sol', type: 'profile', images: image ? [{ url: image }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  };
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'long', year: 'numeric' });
};

function EventRow({ e }: { e: ArtistEvent }) {
  return (
    <li>
      <Link href={`/events/${e.seo_slug || e.id}`} className="group flex items-center gap-3 rounded-xl border border-zinc-900 bg-zinc-950 p-2.5 hover:border-neon-green/50 transition-colors">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-900 shrink-0 flex items-center justify-center">
          {e.flyer_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.flyer_url} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <Calendar className="w-5 h-5 text-zinc-700" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black uppercase tracking-wide text-white truncate group-hover:text-neon-green transition-colors">{e.title}</p>
          <p className="text-[11px] text-zinc-500 truncate">{[fmt(e.date), e.venue].filter(Boolean).join(' · ')}</p>
        </div>
      </Link>
    </li>
  );
}

export default async function ArtistPublicPage({ params }: { params: { slug: string } }) {
  const a = await getArtist(params.slug);
  if (!a) notFound();

  const links = (a.links ?? []).map((l) => ({ ...l, href: safeExternalUrl(l.url) })).filter((l) => l.href);
  const recordings = a.posts.filter((p) => p.kind === 'MUSIC');
  const others = a.posts.filter((p) => p.kind !== 'MUSIC');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: a.stage_name,
    url: `${SITE_URL}/artistas/${a.slug}`,
    ...(a.photo_url ? { image: a.photo_url } : {}),
    ...(a.bio ? { description: a.bio.slice(0, 500) } : {}),
    ...(a.genres?.length ? { genre: a.genres } : {}),
    ...(links.length ? { sameAs: links.map((l) => l.href) } : {}),
  };

  return (
    <div className="min-h-screen bg-[#050505]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(jsonLd) }} />

      {/* Portada: la imagen se muestra tal cual, sin filtros */}
      <div className="relative w-full">
        {a.cover_url ? (
          <div className="relative h-[34vh] sm:h-[46vh] overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.cover_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#050505] to-transparent" />
          </div>
        ) : (
          <div className="h-24 bg-gradient-to-b from-zinc-900 to-[#050505]" />
        )}
      </div>

      <main className={`max-w-3xl mx-auto px-4 sm:px-6 pb-28 relative z-10 ${a.cover_url ? '-mt-16' : ''}`}>
        <Link href="/artistas" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 uppercase font-bold tracking-widest text-[10px] min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> Artistas
        </Link>

        <header className="flex flex-col sm:flex-row sm:items-end gap-5 mb-8">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-zinc-800 bg-zinc-900 shrink-0 flex items-center justify-center">
            {a.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photo_url} alt={a.stage_name} className="w-full h-full object-cover" />
            ) : (
              <Music className="w-12 h-12 text-zinc-700" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white leading-none break-words">{a.stage_name}</h1>
            {a.tagline && <p className="mt-3 text-base sm:text-lg text-zinc-300">{a.tagline}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {a.city && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-zinc-400"><MapPin className="w-3.5 h-3.5" /> {a.city}</span>
              )}
              {a.genres?.map((g) => (
                <span key={g} className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-neon-purple/40 text-neon-purple">{g}</span>
              ))}
            </div>
          </div>
        </header>

        {links.length > 0 && (
          <nav aria-label={`Redes de ${a.stage_name}`} className="mb-10 flex flex-wrap gap-2">
            {links.map((l) => (
              <a key={l.href} href={l.href!} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl border border-zinc-800 bg-zinc-950 text-[11px] font-black uppercase tracking-widest text-zinc-200 hover:border-neon-green/60 hover:text-neon-green transition-colors">
                {linkLabel(l)} <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            ))}
          </nav>
        )}

        {a.bio && (
          <section className="mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-3">Sobre {a.stage_name}</h2>
            <p className="text-zinc-300 leading-relaxed whitespace-pre-line break-words">{a.bio}</p>
          </section>
        )}

        {recordings.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Grabaciones</h2>
            <ul className="space-y-6">
              {recordings.map((p) => (
                <li key={p.id}>
                  <h3 className="text-base font-black uppercase tracking-wide text-white mb-2 flex items-center gap-2 break-words">
                    {p.is_pinned && <Pin className="w-4 h-4 text-neon-green shrink-0" />} {p.title}
                  </h3>
                  <MediaEmbed url={p.url} title={p.title} />
                  {p.body && <p className="mt-2 text-sm text-zinc-400 leading-relaxed whitespace-pre-line break-words">{p.body}</p>}
                  {mediaEmbed(p.url) && safeExternalUrl(p.url) && (
                    <a href={safeExternalUrl(p.url)!} target="_blank" rel="noopener noreferrer nofollow" className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-neon-purple transition-colors min-h-[32px]">
                      Abrir en {mediaEmbed(p.url)!.provider === 'youtube' ? 'YouTube' : 'SoundCloud'} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {a.upcoming_events.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Próximas presentaciones</h2>
            <ul className="space-y-2">{a.upcoming_events.map((e) => <EventRow key={e.id} e={e} />)}</ul>
          </section>
        )}

        {others.length > 0 && (
          <section className="mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Publicaciones</h2>
            <ul className="space-y-5">
              {others.map((p) => (
                <li key={p.id} className="rounded-2xl border border-zinc-900 bg-zinc-950 overflow-hidden">
                  {p.cover_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.cover_url} alt="" loading="lazy" className="w-full max-h-[480px] object-cover" />
                  )}
                  <div className="p-5">
                    <p className="text-[10px] font-bold text-zinc-600 mb-1">{fmt(p.created_at)}</p>
                    <h3 className="text-lg font-black uppercase tracking-wide text-white mb-2 flex items-center gap-2 break-words">
                      {p.is_pinned && <Pin className="w-4 h-4 text-neon-green shrink-0" />} {p.title}
                    </h3>
                    {p.body && <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line break-words">{p.body}</p>}
                    {p.url && <div className="mt-3"><MediaEmbed url={p.url} title={p.title} /></div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {a.past_events.length > 0 && (
          <section>
            <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Presentaciones anteriores</h2>
            <ul className="space-y-2">{a.past_events.map((e) => <EventRow key={e.id} e={e} />)}</ul>
          </section>
        )}
      </main>
    </div>
  );
}
