"use client";
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import CheckoutWizard from '@/components/CheckoutWizard';

export default function EventDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [selectedTicket, setSelectedTicket] = useState<any>(null); // full ticket object
  const [showWizard, setShowWizard] = useState(false);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${params.id}`)
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

  const handleLaunchWompi = async (attendees: any[], hp: string, recaptchaToken: string) => {
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

      const res = await fetch(`${API}/orders/checkout-wompi`, {
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
        throw new Error(errData?.message || 'Error al inicializar el pago.');
      }

      const data = await res.json();
      // Guardamos el orderId para el fallback post-pago
      const orderId: string = data.reference;

      const checkout = new (window as any).WidgetCheckout({
        currency: 'COP',
        amountInCents: data.amountInCents,
        reference: orderId,
        publicKey: data.publicKey,
        signature: { integrity: data.signature }
      });

      checkout.open(async (result: any) => {
        const tx = result.transaction;
        setShowWizard(false);

        if (tx.status === 'APPROVED') {
          setSuccess('¡Pago aprobado! Registrando tu compra...');

          // ── FALLBACK CRÍTICO ────────────────────────────────────────────────
          // Llamamos al backend para completar la orden y generar los QRs.
          // Esto funciona aunque el webhook de Wompi no haya llegado.
          // Si el webhook llegó primero, el endpoint es idempotente (no duplica).
          try {
            const confirmRes = await fetch(`${API}/orders/confirm-ticket-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                orderId,
                wompiTransactionId: tx.id,
              }),
            });
            if (!confirmRes.ok) {
              console.error('[ticket-confirm] Error en fallback:', await confirmRes.text());
            } else {
              console.log('[ticket-confirm] ✅ Orden confirmada exitosamente.');
            }
          } catch (confirmErr) {
            // No bloqueamos el flujo del usuario si el fallback falla —
            // el webhook aún puede llegar y completar la orden.
            console.error('[ticket-confirm] Excepción en fallback:', confirmErr);
          }
          // ────────────────────────────────────────────────────────────────────

          setTimeout(() => {
            const userPayload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
            router.push(`/profile/${userPayload.id || userPayload.sub}`);
          }, 2000);
        } else {
          setWizardError(`Estado: ${tx.status}. Intenta de nuevo.`);
        }
      });
    } catch (err: any) {
      setWizardError(err.message);
    } finally {
      setWizardLoading(false);
    }
  };


  return (
    <div className="min-h-screen pb-20">
      <Script src="https://checkout.wompi.co/widget.js" strategy="lazyOnload" />

      {/* Hero */}
      <div className="relative w-full min-h-[60vh] border-b border-zinc-800 flex items-center justify-center p-6 md:p-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={event.flyer_url} alt="background" className="w-full h-full object-cover blur-3xl opacity-30 transform scale-125" />
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

          <div className="w-full md:w-1/2 order-1 md:order-2 flex justify-center md:justify-end">
            <div className="relative w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.7)] group transform md:rotate-3 hover:rotate-0 transition-transform duration-500 rounded-2xl overflow-hidden border border-zinc-800">
              <img src={event.flyer_url} alt={event.title} className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-1000" />
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
            <p className="text-zinc-400 leading-relaxed whitespace-pre-line">{event.description}</p>
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

                    <div className="flex justify-between items-center relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold uppercase tracking-wider text-sm ${isSelected ? 'text-neon-green' : canBuy ? 'text-zinc-200' : 'text-zinc-600 line-through'}`}>
                            {ticket.name}
                          </h4>
                          {!isStarted && <span className="bg-zinc-800 text-zinc-400 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest">PRÓXIMAMENTE</span>}
                          {isEnded && <span className="bg-red-900/40 text-red-500 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest border border-red-900">CERRADO</span>}
                          {!isAvailable && isStarted && !isEnded && <span className="bg-zinc-800 text-zinc-500 text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-widest">SOLD OUT</span>}
                          {canBuy && (
                             <span className="bg-neon-green/10 text-neon-green text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-[0.2em] border border-neon-green/20 animate-pulse">DISPONIBLE AHORA</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{canBuy ? `${ticket.available} disponibles` : 'No disponible para compra'}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-black text-lg ${canBuy ? 'text-white' : 'text-zinc-600'}`}>
                          {Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(ticket.price)}
                        </span>
                        {canBuy && (
                          <div className={`w-4 h-4 rounded-full border-2 transition-all shrink-0 ${isSelected ? 'border-neon-green bg-neon-green' : 'border-zinc-600'}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { if (selectedTicket) setShowWizard(true); }}
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
    </div>
  );
}
