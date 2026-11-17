"use client";
import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Mail, Printer, Receipt, X } from 'lucide-react';
import { apiFetch } from '@/lib/kasa-api';
import { type ArtistBookingView, type ArtistDetail } from '@/lib/artists';
import {
  CUENTA_COBRO_EMAIL, cuentaCobroAsunto, cuentaCobroFaltantes, cuentaCobroMailto, cuentaCobroNumeroSugerido, cuentaCobroTexto,
  type CuentaCobroInput,
} from '@/lib/cuenta-cobro';

const inputCls = 'w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm focus:border-neon-purple outline-none';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Cuenta de cobro de una presentación. Se llena sola con los datos del artista y del evento; el artista completa
 * el número y la cuenta donde recibe el pago, y la envía desde su propio correo, ya dirigida a la Fundación.
 * También puede imprimirla o guardarla en PDF para firmarla. No pasa por el servidor.
 */
export default function CuentaCobro({ artist, booking, position }: { artist: ArtistDetail; booking: ArtistBookingView; position: number }) {
  const [open, setOpen] = useState(false);
  const [numero, setNumero] = useState('');
  const [ciudad, setCiudad] = useState('Pasto');
  const [datosPago, setDatosPago] = useState('');
  const [telefono, setTelefono] = useState('');
  const [copied, setCopied] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNumero(cuentaCobroNumeroSugerido(booking.event.date, position));
    setDatosPago(artist.payout_info ?? '');
    setTelefono(artist.phone ?? '');
    setCopied(false);
    setTried(false);
  }, [open, booking.event.date, position, artist.payout_info, artist.phone]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const input: CuentaCobroInput = useMemo(
    () => ({
      numero,
      ciudad,
      nombreLegal: artist.legal_name ?? '',
      docTipo: artist.doc_type ?? '',
      docNumero: artist.doc_number ?? '',
      nombreArtistico: artist.stage_name,
      evento: booking.event.title,
      eventoFecha: booking.event.date,
      eventoLugar: booking.event.venue ?? null,
      valor: booking.fee,
      datosPago,
      telefono,
      correo: artist.user?.email ?? null,
      direccion: artist.address ?? null,
    }),
    [numero, ciudad, datosPago, telefono, artist, booking],
  );
  const missing = cuentaCobroFaltantes(input);
  const text = cuentaCobroTexto(input);
  const identityMissing = !input.nombreLegal.trim() || !input.docNumero.trim();

  /** Guarda en el perfil la cuenta de pago y el teléfono, para no volver a escribirlos. Si falla, no estorba. */
  const remember = () => {
    const body: Record<string, string | null> = {};
    if ((datosPago.trim() || null) !== (artist.payout_info ?? null)) body.payout_info = datosPago.trim() || null;
    if ((telefono.trim() || null) !== (artist.phone ?? null)) body.phone = telefono.trim() || null;
    if (Object.keys(body).length > 0) apiFetch('/artists/me', { method: 'PUT', body }).catch(() => undefined);
  };

  const ready = () => {
    setTried(true);
    if (missing.length > 0) return false;
    remember();
    return true;
  };

  const copy = async () => {
    if (!ready()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const print = () => {
    if (!ready()) return;
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) return;
    w.document.write(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(cuentaCobroAsunto(input))}</title>` +
        '<style>@page{margin:2.5cm}body{font-family:Georgia,"Times New Roman",serif;font-size:12pt;line-height:1.6;color:#000;white-space:pre-wrap;max-width:17cm;margin:0 auto;padding:1cm}</style>' +
        `</head><body>${esc(text)}</body></html>`,
    );
    w.document.close();
    w.focus();
    w.print();
  };

  if (!(booking.fee > 0)) return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-[44px] px-4 rounded-xl border border-zinc-700 text-zinc-200 text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:border-neon-green hover:text-neon-green">
        <Receipt className="w-4 h-4" /> Cuenta de cobro
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Cuenta de cobro">
          <div className="w-full sm:max-w-2xl max-h-[94vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-zinc-900">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{booking.event.title}</p>
                <h3 className="text-base font-black uppercase text-white">Cuenta de cobro</h3>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="w-11 h-11 -mr-2 rounded-lg text-zinc-500 hover:text-white flex items-center justify-center shrink-0"><X className="w-5 h-5" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {identityMissing && (
                <p role="alert" className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-[11px] font-bold text-amber-300">
                  Falta tu nombre legal o tu número de documento. Complétalos en «Mi perfil → Datos para tu contrato» y vuelve aquí.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="cc-numero">Número</label>
                  <input id="cc-numero" value={numero} onChange={(e) => setNumero(e.target.value)} maxLength={20} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="cc-ciudad">Ciudad</label>
                  <input id="cc-ciudad" value={ciudad} onChange={(e) => setCiudad(e.target.value)} maxLength={60} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="cc-pago">Cuenta donde recibes el pago</label>
                <textarea id="cc-pago" value={datosPago} onChange={(e) => setDatosPago(e.target.value)} maxLength={500} rows={2} className={`${inputCls} h-auto py-3`} placeholder="Banco, tipo de cuenta y número (debe estar a tu nombre)" />
              </div>
              <div>
                <label className={labelCls} htmlFor="cc-tel">Teléfono</label>
                <input id="cc-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={30} inputMode="tel" className={inputCls} />
              </div>

              <div>
                <p className={labelCls}>Así queda</p>
                <div className="rounded-xl border border-zinc-800 bg-white text-black p-4 text-[12px] leading-relaxed whitespace-pre-wrap break-words font-serif">{text}</div>
              </div>
            </div>

            <footer className="px-5 py-4 border-t border-zinc-900 space-y-3">
              {tried && missing.length > 0 && <p role="alert" className="text-xs font-bold text-red-400">Falta: {missing.join(', ')}.</p>}
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Se abre tu correo con la cuenta de cobro ya escrita y dirigida a {CUENTA_COBRO_EMAIL}; solo tienes que enviarla. Si prefieres firmarla a mano, guárdala en PDF y adjúntala.
              </p>
              <a
                href={missing.length === 0 ? cuentaCobroMailto(input) : undefined}
                onClick={(e) => {
                  if (!ready()) e.preventDefault();
                }}
                role="button"
                className={`w-full h-14 rounded-xl bg-neon-green text-black text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 ${missing.length > 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Mail className="w-5 h-5" /> Enviar a la Fundación
              </a>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={print} className="h-12 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Imprimir / PDF</button>
                <button type="button" onClick={copy} className="h-12 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  {copied ? <><Check className="w-4 h-4 text-neon-green" /> Copiada</> : <><Copy className="w-4 h-4" /> Copiar texto</>}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
