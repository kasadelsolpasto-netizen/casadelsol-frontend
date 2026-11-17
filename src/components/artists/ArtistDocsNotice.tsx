"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, FileCheck2, Mail } from 'lucide-react';
import FormModal from '@/components/ui/FormModal';
import RutGuide from '@/components/artists/RutGuide';
import { ARTIST_DOCS, ARTIST_DOCS_EMAIL, docsMailto, docsSeenKey } from '@/lib/rut-guide';

type Upcoming = { id: string; title: string };

function DocsBody({ stageName, eventTitle }: { stageName: string; eventTitle?: string }) {
  return (
    <>
      <p className="text-sm text-zinc-200 leading-relaxed">
        Para girarte el pago necesitamos que envíes al correo{' '}
        <a href={docsMailto(stageName, eventTitle)} className="font-black text-neon-green underline underline-offset-4 break-all">{ARTIST_DOCS_EMAIL}</a>:
      </p>
      <ul className="mt-2 space-y-1.5">
        {ARTIST_DOCS.map((d) => (
          <li key={d} className="text-sm text-zinc-200 flex items-start gap-2"><FileCheck2 className="w-4 h-4 text-neon-green shrink-0 mt-0.5" /> {d}</li>
        ))}
      </ul>
    </>
  );
}

/** Recordatorio corto dentro de cada evento en el que el artista está programado. */
export function DocsReminder({ stageName, eventTitle }: { stageName: string; eventTitle: string }) {
  return (
    <div className="mt-3 rounded-xl border border-neon-green/25 bg-neon-green/5 p-3">
      <p className="text-[11px] text-zinc-300 leading-relaxed">
        Para el pago de esta presentación envía la copia del RUT, de la cédula y la certificación bancaria a{' '}
        <a href={docsMailto(stageName, eventTitle)} className="font-black text-neon-green underline underline-offset-4 break-all">{ARTIST_DOCS_EMAIL}</a>.{' '}
        <Link href="/guia-rut" target="_blank" className="font-bold text-zinc-200 underline underline-offset-4">Instructivo del RUT</Link>
      </p>
    </div>
  );
}

/**
 * Documentos para el pago del artista. Se anuncia en una ventana la primera vez que abre su panel y cada vez
 * que se le programa en un evento nuevo; después queda siempre a la vista como tarjeta, con el instructivo
 * del RUT desplegable.
 */
export default function ArtistDocsNotice({ userId, stageName, upcoming }: { userId: string | null; stageName: string; upcoming: Upcoming[] }) {
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(false);
  const [fresh, setFresh] = useState<Upcoming[]>([]);
  const [first, setFirst] = useState(false);
  const idsKey = upcoming.map((u) => u.id).join(',');

  useEffect(() => {
    let seen: { first?: boolean; events?: string[] } = {};
    try {
      seen = JSON.parse(localStorage.getItem(docsSeenKey(userId)) || '{}') || {};
    } catch {
      seen = {};
    }
    const known = new Set(Array.isArray(seen.events) ? seen.events : []);
    const news = upcoming.filter((u) => !known.has(u.id));
    setFirst(!seen.first);
    setFresh(news);
    if (!seen.first || news.length > 0) setOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, idsKey]);

  const acknowledge = () => {
    setOpen(false);
    try {
      localStorage.setItem(docsSeenKey(userId), JSON.stringify({ first: true, events: upcoming.map((u) => u.id) }));
    } catch {
      // sin almacenamiento: el aviso volverá a salir, la tarjeta sigue a la vista
    }
  };

  const eventTitle = fresh.length === 1 ? fresh[0].title : undefined;

  return (
    <>
      <section className="mb-6 rounded-2xl border border-neon-green/30 bg-neon-green/5 p-4" aria-label="Documentos para tu pago">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-neon-green mb-2">Documentos para tu pago</h2>
        <DocsBody stageName={stageName} />
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={docsMailto(stageName)} className="min-h-[44px] px-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2">
            <Mail className="w-4 h-4" /> Enviar documentos
          </a>
          <button type="button" aria-expanded={guide} onClick={() => setGuide((g) => !g)} className="min-h-[44px] px-4 rounded-xl border border-zinc-700 text-zinc-200 text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:border-neon-purple">
            Instructivo del RUT <ChevronDown className={`w-4 h-4 transition-transform ${guide ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {guide && (
          <div className="mt-5 pt-5 border-t border-zinc-800">
            <RutGuide />
          </div>
        )}
      </section>

      <FormModal open={open} title={first ? 'Bienvenido a tu panel de artista' : 'Te programamos en un evento'} submitLabel="Entendido" hideCancel onSubmit={acknowledge} onClose={acknowledge}>
        {!first && fresh.length > 0 && (
          <p className="text-sm font-bold text-white">{fresh.length === 1 ? `Estás en «${fresh[0].title}».` : `Estás en: ${fresh.map((f) => `«${f.title}»`).join(', ')}.`}</p>
        )}
        <DocsBody stageName={stageName} eventTitle={eventTitle} />
        <p className="text-[12px] text-zinc-400 leading-relaxed">Si todavía no tienes RUT, el trámite es gratuito y se hace por internet en unos 15 minutos. El instructivo te lleva paso a paso, con los enlaces de la DIAN.</p>
        <div className="flex flex-wrap gap-2">
          <a href={docsMailto(stageName, eventTitle)} className="min-h-[44px] px-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2">
            <Mail className="w-4 h-4" /> Enviar documentos
          </a>
          <Link href="/guia-rut" target="_blank" className="min-h-[44px] px-4 rounded-xl border border-zinc-700 text-zinc-200 text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:border-neon-purple">
            Ver instructivo del RUT
          </Link>
        </div>
      </FormModal>
    </>
  );
}
