"use client";
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';

export default function EventDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [event, setEvent] = useState<any>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${params.id}`)
      .then(res => res.json())
      .then(data => setEvent(data))
      .catch(console.error);
  }, [params.id]);

  if (!event) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070000] flex flex-col items-center justify-center overflow-hidden">
        {/* Ruido Estática Oscura */}
        <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-60 mix-blend-overlay animate-pulse"></div>
        
        {/* Rejilla CRT de Seguridad Roja */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-90" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 1px, rgba(12,0,0,0.9) 2px, rgba(12,0,0,0.9) 4px)' }}></div>
        
        {/* Flash de sangre (Blood ping) para el espanto */}
        <div className="absolute inset-0 z-0 bg-red-900/10 blur-xl animate-[ping_4s_infinite] mix-blend-color-dodge"></div>

        <div className="relative z-20 flex flex-col items-center w-full px-6 overflow-hidden">
            {/* Texto Glitch (Super Responsivo) */}
            <div className="text-xl sm:text-3xl md:text-5xl font-black uppercase tracking-widest sm:tracking-[0.4em] flex flex-col text-center relative w-full items-center justify-center">
              <span className="text-red-900 animate-bounce absolute opacity-80 blur-[2px] translate-x-1 -translate-y-1">INJECTING PAYLOAD</span>
              <span className="text-red-600 absolute -translate-x-[2px] translate-y-[2px] mix-blend-screen opacity-90 animate-ping">INJECTING PAYLOAD</span>
              <span className="text-zinc-400 mix-blend-screen relative z-10">INJECTING PAYLOAD</span>
            </div>

            {/* Barra de Progreso de Virus / Hackeo */}
            <div className="mt-12 w-full max-w-[280px] sm:max-w-sm md:max-w-md border border-red-900/50 p-1 relative bg-black/80">
               <div className="h-1.5 md:h-2 bg-red-600 animate-[pulse_0.3s_infinite] w-3/4 shadow-[0_0_15px_rgba(220,38,38,0.8)] border-r-2 border-white"></div>
            </div>

            <div className="w-full max-w-[280px] sm:max-w-sm md:max-w-md flex justify-between mt-2 px-1">
               <span className="text-[9px] sm:text-[10px] text-red-600 font-bold uppercase tracking-widest animate-pulse font-mono">DNG_RITUAL</span>
               <span className="text-[9px] sm:text-[10px] text-red-600 font-bold uppercase tracking-widest font-mono flex items-center gap-1">
                 <span className="w-2 h-3 bg-red-600 animate-pulse"></span>
               </span>
            </div>

            <p className="mt-8 text-[8px] sm:text-[10px] md:text-[11px] text-red-500/60 font-bold uppercase tracking-[0.2em] sm:tracking-[0.3em] font-mono text-center flex flex-col gap-1 w-full truncate">
              <span>0x000FF1 • EJECUTANDO MALWARE_</span>
              <span className="opacity-50 tracking-widest">BYPASSING MAINFRAME...</span>
            </p>
        </div>
      </div>
    );
  }

  const handleCheckout = async () => {
    if (!selectedTicket) return;
    setError('');
    setLoading(true);

    try {
      const tokenArray = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenArray ? tokenArray.split('=')[1] : null;

      if (!token) {
        throw new Error('Primero debes iniciar sesión para comprar boletas.');
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/orders/checkout-wompi`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ticket_type_id: selectedTicket, quantity: 1 })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Error inicializando pasarela de Wompi.');
      }

      const data = await res.json();
      
      // Invocar Wompi JS Nativo con Firma de Integridad (Anti-fraude)
      const checkout = new (window as any).WidgetCheckout({
        currency: 'COP',
        amountInCents: data.amountInCents,
        reference: data.reference,
        publicKey: data.publicKey,
        signature: { integrity: data.signature }
      });

      checkout.open((result: any) => {
        const transaction = result.transaction;
        if (transaction.status === 'APPROVED') {
           setSuccess('¡Transacción detectada! Redirigiendo a tu bóveda...');
           setTimeout(() => {
              const userPayload = JSON.parse(decodeURIComponent(escape(atob(token.split('.')[1]))));
              router.push(`/profile/${userPayload.id || userPayload.sub}`);
           }, 2000);
        } else {
           setError(`Estado Wompi: ${transaction.status}`);
        }
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <Script src="https://checkout.wompi.co/widget.js" strategy="lazyOnload" />
      {/* Nuevo Header / Hero Split */}
      <div className="relative w-full min-h-[60vh] border-b border-zinc-800 flex items-center justify-center p-6 md:p-12 overflow-hidden">
        {/* Fondo borroso para ambientar */}
        <div className="absolute inset-0 z-0">
          <img src={event.flyer_url} alt="background" className="w-full h-full object-cover blur-3xl opacity-30 transform scale-125" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
        </div>

        <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-10 lg:gap-20">
          {/* Lado Izquierdo: Info (En móvil sale después de la imagen) */}
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

          {/* Lado Derecho: Flyer Adaptativo */}
          <div className="w-full md:w-1/2 order-1 md:order-2 flex justify-center md:justify-end">
            <div className="relative w-full max-w-sm shadow-[0_0_50px_rgba(0,0,0,0.7)] group transform md:rotate-3 hover:rotate-0 transition-transform duration-500 rounded-2xl overflow-hidden border border-zinc-800">
              <img 
                src={event.flyer_url} 
                alt={event.title}
                className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-1000" 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h3 className="text-xl font-bold uppercase tracking-widest text-zinc-300 border-b border-zinc-800 pb-2 mb-4">
              Acerca del Evento
            </h3>
            <p className="text-zinc-400 leading-relaxed text-balance whitespace-pre-line">
              {event.description}
            </p>
          </section>
        </div>

        <div id="tickets-section" className="lg:col-span-1 scroll-mt-24">
          <div className="glass-panel rounded-2xl p-6 sticky top-24">
            <h3 className="text-lg font-bold uppercase tracking-widest text-white mb-6 flex items-center justify-between">
              Boletas
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
            </h3>

            {error && <div className="mb-4 text-xs font-bold text-red-400 uppercase">{error}</div>}
            {success && <div className="mb-4 text-xs font-bold text-neon-green uppercase">{success}</div>}

            <div className="space-y-4">
              {event.ticket_types.map((ticket: any) => {
                const now = new Date();
                const isStarted = !ticket.sale_start || new Date(ticket.sale_start) <= now;
                const isEnded = ticket.sale_end && new Date(ticket.sale_end) <= now;
                const isAvailable = ticket.available > 0;
                const canBuy = isAvailable && isStarted && !isEnded;

                let statusBadge = null;
                if (!isStarted) statusBadge = <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest whitespace-nowrap">PRÓXIMAMENTE</span>;
                else if (isEnded) statusBadge = <span className="bg-red-900/30 text-red-500 border border-red-900 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest whitespace-nowrap">FASE CERRADA</span>;
                else if (!isAvailable) statusBadge = <span className="bg-zinc-800 text-zinc-500 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest whitespace-nowrap">SOLD OUT</span>;

                return (
                  <div 
                    key={ticket.id} 
                    onClick={() => canBuy && setSelectedTicket(ticket.id)}
                    className={`border rounded-xl p-4 flex justify-between items-center transition-all ${
                      canBuy
                        ? 'cursor-pointer group ' + (selectedTicket === ticket.id ? 'border-neon-green bg-neon-green/10 shadow-[0_0_15px_rgba(57,255,20,0.2)]' : 'border-zinc-700 hover:border-zinc-500 bg-black/40')
                        : 'border-zinc-900 bg-zinc-950 opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className={`font-bold uppercase tracking-wider ${canBuy ? (selectedTicket === ticket.id ? 'text-neon-green' : 'text-zinc-200') : 'text-zinc-600 line-through'}`}>
                          {ticket.name}
                        </h4>
                        {statusBadge}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {canBuy ? `Quedan ${ticket.available}` : 'No disponible'}
                      </p>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <span className={`text-xl font-black ${canBuy ? 'text-white' : 'text-zinc-600'}`}>
                        {Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(ticket.price)}
                      </span>
                      {canBuy && (
                        <div className={`w-4 h-4 rounded-full border-2 ${selectedTicket === ticket.id ? 'border-neon-green bg-neon-green' : 'border-zinc-600'}`}></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={handleCheckout}
              disabled={!selectedTicket || loading}
              className="w-full mt-8 bg-neon-green text-black font-bold uppercase tracking-widest py-4 rounded-xl hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Redirigiendo a Pasarela...' : (selectedTicket ? 'Pagar Seguro con Wompi' : 'Selecciona un Ticket')}
            </button>
          </div>
        </div>
      </div>

      {/* Botón Flotante (Ethereal Dark UX) */}
      <div className="fixed bottom-6 w-full flex justify-center z-50 lg:hidden pointer-events-none px-4">
        <button 
          onClick={() => document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' })}
          className="pointer-events-auto relative overflow-hidden group bg-[#050505]/80 backdrop-blur-md border border-purple-900/50 hover:border-purple-500/80 shadow-[0_0_30px_rgba(0,0,0,0.9)] hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] px-8 py-3.5 rounded-full transition-all duration-300 transform hover:-translate-y-1 hover:-rotate-1 active:scale-95 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-500"
        >
           {/* Resplandor fantasma interno */}
           <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-900/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out blur-md"></div>
           
           {/* Ojo/Luz Tenebrosa */}
           <span className="relative flex items-center justify-center w-2 h-2">
             <span className="absolute animate-ping w-3 h-3 rounded-full bg-purple-600 opacity-60"></span>
             <span className="relative w-2 h-2 rounded-full bg-purple-400"></span>
           </span>
           
           <span className="relative text-zinc-300 font-black uppercase tracking-[0.2em] text-[11px] group-hover:text-white transition-colors">
             Obtener Entrada
           </span>

           <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="relative text-purple-800 group-hover:text-purple-400 transition-colors group-hover:translate-x-1">
             <polyline points="9 18 15 12 9 6"></polyline>
           </svg>
        </button>
      </div>

    </div>
  );
}
