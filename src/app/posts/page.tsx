"use client";
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2, Megaphone, FileText, MessageSquare, Music, Pin, ArrowRight } from 'lucide-react';

const TYPE_META: Record<string, { label: string; Icon: any; accent: string; tag: string }> = {
  ANNOUNCEMENT: { label: 'Anuncio',    Icon: Megaphone,     accent: 'text-red-400 border-red-900/40 bg-red-950/30',           tag: 'bg-red-900/40 text-red-400 border-red-900/50' },
  POST:         { label: 'Publicación', Icon: FileText,      accent: 'text-neon-purple border-purple-900/40 bg-purple-950/30', tag: 'bg-purple-900/30 text-purple-400 border-purple-900/50' },
  FORUM:        { label: 'Foro',        Icon: MessageSquare, accent: 'text-blue-400 border-blue-900/40 bg-blue-950/30',        tag: 'bg-blue-900/30 text-blue-400 border-blue-900/50' },
  SETLIST:      { label: 'Setlist',     Icon: Music,         accent: 'text-neon-green border-green-900/40 bg-green-950/30',    tag: 'bg-green-900/30 text-neon-green border-green-900/50' },
};

const FILTERS = ['TODOS', 'ANNOUNCEMENT', 'POST', 'FORUM', 'SETLIST'];

// ── Barra de reacciones ❤️🔥 para el feed ───────────────────────────────────
function ReactionBar({ postId, initialCounts }: { postId: string; initialCounts: Record<string, number> }) {
  const [counts, setCounts]           = useState<Record<string, number>>(initialCounts || {});
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [loading, setLoading]         = useState<string | null>(null);

  // Cargar reacciones del usuario actual (si está logueado)
  useEffect(() => {
    const token = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='))?.split('=')[1];
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id || payload.sub;
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${postId}/reactions?userId=${userId}`)
        .then(r => r.json())
        .then(d => {
          if (d.counts)        setCounts(d.counts);
          if (d.userReactions) setUserReactions(d.userReactions);
        });
    } catch {}
  }, [postId]);

  const react = async (e: React.MouseEvent, type: 'heart' | 'fire') => {
    e.preventDefault(); // evitar navegar al link del post
    e.stopPropagation();
    const tokenRow = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    if (!tokenRow) { alert('Inicia sesión para reaccionar'); return; }
    setLoading(type);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenRow.split('=')[1]}` },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setCounts(prev => ({
        ...prev,
        [type]: data.action === 'added' ? (prev[type] || 0) + 1 : Math.max((prev[type] || 0) - 1, 0),
      }));
      setUserReactions(prev =>
        data.action === 'added' ? [...prev, type] : prev.filter(r => r !== type)
      );
    } finally { setLoading(null); }
  };

  return (
    <div className="flex items-center gap-2" onClick={e => e.preventDefault()}>
      {(['heart', 'fire'] as const).map(type => {
        const active = userReactions.includes(type);
        return (
          <button
            key={type}
            onClick={e => react(e, type)}
            disabled={loading === type}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all ${
              active
                ? type === 'heart'
                  ? 'bg-red-900/50 border-red-700/60 text-red-400 scale-105 shadow-[0_0_10px_rgba(248,113,113,0.2)]'
                  : 'bg-orange-900/50 border-orange-700/60 text-orange-400 scale-105 shadow-[0_0_10px_rgba(251,146,60,0.2)]'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white'
            }`}
          >
            {loading === type
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <span>{type === 'heart' ? '❤️' : '🔥'}</span>
            }
            <span>{counts[type] || 0}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function PostsFeedPage() {
  const [posts, setPosts]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal]         = useState(0);
  const [skip, setSkip]           = useState(0);
  const [filter, setFilter]       = useState('TODOS');
  const LIMIT = 12;

  const fetchPosts = useCallback(async (newSkip = 0, append = false) => {
    if (newSkip === 0) setLoading(true); else setLoadingMore(true);
    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts?limit=${LIMIT}&skip=${newSkip}`);
      const data = await res.json();
      setPosts(prev => append ? [...prev, ...data.posts] : data.posts);
      setTotal(data.total);
      setSkip(newSkip + LIMIT);
    } finally { setLoading(false); setLoadingMore(false); }
  }, []);

  useEffect(() => { fetchPosts(0); }, [fetchPosts]);

  const filtered = filter === 'TODOS' ? posts : posts.filter(p => p.type === filter);
  const pinned   = filtered.filter(p => p.is_pinned);
  const rest     = filtered.filter(p => !p.is_pinned);

  return (
    // SIN <Navbar> — el layout global ya lo incluye
    <div className="min-h-screen">
      <main className="max-w-4xl mx-auto px-4 py-16">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-widest text-white mb-4">
            Feed <span className="text-white drop-shadow-[0_0_15px_rgba(191,0,255,0.8)] [text-shadow:0_0_20px_#bf00ff]">Comunidad</span>
          </h1>
          <p className="text-zinc-400 text-lg">Noticias, anuncios y contenido oficial de Kasa del Sol.</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap mb-10">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                filter === f
                  ? 'bg-neon-purple/20 border-neon-purple/50 text-neon-purple'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-white'
              }`}>
              {f === 'TODOS' ? 'Todos' : TYPE_META[f]?.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-32"><Loader2 className="w-10 h-10 text-neon-purple animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 text-zinc-600 font-black uppercase tracking-widest text-sm">
            No hay publicaciones en esta categoría aún.
          </div>
        ) : (
          <div className="space-y-4">

            {/* ── ANUNCIOS DESTACADOS (pinned) ──────────────────────── */}
            {pinned.map(post => {
              const meta = TYPE_META[post.type] || TYPE_META.POST;
              return (
                <div key={post.id} className={`border-2 rounded-3xl overflow-hidden ${meta.accent} transition-all hover:scale-[1.005] animate-in fade-in duration-500`}>
                  <div className="flex items-center gap-3 px-6 pt-5 pb-3">
                    <Pin className="w-4 h-4 opacity-70" />
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${meta.tag}`}>{meta.label}</span>
                    <span className="text-[10px] text-zinc-500 font-bold ml-auto">{new Date(post.published_at).toLocaleDateString('es-CO')}</span>
                  </div>
                  {post.cover_url && (
                    <div className="mx-4 mb-4 rounded-2xl overflow-hidden h-52">
                      <img src={post.cover_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="px-6 pb-6">
                    <h2 className="text-xl font-black uppercase tracking-tight text-white mb-2">{post.title}</h2>
                    <p className="text-zinc-400 text-sm leading-relaxed line-clamp-3">{post.content}</p>
                    <div className="flex items-center justify-between mt-5 gap-4">
                      {/* Reacciones inline — e.preventDefault evita navegar */}
                      <ReactionBar postId={post.id} initialCounts={post.reactionCounts || {}} />
                      <Link href={`/posts/${post.seo_slug || post.id}`} className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-1 transition-colors shrink-0">
                        Leer más <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── RESTO DEL FEED ────────────────────────────────────── */}
            {rest.map((post, i) => {
              const meta = TYPE_META[post.type] || TYPE_META.POST;
              return (
                <div key={post.id}
                  className="group bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden flex flex-col sm:flex-row hover:border-zinc-700 transition-all animate-in fade-in duration-500"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  {post.cover_url && (
                    <Link href={`/posts/${post.seo_slug || post.id}`} className="w-full sm:w-48 h-40 sm:h-auto shrink-0 overflow-hidden block">
                      <img src={post.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </Link>
                  )}
                  <div className="p-6 flex flex-col flex-1 min-w-0">
                    <Link href={`/posts/${post.seo_slug || post.id}`} className="block">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${meta.tag}`}>{meta.label}</span>
                        <span className="text-zinc-600 text-[10px] font-bold">{new Date(post.published_at).toLocaleDateString('es-CO')}</span>
                      </div>
                      <h2 className="text-lg font-black uppercase tracking-tight text-white mb-2 group-hover:text-neon-purple transition-colors line-clamp-2">{post.title}</h2>
                      <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2">{post.content}</p>
                    </Link>
                    {/* Reacciones en la parte inferior — fuera del Link para no propagar */}
                    <div className="flex items-center justify-between mt-4">
                      <ReactionBar postId={post.id} initialCounts={post.reactionCounts || {}} />
                      <Link href={`/posts/${post.seo_slug || post.id}`} className="text-[10px] text-zinc-600 group-hover:text-neon-purple transition-colors flex items-center gap-1 font-bold">
                        Leer más <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cargar más */}
        {!loading && skip < total && (
          <div className="flex justify-center mt-12">
            <button onClick={() => fetchPosts(skip, true)} disabled={loadingMore}
              className="px-10 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-600 text-zinc-300 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all flex items-center gap-2">
              {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ver más publicaciones'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
