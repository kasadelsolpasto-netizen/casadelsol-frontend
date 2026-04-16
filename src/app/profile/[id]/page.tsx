"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Ticket, QrCode, User, Star, MapPin, Calendar, CheckCircle, 
  X, Lock, Share2, DoorOpen, ShieldCheck, Gift, Zap, 
  TicketPercent, Loader2, ShoppingBag, MessageCircle, DollarSign
} from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { InstallAppButton } from '@/components/InstallAppButton';
import { io, Socket } from 'socket.io-client';

const BENEFIT_ICONS: Record<string, any> = {
  DISCOUNT: TicketPercent,
  GIFT: Gift,
  ACCESS: Zap
};

export default function ProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [benefits, setBenefits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState<any>(null);
  const [selectedShopQr, setSelectedShopQr] = useState<any>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  
  // -- REAL-TIME ALERTS (FASE 3) --
  const [userAlert, setUserAlert] = useState<any>(null);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');

  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://casadelsol.app';

  const fetchProfile = async () => {
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${params.id}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setNewName(data.name);
        
        // Fetch Benefits
        try {
          const bRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/promotions/my-benefits`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (bRes.ok) {
            setBenefits(await bRes.json());
          }
        } catch(e) {}
      } else {
        router.push('/login');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [params.id, router]);

  useEffect(() => {
    if (!profile) return;
    
    // Conexión en tiempo real (FASE 3)
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socketRef.current = io(API_URL, { query: { userId: params.id } });

    socketRef.current.on('user_shop_event', (data: any) => {
      if (data.type === 'ORDER_READY') {
        setUserAlert(data);
        // Sonido y Vibración
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
        // Actualizar datos automáticamente
        fetchProfile();
        // Quitar alerta tras 10s
        setTimeout(() => { setUserAlert(null); }, 10000);
      }
    });

    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
    audioRef.current.volume = 1.0;

    return () => { socketRef.current?.disconnect(); };
  }, [profile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('Guardando...');
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${params.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) setProfileMsg('¡Actualizado!');
    } catch (err) {}
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setPassMsg('No coinciden.');
    setPassMsg('Actualizando...');
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${params.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) setPassMsg('¡Contraseña cambiada!');
    } catch (err) {}
  };

  const handleShare = async (e: React.MouseEvent, qrToken: string, eventTitle: string) => {
    e.stopPropagation();
    const url = `${BASE_URL}/ticket/${qrToken}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entrada: ${eventTitle}`,
          text: `¡Aquí tienes mi entrada para ${eventTitle}!`,
          url: url
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(url);
      setProfileMsg('¡Link copiado!');
      setTimeout(() => setProfileMsg(''), 2000);
    }
  };

  const shareWhatsApp = (e: React.MouseEvent, qrToken: string, eventTitle: string, attendeeName: string) => {
    e.stopPropagation();
    const url = `${BASE_URL}/ticket/${qrToken}`;
    const text = encodeURIComponent(
      `🎶 *Entrada Kasa del Sol*\n\n*${eventTitle}*\nAsistente: ${attendeeName}\n\nPresenta este link en la puerta:\n${url}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) return (
     <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-green animate-spin" />
     </div>
  );

  const isStaff = profile?.role === 'STAFF' || profile?.role === 'OWNER';
  const passwordsMatch = newPassword.length >= 8 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen pb-20 bg-[#050505] overflow-x-hidden">
      {/* ── ALERTA DESESPERADA ─────────────────────────── */}
      {profile?.shop_orders?.some((o: any) => o?.status === 'READY') && !isAlertDismissed && (
        <div className="fixed inset-x-0 bottom-32 z-[250] flex flex-col items-center pointer-events-none px-6">
           <div className="bg-red-600 text-white p-8 rounded-[3rem] shadow-[0_30px_90px_rgba(220,38,38,0.8)] border-[6px] border-white animate-[shake_0.5s_infinite] flex flex-col items-center gap-4 pointer-events-auto max-w-sm w-full cursor-pointer hover:scale-110 transition-transform relative">
              <button 
                onClick={(e) => { e.stopPropagation(); setIsAlertDismissed(true); }}
                className="absolute -top-4 -right-4 w-10 h-10 bg-black text-white rounded-full border-4 border-white flex items-center justify-center hover:bg-zinc-900 transition-colors z-10 pointer-events-auto"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-4" onClick={() => router.push(`/profile/${params.id}`)}>
                 <Zap className="w-10 h-10 animate-ping" />
                 <h2 className="text-3xl font-black uppercase italic leading-none text-shadow-lg">¡¡YAAAAAAAA!!</h2>
                 <Zap className="w-10 h-10 animate-ping" />
              </div>
              <p className="font-black uppercase text-sm tracking-tighter text-center leading-tight">
                 ¡TU PEDIDO ESTÁ LISTO!<br />
                 <span className="text-2xl">¡CORRE A LA BARRA AHORA MISMO!</span><br />
                 💨💨💨💨💨💨💨
              </p>
           </div>
        </div>
      )}

      {/* ── NOTIFICACIÓN FASE 3 ───────────────────────── */}
      {userAlert && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-6 animate-in slide-in-from-top-10 duration-500">
           <div className="bg-neon-green p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(57,255,20,0.4)] flex items-center gap-4 border-4 border-black">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-neon-green">
                 <Zap className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1 text-black">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">¡Aviso de Bar!</p>
                 <p className="font-black uppercase text-sm leading-tight">{userAlert?.message}</p>
              </div>
              <button onClick={() => setUserAlert(null)} className="text-black/40 hover:text-black">
                 <X className="w-5 h-5" />
              </button>
           </div>
        </div>
      )}

      {/* STAFF NAV */}
      {isStaff && (
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-900">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neon-green">Staff Activo</span>
            </div>
            <Link href="/scanner" className="bg-neon-green/10 text-neon-green border border-neon-green/30 text-[9px] font-black uppercase px-3 py-1.5 rounded-lg">Scanner QR</Link>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row items-center gap-8 mb-16 pb-12 border-b border-zinc-900">
           <div className="w-32 h-32 rounded-full bg-zinc-900 border-2 border-neon-purple p-1">
              <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                 <User className="w-12 h-12 text-zinc-800" />
              </div>
           </div>
           <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-black uppercase text-white mb-2">{profile?.name}</h1>
              <p className="text-zinc-500 font-bold">{profile?.email}</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-[10px] font-black uppercase tracking-widest">
                 <Star className="w-3 h-3" /> Raver VIP
              </div>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           <div className="lg:col-span-2 space-y-16">
              
              {/* SECCIÓN SHOP */}
              <section>
                 <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3 mb-8">
                    <ShoppingBag className="w-6 h-6 text-orange-500" /> Pedidos de Tienda
                 </h2>
                 {profile?.shop_orders?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {profile?.shop_orders?.map((order: any) => {
                          const isReady = order?.status === 'READY';
                          const isPaid = ['PAID', 'READY', 'DELIVERED'].includes(order?.status);
                          return (
                            <div key={order?.id} className={`p-8 rounded-[2.5rem] border-2 transition-all ${isReady ? 'bg-neon-green/10 border-neon-green shadow-neon-green/20' : 'bg-zinc-950 border-zinc-900'}`}>
                               <div className="flex justify-between items-start mb-6">
                                  <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">ORDEN #{order?.id?.slice(0,6)}</span>
                                   <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${isReady ? 'bg-neon-green text-black border-neon-green' : 'text-zinc-500 border-zinc-800'}`}>
                                      {order?.status}
                                   </span>
                                </div>
                                <div className="flex items-center gap-6">
                                   {order?.status === 'DELIVERED' ? (
                                      <div className="w-24 h-24 rounded-3xl bg-zinc-900 flex flex-col items-center justify-center border-2 border-zinc-800">
                                         <CheckCircle className="w-8 h-8 text-zinc-700 mb-1" />
                                         <span className="text-[7px] font-black text-zinc-700 uppercase">Entregado</span>
                                      </div>
                                   ) : isPaid ? (
                                      <div onClick={() => setSelectedShopQr(order)} className={`w-24 h-24 p-3 bg-white rounded-3xl cursor-pointer hover:scale-105 transition-all ${isReady ? 'ring-4 ring-neon-green' : ''}`}>
                                         <QRCodeSVG value={`KASA_SHOP_DELIVER:${order?.id}:${order?.verification_token || 'legacy'}`} size={72} />
                                      </div>
                                   ) : (
                                      <div className="w-24 h-24 rounded-3xl bg-orange-500/10 flex flex-col items-center justify-center border-2 border-orange-500/20">
                                         <DollarSign className="w-8 h-8 text-orange-500 mb-1" />
                                         <span className="text-[7px] font-black text-orange-500 uppercase">Por Pagar</span>
                                      </div>
                                   )}
                                   <div className="flex-1">
                                      <p className="text-xs font-bold text-zinc-400 mb-1">
                                         {isReady ? '¡TU PEDIDO ESTÁ LISTO!' : order?.status === 'PENDING' ? 'Paga en la barra' : 'Preparando...'}
                                      </p>
                                      <p className="text-2xl font-black text-white">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(order?.total || 0)}</p>
                                   </div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 ) : (
                    <div className="p-12 border-2 border-dashed border-zinc-900 rounded-[3rem] text-center">
                       <ShoppingBag className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                       <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Aún no hay pedidos en la barra</p>
                    </div>
                 )}
              </section>

              {/* SECCIÓN BOLETAS DE EVENTOS */}
              <section>
                 <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3 mb-8">
                    <Ticket className="w-6 h-6 text-neon-green" /> Boletas de Eventos
                 </h2>
                 <div className="space-y-4">
                    {profile?.orders?.map((order: any) => (
                       <div key={order?.id} className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6">
                          <div>
                             <p className="text-white font-black uppercase text-xl">{order?.order_items?.[0]?.ticket_type?.event?.title || 'Evento Kasa'}</p>
                             <p className="text-neon-green font-bold text-sm tracking-widest uppercase">{order?.order_items?.[0]?.ticket_type?.name}</p>
                          </div>
                          <div className="flex flex-wrap gap-6 justify-center">
                             {order?.qr_codes?.map((qr: any) => {
                                const isBurned = !!qr.used_at;
                                return (
                                   <div key={qr?.id} className="flex flex-col items-center gap-3">
                                      {/* QR BOX con Efecto Quemado/Atrás */}
                                      <div 
                                         onClick={() => !isBurned && setSelectedQr(qr)} 
                                         className={`relative w-24 h-24 p-2.5 rounded-2xl transition-all duration-500 shadow-xl ${
                                            isBurned 
                                            ? 'bg-zinc-900 opacity-20 grayscale brightness-50 scale-90 translate-y-3 z-0' 
                                            : 'bg-white cursor-pointer hover:neon-border-primary z-10'
                                         }`}
                                      >
                                         <QRCodeSVG value={`${BASE_URL}/ticket/${qr?.token_hash}`} size={75} />
                                         {isBurned && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                               <div className="bg-red-600/90 text-[7px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter border border-white/20 rotate-[-12deg]">USADA</div>
                                            </div>
                                         )}
                                      </div>

                                      {/* Botones de Compartir (Siempe Visibles debajo) */}
                                      {!isBurned && (
                                         <div className="flex gap-2">
                                            <button 
                                               onClick={(e) => handleShare(e, qr.token_hash, order?.order_items?.[0]?.ticket_type?.event?.title)}
                                               className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-neon-purple transition-all shadow-lg active:scale-90"
                                               title="Compartir"
                                            >
                                               <Share2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                               onClick={(e) => shareWhatsApp(e, qr.token_hash, order?.order_items?.[0]?.ticket_type?.event?.title, qr.attendee_name || profile?.name)}
                                               className="w-8 h-8 bg-[#25D366]/10 border border-[#25D366]/20 rounded-xl flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-lg active:scale-90"
                                               title="Compartir por WhatsApp"
                                            >
                                               <MessageCircle className="w-4 h-4" />
                                            </button>
                                         </div>
                                      )}
                                   </div>
                                );
                             })}
                          </div>
                       </div>
                    ))}
                 </div>
              </section>
           </div>
           
           <div className="space-y-12">
              <section className="p-8 bg-zinc-950 border border-zinc-900 rounded-[2.5rem] sticky top-32">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-8">Bóveda de Seguridad</h3>
                 <form onSubmit={handleProfileUpdate} className="space-y-6 mb-12">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Nombre del Raver</label>
                       <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none" />
                    </div>
                    <button type="submit" className="w-full py-3 bg-zinc-900 hover:bg-neon-purple text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all">Guardar Identidad</button>
                    {profileMsg && <p className="text-center text-[9px] text-neon-purple font-black uppercase mt-2">{profileMsg}</p>}
                 </form>

                 <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest text-shadow-sm">Nueva Llave Secreta</label>
                       <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Confirmar Llave</label>
                       <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none" />
                    </div>
                    <button type="submit" disabled={!passwordsMatch && newPassword.length > 0} className="w-full py-3 bg-zinc-900 hover:bg-white hover:text-black text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-20">Asegurar Bóveda</button>
                    {passMsg && <p className="text-center text-[9px] text-neon-green font-black uppercase mt-2">{passMsg}</p>}
                 </form>
              </section>
           </div>
        </div>
      </main>

      {/* MODAL QR EVENTS */}
      {selectedQr && (
         <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col items-center justify-center p-6" onClick={() => setSelectedQr(null)}>
            <div className="bg-white p-6 rounded-[2.5rem] mb-12 shadow-[0_0_100px_rgba(57,255,20,0.3)]">
               <QRCodeSVG value={`${BASE_URL}/ticket/${selectedQr?.token_hash}`} size={280} level="H" />
            </div>
            <p className="text-neon-green font-black uppercase tracking-widest text-2xl mb-2">{selectedQr?.attendee_name || profile?.name}</p>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">C.C. {selectedQr?.attendee_dni || 'REGISTRADO'}</p>
         </div>
      )}

      {/* MODAL QR SHOP */}
      {selectedShopQr && (
         <div className="fixed inset-0 z-[150] bg-black/98 flex flex-col items-center justify-center p-6" onClick={() => setSelectedShopQr(null)}>
            <div className="bg-white p-8 rounded-[3.5rem] mb-12 shadow-[0_0_100px_rgba(57,255,20,0.4)]">
               <QRCodeSVG 
                  value={`KASA_SHOP_DELIVER:${selectedShopQr?.id}:${selectedShopQr?.verification_token || 'legacy'}`} 
                  size={250} 
                  level="H" 
               />
            </div>
            <h3 className="text-neon-green font-black uppercase text-3xl mb-4">QR DE ENTREGA</h3>
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] text-center max-w-xs leading-relaxed">
               Muéstralo en la barra para quemar tu pedido y recibir tus productos.
            </p>
         </div>
      )}

      <style jsx global>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
