"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { Calendar, MapPin, Share2, MessageCircle, Mail, CheckCircle, XCircle, Download, ArrowLeft } from 'lucide-react';

export default function PublicTicketPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://casadelsol-frontend.vercel.app';
  const ticketUrl = `${BASE_URL}/ticket/${params.token}`;

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/orders/qr/${params.token}`)
      .then(async res => {
        if (!res.ok) { setNotFound(true); return; }
        setTicket(await res.json());
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.token]);

  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push('/');
  };

  const shareNative = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: `Entrada Kasa del Sol — ${ticket?.event?.title}`,
        text: `🎉 ${ticket?.attendee_name} tiene entrada para ${ticket?.event?.title}. Muestra este QR en la puerta.`,
        url: ticketUrl,
      });
    } catch {}
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `🎶 *Entrada Kasa del Sol*\n\n*${ticket?.event?.title}*\nAsistente: ${ticket?.attendee_name}\n\nPresenta este link en la puerta:\n${ticketUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const shareEmail = () => {
    const subject = encodeURIComponent(`Tu entrada para ${ticket?.event?.title} — Kasa del Sol`);
    const body = encodeURIComponent(
      `Hola ${ticket?.attendee_name},\n\nAquí está tu entrada digital para "${ticket?.event?.title}".\n\nPresenta este link en la puerta:\n${ticketUrl}\n\n¡Nos vemos en la pista! 🎶\n— Kasa del Sol`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-svg-full');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      if (!ctx) return;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement('a');
      a.download = `kasa-qr-${ticket?.attendee_name?.replace(/ /g, '-') || 'ticket'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-neon-green border-t-transparent animate-spin" />
          <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">Verificando ticket...</p>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 gap-4">
        <XCircle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-black uppercase tracking-widest text-white">Ticket No Encontrado</h1>
        <p className="text-zinc-500 text-sm">El enlace no es válido o el ticket no existe.</p>
        <button onClick={goBack}
          className="mt-2 flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-xs font-black uppercase tracking-widest">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
      </div>
    );
  }

  const eventDate = ticket.event?.date
    ? new Date(ticket.event.date).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const hasNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    // Click en el fondo (fuera de la tarjeta) → volver atrás
    <div
      className="min-h-screen flex flex-col items-center cursor-pointer"
      onClick={goBack}
    >
      {/* Fondo desenfocado */}
      {ticket.event?.flyer_url && (
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <img src={ticket.event.flyer_url} alt="" className="w-full h-full object-cover blur-3xl opacity-10 scale-110" />
          <div className="absolute inset-0 bg-black/85" />
        </div>
      )}

      {/* Botón volver — fijo arriba a la izquierda, siempre visible */}
      <button
        onClick={e => { e.stopPropagation(); goBack(); }}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/70 backdrop-blur-md border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all text-xs font-black uppercase tracking-widest group active:scale-95 shadow-lg"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="hidden sm:inline">Volver</span>
      </button>

      {/* Contenido — stopPropagation para que clics dentro no disparen goBack */}
      <div
        className="w-full max-w-sm px-4 pt-16 pb-16 cursor-default"
        onClick={e => e.stopPropagation()}
      >
        {/* Brand */}
        <div className="text-center mb-5">
          <p className="text-[11px] text-zinc-500 uppercase tracking-[0.4em] font-bold">Kasa del Sol</p>
          <h1 className="text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-neon-purple mt-1">
            Entrada Digital
          </h1>
        </div>

        {/* Badge de estado */}
        <div className={`flex items-center justify-center gap-2 mb-5 py-2 px-4 rounded-full text-xs font-black uppercase tracking-widest w-fit mx-auto border ${
          ticket.is_used
            ? 'bg-red-900/20 border-red-500/40 text-red-400'
            : 'bg-neon-green/10 border-neon-green/40 text-neon-green'
        }`}>
          {ticket.is_used
            ? <><XCircle className="w-3.5 h-3.5" /> Ya utilizado</>
            : <><CheckCircle className="w-3.5 h-3.5" /> Válido · Listo para usar</>}
        </div>

        {/* Tarjeta principal */}
        <div className={`relative rounded-2xl overflow-hidden border bg-[#0a0a0a] shadow-2xl ${ticket.is_used ? 'border-red-900/40' : 'border-zinc-800'}`}>
          <div className={`h-1 w-full ${ticket.is_used ? 'bg-gradient-to-r from-red-900 to-red-500' : 'bg-gradient-to-r from-neon-green via-neon-purple to-neon-green'}`} />

          <div className="p-5">
            <div className="flex items-start gap-3 mb-4">
              {ticket.event?.flyer_url && (
                <img src={ticket.event.flyer_url} alt={ticket.event.title}
                  className="w-14 h-14 rounded-xl object-cover border border-zinc-800 shrink-0" />
              )}
              <div className="min-w-0">
                <h2 className="font-black uppercase tracking-widest text-white text-base leading-tight">{ticket.event?.title}</h2>
                <p className="text-[11px] text-neon-green font-bold uppercase tracking-widest mt-0.5">{ticket.ticket_name}</p>
              </div>
            </div>
            {eventDate && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                <span className="capitalize">{eventDate}</span>
              </div>
            )}
            {ticket.event?.venue && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                {ticket.event.venue}
              </div>
            )}
          </div>

          {/* Línea perforada */}
          <div className="relative flex items-center px-4 my-1">
            <div className="w-5 h-5 rounded-full bg-black absolute -left-2.5 border-r border-zinc-800" />
            <div className="flex-1 border-t border-dashed border-zinc-800" />
            <div className="w-5 h-5 rounded-full bg-black absolute -right-2.5 border-l border-zinc-800" />
          </div>

          <div className="px-5 pt-4 pb-2 text-center">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold mb-1">Entrada válida para</p>
            <p className={`text-lg font-black uppercase tracking-wider ${ticket.is_used ? 'text-zinc-600 line-through' : 'text-white'}`}>
              {ticket.attendee_name}
            </p>
          </div>

          <div className="p-5 flex justify-center">
            <div className={`p-3 rounded-2xl ${ticket.is_used ? 'bg-zinc-900 opacity-30 grayscale' : 'bg-white shadow-[0_0_30px_rgba(57,255,20,0.25)]'}`}>
              <QRCodeSVG
                id="qr-svg-full"
                value={ticket.token}
                size={210}
                level="H"
                includeMargin={false}
                bgColor="white"
                fgColor="#000000"
              />
            </div>
          </div>

          {ticket.is_used && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-red-600/90 text-white font-black uppercase tracking-[0.3em] text-xl px-8 py-3 rotate-[-15deg] border-4 border-white/30 rounded shadow-2xl">
                USADO
              </div>
            </div>
          )}

          <div className="px-5 pb-5 text-center">
            <p className="text-[9px] text-zinc-700 font-mono tracking-widest break-all">{ticket.token.slice(0, 24)}...</p>
          </div>
        </div>

        {/* Botones de compartir */}
        {!ticket.is_used && (
          <div className="mt-5 space-y-3">
            <p className="text-center text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Compartir entrada</p>

            {hasNativeShare && (
              <button onClick={shareNative}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-white text-black font-black uppercase tracking-widest text-xs hover:bg-neon-green transition-all group active:scale-[0.98]">
                <Share2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Compartir…
              </button>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button onClick={shareWhatsApp}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-black uppercase tracking-widest text-[11px] hover:bg-[#25D366]/20 transition-all active:scale-95">
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </button>
              <button onClick={shareEmail}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black uppercase tracking-widest text-[11px] hover:bg-blue-500/20 transition-all active:scale-95">
                <Mail className="w-4 h-4" /> Email
              </button>
            </div>

            <button onClick={downloadQR}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-white font-black uppercase tracking-widest text-[11px] transition-all active:scale-[0.98]">
              <Download className="w-4 h-4" /> Descargar QR
            </button>
          </div>
        )}

        {/* Botón volver — abajo, cómodo para pulgar en móvil */}
        <button
          onClick={goBack}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 rounded-xl border border-zinc-800/60 hover:border-zinc-700 text-zinc-600 hover:text-zinc-300 transition-all text-xs font-black uppercase tracking-widest group active:scale-[0.98]"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Volver a mi Bóveda
        </button>

        <p className="mt-6 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
          Este QR es tu acceso único e intransferible. Una vez utilizado queda inválido.
        </p>
      </div>
    </div>
  );
}
