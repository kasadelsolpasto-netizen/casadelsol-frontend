"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, Pin, PinOff, Pencil, Trash2, Eye, EyeOff, Megaphone, FileText, MessageSquare, Music } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

const TYPE_META: Record<string, { label: string; color: string; Icon: any }> = {
  ANNOUNCEMENT: { label: 'Anuncio',     color: 'text-red-400 bg-red-900/20 border-red-900/50',    Icon: Megaphone },
  POST:         { label: 'Post',        color: 'text-purple-400 bg-purple-900/20 border-purple-900/50', Icon: FileText },
  FORUM:        { label: 'Foro',        color: 'text-blue-400 bg-blue-900/20 border-blue-900/50',  Icon: MessageSquare },
  SETLIST:      { label: 'Setlist',     color: 'text-neon-green bg-green-900/20 border-green-900/50', Icon: Music },
};

export default function AdminPublicacionesPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/admin/all`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) setPosts(await res.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar "${title}"? Esta acción es irreversible.`)) return;
    setDeleting(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchPosts();
    } finally { setDeleting(null); }
  };

  const handlePin = async (id: string) => {
    setPinning(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${id}/pin`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchPosts();
    } finally { setPinning(null); }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto pb-32">
        <header className="mb-10 border-b border-zinc-900 pb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight text-white mb-2">Publicaciones</h1>
            <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Gestión del feed de contenido</p>
          </div>
          <Link
            href="/admin/publicaciones/nueva"
            className="flex items-center gap-2 bg-gradient-to-r from-neon-purple to-neon-green text-black font-black uppercase tracking-widest text-[10px] px-6 py-3 rounded-xl hover:shadow-[0_0_25px_rgba(57,255,20,0.3)] transition-all shrink-0"
          >
            <Plus className="w-4 h-4" /> Nueva Publicación
          </Link>
        </header>

        {loading ? (
          <div className="flex justify-center p-32"><Loader2 className="w-10 h-10 animate-spin text-neon-purple" /></div>
        ) : posts.length === 0 ? (
          <div className="p-20 text-center border-2 border-zinc-900 border-dashed rounded-[3rem] flex flex-col items-center">
            <FileText className="w-16 h-16 text-zinc-800 mb-4" />
            <p className="text-zinc-600 font-black uppercase tracking-widest text-xs">No hay publicaciones aún.</p>
            <Link href="/admin/publicaciones/nueva" className="mt-6 text-neon-purple text-sm font-bold hover:underline">
              Crear la primera publicación →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post: any) => {
              const meta = TYPE_META[post.type] || TYPE_META.POST;
              const Icon = meta.Icon;
              return (
                <div key={post.id} className={`bg-zinc-950 border rounded-2xl overflow-hidden flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 transition-all hover:border-zinc-700 ${post.is_pinned ? 'border-neon-green/30' : 'border-zinc-900'}`}>
                  {/* Imagen portada */}
                  {post.cover_url ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0">
                      <img src={post.cover_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-zinc-900 flex items-center justify-center shrink-0">
                      <Icon className={`w-6 h-6 ${meta.color.split(' ')[0]}`} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                      {post.is_pinned && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-neon-green bg-neon-green/10 border-neon-green/30">📌 Destacado</span>}
                      {post.is_draft && <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border text-zinc-500 bg-zinc-900 border-zinc-800">Borrador</span>}
                    </div>
                    <p className="text-white font-black text-sm uppercase tracking-wider truncate">{post.title}</p>
                    <p className="text-zinc-500 text-[10px] font-bold mt-0.5">
                      {new Date(post.published_at).toLocaleDateString('es-CO')} · ❤️ {post._count?.post_reactions || 0} reacciones
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handlePin(post.id)}
                      disabled={pinning === post.id}
                      title={post.is_pinned ? 'Quitar destacado' : 'Destacar'}
                      className={`p-2 rounded-lg transition-all ${post.is_pinned ? 'text-neon-green bg-neon-green/10 hover:bg-neon-green/20' : 'text-zinc-600 hover:text-white bg-zinc-900 hover:bg-zinc-800'}`}
                    >
                      {pinning === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : post.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <Link href={`/admin/publicaciones/editar/${post.id}`} className="p-2 rounded-lg bg-zinc-900 hover:bg-neon-purple/20 text-zinc-500 hover:text-neon-purple transition-all">
                      <Pencil className="w-4 h-4" />
                    </Link>
                    <Link href={`/posts/${post.id}`} target="_blank" className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-white transition-all">
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id, post.title)}
                      disabled={deleting === post.id}
                      className="p-2 rounded-lg bg-zinc-900 hover:bg-red-900/30 text-zinc-600 hover:text-red-400 transition-all"
                    >
                      {deleting === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
