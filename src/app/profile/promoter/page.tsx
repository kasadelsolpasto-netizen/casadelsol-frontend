"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, DollarSign, CheckCircle2, AlertTriangle, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function PromoterDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerDni, setBuyerDni] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const getToken = () => {
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    return tokenRow ? tokenRow.split('=')[1] : null;
  };

  useEffect(() => {
    const loadData = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Fetch User Profile
        const lsUser = localStorage.getItem('kasa_user');
        const userId = lsUser ? JSON.parse(lsUser).id : null;
        if (!userId) {
          router.push('/login');
          return;
        }

        const resProfile = await fetch(`${API_URL}/users/${userId}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!resProfile.ok) throw new Error('Error cargando perfil');
        const profileData = await resProfile.json();
        
        if (!profileData.promoter_codes || profileData.promoter_codes.length === 0) {
          router.push('/profile/' + userId); // No es promotor
          return;
        }
        
        setProfile(profileData);

        // Fetch Events
        const resEvents = await fetch(`${API_URL}/events`);
        if (resEvents.ok) {
          setEvents(await resEvents.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const tickets = selectedEvent?.ticket_types?.filter((t: any) => t.price > 0 && t.available > 0) || [];
  const selectedTicket = tickets.find((t: any) => t.id === selectedTicketId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedTicket || quantity < 1) {
      setErrorMsg('Selecciona un evento y boleto válido.');
      return;
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const attendees = Array(quantity).fill({
        ticket_type_id: selectedTicket.id,
        attendee_name: buyerName,
        attendee_email: buyerEmail,
        attendee_dni: buyerDni
      });

      const res = await fetch(`${API_URL}/orders/promoter-cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          buyerName,
          buyerEmail,
          buyerDni,
          attendees,
          promoterCode: profile.promoter_codes[0].code
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar la venta.');
      }

      setSuccessMsg(`Venta exitosa. QR(s) enviados a ${buyerEmail}`);
      
      // Reset form
      setSelectedEventId('');
      setSelectedTicketId('');
      setQuantity(1);
      setBuyerName('');
      setBuyerEmail('');
      setBuyerDni('');

      // Refresh profile to update stats
      const resProfile = await fetch(`${API_URL}/users/${profile.id}/profile`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resProfile.ok) {
        setProfile(await resProfile.json());
      }
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
       <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-neon-green animate-spin mb-4" />
          <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Cargando Panel...</p>
       </div>
    );
  }

  const myCode = profile?.promoter_codes?.[0];
  const finalPrice = selectedTicket ? selectedTicket.price * (1 - myCode.discount_perc / 100) * quantity : 0;

  return (
    <div className="min-h-screen pb-20 bg-[#050505]">
      <main className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-12 border-b border-zinc-900 pb-8">
          <Link href={`/profile/${profile?.id}`} className="inline-flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors mb-6">
            <ChevronLeft className="w-4 h-4" /> Volver a mi Bóveda
          </Link>
          <br/>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-[10px] font-black uppercase tracking-widest mb-4">
            <DollarSign className="w-3 h-3" /> Promotor Autorizado
          </div>
          <h1 className="text-4xl font-black uppercase text-white mb-2">Panel de Ventas</h1>
          <p className="text-zinc-500 font-bold">Genera ventas en efectivo. El sistema registrará tu deuda.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Stats Card */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/10 blur-[50px] pointer-events-none" />
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4">Tu Código</h3>
              <p className="text-2xl font-mono text-neon-green font-bold bg-zinc-900 p-3 rounded-xl text-center border border-zinc-800">
                {myCode?.code}
              </p>
              <div className="mt-6 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total Ventas</p>
                  <p className="text-3xl font-black text-white">{myCode?.uses_count}</p>
                </div>
                {myCode?.discount_perc > 0 && (
                  <div className="text-right">
                     <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Descuento</p>
                     <p className="text-lg font-black text-neon-purple">{myCode?.discount_perc}% OFF</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Formulario */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-black uppercase text-white flex items-center gap-3 mb-8">
                <Ticket className="w-6 h-6 text-neon-green" /> Nueva Venta en Efectivo
              </h2>

              {successMsg && (
                <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  <p className="text-sm font-bold text-green-400">{successMsg}</p>
                </div>
              )}

              {errorMsg && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-sm font-bold text-red-400">{errorMsg}</p>
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Evento</label>
                  <select 
                    required
                    value={selectedEventId}
                    onChange={(e) => { setSelectedEventId(e.target.value); setSelectedTicketId(''); }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                  >
                    <option value="">Selecciona un evento</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title} - {new Date(ev.date).toLocaleDateString('es-CO')}</option>
                    ))}
                  </select>
                </div>

                {selectedEvent && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Tipo de Boleto</label>
                      <select 
                        required
                        value={selectedTicketId}
                        onChange={(e) => setSelectedTicketId(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                      >
                        <option value="">Selecciona boleto</option>
                        {tickets.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.name} - ${t.price} ({t.available} disp.)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Cantidad</label>
                      <input 
                        type="number" min="1" max="10" required
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-zinc-900">
                  <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Datos del Cliente</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Nombre Completo</label>
                      <input 
                        required type="text" placeholder="Ej: Juan Pérez"
                        value={buyerName} onChange={e => setBuyerName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Correo Electrónico (Para enviar QR y crear Bóveda)</label>
                      <input 
                        required type="email" placeholder="ejemplo@correo.com"
                        value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Cédula / Documento (Opcional)</label>
                      <input 
                        type="text" placeholder="Número de documento"
                        value={buyerDni} onChange={e => setBuyerDni(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                      />
                    </div>
                  </div>
                </div>

                {selectedTicket && (
                  <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-xl p-4 flex justify-between items-center">
                    <span className="text-[10px] font-black text-neon-purple uppercase tracking-widest">Total a Cobrar en Efectivo</span>
                    <span className="text-2xl font-black text-white">
                      {Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(finalPrice)}
                    </span>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full py-4 bg-neon-green hover:bg-neon-green/90 text-black text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(57,255,20,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generar Venta y QRs'}
                </button>
                <p className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-4">
                  Al hacer clic confirmas que recibiste el efectivo.
                </p>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
