import Link from 'next/link';
import Image from 'next/image';
import { JetBrains_Mono } from 'next/font/google';
export const dynamic = 'force-dynamic';
import { ArrowRight, Calendar, MapPin, Tag } from 'lucide-react';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { RaveScene } from '@/components/home/RaveScene';
import { SoundDeck } from '@/components/home/SoundDeck';
import { TiltFlyer } from '@/components/home/TiltFlyer';
import { TiltCard } from '@/components/home/TiltCard';
import { Countdown } from '@/components/home/Countdown';

const tekno = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-tekno' });

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const TZ = 'America/Bogota';

const TYPE_META: Record<string, { label: string; tag: string }> = {
  ANNOUNCEMENT: { label: 'Anuncio', tag: 'bg-red-900/30 text-red-400 border-red-900/40' },
  POST:         { label: 'Post',    tag: 'bg-purple-900/20 text-purple-400 border-purple-900/40' },
  FORUM:        { label: 'Foro',    tag: 'bg-blue-900/20 text-blue-400 border-blue-900/40' },
  SETLIST:      { label: 'Setlist', tag: 'bg-green-900/20 text-green-400 border-green-900/40' },
};

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('es-CO', { timeZone: TZ, ...opts }).format(new Date(iso));
const shortDate = (iso: string) =>
  `${fmt(iso, { day: '2-digit' })}.${fmt(iso, { month: '2-digit' })}.${fmt(iso, { year: '2-digit' })}`;
const cop = (n: number) =>
  Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function ticketInfo(event: any) {
  const now = new Date();
  const all = event.ticket_types || [];
  const active = all.filter((t: any) => {
    if (t.available <= 0) return false;
    if (t.sale_start && new Date(t.sale_start) > now) return false;
    if (t.sale_end && new Date(t.sale_end) < now) return false;
    return true;
  });
  const pool = active.length > 0 ? active : all;
  const minPrice = pool.length > 0 ? Math.min(...pool.map((t: any) => t.price)) : 0;
  const soldOut = all.length > 0 && all.every((t: any) => t.available <= 0);
  return { minPrice, onSale: active.length > 0, soldOut };
}

export default async function Home() {
  let events: any[] = [];
  let posts: any[] = [];
  let brandConfig: any = {};

  try {
    const [eventsRes, postsRes, brandRes] = await Promise.all([
      fetch(`${API}/events`, { cache: 'no-store' }),
      fetch(`${API}/posts?limit=4&skip=0`, { cache: 'no-store' }),
      fetch(`${API}/settings/brand`, { cache: 'no-store' }),
    ]);
    if (eventsRes.ok) events = await eventsRes.json();
    if (postsRes.ok) { const d = await postsRes.json(); posts = d.posts || []; }
    if (brandRes.ok) brandConfig = await brandRes.json();
  } catch (error) {
    console.error('Error fetching home data:', error);
  }

  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcoming = sorted.filter((e) => new Date(e.date).getTime() > Date.now() - 12 * 3600 * 1000);
  const featured = (upcoming.length > 0 ? upcoming : sorted)[0];
  const featuredInfo = featured ? ticketInfo(featured) : null;
  const href = (e: any) => `/events/${e.seo_slug || e.id}`;

  const defaultTitle = 'Próximos <span class="text-white drop-shadow-[0_0_15px_rgba(57,255,20,0.8)] [text-shadow:0_0_20px_#39ff14]">Eventos</span>';
  const defaultDesc = 'Navega por la cartelera de música electrónica oficial. Asegura tu entrada y vive la rave antes del Sold Out.';

  return (
    <div className={`${tekno.variable} rave-home relative min-h-screen`}>
      <RaveScene />
      <div className="crt-lines" aria-hidden="true" />

      {/* ── HERO 3D ─────────────────────────────────────────── */}
      <section className="relative isolate max-w-7xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-12 lg:gap-16 items-center lg:min-h-[calc(100dvh-8rem)]">
        <div className="hero-scrim" aria-hidden="true" />
        <div className="flex flex-col gap-7 min-w-0 order-2 lg:order-1">
          <div className="flex flex-wrap gap-2 font-mono text-[10px] sm:text-xs uppercase tracking-[0.2em]">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black/60 backdrop-blur px-3 py-1.5 text-zinc-300">
              <span className={`w-1.5 h-1.5 rounded-full ${featuredInfo?.onSale ? 'bg-[#ff2a2a] shadow-[0_0_6px_#ff2a2a] animate-pulse' : 'bg-zinc-500'}`} />
              {featuredInfo?.onSale ? 'boletas en venta' : 'stand by'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-black/60 backdrop-blur px-3 py-1.5 text-zinc-400">
              techno · private raves
            </span>
          </div>

          <div className="title-stage">
            <p className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.4em] text-neon-purple mb-3">{'// sound system'}</p>
            <h1 className="title-3d text-[15vw] sm:text-7xl xl:text-[7.5rem] font-black uppercase leading-[0.85] tracking-tight text-white">
              Kasa<br />del <span className="text-neon-green">Sol</span>
            </h1>
          </div>

          <p className="text-base sm:text-lg text-zinc-400 max-w-xl text-balance whitespace-pre-line">
            {brandConfig.homeDescription || defaultDesc}
          </p>

          <SoundDeck variant="hero" />

          {featured && featuredInfo && (
            <div className="glass-panel rounded-2xl overflow-hidden max-w-2xl">
              <div className="flex items-center justify-between gap-3 px-5 py-2.5 border-b border-white/5 font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-zinc-500">
                <span className="text-neon-purple">{'// próxima rave'}</span>
                <span className="text-neon-green"><Countdown target={featured.date} /></span>
              </div>
              <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white leading-tight break-words">{featured.title}</h2>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-zinc-400">
                    <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-neon-purple" />{fmt(featured.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {fmt(featured.date, { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                    {featured.venue && <span className="inline-flex items-center gap-2 min-w-0"><MapPin className="w-4 h-4 text-neon-purple shrink-0" /><span className="truncate">{featured.venue}</span></span>}
                    <span className="inline-flex items-center gap-2"><Tag className="w-4 h-4 text-neon-green" /><span className="font-semibold text-zinc-200">{featuredInfo.soldOut ? 'Sold out' : `Desde ${cop(featuredInfo.minPrice)}`}</span></span>
                  </div>
                </div>
                <Link
                  href={href(featured)}
                  className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-neon-green px-6 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] text-black shadow-[0_0_20px_rgba(57,255,20,0.45)] hover:shadow-[0_0_35px_rgba(57,255,20,0.8)] hover:scale-[1.03] transition-all"
                >
                  {featuredInfo.soldOut ? 'Ver evento' : 'Comprar boletas'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="order-1 lg:order-2 flex justify-center">
          {featured ? (
            <TiltFlyer href={href(featured)} src={featured.flyer_url} title={featured.title} stamp={shortDate(featured.date)} />
          ) : (
            <TiltFlyer href="/events" src={null} title="Cartelera" stamp="próximamente" />
          )}
        </div>
      </section>

      {/* ── CARTELERA ───────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-purple mb-2">{'// cartelera'}</p>
            <h2
              className="text-3xl md:text-5xl font-black uppercase tracking-widest text-white"
              dangerouslySetInnerHTML={{ __html: brandConfig.homeTitle || defaultTitle }}
            />
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600 tabular-nums">[{String(events.length).padStart(2, '0')}]</span>
        </div>

        {events.length === 0 ? (
          <p className="glass-panel rounded-2xl p-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-zinc-500">
            {'// sin fechas anunciadas — stay tuned'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 [perspective:1200px]">
            {events.map((event: any) => {
              const info = ticketInfo(event);
              return (
                <TiltCard
                  href={href(event)}
                  key={event.id}
                  className="group relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_0_40px_rgba(57,255,20,0.2)] block p-[1px] bg-zinc-800/50"
                >
                  <div className="absolute top-[-150%] left-[-50%] w-[200%] h-[400%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_70%,#39ff14_85%,#bf00ff_100%)] opacity-30 group-hover:opacity-100 transition-opacity duration-1000 pointer-events-none" />
                  <div className="relative bg-[#050505] rounded-[15px] overflow-hidden z-10 h-full flex flex-col glass-panel border border-zinc-800/80">
                    <div className="h-56 w-full bg-zinc-900 relative overflow-hidden shrink-0">
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10" />
                      {event.flyer_url && (
                        <Image
                          src={event.flyer_url}
                          alt={event.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100"
                        />
                      )}
                      <span className="absolute top-3 left-3 z-20 rounded-full bg-black/70 backdrop-blur px-2.5 py-1 font-mono text-[10px] tracking-[0.2em] text-neon-green">
                        {shortDate(event.date)}
                      </span>
                      <span className="tilt-glare absolute inset-0 z-20 pointer-events-none" aria-hidden="true" />
                    </div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-2xl font-bold uppercase tracking-wider text-white group-hover:text-neon-green transition-colors mb-4 line-clamp-1">
                        {event.title}
                      </h3>
                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-center text-sm text-zinc-400 gap-3">
                          <Calendar className="w-4 h-4 text-neon-purple" />
                          <span>{fmt(event.date, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center text-sm text-zinc-400 gap-3">
                          <MapPin className="w-4 h-4 text-neon-purple" />
                          <span className="line-clamp-1">{event.venue}</span>
                        </div>
                        <div className="flex items-center text-sm text-zinc-400 gap-3">
                          <Tag className="w-4 h-4 text-neon-green" />
                          <span className="font-semibold text-zinc-200">{info.soldOut ? 'Sold out' : `Desde ${cop(info.minPrice)}`}</span>
                        </div>
                      </div>
                      <div className="w-full text-center py-3 border border-zinc-700 rounded-lg text-[10px] uppercase tracking-[0.2em] font-black text-zinc-300 group-hover:bg-neon-green group-hover:text-black group-hover:border-neon-green group-hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex justify-center items-center gap-2">
                        Ver Detalles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </TiltCard>
              );
            })}
          </div>
        )}

        {/* ── FEED ── */}
        {posts.length > 0 && (
          <section className="mt-24 pt-16 border-t border-zinc-900">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-neon-purple mb-2">{'// transmisión'}</p>
                <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-white">
                  Del <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">Feed</span>
                </h2>
              </div>
              <Link href="/posts" className="shrink-0 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-neon-purple transition-colors items-center gap-1 hidden sm:flex">
                Ver todo <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 [perspective:1000px]">
              {posts.map((post: any) => {
                const meta = TYPE_META[post.type] || TYPE_META.POST;
                const isPinned = post.is_pinned;
                return (
                  <TiltCard
                    key={post.id}
                    href={`/posts/${post.seo_slug || post.id}`}
                    max={6}
                    className={`group flex gap-4 p-5 rounded-2xl border backdrop-blur hover:border-zinc-700 ${isPinned ? 'bg-neon-purple/5 border-neon-purple/30' : 'bg-zinc-950/80 border-zinc-900'}`}
                  >
                    {post.cover_url ? (
                      <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
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
                      <p className="text-zinc-500 text-[11px] mt-1 line-clamp-1">{post.content}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-700 group-hover:text-neon-purple group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </TiltCard>
                );
              })}
            </div>

            <div className="mt-8 flex justify-center">
              <Link href="/posts"
                className="group relative overflow-hidden flex items-center gap-3 px-10 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur hover:border-neon-purple/50 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/0 via-neon-purple/5 to-neon-green/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                <span className="relative text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-white transition-colors">
                  Ver más publicaciones
                </span>
                <ArrowRight className="relative w-4 h-4 text-zinc-600 group-hover:text-neon-purple group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </section>
        )}
      </section>

      <footer className="relative pb-28 text-center font-mono text-[10px] uppercase tracking-[0.35em] text-zinc-600">
        kasa del sol · 136 bpm · techno all night long
      </footer>

      <SoundDeck variant="dock" />
      <WhatsAppButton className="bottom-6 right-4 md:right-6" />
    </div>
  );
}
