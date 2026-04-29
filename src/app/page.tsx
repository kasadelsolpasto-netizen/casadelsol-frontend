import Link from 'next/link';
import Image from 'next/image';
export const dynamic = 'force-dynamic';
import { ArrowRight, Calendar, MapPin, Tag } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { WhatsAppButton } from '@/components/WhatsAppButton';

const TYPE_META: Record<string, { label: string; tag: string }> = {
  ANNOUNCEMENT: { label: 'Anuncio',  tag: 'bg-red-900/30 text-red-400 border-red-900/40' },
  POST:         { label: 'Post',     tag: 'bg-purple-900/20 text-purple-400 border-purple-900/40' },
  FORUM:        { label: 'Foro',     tag: 'bg-blue-900/20 text-blue-400 border-blue-900/40' },
  SETLIST:      { label: 'Setlist',  tag: 'bg-green-900/20 text-green-400 border-green-900/40' },
};

export default async function Home() {
  let events: any[] = [];
  let posts: any[] = [];

  try {
    const [eventsRes, postsRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'}/events`, { cache: 'no-store' }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'}/posts?limit=4&skip=0`, { cache: 'no-store' }),
    ]);
    if (eventsRes.ok) events = await eventsRes.json();
    if (postsRes.ok) { const d = await postsRes.json(); posts = d.posts || []; }
  } catch (error) {
    console.error('Error fetching home data:', error);
  }

  return (
    <div className="min-h-screen">

      {/* Hero / Feed de Eventos */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-widest text-white mb-4">
            Próximos <span className="text-white drop-shadow-[0_0_15px_rgba(57,255,20,0.8)] [text-shadow:0_0_20px_#39ff14]">Eventos</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl text-balance">
            Navega por la cartelera de música electrónica oficial. Asegura tu entrada y vive la rave antes del Sold Out.
          </p>
        </div>

        {/* Grid de eventos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event: any) => {
            const minPrice = event.ticket_types && event.ticket_types.length > 0
              ? Math.min(...event.ticket_types.map((t: any) => t.price))
              : 0;
            return (
            <Link href={`/events/${event.seo_slug || event.id}`} key={event.id} className="group relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] transform hover:-translate-y-2 transition-all duration-300 block p-[1px] bg-zinc-800/50">
              <div className="absolute top-[-150%] left-[-50%] w-[200%] h-[400%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_70%,#39ff14_85%,#bf00ff_100%)] opacity-30 group-hover:opacity-100 transition-opacity duration-1000 point-events-none" />
              <div className="relative bg-[#050505] rounded-[15px] overflow-hidden z-10 h-full flex flex-col glass-panel border border-zinc-800/80">
                <div className="h-56 w-full bg-zinc-900 relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10"></div>
                  {event.flyer_url && (
                    <Image 
                      src={event.flyer_url} 
                      alt={event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100" 
                    />
                  )}
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-2xl font-bold uppercase tracking-wider text-white group-hover:text-neon-green transition-colors mb-4 line-clamp-1">
                    {event.title}
                  </h2>
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center text-sm text-zinc-400 gap-3">
                      <Calendar className="w-4 h-4 text-neon-purple" />
                      <span>{new Date(event.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center text-sm text-zinc-400 gap-3">
                      <MapPin className="w-4 h-4 text-neon-purple" />
                      <span className="line-clamp-1">{event.venue}</span>
                    </div>
                    <div className="flex items-center text-sm text-zinc-400 gap-3">
                      <Tag className="w-4 h-4 text-neon-green" />
                      <span className="font-semibold text-zinc-200">Desde {Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(minPrice)}</span>
                    </div>
                  </div>
                  <div className="w-full text-center py-3 border border-zinc-700 rounded-lg text-[10px] uppercase tracking-[0.2em] font-black text-zinc-300 group-hover:bg-neon-green group-hover:text-black group-hover:border-neon-green group-hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex justify-center items-center gap-2">
                    Ver Detalles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>

        {/* ── SECCIÓN DE PUBLICACIONES ── */}
        {posts.length > 0 && (
          <section className="mt-24 pt-16 border-t border-zinc-900">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-white">
                  Del <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">Feed</span>
                </h2>
                <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mt-1">Noticias y contenido oficial</p>
              </div>
              <Link href="/posts" className="shrink-0 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-neon-purple transition-colors items-center gap-1 hidden sm:flex">
                Ver todo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {posts.map((post: any, i: number) => {
                const meta = TYPE_META[post.type] || TYPE_META.POST;
                const isPinned = post.is_pinned;
                return (
                  <Link key={post.id} href={`/posts/${post.seo_slug || post.id}`}
                    className={`group flex gap-4 p-5 rounded-2xl border transition-all hover:border-zinc-700 hover:-translate-y-0.5 ${isPinned ? 'bg-neon-purple/5 border-neon-purple/30' : 'bg-zinc-950 border-zinc-900'}`}>
                    {post.cover_url ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                        <img src={post.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-2xl">
                        {post.type === 'ANNOUNCEMENT' ? '📢' : post.type === 'SETLIST' ? '🎵' : post.type === 'FORUM' ? '💬' : '📝'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${meta.tag}`}>{meta.label}</span>
                        {isPinned && <span className="text-[8px] text-neon-green">📌</span>}
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-white line-clamp-2 group-hover:text-neon-purple transition-colors">{post.title}</h3>
                      <p className="text-zinc-600 text-[11px] mt-1 line-clamp-1">{post.content}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-800 group-hover:text-neon-purple group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </Link>
                );
              })}
            </div>

            {/* Botón Ver más publicaciones */}
            <div className="mt-8 flex justify-center">
              <Link href="/posts"
                className="group relative overflow-hidden flex items-center gap-3 px-10 py-4 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-neon-purple/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/0 via-neon-purple/5 to-neon-green/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-white transition-colors">
                  Ver más publicaciones
                </span>
                <ArrowRight className="relative w-4 h-4 text-zinc-600 group-hover:text-neon-purple group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </section>
        )}
      </main>
      
      <WhatsAppButton className="bottom-6 right-4 md:right-6" />
    </div>
  );
}
