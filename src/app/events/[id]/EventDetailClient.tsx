"use client";
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, QrCode as QrCodeIcon, X, Copy, Check, Link2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';
import CheckoutWizard from '@/components/CheckoutWizard';
import { WhatsAppButton } from '@/components/WhatsAppButton';

export default function EventDetailClient({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [success, setSuccess] = useState('');
  const [showVaultAnim, setShowVaultAnim] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [pageUrl, setPageUrl] = useState('https://kasadelsol.co');

  useEffect(() => {
    setPageUrl(window.location.href);
    let apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    if (apiEndpoint.includes('localhost')) apiEndpoint = apiEndpoint.replace('localhost', '127.0.0.1');

    // View Tracking
    const trackedKey = `kasa_event_view_${params.id}`;
    if (!sessionStorage.getItem(trackedKey)) {
      sessionStorage.setItem(trackedKey, 'true');
      fetch(`${apiEndpoint}/events/${params.id}/view`, { method: 'POST' }).catch(() => {});
    }

    fetch(`${apiEndpoint}/events/${params.id}`)
      .then(res => res.json())
      .then(setEvent)
      .catch(console.error);
  }, [params.id]);

  if (!event) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070000] flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-10 pointer-events-none opacity-90" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 1px, rgba(12,0,0,0.9) 2px, rgba(12,0,0,0.9) 4px)' }} />
        <div className="relative z-20 flex flex-col items-center w-full px-6">
          <div className="text-xl sm:text-3xl md:text-5xl font-black uppercase tracking-widest sm:tracking-[0.4em] flex flex-col text-center relative w-full items-center justify-center">
            <span className="text-red-900 animate-bounce absolute opacity-80 blur-[2px] translate-x-1 -translate-y-1">INJECTING PAYLOAD</span>
            <span className="text-red-600 absolute -translate-x-[2px] translate-y-[2px] mix-blend-screen opacity-90 animate-ping">INJECTING PAYLOAD</span>
            <span className="text-zinc-400 mix-blend-screen relative z-10">INJECTING PAYLOAD</span>
          </div>
          <div className="mt-12 w-full max-w-sm border border-red-900/50 p-1 bg-black/80">
            <div className="h-2 bg-red-600 animate-[pulse_0.3s_infinite] w-3/4 shadow-[0_0_15px_rgba(220,38,38,0.8)]" />
          </div>
        </div>
      </div>
    );
  }

  const handleLaunchWompi = async (attendees: any[], hp: string, recaptchaToken: string, promoterCode?: string) => {
    setWizardError('');
    setWizardLoading(true);
    try {
      const tokenRow = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      if (!token) { setWizardError('Sesión expirada. Por favor recarga.'); return; }

      const payloadAttendees = attendees.map(att => ({
        ...att,
        ticket_type_id: selectedTicket.id
      }));

      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // ── FLUJO GRATUITO ────────────────────────────────────────────
      if (selectedTicket.price === 0) {
        const res = await fetch(`${API}/orders/checkout-free`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'recaptcha-token': recaptchaToken
          },
          body: JSON.stringify({ attendees: payloadAttendees, hp })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.message || 'Error al registrar tu entrada gratuita.');
        }

        setWizardLoading(false);
        setShowWizard(false);
        setShowVaultAnim(true);
        setTimeout(() => {
          const userPayload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
          router.push(`/profile/${userPayload.id || userPayload.sub}`);
        }, 2000);
        return;
      }

      // ── FLUJO WOMPI (tickets de pago) ─────────────────────────────
      const res = await fetch(`${API}/orders/checkout-wompi`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}`,
          'recaptcha-token': recaptchaToken
        },
        body: JSON.stringify({ attendees: payloadAttendees, hp, promoter_code: promoterCode })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Error al inicializar el pago.');
      }

      const data = await res.json();
      const orderId: string = data.reference;

      if (typeof (window as any).WidgetCheckout !== 'function') {
         throw new Error('Cargando servidor seguro de pagos... por favor intenta nuevamente en unos segundos.');
      }

      const buyer = attendees[0];
      const customerData: Record<string, string> = {};
      if (buyer?.attendee_email) customerData.email = buyer.attendee_email;
      if (buyer?.attendee_name) customerData.fullName = buyer.attendee_name;

      const widgetConfig = {
        currency: 'COP',
        amountInCents: data.amountInCents,
        reference: orderId,
        publicKey: data.publicKey,
        signature: { integrity: data.signature },
        ...(Object.keys(customerData).length > 0 && { customerData }),
      };

      const checkout = new (window as any).WidgetCheckout(widgetConfig);

      checkout.open(async (result: any) => {
        setWizardLoading(false);
        const tx = result.transaction;
        setShowWizard(false);

        if (tx.status === 'APPROVED') {
          // Mostrar animación de bóveda inmediatamente
          setShowWizard(false);
          setShowVaultAnim(true);
          try {
            const confirmRes = await fetch(`${API}/orders/confirm-ticket-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ orderId, wompiTransactionId: tx.id }),
            });
            if (!confirmRes.ok) console.error('[ticket-confirm] Error:', await confirmRes.text());
          } catch (confirmErr) { console.error('[ticket-confirm] Error:', confirmErr); }
          setTimeout(() => {
            const userPayload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
            router.push(`/profile/${userPayload.id || userPayload.sub}`);
          }, 2000);
        } else {
          setWizardError(`Estado: ${tx.status}. Intenta de nuevo.`);
        }
      });

    } catch (err: any) {
      console.error('[Checkout] ERROR:', err);
      setWizardError(err.message);
      setWizardLoading(false);
    }
  };



  // ── Animación de bóveda ──────────────────────────────────────
  if (showVaultAnim) {
    return (
      <div className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center overflow-hidden">
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)' }} />
        
        {/* Red portal rings */}
        <div className="absolute w-[600px] h-[600px] rounded-full border border-red-900/10 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute w-[400px] h-[400px] rounded-full border border-red-700/20 animate-ping" style={{ animationDelay: '0.5s', animationDuration: '3s' }} />
        <div className="absolute w-[200px] h-[200px] rounded-full border border-red-500/30 animate-ping" style={{ animationDelay: '1s', animationDuration: '3s' }} />

        {/* Diabolical Core / Monolith */}
        <div className="w-32 h-48 border-2 border-red-600 bg-black shadow-[0_0_100px_rgba(220,38,38,0.6)] flex items-center justify-center relative mb-12 overflow-hidden transform skew-x-[-5deg]">
           <div className="absolute inset-2 border border-red-800 shadow-[inset_0_0_50px_rgba(220,38,38,0.8)]"></div>
           <div className="absolute inset-4 bg-gradient-to-t from-red-600/50 to-black animate-pulse" style={{ animationDuration: '1.5s' }}></div>
           
           {/* Sharp Spinners */}
           <div className="w-16 h-16 border-2 border-red-600 border-t-red-900 animate-spin absolute top-1/3"></div>
           <div className="w-8 h-8 border-2 border-red-800 border-b-red-500 animate-spin absolute top-1/3" style={{ animationDirection: 'reverse', animationDuration: '0.5s' }}></div>
        </div>

        {/* Texto glitch Virus */}
        <div className="relative text-center font-mono">
          <span className="absolute text-red-700 text-3xl font-black uppercase tracking-[0.3em] blur-[4px] translate-x-[4px] -translate-y-[4px] opacity-70">ABRIENDO LA BÓVEDA</span>
          <span className="absolute text-red-500 text-3xl font-black uppercase tracking-[0.3em] blur-[2px] -translate-x-[2px] translate-y-[2px] mix-blend-screen">ABRIENDO LA BÓVEDA</span>
          <span className="relative text-red-600 text-3xl font-black uppercase tracking-[0.3em] [text-shadow:0_0_20px_#dc2626]">ABRIENDO LA BÓVEDA</span>
        </div>
        <p className="mt-6 text-red-800 text-xs uppercase tracking-[0.5em] font-mono animate-pulse font-bold">Ejecutando script de acceso…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Script src="https://checkout.wompi.co/widget.js" strategy="afterInteractive" />

      {/* Hero */}
      <div className="relative w-full min-h-[60vh] border-b border-zinc-800 flex items-center justify-center p-6 md:p-12 overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          {event.flyer_url && <Image src={event.flyer_url} alt="background" fill priority sizes="100vw" className="object-cover blur-3xl opacity-30 transform scale-125" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10 lg:gap-20">
          <div className="w-full md:w-1/2 flex flex-col justify-center order-2 md:order-1 pt-4 md:pt-0">
            <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors uppercase text-xs tracking-widest font-semibold mb-6 w-fit">
              <ArrowLeft className="w-4 h-4" /> Volver
            </Link>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-widest text-white mb-6 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] neon-text-primary">
              {event.title}
            </h1>
            <div className="flex flex-col sm:flex-row w-fit gap-4 sm:gap-6 text-sm font-semibold uppercase tracking-wider">
              <div className="flex items-center gap-2 py-2 px-4 bg-black/50 backdrop-blur rounded border border-zinc-800">
                <Calendar className="w-4 h-4 text-neon-green" /> {new Date(event.date).toLocaleDateString('es-CO')}
              </div>
              <div className="flex items-center gap-2 py-2 px-4 bg-black/50 backdrop-blur rounded border border-zinc-800">
                <MapPin className="w-4 h-4 text-neon-purple" /> {event.venue}
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/2 order-1 md:order-2 flex flex-col justify-center items-center md:items-end gap-6 pt-4 md:pt-0">
            <div className="relative w-full max-w-sm aspect-[4/5] shadow-[0_0_50px_rgba(0,0,0,0.7)] group transform md:rotate-3 hover:rotate-0 transition-all duration-500 rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/50 p-[2px]">
              {/* Controles de la animación neón envolvente */}
              <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_75%,#39ff14_90%,#bf00ff_100%)] opacity-40 group-hover:opacity-100 transition-opacity duration-1000 z-0 pointer-events-none"></div>
              
              <div className="relative w-full h-full rounded-xl overflow-hidden bg-black z-10">
                {event.flyer_url && <Image src={event.flyer_url} alt={event.title} fill priority sizes="(max-width: 768px) 100vw, 400px" className="object-cover group-hover:scale-105 transition-transform duration-1000" />}
              </div>
            </div>

            {/* Share row — minimal */}
            <div className="w-full max-w-sm">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-2 text-center">Compartir</p>
              <div className="flex items-center justify-center gap-2">
                {/* WhatsApp */}
                <button
                  onClick={() => window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent('¡Mira este evento! ' + event.title + ' — ' + pageUrl)}`, '_blank')}
                  title="WhatsApp"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#25D366]/10 border border-[#25D366]/25 text-[#25D366] hover:bg-[#25D366] hover:text-black transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 1C5.924 1 1 5.925 1 12.001c0 1.943.505 3.771 1.392 5.362L1 23l5.75-1.375A10.95 10.95 0 0012 23c6.075 0 11-4.925 11-11S18.075 1 12 1zm0 20.095a9.055 9.055 0 01-4.612-1.262l-.33-.197-3.416.817.848-3.327-.215-.342A9.059 9.059 0 012.904 12c0-4.998 4.097-9.095 9.096-9.095 4.998 0 9.095 4.097 9.095 9.095s-4.097 9.095-9.096 9.095z"/></svg>
                </button>
                {/* Facebook */}
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank')}
                  title="Facebook"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-[#1877F2]/10 border border-[#1877F2]/25 text-[#1877F2] hover:bg-[#1877F2] hover:text-white transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </button>
                {/* X */}
                <button
                  onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent('¡No te pierdas ' + event.title + ' en Kasa del Sol!')}&url=${encodeURIComponent(pageUrl)}`, '_blank')}
                  title="X / Twitter"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.639L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>
                </button>
                {/* Copy link */}
                <button
                  onClick={() => { navigator.clipboard.writeText(pageUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                  title="Copiar enlace"
                  className={`w-8 h-8 flex items-center justify-center rounded-full border transition-all ${copiedLink ? 'bg-neon-green border-neon-green text-black' : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                </button>
                {/* QR */}
                <button
                  onClick={() => setShowQrModal(true)}
                  title="Código QR"
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-neon-purple/10 border border-neon-purple/25 text-neon-purple hover:bg-neon-purple hover:text-black transition-all"
                >
                  <QrCodeIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h3 className="text-xl font-bold uppercase tracking-widest text-zinc-300 border-b border-zinc-800 pb-2 mb-4">
              Acerca del Evento
            </h3>
            <div className="w-full overflow-hidden">
              <p className="text-zinc-400 leading-relaxed whitespace-pre-line break-words break-all">{event.description}</p>
            </div>
          </section>
        </div>

        {/* Tickets panel */}
        <div id="tickets-section" className="lg:col-span-1 scroll-mt-24">
          <div className="glass-panel rounded-2xl p-6 sticky top-24">
            <h3 className="text-lg font-bold uppercase tracking-widest text-white mb-6 flex items-center justify-between">
              Entradas
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            </h3>

            {success && (
              <div className="mb-4 p-3 bg-neon-green/10 border border-neon-green/30 rounded-xl text-neon-green text-xs font-black uppercase text-center">
                {success}
              </div>
            )}

            <div className="space-y-3">
              {event.ticket_types.map((ticket: any) => {
                const now = new Date();
                const isStarted = !ticket.sale_start || new Date(ticket.sale_start) <= now;
                const isEnded = ticket.sale_end && new Date(ticket.sale_end) <= now;
                const isAvailable = ticket.available > 0;
                const canBuy = isAvailable && isStarted && !isEnded;
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => canBuy && setSelectedTicket(ticket)}
                    className={`border rounded-xl p-4 transition-all relative overflow-hidden ${
                      canBuy
                        ? `cursor-pointer ${isSelected
                            ? 'border-neon-green bg-neon-green/10 shadow-[0_0_20px_rgba(57,255,20,0.2)]'
                            : 'border-zinc-700 hover:border-zinc-500 bg-black/40 hover:bg-black/60'}`
                        : 'border-zinc-900 bg-zinc-950 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    {/* Indicador de Activo Neón */}
                    {canBuy && !isSelected && (
                      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20">
                         <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-neon-green animate-ping" />
                      </div>
                    )}

                    <div className="flex justify-between items-center relative z-10 gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <h4 className={`font-bold uppercase tracking-wider text-sm ${isSelected ? 'text-neon-green' : canBuy ? 'text-zinc-200' : 'text-zinc-600 line-through'}`}>
                            {ticket.name}
                          </h4>
                          {!isStarted && <span className="bg-zinc-800 text-zinc-400 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shrink-0">PRÓXIMAMENTE</span>}
                          {isEnded && <span className="bg-red-900/40 text-red-500 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-red-900 shrink-0">CERRADO</span>}
                          {!isAvailable && isStarted && !isEnded && <span className="bg-zinc-800 text-zinc-500 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest shrink-0">SOLD OUT</span>}
                          {canBuy && (
                             <span className="bg-neon-green/10 text-neon-green text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-[0.2em] border border-neon-green/20 animate-pulse shrink-0 flex-initial">DISPONIBLE AHORA</span>
                          )}
                        </div>
                        <p className={`text-xs mt-1 font-medium ${canBuy && ticket.hide_stock && ticket.available <= 20 ? 'text-orange-400 font-bold' : 'text-zinc-500'}`}>
                          {!canBuy ? 'No disponible para compra' : 
                           ticket.hide_stock ? (ticket.available > 20 ? 'Disponible ahora' : `¡Últimas ${ticket.available} entradas!`) : 
                           `${ticket.available} disponibles`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`font-black text-lg ${canBuy ? (ticket.price === 0 ? 'text-neon-green' : 'text-white') : 'text-zinc-600'}`}>
                          {ticket.price === 0
                            ? 'GRATIS'
                            : Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(ticket.price)}
                        </span>
                        {canBuy && (
                          <div className={`w-5 h-5 rounded-full border-2 transition-all shrink-0 ${isSelected ? 'border-neon-green bg-neon-green' : 'border-zinc-600'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { 
                if (selectedTicket) {
                  // Track Checkout Click
                  const trackedClickKey = `kasa_event_click_${params.id}`;
                  if (!sessionStorage.getItem(trackedClickKey)) {
                    sessionStorage.setItem(trackedClickKey, 'true');
                    const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
                    fetch(`${apiEndpoint}/events/${params.id}/click`, { method: 'POST' }).catch(() => {});
                  }
                  setShowWizard(true); 
                }
              }}
              disabled={!selectedTicket}
              className="w-full mt-6 bg-neon-green text-black font-black uppercase tracking-widest py-4 rounded-xl hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {selectedTicket ? `Comprar — ${selectedTicket.name}` : 'Selecciona una entrada'}
            </button>
          </div>
        </div>
      </div>

      {/* Floating CTA for mobile */}
      <div className="fixed bottom-6 w-full flex justify-center z-40 lg:hidden pointer-events-none px-4">
        <button
          onClick={() => document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="pointer-events-auto relative overflow-hidden group bg-[#050505]/80 backdrop-blur-md border border-purple-900/50 hover:border-purple-500/80 shadow-[0_0_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] px-8 py-3.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-900/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out blur-md" />
          <span className="relative flex w-2 h-2">
            <span className="absolute animate-ping w-3 h-3 rounded-full bg-purple-600 opacity-60" />
            <span className="relative w-2 h-2 rounded-full bg-purple-400" />
          </span>
          <span className="relative text-zinc-300 font-black uppercase tracking-[0.2em] text-[11px] group-hover:text-white transition-colors">
            Obtener Entrada
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="relative text-purple-800 group-hover:text-purple-400 transition-colors group-hover:translate-x-1">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <CheckoutWizard
        isOpen={showWizard}
        onClose={() => { setShowWizard(false); setWizardError(''); }}
        ticketType={selectedTicket}
        onLaunchWompi={handleLaunchWompi}
        isLoading={wizardLoading}
        error={wizardError}
      />
      
      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setShowQrModal(false)}>
          <div className="bg-[#050505] border border-neon-purple/50 p-8 rounded-3xl max-w-xs w-full animate-in fade-in zoom-in-95 shadow-[0_0_50px_rgba(191,0,255,0.2)] flex flex-col items-center relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowQrModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green mb-6 text-center">
              Escanear Evento
            </h3>
            <div className="bg-white p-4 rounded-2xl shadow-[0_0_30px_rgba(57,255,20,0.3)] border-4 border-neon-green/20">
              <QRCodeSVG 
                value={pageUrl} 
                size={200}
                bgColor="#ffffff"
                fgColor="#000000"
                level="H"
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-6 text-center">
              Comparte este código para llevar a otros directamente a la página del evento.
            </p>
          </div>
        </div>
      )}
      


      <WhatsAppButton className="bottom-[90px] lg:bottom-6 right-4 lg:right-6" />
    </div>
  );
}
