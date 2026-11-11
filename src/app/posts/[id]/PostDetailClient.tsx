"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Calendar, Megaphone, FileText, MessageSquare, Music } from 'lucide-react';

const TYPE_META: Record<string, { label: string; Icon: any; tag: string }> = {
  ANNOUNCEMENT: { label: 'Anuncio',    Icon: Megaphone,     tag: 'bg-red-900/30 text-red-400 border-red-900/50' },
  POST:         { label: 'Publicación', Icon: FileText,      tag: 'bg-purple-900/20 text-purple-400 border-purple-900/50' },
  FORUM:        { label: 'Foro',        Icon: MessageSquare, tag: 'bg-blue-900/20 text-blue-400 border-blue-900/50' },
  SETLIST:      { label: 'Setlist',     Icon: Music,         tag: 'bg-green-900/20 text-neon-green border-green-900/50' },
};

// ── Botón de reacción individual ─────────────────────────────────────────────
function ReactionButton({ postId, type, emoji }: { postId: string; type: 'heart' | 'fire'; emoji: string }) {
  const [count, setCount]   = useState(0);
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='))?.split('=')[1];
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const userId = payload.id || payload.sub;
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${postId}/reactions?userId=${userId}`)
        .then(r => r.json())
        .then(d => {
          if (d.counts)        setCount(d.counts[type] || 0);
          if (d.userReactions) setActive(d.userReactions.includes(type));
        });
    } catch {}
  }, [postId, type]);

  const react = async () => {
    const tokenRow = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    if (!tokenRow) { alert('Inicia sesión para reaccionar'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenRow.split('=')[1]}` },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      setActive(data.action === 'added');
      setCount(prev => data.action === 'added' ? prev + 1 : Math.max(prev - 1, 0));
    } finally { setLoading(false); }
  };

  return (
    <button
      onClick={react}
      disabled={loading}
      className={`flex items-center gap-2 px-5 py-3 rounded-2xl border text-sm font-black uppercase tracking-wider transition-all ${
        active
          ? type === 'heart'
            ? 'bg-red-900/40 border-red-700/50 text-red-400 scale-105 shadow-[0_0_20px_rgba(248,113,113,0.2)]'
            : 'bg-orange-900/40 border-orange-700/50 text-orange-400 scale-105 shadow-[0_0_20px_rgba(251,146,60,0.2)]'
          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
      }`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="text-base">{emoji}</span>}
      <span>{count}</span>
    </button>
  );
}

// ── Componente cliente principal ─────────────────────────────────────────────
export default function PostDetailClient({ post }: { post: any }) {
  const meta = TYPE_META[post.type] || TYPE_META.POST;
  const Icon = meta.Icon;

  return (
    <div className="min-h-screen bg-[#050505]">

      {/* HERO con portada */}
      <div className="relative w-full">
        {post.cover_url ? (
          <div className="relative h-[55vh] overflow-hidden">
            <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/20 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-b from-zinc-900 to-[#050505]" />
        )}
      </div>

      {/* CONTENIDO */}
      <main className="max-w-3xl mx-auto px-4 -mt-32 relative z-10 pb-32">
        {/* Nav */}
        <Link href="/posts" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-all mb-8 uppercase font-bold tracking-widest text-[10px]">
          <ArrowLeft className="w-4 h-4" /> Feed
        </Link>

        {/* Tag + fecha */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${meta.tag}`}>
            <Icon className="w-3 h-3" /> {meta.label}
          </span>
          {post.is_pinned && (
            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full border bg-neon-green/10 text-neon-green border-neon-green/30">
              📌 Destacado
            </span>
          )}
          <span className="text-zinc-600 text-[10px] font-bold flex items-center gap-1.5 ml-auto">
            <Calendar className="w-3 h-3" />
            {new Date(post.published_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Título */}
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white leading-none mb-8">
          {post.title}
        </h1>

        {/* Contenido HTML enriquecido */}
        <div className="post-content" dangerouslySetInnerHTML={{ __html: post.content }} />

        {/* Galería */}
        {post.media_urls?.length > 0 && (
          <div className="mt-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Galería</p>
            <div className={`grid gap-2 ${
              post.media_urls.length === 1 ? 'grid-cols-1' :
              post.media_urls.length === 2 ? 'grid-cols-2' :
              'grid-cols-2 md:grid-cols-3'
            }`}>
              {post.media_urls.map((url: string, i: number) => (
                <a key={i} href={url} target="_blank" rel="noreferrer"
                  className="rounded-2xl overflow-hidden aspect-square hover:opacity-90 transition-opacity block">
                  <img src={url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Reacciones */}
        <div className="mt-12 pt-8 border-t border-zinc-900">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-5">¿Qué te pareció?</p>
          <div className="flex gap-3 flex-wrap">
            <ReactionButton postId={post.id} type="heart" emoji="❤️" />
            <ReactionButton postId={post.id} type="fire"  emoji="🔥" />
          </div>
        </div>

        {/* Autor */}
        <div className="mt-10 flex items-center gap-4 p-6 bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <div className="w-12 h-12 rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center text-neon-purple font-black text-lg shrink-0">
            {post.author?.name?.[0] || 'K'}
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-zinc-600 mb-0.5">Publicado por</p>
            <p className="text-sm font-black text-white uppercase">{post.author?.name || 'Kasa del Sol'}</p>
          </div>
          <Link href="/posts" className="ml-auto text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-neon-purple transition-colors flex items-center gap-1">
            Ver más posts →
          </Link>
        </div>
      </main>
    </div>
  );
}
