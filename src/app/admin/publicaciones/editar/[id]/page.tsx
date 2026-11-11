"use client";
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, Loader2, Upload, Image as ImageIcon, X, Pin, Eye, EyeOff, Trash2 } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import dynamic from 'next/dynamic';
import SeoPanel from '@/components/SeoPanel';

const RichEditor = dynamic(() => import('@/components/RichEditor'), { ssr: false, loading: () => (
  <div className="rounded-2xl border border-zinc-800 bg-black h-64 flex items-center justify-center">
    <span className="text-zinc-600 text-xs font-bold uppercase tracking-widest">Cargando editor...</span>
  </div>
) });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const POST_TYPES = [
  { value: 'ANNOUNCEMENT', label: 'Anuncio',      color: 'text-red-400',    bg: 'bg-red-900/20',    border: 'border-red-900/50' },
  { value: 'POST',         label: 'Publicación',  color: 'text-neon-purple', bg: 'bg-purple-900/20', border: 'border-purple-900/50' },
  { value: 'FORUM',        label: 'Foro',          color: 'text-blue-400',   bg: 'bg-blue-900/20',   border: 'border-blue-900/50' },
  { value: 'SETLIST',      label: 'Setlist',       color: 'text-neon-green', bg: 'bg-green-900/20',  border: 'border-green-900/50' },
];

export default function EditPostPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<any>(null);
  const [seo, setSeo]   = useState({ seo_title: '', seo_description: '', seo_slug: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${params.id}/public`)
      .then(r => r.json())
      .then(data => {
        setForm({
          title:      data.title || '',
          content:    data.content || '',
          type:       data.type || 'POST',
          cover_url:  data.cover_url || '',
          media_urls: data.media_urls || [],
          is_pinned:  data.is_pinned ?? false,
          is_draft:   data.is_draft ?? false,
        });
        setSeo({
          seo_title:       data.seo_title       || '',
          seo_description: data.seo_description || '',
          seo_slug:        data.seo_slug        || '',
        });
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  const uploadToSupabase = async (file: File, folder = 'covers') => {
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: err } = await supabase.storage.from('posts').upload(fileName, file);
    if (err) throw new Error(err.message);
    return supabase.storage.from('posts').getPublicUrl(fileName).data.publicUrl;
  };

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToSupabase(file, 'covers');
      setForm((f: any) => ({ ...f, cover_url: url }));
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map(f => uploadToSupabase(f, 'gallery')));
      setForm((f: any) => ({ ...f, media_urls: [...f.media_urls, ...urls].slice(0, 6) }));
    } catch (e: any) { setError(e.message); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || form.content.replace(/<[^>]*>/g, '').trim() === '') return setError('Título y contenido son obligatorios.');
    setSaving(true); setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, ...seo }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error');
      router.push('/admin/publicaciones');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <AdminGuard>
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
      </div>
    </AdminGuard>
  );

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#030303] text-white p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-[55%] space-y-6 pb-20">
          <header>
            <Link href="/admin/publicaciones" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-4 uppercase font-bold tracking-widest text-[10px]">
              <ArrowLeft className="w-4 h-4" /> Volver
            </Link>
            <h1 className="text-4xl font-black uppercase tracking-tight text-white">
              Editar <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">Publicación</span>
            </h1>
          </header>

          {/* Tipo */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Tipo</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {POST_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm((f: any) => ({ ...f, type: t.value }))}
                  className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${form.type === t.value ? `${t.bg} ${t.border} ${t.color}` : 'bg-zinc-900/30 border-zinc-800 text-zinc-500'}`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Título</label>
            <input type="text" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))}
              className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white text-lg font-bold placeholder:text-zinc-700 focus:border-neon-purple outline-none transition-all" />
          </div>

          {/* Portada */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Imagen de Portada</label>
            <div onClick={() => !form.cover_url && fileInputRef.current?.click()}
              className="relative rounded-2xl border-2 border-dashed border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer overflow-hidden">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
              {form.cover_url ? (
                <div className="relative group h-40">
                  <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><Upload className="w-4 h-4" /></button>
                    <button onClick={e => { e.stopPropagation(); setForm((f: any) => ({ ...f, cover_url: '' })); }} className="p-2 bg-red-500/20 rounded-full text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  {uploading ? <Loader2 className="w-6 h-6 text-neon-purple animate-spin" /> : <ImageIcon className="w-6 h-6 text-zinc-600" />}
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{uploading ? 'Subiendo...' : 'Click para subir'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contenido */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contenido</label>
            <RichEditor
              value={form.content}
              onChange={html => setForm((f: any) => ({ ...f, content: html }))}
              placeholder="Escribe el contenido..."
            />
          </div>

          {/* Galería */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Galería ({form.media_urls.length}/6)</label>
              <button onClick={() => galleryInputRef.current?.click()} className="text-[9px] font-black uppercase tracking-widest text-neon-purple hover:text-white transition-colors">+ Agregar</button>
            </div>
            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
            {form.media_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.media_urls.map((url: string, i: number) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => setForm((f: any) => ({ ...f, media_urls: f.media_urls.filter((_: any, j: number) => j !== i) }))}
                      className="absolute top-1 right-1 p-1 bg-black/80 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opciones */}
          <div className="flex gap-6">
            {[
              { key: 'is_pinned', label: 'Destacado', icon: Pin },
              { key: 'is_draft', label: 'Borrador', icon: EyeOff },
            ].map(({ key, label, icon: Icon }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <div onClick={() => setForm((f: any) => ({ ...f, [key]: !f[key] }))}
                  className={`w-12 h-6 rounded-full transition-all relative ${form[key] ? 'bg-neon-green' : 'bg-zinc-800'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form[key] ? 'left-7' : 'left-1'}`} />
                </div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1"><Icon className="w-3 h-3" />{label}</span>
              </label>
            ))}
          </div>

          {/* SEO Panel */}
          <SeoPanel
            title={form.title}
            content={form.content}
            value={seo}
            onChange={setSeo}
          />

          {error && <div className="text-red-400 text-xs font-bold bg-red-900/20 border border-red-900/40 p-4 rounded-xl">{error}</div>}

          <button onClick={handleSubmit} disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-neon-purple to-neon-green text-black font-black uppercase tracking-widest text-[10px] rounded-xl hover:shadow-[0_0_30px_rgba(57,255,20,0.3)] flex items-center justify-center gap-2 transition-all">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
          </button>
        </div>

        {/* Preview */}
        <div className="hidden lg:block w-full lg:w-[45%] sticky top-8 h-fit">
          <div className="glass-panel rounded-[2.5rem] border border-zinc-800 overflow-hidden">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center">
              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${POST_TYPES.find(t => t.value === form.type)?.bg} ${POST_TYPES.find(t => t.value === form.type)?.color} ${POST_TYPES.find(t => t.value === form.type)?.border}`}>
                {POST_TYPES.find(t => t.value === form.type)?.label}
              </span>
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Vista Previa</span>
            </div>
            {form.cover_url && <div className="h-44 overflow-hidden"><img src={form.cover_url} alt="" className="w-full h-full object-cover" /></div>}
            <div className="p-6">
              <h2 className="text-xl font-black uppercase text-white mb-3 leading-tight">{form.title || 'Título...'}</h2>
              {form.content ? (
                <div className="post-content text-sm line-clamp-[6] overflow-hidden" dangerouslySetInnerHTML={{ __html: form.content }} />
              ) : (
                <p className="text-zinc-600 text-sm">Contenido...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
