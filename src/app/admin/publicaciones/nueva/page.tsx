"use client";
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
  ArrowLeft, Loader2, Upload, Image as ImageIcon, X, Pin,
  Megaphone, FileText, MessageSquare, Music, Eye, EyeOff, Save, Trash2
} from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import dynamic from 'next/dynamic';
import SeoPanel from '@/components/SeoPanel';

// Cargamos el editor solo en cliente (Tiptap no soporta SSR)
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
  { value: 'ANNOUNCEMENT', label: 'Anuncio', icon: Megaphone, color: 'text-red-400', bg: 'bg-red-900/20', border: 'border-red-900/50' },
  { value: 'POST',         label: 'Publicación', icon: FileText, color: 'text-neon-purple', bg: 'bg-purple-900/20', border: 'border-purple-900/50' },
  { value: 'FORUM',        label: 'Foro',  icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-900/20', border: 'border-blue-900/50' },
  { value: 'SETLIST',      label: 'Setlist', icon: Music, color: 'text-neon-green', bg: 'bg-green-900/20', border: 'border-green-900/50' },
];

export default function NewPostPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    content: '',
    type: 'POST',
    cover_url: '',
    media_urls: [] as string[],
    is_pinned: false,
    is_draft: false,
  });
  const [seo, setSeo] = useState({ seo_title: '', seo_description: '', seo_slug: '' });
  const [uploading, setUploading] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const uploadToSupabase = async (file: File, folder = 'covers') => {
    const ext = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('posts').upload(fileName, file);
    if (uploadError) throw new Error(uploadError.message);
    return supabase.storage.from('posts').getPublicUrl(fileName).data.publicUrl;
  };

  const handleCoverDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    await handleCoverUpload(file);
  };

  const handleCoverUpload = async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToSupabase(file, 'covers');
      setForm(f => ({ ...f, cover_url: url }));
    } catch (e: any) { setError('Error subiendo imagen: ' + e.message); }
    finally { setUploading(false); }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingGallery(true);
    try {
      const urls = await Promise.all(files.map(f => uploadToSupabase(f, 'gallery')));
      setForm(f => ({ ...f, media_urls: [...f.media_urls, ...urls].slice(0, 6) }));
    } catch (e: any) { setError('Error subiendo galería: ' + e.message); }
    finally { setUploadingGallery(false); }
  };

  const handleSubmit = async (draft = false) => {
    if (!form.title.trim()) return setError('El título es obligatorio.');
    // Validar que el contenido no esté vacío (quitamos etiquetas HTML)
    const stripped = form.content.replace(/<[^>]*>/g, '').trim();
    if (!stripped) return setError('El contenido es obligatorio.');
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ ...form, ...seo, is_draft: draft }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Error al guardar');
      router.push('/admin/publicaciones');
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  const selectedType = POST_TYPES.find(t => t.value === form.type)!;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#030303] text-white p-4 md:p-8 relative overflow-hidden flex flex-col lg:flex-row gap-8">

        {/* ── EDITOR (izquierda) ─────────────────────── */}
        <div className="w-full lg:w-[55%] space-y-6 animate-in fade-in slide-in-from-left-4 duration-700">
          <header>
            <Link href="/admin/publicaciones" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white transition-all mb-4 uppercase font-bold tracking-widest text-[10px]">
              <ArrowLeft className="w-4 h-4" /> Volver
            </Link>
            <h1 className="text-4xl font-black uppercase tracking-tight text-white leading-none">
              Nueva <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">Publicación</span>
            </h1>
          </header>

          {/* Tipo de publicación */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Tipo de Publicación</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {POST_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      form.type === t.value
                        ? `${t.bg} ${t.border} ${t.color}`
                        : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[9px] font-black uppercase tracking-widest">{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Título</label>
            <input
              type="text"
              placeholder="Escribe el título aquí..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white text-lg font-bold placeholder:text-zinc-700 hover:border-zinc-600 focus:border-neon-purple outline-none transition-all"
            />
          </div>

          {/* Imagen de portada */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Imagen de Portada</label>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleCoverDrop}
              onClick={() => !form.cover_url && fileInputRef.current?.click()}
              className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
                dragging ? 'border-neon-purple bg-neon-purple/5' :
                form.cover_url ? 'border-zinc-700' : 'border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                onChange={e => e.target.files?.[0] && handleCoverUpload(e.target.files[0])} />
              {form.cover_url ? (
                <div className="relative group h-48">
                  <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-all">
                      <Upload className="w-5 h-5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, cover_url: '' })); }} className="p-3 bg-red-500/20 rounded-full hover:bg-red-500/40 transition-all text-red-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  {uploading ? <Loader2 className="w-8 h-8 text-neon-purple animate-spin" /> : <ImageIcon className="w-8 h-8 text-zinc-600" />}
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                    {uploading ? 'Subiendo...' : 'Arrastra o click para subir portada'}
                  </span>
                  <span className="text-[10px] text-zinc-700">PNG, JPG, MP4 — máx. 50MB</span>
                </div>
              )}
            </div>
          </div>

          {/* Contenido — Editor rico */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contenido</label>
            <RichEditor
              value={form.content}
              onChange={html => setForm(f => ({ ...f, content: html }))}
              placeholder="Escribe el contenido de la publicación..."
            />
          </div>

          {/* Galería adicional */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Galería ({form.media_urls.length}/6)</label>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="text-[9px] font-black uppercase tracking-widest text-neon-purple hover:text-white transition-colors flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> Agregar imágenes
              </button>
            </div>
            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryUpload} />
            {form.media_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.media_urls.map((url, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, media_urls: f.media_urls.filter((_, j) => j !== i) }))}
                      className="absolute top-1 right-1 p-1 bg-black/80 rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {uploadingGallery && (
                  <div className="aspect-square rounded-xl bg-zinc-900 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-neon-purple animate-spin" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Opciones */}
          <div className="flex gap-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div onClick={() => setForm(f => ({ ...f, is_pinned: !f.is_pinned }))}
                className={`w-12 h-6 rounded-full transition-all relative ${form.is_pinned ? 'bg-neon-green' : 'bg-zinc-800'}`}>
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${form.is_pinned ? 'left-7' : 'left-1'}`} />
              </div>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest group-hover:text-white transition-colors flex items-center gap-1">
                <Pin className="w-3 h-3" /> Destacar
              </span>
            </label>
          </div>

          {/* SEO Panel — como Shopify */}
          <SeoPanel
            title={form.title}
            content={form.content}
            value={seo}
            onChange={setSeo}
          />

          {error && <div className="text-red-400 text-xs font-bold bg-red-900/20 border border-red-900/40 p-4 rounded-xl">{error}</div>}

          {/* Acciones */}
          <div className="flex gap-3 pb-20">
            <button
              onClick={() => handleSubmit(true)}
              disabled={saving}
              className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black uppercase tracking-widest text-[10px] rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <EyeOff className="w-4 h-4" /> Guardar Borrador
            </button>
            <button
              onClick={() => handleSubmit(false)}
              disabled={saving}
              className="flex-1 py-4 bg-gradient-to-r from-neon-purple to-neon-green text-black font-black uppercase tracking-widest text-[10px] rounded-xl transition-all hover:shadow-[0_0_30px_rgba(57,255,20,0.3)] flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Eye className="w-4 h-4" /> Publicar Ahora</>}
            </button>
          </div>
        </div>

        {/* ── PREVIEW (derecha) ───────────────────────── */}
        <div className="hidden lg:block w-full lg:w-[45%] sticky top-8 h-fit animate-in fade-in slide-in-from-right-4 duration-700">
          <div className="glass-panel rounded-[2.5rem] border border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${selectedType.bg} ${selectedType.color} ${selectedType.border} border`}>
                {selectedType.label}
              </div>
              {form.is_pinned && <div className="flex items-center gap-1 text-neon-green text-[9px] font-black uppercase tracking-widest"><Pin className="w-3 h-3" /> Destacado</div>}
              <span className="ml-auto text-[9px] text-zinc-600 font-bold uppercase tracking-widest">Vista Previa</span>
            </div>

            {form.cover_url && (
              <div className="relative h-56 overflow-hidden">
                <img src={form.cover_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              </div>
            )}

            <div className="p-8">
              <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-4 leading-tight">
                {form.title || 'Título de la publicación...'}
              </h2>
              {form.content ? (
                <div
                  className="post-content text-sm line-clamp-[8] overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: form.content }}
                />
              ) : (
                <p className="text-zinc-600 text-sm">El contenido aparecerá aquí...</p>
              )}
              {form.media_urls.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                  {form.media_urls.slice(0, 3).map((url, i) => (
                    <div key={i} className="aspect-square"><img src={url} alt="" className="w-full h-full object-cover" /></div>
                  ))}
                </div>
              )}
              <div className="mt-6 flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-zinc-600 text-sm font-bold">❤️ 0</span>
                <span className="flex items-center gap-1.5 text-zinc-600 text-sm font-bold">🔥 0</span>
              </div>
            </div>
          </div>

          {/* Ambient */}
          <div className="fixed top-0 right-0 w-96 h-96 bg-neon-purple/10 blur-[150px] pointer-events-none -z-10" />
          <div className="fixed bottom-0 right-0 w-64 h-64 bg-neon-green/5 blur-[100px] pointer-events-none -z-10" />
        </div>
      </div>
    </AdminGuard>
  );
}
