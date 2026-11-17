// Instructivo RUT para artistas (página propia, para compartir por enlace).
import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import RutGuide from '@/components/artists/RutGuide';
import { ARTIST_DOCS_EMAIL, docsMailto } from '@/lib/rut-guide';

export const metadata: Metadata = {
  title: 'Instructivo RUT para artistas | Kasa del Sol',
  description: 'Cómo inscribirse en el RUT, qué actividad económica registrar y qué documentos enviar para el pago de la presentación.',
  alternates: { canonical: 'https://kasadelsol.co/guia-rut' },
};

export default function RutGuidePage() {
  return (
    <div className="min-h-screen bg-[#050505]">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 pb-28">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-purple mb-2">Artistas</p>
        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white mb-6">Instructivo RUT</h1>
        <div className="mb-8 rounded-2xl border border-neon-green/30 bg-neon-green/5 p-4">
          <p className="text-sm text-zinc-200 leading-relaxed">
            Envíe la copia del RUT, de la cédula y la certificación bancaria a{' '}
            <a href={docsMailto()} className="font-black text-neon-green underline underline-offset-4 break-all">{ARTIST_DOCS_EMAIL}</a>.
          </p>
          <a href={docsMailto()} className="mt-3 min-h-[44px] px-4 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2">
            <Mail className="w-4 h-4" /> Escribir el correo
          </a>
        </div>
        <RutGuide />
      </main>
    </div>
  );
}
