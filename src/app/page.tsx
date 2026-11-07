import Link from 'next/link';
import Image from 'next/image';
import { JetBrains_Mono } from 'next/font/google';
export const dynamic = 'force-dynamic';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { RaveCanvas } from '@/components/home/RaveCanvas';
import { Countdown } from '@/components/home/Countdown';

const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['300', '400', '700', '800'] });

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
const TZ = 'America/Bogota';

const TYPE_LABEL: Record<string, string> = {
  ANNOUNCEMENT: 'anuncio',
  POST: 'post',
  FORUM: 'foro',
  SETLIST: 'setlist',
};

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, '').trim();

function datePart(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, ...opts }).format(new Date(iso));
}
const shortDate = (iso: string) =>
  `${datePart(iso, { day: '2-digit' })}.${datePart(iso, { month: '2-digit' })}.${datePart(iso, { year: '2-digit' })}`;
const weekday = (iso: string) => datePart(iso, { weekday: 'short' }).replace('.', '');
const hour = (iso: string) => datePart(iso, { hour: '2-digit', minute: '2-digit', hour12: false });
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

function Corners() {
  const c = 'absolute w-4 h-4 sm:w-6 sm:h-6 border-white/40 pointer-events-none z-20';
  return (
    <>
      <span className={`${c} top-2 left-2 sm:top-4 sm:left-4 border-l border-t`} />
      <span className={`${c} top-2 right-2 sm:top-4 sm:right-4 border-r border-t`} />
      <span className={`${c} bottom-2 left-2 sm:bottom-4 sm:left-4 border-l border-b`} />
      <span className={`${c} bottom-2 right-2 sm:bottom-4 sm:right-4 border-r border-b`} />
    </>
  );
}

function Tag({ children, live = false }: { children: React.ReactNode; live?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 border border-[#333] bg-black/80 backdrop-blur-sm text-[10px] sm:text-xs tracking-wider text-white/60">
      <span className={live ? 'w-1.5 h-1.5 bg-[#ff2a2a] shadow-[0_0_6px_#ff2a2a] animate-pulse' : 'w-1.5 h-1.5 bg-white/60'} />
      {children}
    </span>
  );
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
  const lineup = upcoming.length > 0 ? upcoming : sorted;
  const featured = lineup[0];
  const featuredInfo = featured ? ticketInfo(featured) : null;
  const href = (e: any) => `/events/${e.seo_slug || e.id}`;

  const listTitle = stripHtml(brandConfig.homeTitle || '') || 'Próximos eventos';
  const tagline =
    brandConfig.homeDescription ||
    'Navega por la cartelera de música electrónica oficial. Asegura tu entrada y vive la rave antes del Sold Out.';

  return (
    <div className={`${mono.className} rave-home relative min-h-screen text-white`}>
      <RaveCanvas />
      <div className="crt-lines" aria-hidden="true" />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-10 pb-12 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-8 lg:gap-12 items-center lg:min-h-[calc(100dvh-5rem)]">
        <div className="flex flex-col gap-6 sm:gap-8 min-w-0 order-2 lg:order-1">
          <div className="flex flex-wrap gap-2">
            <Tag live={!!featuredInfo?.onSale}>{featuredInfo?.onSale ? 'boletas en venta' : 'stand by'}</Tag>
            <Tag>private raves · since day one</Tag>
          </div>

          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-white/60 mb-3">// kasa del sol</p>
            <h1
              className="glitch-container text-[13vw] sm:text-7xl xl:text-8xl font-extrabold uppercase leading-[0.85] tracking-tighter break-words"
              data-text="KASA DEL SOL"
            >
              KASA DEL SOL
            </h1>
            <p className="mt-5 text-xs sm:text-sm text-white/60 max-w-xl leading-relaxed whitespace-pre-line">{tagline}</p>
          </div>

          {featured && featuredInfo && (
            <div className="border border-[#222] bg-black/70 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-[#222] text-[10px] sm:text-xs uppercase tracking-[0.25em] text-white/60">
                <span>// próxima rave</span>
                <span className="text-white"><Countdown target={featured.date} /></span>
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-4">
                <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-wider leading-tight break-words">{featured.title}</h2>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-white/40">fecha</dt>
                    <dd className="mt-1 tabular-nums">{weekday(featured.date)} {shortDate(featured.date)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-white/40">puertas</dt>
                    <dd className="mt-1 tabular-nums">{hour(featured.date)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-white/40">lugar</dt>
                    <dd className="mt-1 truncate">{featured.venue || 'por anunciar'}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.25em] text-white/40">desde</dt>
                    <dd className="mt-1 tabular-nums">{featuredInfo.soldOut ? 'sold out' : cop(featuredInfo.minPrice)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2 font-bold">
                  <Link
                    href={href(featured)}
                    className="inline-flex items-center gap-2 border border-white bg-white px-5 py-2.5 text-xs sm:text-sm uppercase tracking-wider text-black shadow-[0_0_18px_rgba(255,255,255,0.25)] transition-colors hover:bg-black hover:text-white"
                  >
                    <span aria-hidden="true">▶</span> {featuredInfo.soldOut ? 'ver evento' : 'comprar boletas'}
                  </Link>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-2 border border-white/60 bg-black/85 px-5 py-2.5 text-[11px] sm:text-xs uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-black"
                  >
                    cartelera completa
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Flyer protagonista */}
        <div className="order-1 lg:order-2 flex justify-center [perspective:1200px]">
          {featured?.flyer_url ? (
            <Link
              href={href(featured)}
              aria-label={`Ver ${featured.title}`}
              className="flyer-frame vhs-effect relative block w-full max-w-[420px] sm:max-w-[480px] lg:w-[min(40vw,520px)] aspect-[4/5] border border-[#222] overflow-hidden bg-[#050505]"
            >
              <Image
                src={featured.flyer_url}
                alt={featured.title}
                fill
                priority
                sizes="(max-width: 640px) 420px, (max-width: 1024px) 480px, 520px"
                className="object-cover"
              />
              <Corners />
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[9px] sm:text-[10px] uppercase tracking-[0.35em] text-white/70 bg-black/70 px-2 py-0.5 whitespace-nowrap">
                rec ● {shortDate(featured.date)}
              </span>
            </Link>
          ) : (
            <div className="relative w-full max-w-[420px] lg:w-[min(40vw,520px)] aspect-[4/5] border border-[#222] bg-black/60 flex items-center justify-center">
              <Corners />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.35em] text-white/60 animate-pulse">// no signal</span>
            </div>
          )}
        </div>
      </section>

      {/* ── CARTELERA ───────────────────────────────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex items-end justify-between gap-4 mb-5 border-b border-[#222] pb-3">
          <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-widest">{listTitle}</h2>
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 tabular-nums">[{String(lineup.length).padStart(2, '0')}]</span>
        </div>

        {lineup.length === 0 ? (
          <p className="card-underground p-6 text-center text-xs uppercase tracking-[0.3em] text-white/60">
            // sin fechas anunciadas — stay tuned
          </p>
        ) : (
          <ol className="flex flex-col gap-2">
            {lineup.map((event: any, i: number) => {
              const info = ticketInfo(event);
              return (
                <li key={event.id}>
                  <Link
                    href={href(event)}
                    className="group card-underground grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[3rem_7rem_minmax(0,1fr)_minmax(0,14rem)_8rem_1.5rem] items-center gap-x-4 gap-y-1 p-3 sm:p-4"
                  >
                    <span className="text-[10px] text-white/40 tabular-nums row-span-2 sm:row-span-1">{String(i + 1).padStart(2, '0')}</span>
                    <span className="hidden sm:block text-xs tabular-nums text-white/80">{shortDate(event.date)}</span>
                    <span className="glitch-container text-sm sm:text-base font-bold uppercase tracking-wider truncate" data-text={event.title}>
                      {event.title}
                    </span>
                    <span className="hidden sm:block text-xs text-white/60 truncate">{event.venue}</span>
                    <span className="text-[11px] sm:text-xs text-right tabular-nums row-span-2 sm:row-span-1">
                      {info.soldOut ? (
                        <span className="text-white/40 line-through">sold out</span>
                      ) : (
                        cop(info.minPrice)
                      )}
                    </span>
                    <span className="hidden sm:block text-right opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">→</span>
                    <span className="sm:hidden text-[10px] text-white/60 truncate">
                      {shortDate(event.date)} · {event.venue}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* ── FEED ────────────────────────────────────────────── */}
      {posts.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pb-16">
          <div className="flex items-end justify-between gap-4 mb-5 border-b border-[#222] pb-3">
            <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-widest">// del feed</h2>
            <Link href="/posts" className="text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors">
              ver todo →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            {posts.map((post: any) => (
              <Link key={post.id} href={`/posts/${post.seo_slug || post.id}`} className="group card-underground flex gap-4 p-3 sm:p-4">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 border border-[#222] overflow-hidden bg-[#050505] flex items-center justify-center">
                  {post.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.cover_url} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-[filter] duration-300" />
                  ) : (
                    <span className="text-[9px] uppercase tracking-[0.2em] text-white/40">{TYPE_LABEL[post.type] || 'post'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1.5">
                    [{TYPE_LABEL[post.type] || 'post'}]{post.is_pinned ? ' · fijado' : ''}
                  </p>
                  <h3 className="text-sm font-bold uppercase tracking-wider line-clamp-2">{post.title}</h3>
                  <p className="text-white/50 text-[11px] mt-1 line-clamp-1">{post.content}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="relative max-w-4xl mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-3">
          {[
            { label: 'EVENTOS', sub: 'cartelera', to: '/events' },
            { label: 'SHOP', sub: 'merch', to: '/shop' },
            { label: 'PROMOS', sub: 'descuentos', to: '/promos' },
            { label: 'FEED', sub: 'noticias', to: '/posts' },
          ].map((item) => (
            <Link key={item.to} href={item.to} className="group card-underground p-3 sm:p-4 text-center">
              <span className="glitch-container block whitespace-nowrap text-xs md:text-sm font-bold mb-1 tracking-widest" data-text={item.label}>
                {item.label}
                <span className="inline-block ml-1 opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </span>
              <span className="block text-[9px] md:text-[10px] text-white/60 uppercase tracking-[0.3em]">{item.sub}</span>
            </Link>
          ))}
        </div>
      </nav>

      <footer className="relative pb-24 text-center text-[9px] sm:text-[10px] uppercase tracking-[0.3em] text-white/40">
        kasa del sol · private raves · techno
      </footer>

      <WhatsAppButton className="bottom-6 right-4 md:right-6" />
    </div>
  );
}
