"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ExternalLink, Eye, EyeOff, Loader2, Pencil, Pin, Plus, Trash2, X } from 'lucide-react';
import ImageUpload from '@/components/artists/ImageUpload';
import MediaEmbed from '@/components/artists/MediaEmbed';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { linkLabel, mediaEmbed } from '@/lib/embeds';
import { fmtDate } from '@/lib/artists';

type LinkRow = { kind?: string; label: string; url: string };
type PageData = { slug: string; tagline: string | null; genres: string[]; city: string | null; cover_url: string | null; links: LinkRow[]; is_public: boolean };
type PostKind = 'MUSIC' | 'LINK' | 'ARTICLE';
type ArtistPost = { id: string; kind: PostKind; title: string; body: string | null; url: string | null; cover_url: string | null; is_published: boolean; is_pinned: boolean; created_at: string };

const MAX_LINKS = 12;
const inputCls = 'w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm focus:border-neon-purple outline-none';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2';
const KIND_INFO: Record<PostKind, { label: string; hint: string }> = {
  MUSIC: { label: 'Grabación', hint: 'Pega el enlace de YouTube o SoundCloud: se verá con su reproductor.' },
  LINK: { label: 'Enlace', hint: 'Un enlace que quieras destacar (nota de prensa, lanzamiento, tienda).' },
  ARTICLE: { label: 'Texto', hint: 'Una nota escrita por ti. Puedes acompañarla con una imagen.' },
};

const msgOf = (e: unknown) => (e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');

function Note({ msg }: { msg: { tone: 'ok' | 'error'; text: string } | null }) {
  if (!msg) return null;
  return (
    <p role="status" className={`text-xs font-bold flex items-center gap-1.5 ${msg.tone === 'ok' ? 'text-neon-green' : 'text-red-400'}`}>
      {msg.tone === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" />} {msg.text}
    </p>
  );
}

/**
 * Lo que el artista publica hacia afuera: su página (portada, frase, géneros, ciudad y enlaces de sus redes)
 * y sus publicaciones (grabaciones con reproductor, enlaces y textos). Solo edita lo suyo.
 */
export default function ArtistPageEditor() {
  const [page, setPage] = useState<PageData | null>(null);
  const [posts, setPosts] = useState<ArtistPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Página
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('');
  const [genres, setGenres] = useState('');
  const [cover, setCover] = useState('');
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [savingPage, setSavingPage] = useState(false);
  const [pageMsg, setPageMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  // Publicación en edición (null = cerrada; id '' = nueva)
  const [draft, setDraft] = useState<(Omit<ArtistPost, 'created_at' | 'body' | 'url' | 'cover_url'> & { body: string; url: string; cover_url: string }) | null>(null);
  const [savingPost, setSavingPost] = useState(false);
  const [postMsg, setPostMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<ArtistPost | null>(null);

  const fillPage = (p: PageData) => {
    setPage(p);
    setSlug(p.slug);
    setTagline(p.tagline ?? '');
    setCity(p.city ?? '');
    setGenres((p.genres ?? []).join(', '));
    setCover(p.cover_url ?? '');
    setLinks((p.links ?? []).map((l) => ({ kind: l.kind, label: l.label ?? '', url: l.url })));
  };

  const load = useCallback(async () => {
    try {
      const [p, list] = await Promise.all([apiFetch<PageData>('/artists/me/page'), apiFetch<ArtistPost[]>('/artists/me/posts')]);
      fillPage(p);
      setPosts(list);
      setLoadError('');
    } catch (e) {
      setLoadError(msgOf(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePage = async (extra: Partial<{ is_public: boolean }> = {}) => {
    setSavingPage(true);
    setPageMsg(null);
    try {
      const saved = await apiFetch<PageData>('/artists/me/page', {
        method: 'PUT',
        body: {
          slug,
          tagline: tagline.trim() || null,
          city: city.trim() || null,
          genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
          cover_url: cover || null,
          links: links.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), label: l.label.trim() || null })),
          ...extra,
        },
      });
      fillPage(saved);
      setPageMsg({
        tone: 'ok',
        text: extra.is_public === true ? 'Tu página ya está publicada.' : extra.is_public === false ? 'Tu página quedó oculta.' : 'Página guardada.',
      });
    } catch (e) {
      setPageMsg({ tone: 'error', text: msgOf(e) });
    } finally {
      setSavingPage(false);
    }
  };

  const savePost = async () => {
    if (!draft) return;
    setSavingPost(true);
    setPostMsg(null);
    try {
      const body = {
        kind: draft.kind,
        title: draft.title.trim(),
        body: draft.body.trim() || null,
        url: draft.url.trim() || null,
        cover_url: draft.cover_url || null,
        is_published: draft.is_published,
        is_pinned: draft.is_pinned,
      };
      if (draft.id) await apiFetch(`/artists/me/posts/${draft.id}`, { method: 'PUT', body });
      else await apiFetch('/artists/me/posts', { method: 'POST', body });
      setDraft(null);
      setPosts(await apiFetch<ArtistPost[]>('/artists/me/posts'));
      setPostMsg({ tone: 'ok', text: 'Publicación guardada.' });
    } catch (e) {
      setPostMsg({ tone: 'error', text: msgOf(e) });
    } finally {
      setSavingPost(false);
    }
  };

  const removePost = async () => {
    if (!toDelete) return;
    try {
      await apiFetch(`/artists/me/posts/${toDelete.id}`, { method: 'DELETE' });
      setPosts((list) => list.filter((p) => p.id !== toDelete.id));
      setPostMsg({ tone: 'ok', text: 'Publicación borrada.' });
    } catch (e) {
      setPostMsg({ tone: 'error', text: msgOf(e) });
    } finally {
      setToDelete(null);
    }
  };

  if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 text-zinc-600 animate-spin" /></div>;
  if (loadError || !page) return <p role="alert" className="text-center text-sm font-bold text-red-400 p-8">{loadError || 'No se pudo cargar tu página.'}</p>;

  const draftEmbed = draft?.kind === 'MUSIC' ? mediaEmbed(draft.url) : null;

  return (
    <div className="space-y-10">
      {/* ── Estado de la página ── */}
      <section className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${page.is_public ? 'border-neon-green/40 bg-neon-green/5' : 'border-zinc-800 bg-zinc-950'}`}>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
            {page.is_public ? <Eye className="w-4 h-4 text-neon-green" /> : <EyeOff className="w-4 h-4 text-zinc-500" />}
            {page.is_public ? 'Página publicada' : 'Página oculta'}
          </p>
          <p className="text-[11px] text-zinc-500 mt-1 break-all">kasadelsol.co/artistas/{page.slug}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {page.is_public && (
            <Link href={`/artistas/${page.slug}`} target="_blank" className="h-10 px-4 rounded-xl border border-zinc-700 text-[11px] font-black uppercase tracking-widest text-zinc-200 hover:border-neon-purple inline-flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" /> Ver
            </Link>
          )}
          <button
            type="button"
            disabled={savingPage}
            onClick={() => savePage({ is_public: !page.is_public })}
            className={`h-10 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-60 ${page.is_public ? 'border border-zinc-700 text-zinc-300 hover:border-red-900 hover:text-red-400' : 'bg-neon-green text-black'}`}
          >
            {page.is_public ? 'Ocultar' : 'Publicar página'}
          </button>
        </div>
      </section>

      {/* ── Datos de la página ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          savePage();
        }}
        className="space-y-5"
      >
        <h2 className="text-sm font-black uppercase tracking-widest text-white">Mi página</h2>
        <ImageUpload value={cover} onChange={setCover} folder="artists/covers" label="Portada" hint="Imagen horizontal que encabeza tu página. JPG, PNG o WebP." maxSide={2400} />
        <div>
          <label className={labelCls} htmlFor="ap-tagline">Frase de presentación</label>
          <input id="ap-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} className={inputCls} placeholder="Techno andino desde Pasto" />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} htmlFor="ap-city">Ciudad</label>
            <input id="ap-city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} className={inputCls} placeholder="Pasto, Nariño" />
          </div>
          <div>
            <label className={labelCls} htmlFor="ap-genres">Géneros (separados por coma)</label>
            <input id="ap-genres" value={genres} onChange={(e) => setGenres(e.target.value)} className={inputCls} placeholder="Techno, House, Tribal" />
          </div>
        </div>
        <div>
          <label className={labelCls} htmlFor="ap-slug">Dirección de tu página</label>
          <div className="flex items-center rounded-xl border border-zinc-800 bg-black/60 focus-within:border-neon-purple">
            <span className="pl-4 text-xs text-zinc-600 whitespace-nowrap">/artistas/</span>
            <input id="ap-slug" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={50} className="flex-1 min-w-0 bg-transparent h-12 pr-4 text-white text-sm outline-none" />
          </div>
        </div>

        <div>
          <p className={labelCls}>Redes y enlaces</p>
          <ul className="space-y-2">
            {links.map((l, i) => (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] gap-2 items-center">
                <input
                  value={l.url}
                  onChange={(e) => setLinks((rows) => rows.map((r, j) => (j === i ? { ...r, url: e.target.value } : r)))}
                  className={inputCls}
                  placeholder="instagram.com/tu_usuario"
                  inputMode="url"
                  aria-label={`Enlace ${i + 1}`}
                />
                <input
                  value={l.label}
                  onChange={(e) => setLinks((rows) => rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                  maxLength={40}
                  className={`${inputCls} col-span-2 sm:col-span-1 sm:order-none order-last`}
                  placeholder={l.url.trim() ? linkLabel({ kind: l.kind, url: l.url }) : 'Nombre (opcional)'}
                  aria-label={`Nombre del enlace ${i + 1}`}
                />
                <button type="button" onClick={() => setLinks((rows) => rows.filter((_, j) => j !== i))} aria-label={`Quitar enlace ${i + 1}`} className="h-12 w-12 rounded-xl border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-900 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
          {links.length < MAX_LINKS && (
            <button type="button" onClick={() => setLinks((rows) => [...rows, { label: '', url: '' }])} className="mt-2 h-10 px-4 rounded-xl border border-dashed border-zinc-700 text-[11px] font-black uppercase tracking-widest text-zinc-300 hover:border-neon-purple inline-flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Agregar enlace
            </button>
          )}
          <p className="mt-1.5 text-[11px] font-bold text-zinc-500">Instagram, SoundCloud, Spotify, YouTube, Bandcamp o tu sitio. La red se reconoce sola por la dirección.</p>
        </div>

        <Note msg={pageMsg} />
        <button type="submit" disabled={savingPage} className="w-full h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
          {savingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar página'}
        </button>
      </form>

      {/* ── Publicaciones ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Grabaciones y publicaciones</h2>
          {!draft && (
            <button
              type="button"
              onClick={() => {
                setPostMsg(null);
                setDraft({ id: '', kind: 'MUSIC', title: '', body: '', url: '', cover_url: '', is_published: true, is_pinned: false });
              }}
              className="h-10 px-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva
            </button>
          )}
        </div>

        {draft && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              savePost();
            }}
            className="rounded-2xl border border-neon-purple/40 bg-zinc-950 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-widest text-neon-purple">{draft.id ? 'Editar publicación' : 'Nueva publicación'}</p>
              <button type="button" onClick={() => setDraft(null)} aria-label="Cerrar" className="w-9 h-9 rounded-lg text-zinc-500 hover:text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div role="radiogroup" aria-label="Qué vas a publicar" className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black border border-zinc-900">
              {(Object.keys(KIND_INFO) as PostKind[]).map((k) => (
                <button key={k} type="button" role="radio" aria-checked={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k })} className={`h-10 rounded-lg text-[11px] font-black uppercase tracking-widest ${draft.kind === k ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
                  {KIND_INFO[k].label}
                </button>
              ))}
            </div>
            <p className="text-[11px] font-bold text-zinc-500">{KIND_INFO[draft.kind].hint}</p>
            <div>
              <label className={labelCls} htmlFor="post-title">Título</label>
              <input id="post-title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120} required className={inputCls} />
            </div>
            {draft.kind !== 'ARTICLE' && (
              <div>
                <label className={labelCls} htmlFor="post-url">{draft.kind === 'MUSIC' ? 'Enlace de YouTube o SoundCloud' : 'Enlace'}</label>
                <input id="post-url" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} inputMode="url" className={inputCls} placeholder={draft.kind === 'MUSIC' ? 'https://soundcloud.com/tu-usuario/tu-set' : 'https://…'} />
                {draft.kind === 'MUSIC' && draft.url.trim() && (
                  draftEmbed ? (
                    <div className="mt-3"><MediaEmbed url={draft.url} title={draft.title} /></div>
                  ) : (
                    <p className="mt-1.5 text-[11px] font-bold text-amber-400">
                      Este enlace no tiene reproductor: se mostrará como botón. Para que suene en tu página usa el enlace completo de la pista en soundcloud.com o del video en YouTube (los enlaces cortos on.soundcloud.com no sirven).
                    </p>
                  )
                )}
              </div>
            )}
            <div>
              <label className={labelCls} htmlFor="post-body">{draft.kind === 'ARTICLE' ? 'Texto' : 'Descripción (opcional)'}</label>
              <textarea id="post-body" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} maxLength={8000} rows={draft.kind === 'ARTICLE' ? 8 : 3} className={`${inputCls} h-auto py-3`} />
            </div>
            {draft.kind !== 'MUSIC' && (
              <ImageUpload value={draft.cover_url} onChange={(url) => setDraft({ ...draft, cover_url: url })} folder="artists/posts" label="Imagen (opcional)" />
            )}
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 min-h-[44px]">
                <input type="checkbox" checked={draft.is_published} onChange={(e) => setDraft({ ...draft, is_published: e.target.checked })} className="w-4 h-4 accent-[#39ff14]" /> Visible en mi página
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-300 min-h-[44px]">
                <input type="checkbox" checked={draft.is_pinned} onChange={(e) => setDraft({ ...draft, is_pinned: e.target.checked })} className="w-4 h-4 accent-[#39ff14]" /> Fijar arriba
              </label>
            </div>
            <Note msg={postMsg?.tone === 'error' ? postMsg : null} />
            <button type="submit" disabled={savingPost} className="w-full h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
              {savingPost ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar publicación'}
            </button>
          </form>
        )}

        {!draft && <Note msg={postMsg} />}

        {posts.length === 0 && !draft ? (
          <p className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Todavía no has publicado nada. Empieza por una grabación: pega el enlace de tu set en SoundCloud o de tu video en YouTube.</p>
        ) : (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate flex items-center gap-1.5">
                    {p.is_pinned && <Pin className="w-3.5 h-3.5 text-neon-green shrink-0" />} {p.title}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {KIND_INFO[p.kind]?.label ?? p.kind} · {fmtDate(p.created_at)}
                    {!p.is_published && ' · oculta'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Editar ${p.title}`}
                    onClick={() => {
                      setPostMsg(null);
                      setDraft({ id: p.id, kind: p.kind, title: p.title, body: p.body ?? '', url: p.url ?? '', cover_url: p.cover_url ?? '', is_published: p.is_published, is_pinned: p.is_pinned });
                    }}
                    className="w-11 h-11 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" aria-label={`Borrar ${p.title}`} onClick={() => setToDelete(p)} className="w-11 h-11 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog open={!!toDelete} title="Borrar publicación" confirmLabel="Borrar" tone="danger" onConfirm={removePost} onCancel={() => setToDelete(null)}>
        «{toDelete?.title}» dejará de verse en tu página. No se puede deshacer.
      </ConfirmDialog>
    </div>
  );
}
