// Directorio público de artistas: solo quienes publicaron su página.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Music } from 'lucide-react';

export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';

export const metadata: Metadata = {
  title: 'Artistas | Kasa del Sol',
  description: 'Artistas de Kasa del Sol: sus grabaciones, redes y próximas presentaciones.',
  alternates: { canonical: 'https://kasadelsol.co/artistas' },
};

type ArtistCard = { slug: string; stage_name: string; photo_url: string | null; tagline: string | null; genres: string[]; city: string | null };

async function getArtists(): Promise<ArtistCard[] | null> {
  try {
    const res = await fetch(`${API}/artists/public`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export default async function ArtistsPage() {
  const artists = await getArtists();

  return (
    <div className="min-h-screen bg-[#050505]">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <header className="mb-10">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-purple mb-2">Kasa del Sol</p>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-white">Artistas</h1>
        </header>

        {artists === null ? (
          <p role="alert" className="p-10 text-center text-sm font-bold text-zinc-400 border border-dashed border-zinc-800 rounded-2xl">No se pudo cargar el directorio. Intenta de nuevo en un momento.</p>
        ) : artists.length === 0 ? (
          <p className="p-10 text-center text-sm font-bold text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Pronto verás aquí a los artistas de la casa.</p>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {artists.map((a) => (
              <li key={a.slug}>
                <Link href={`/artistas/${a.slug}`} className="group block rounded-2xl overflow-hidden border border-zinc-900 bg-zinc-950 hover:border-neon-purple/60 transition-colors">
                  <div className="aspect-square bg-zinc-900 flex items-center justify-center overflow-hidden">
                    {a.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.photo_url} alt={a.stage_name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <Music className="w-10 h-10 text-zinc-700" />
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    <h2 className="text-sm sm:text-base font-black uppercase tracking-wide text-white break-words group-hover:text-neon-green transition-colors">{a.stage_name}</h2>
                    {(a.genres?.length > 0 || a.city) && (
                      <p className="mt-1 text-[11px] text-zinc-500 line-clamp-2">{[a.genres?.slice(0, 3).join(' · '), a.city].filter(Boolean).join(' — ')}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
