"use client";
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Search, Globe, AlertCircle, CheckCircle2 } from 'lucide-react';

interface SeoData {
  seo_title: string;
  seo_description: string;
  seo_slug: string;
}

interface SeoPanelProps {
  title: string;          // título del post (para auto-fill)
  content: string;        // HTML del contenido (para auto-fill description)
  value: SeoData;
  onChange: (data: SeoData) => void;
  baseUrl?: string;
}

// Strips HTML tags to get plain text excerpt
function stripHtml(html: string, maxLen = 160) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

// Generates a URL-friendly slug from a string
function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

// Character count indicator
function CharCount({ current, max, warn = max * 0.8 }: { current: number; max: number; warn?: number }) {
  const pct   = current / max;
  const color = current > max ? 'text-red-400' : current >= warn ? 'text-yellow-400' : 'text-neon-green';
  return (
    <span className={`text-[10px] font-black tabular-nums ${color}`}>
      {current}/{max}
    </span>
  );
}

export default function SeoPanel({ title, content, value, onChange, baseUrl = 'kasadelsol.co' }: SeoPanelProps) {
  const [open, setOpen]         = useState(false);
  const [manualTitle, setManualTitle]   = useState(false);
  const [manualDesc,  setManualDesc]    = useState(false);
  const [manualSlug,  setManualSlug]    = useState(false);

  // Auto-sync fields when post title/content changes (if user hasn't manually edited)
  useEffect(() => {
    if (!manualTitle && title) {
      const auto = `${title} | Kasa del Sol`.slice(0, 70);
      onChange({ ...value, seo_title: auto });
    }
  }, [title, manualTitle]);

  useEffect(() => {
    if (!manualDesc && content) {
      const auto = stripHtml(content, 160);
      onChange({ ...value, seo_description: auto });
    }
  }, [content, manualDesc]);

  useEffect(() => {
    if (!manualSlug && title) {
      onChange({ ...value, seo_slug: slugify(title) });
    }
  }, [title, manualSlug]);

  const displayTitle = value.seo_title || `${title} | Kasa del Sol`;
  const displayDesc  = value.seo_description || stripHtml(content, 160) || 'Sin descripción.';
  const displaySlug  = value.seo_slug || slugify(title);
  const displayUrl   = `https://${baseUrl}/posts/${displaySlug || '...'}`;

  const titleScore = displayTitle.length >= 40 && displayTitle.length <= 70;
  const descScore  = displayDesc.length  >= 100 && displayDesc.length  <= 160;
  const slugOk     = /^[a-z0-9-]+$/.test(displaySlug) && displaySlug.length > 0;
  const score      = [titleScore, descScore, slugOk].filter(Boolean).length;

  return (
    <div className={`rounded-2xl border transition-all ${open ? 'border-zinc-700' : 'border-zinc-900'} bg-zinc-950 overflow-hidden`}>

      {/* ── CABECERA COLAPSABLE ───────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-900/40 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neon-green/10 border border-neon-green/20 flex items-center justify-center">
            <Search className="w-4 h-4 text-neon-green" />
          </div>
          <div className="text-left">
            <p className="text-xs font-black uppercase tracking-widest text-white">SEO & Búsqueda</p>
            <p className="text-[10px] text-zinc-500 font-bold">Meta title, descripción, URL amigable</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Score badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
            score === 3 ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
            : score >= 1 ? 'bg-yellow-900/20 border-yellow-900/40 text-yellow-400'
            : 'bg-zinc-900 border-zinc-800 text-zinc-600'
          }`}>
            {score === 3 ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            {score}/3
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {/* ── CONTENIDO EXPANDIDO ───────────────────────────────── */}
      {open && (
        <div className="px-6 pb-6 space-y-6 border-t border-zinc-900">

          {/* Google Snippet Preview */}
          <div className="mt-5">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
              <Globe className="w-3 h-3" /> Vista previa en Google
            </p>
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-1">
              {/* URL breadcrumb */}
              <p className="text-[11px] text-zinc-500 font-medium truncate flex items-center gap-1">
                <span className="text-neon-green">🌐</span>
                {displayUrl}
              </p>
              {/* Title */}
              <p className="text-blue-400 text-[15px] font-semibold leading-snug line-clamp-1 hover:underline cursor-pointer">
                {displayTitle.slice(0, 70) || 'Título SEO de la publicación...'}
              </p>
              {/* Description */}
              <p className="text-zinc-400 text-[12px] leading-relaxed line-clamp-2">
                {displayDesc.slice(0, 160) || 'La meta descripción aparecerá aquí. Escribe algo atractivo para mejorar el CTR.'}
              </p>
            </div>
          </div>

          {/* ── Meta Title ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Meta Título</label>
              <div className="flex items-center gap-2">
                {!titleScore && <span className="text-[9px] text-yellow-500 font-bold">Ideal: 40–70 caracteres</span>}
                <CharCount current={displayTitle.length} max={70} />
              </div>
            </div>
            <input
              type="text"
              value={value.seo_title}
              onChange={e => { setManualTitle(true); onChange({ ...value, seo_title: e.target.value }); }}
              placeholder={`${title} | Kasa del Sol`}
              className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm placeholder:text-zinc-700 hover:border-zinc-600 focus:border-neon-green outline-none transition-all"
            />
            {manualTitle && (
              <button type="button" onClick={() => { setManualTitle(false); onChange({ ...value, seo_title: `${title} | Kasa del Sol`.slice(0, 70) }); }}
                className="text-[9px] text-zinc-600 hover:text-neon-purple transition-colors font-bold uppercase tracking-widest">
                ↩ Restaurar automático
              </button>
            )}
          </div>

          {/* ── Meta Description ──────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Meta Descripción</label>
              <div className="flex items-center gap-2">
                {!descScore && <span className="text-[9px] text-yellow-500 font-bold">Ideal: 100–160 caracteres</span>}
                <CharCount current={displayDesc.length} max={160} />
              </div>
            </div>
            <textarea
              rows={3}
              value={value.seo_description}
              onChange={e => { setManualDesc(true); onChange({ ...value, seo_description: e.target.value }); }}
              placeholder="Describe el contenido en 1-2 oraciones. Aparece en los resultados de búsqueda..."
              className="w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm placeholder:text-zinc-700 hover:border-zinc-600 focus:border-neon-green outline-none transition-all resize-none leading-relaxed"
            />
            {manualDesc && (
              <button type="button" onClick={() => { setManualDesc(false); onChange({ ...value, seo_description: stripHtml(content, 160) }); }}
                className="text-[9px] text-zinc-600 hover:text-neon-purple transition-colors font-bold uppercase tracking-widest">
                ↩ Restaurar automático
              </button>
            )}
          </div>

          {/* ── URL Slug ──────────────────────────────────────── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">URL Amigable (Slug)</label>
              {!slugOk && <span className="text-[9px] text-red-400 font-bold">Solo minúsculas, números y guiones</span>}
            </div>
            <div className="flex items-center gap-0 bg-black border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 focus-within:border-neon-green transition-all">
              <span className="px-4 py-3 text-zinc-600 text-xs font-bold shrink-0 border-r border-zinc-800 bg-zinc-950">
                /posts/
              </span>
              <input
                type="text"
                value={value.seo_slug}
                onChange={e => {
                  setManualSlug(true);
                  const clean = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 80);
                  onChange({ ...value, seo_slug: clean });
                }}
                placeholder={slugify(title) || 'mi-publicacion'}
                className="flex-1 bg-transparent py-3 px-4 text-white text-sm placeholder:text-zinc-700 outline-none"
              />
            </div>
            {manualSlug && (
              <button type="button" onClick={() => { setManualSlug(false); onChange({ ...value, seo_slug: slugify(title) }); }}
                className="text-[9px] text-zinc-600 hover:text-neon-purple transition-colors font-bold uppercase tracking-widest">
                ↩ Restaurar automático
              </button>
            )}
          </div>

          {/* ── Datos Estructurados (info) ─────────────────────── */}
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1.5">
              <span>{ }</span> Datos Estructurados (JSON-LD)
            </p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Se genera automáticamente el schema <code className="text-neon-green bg-neon-green/5 px-1 rounded">Article</code> de Schema.org
              al publicar — Google y otros motores lo leen para enriquecer los resultados con fecha, autor e imagen.
            </p>
            <div className="mt-3 bg-black/60 rounded-lg p-3 font-mono text-[10px] text-zinc-600 overflow-x-auto whitespace-pre">
{`{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "${displayTitle.slice(0, 50)}${displayTitle.length > 50 ? '...' : ''}",
  "description": "${displayDesc.slice(0, 60)}${displayDesc.length > 60 ? '...' : ''}",
  "url": "${displayUrl}",
  "publisher": { "@type": "Organization",
    "name": "Kasa del Sol" }
}`}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
