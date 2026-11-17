"use client";
import { useRef, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { fitWithin, uploadPath, uploadProblem } from '@/lib/image-upload';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

/**
 * Reduce la imagen en el navegador solo si excede `maxSide` (alta calidad, sin filtros). Si el navegador no
 * puede procesarla, se sube el archivo original.
 */
async function prepare(file: File, maxSide: number): Promise<{ blob: Blob; ext: string }> {
  const original = { blob: file as Blob, ext: file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg' };
  try {
    const bitmap = await createImageBitmap(file);
    const size = fitWithin(bitmap.width, bitmap.height, maxSide);
    if (!size.resized) {
      bitmap.close?.();
      return original;
    }
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return original;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close?.();
    // PNG conserva transparencia; el resto sale en JPEG de alta calidad.
    const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.92));
    return blob ? { blob, ext: type === 'image/png' ? 'png' : 'jpg' } : original;
  } catch {
    return original;
  }
}

/**
 * Campo para subir una imagen (foto del artista, portada, imagen de una publicación).
 * Entrega la dirección pública de la imagen ya subida, o '' si se quita.
 */
export default function ImageUpload({
  value,
  onChange,
  folder,
  label,
  hint,
  shape = 'wide',
  maxSide = 2000,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  label: string;
  hint?: string;
  shape?: 'round' | 'wide';
  maxSide?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    const problem = uploadProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const { blob, ext } = await prepare(file, maxSide);
      const path = uploadPath(folder, ext);
      const { error: upErr } = await supabase.storage.from('posts').upload(path, blob, { contentType: blob.type || file.type, cacheControl: '31536000' });
      if (upErr) {
        setError('No se pudo subir la imagen. Intenta de nuevo.');
        return;
      }
      onChange(supabase.storage.from('posts').getPublicUrl(path).data.publicUrl);
    } catch {
      setError('No se pudo subir la imagen. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const frame = shape === 'round' ? 'w-28 h-28 rounded-full' : 'w-full aspect-[16/7] rounded-2xl';

  return (
    <div>
      <p className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">{label}</p>
      <div className={`flex gap-4 ${shape === 'round' ? 'items-center' : 'flex-col'}`}>
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-label={value ? `Cambiar ${label.toLowerCase()}` : `Subir ${label.toLowerCase()}`}
          className={`${frame} relative shrink-0 overflow-hidden border border-dashed border-zinc-700 bg-black/60 flex items-center justify-center text-zinc-500 hover:border-neon-purple hover:text-white transition-colors`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <ImagePlus className="w-6 h-6" />
          )}
          {busy && (
            <span className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-neon-green animate-spin" />
            </span>
          )}
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="h-10 px-4 rounded-xl border border-zinc-700 text-[11px] font-black uppercase tracking-widest text-zinc-200 hover:border-neon-purple disabled:opacity-60"
          >
            {busy ? 'Subiendo…' : value ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {value && !busy && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="h-10 px-3 rounded-xl border border-zinc-800 text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400 hover:border-red-900 inline-flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" /> Quitar
            </button>
          )}
        </div>
      </div>
      {hint && !error && <p className="mt-1.5 text-[11px] font-bold text-zinc-500">{hint}</p>}
      {error && <p role="alert" className="mt-1.5 text-[11px] font-bold text-red-400">{error}</p>}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
