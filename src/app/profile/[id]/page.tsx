"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Ticket, User, Star, CheckCircle, 
  X, Share2, Gift, Zap, 
  TicketPercent, Loader2, ShoppingBag, MessageCircle, DollarSign,
  ChevronLeft, ChevronRight, Upload
} from 'lucide-react';
import { UserAvatar, AVATAR_OPTIONS } from '@/components/UserAvatar';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';

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
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);
  const [showAllPromos, setShowAllPromos] = useState(false);
  const [showAllShop, setShowAllShop] = useState(false);
  const [qrPages, setQrPages] = useState<Record<string, number>>({});
  const [isFirstLoad, setIsFirstLoad] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

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
        sessionStorage.setItem(`kasa_profile_${params.id}`, JSON.stringify(data));
        
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
    const lastVisited = sessionStorage.getItem('vault_last_visited');
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    const isExpired = !lastVisited || (now - parseInt(lastVisited, 10)) > FIVE_MINUTES;

    if (isExpired) {
      setIsFirstLoad(true);
      setLoading(true);
    } else {
      const cachedProfile = sessionStorage.getItem(`kasa_profile_${params.id}`);
      if (cachedProfile) {
        try {
          const data = JSON.parse(cachedProfile);
          setProfile(data);
          setNewName(data.name);
          setLoading(false);
        } catch (e) {}
      }
    }

    sessionStorage.setItem('vault_last_visited', now.toString());
    fetchProfile();
  }, [params.id, router]);

  useEffect(() => {
    if (!profile) return;
    
    // Actualización en tiempo real: cuando el pedido está READY,
    // el GlobalOrderReadyAlert (en layout.tsx) muestra la notificación.
    // Aquí solo refrescamos los datos del perfil para actualizar las tarjetas.
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(API_URL, { query: { userId: params.id } });

    socket.on('user_shop_event', (data: any) => {
      if (data.type === 'ORDER_READY') {
        // Solo actualizamos los datos — la notificación visual la maneja GlobalOrderReadyAlert
        fetchProfile();
      }
    });

  const normalOrders = profile?.orders?.filter((o: any) => o?.qr_codes?.length > 0 && o?.payment_ref !== 'COURTESY') || [];
  const promoOrders = profile?.orders?.filter((o: any) => o?.qr_codes?.length > 0 && o?.payment_ref === 'COURTESY') || [];

    return () => { socket.disconnect(); };
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

  const handleUpdateAvatar = async (avatarId: string) => {
    setUpdatingAvatar(true);
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${params.id}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar: avatarId })
      });
      if (res.ok) {
        setProfile({ ...profile, avatar: avatarId });
        setShowAvatarModal(false);
        // Also update local storage so Navbar updates!
        const lsUser = localStorage.getItem('kasa_user');
        if (lsUser) {
           const parsed = JSON.parse(lsUser);
           parsed.avatar = avatarId;
           localStorage.setItem('kasa_user', JSON.stringify(parsed));
           window.dispatchEvent(new Event('storage'));
        }
        // Update profile cache
        const pc = sessionStorage.getItem(`kasa_profile_${params.id}`);
        if (pc) {
           const pParsed = JSON.parse(pc);
           pParsed.avatar = avatarId;
           sessionStorage.setItem(`kasa_profile_${params.id}`, JSON.stringify(pParsed));
        }
      }
    } catch(e) {}
    setUpdatingAvatar(false);
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

  if (loading) {
    if (isFirstLoad) {
      return (
        <div className="min-h-[calc(100vh-80px)] w-full bg-[#050505] flex flex-col items-center justify-center overflow-hidden relative">
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
       <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-neon-green animate-spin mb-4" />
          <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Cargando Bóveda...</p>
       </div>
    );
  }

  const isStaff = profile?.role === 'STAFF' || profile?.role === 'OWNER';
  const passwordsMatch = newPassword.length >= 8 && newPassword === confirmPassword;

  const normalOrders = profile?.orders?.filter((o: any) => o?.qr_codes?.length > 0 && o?.payment_ref !== 'COURTESY') || [];

  return (
    <div className="min-h-screen pb-20 bg-[#050505] overflow-x-hidden">
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
           <div className="relative group/avatar w-32 h-32">
              <UserAvatar avatarId={profile?.avatar} className="w-full h-full border-2 border-neon-purple p-1" iconClassName="w-16 h-16 text-zinc-600" />
              <button 
                onClick={() => setShowAvatarModal(true)} 
                className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-400 hover:bg-neon-purple hover:text-black hover:border-neon-purple transition-all shadow-lg z-10"
                title="Cambiar Diseño"
              >
                <Upload className="w-4 h-4" />
              </button>
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
              
              {/* SECCIÓN BOLETAS DE EVENTOS */}
              <section>
                 <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3 mb-8">
                    <Ticket className="w-6 h-6 text-neon-green" /> Boletas de Eventos
                 </h2>
                 <div className="space-y-4">
                    {normalOrders.length > 0 ? (
                       <>
                          {(showAllEvents ? normalOrders : normalOrders.slice(0, 3)).map((order: any) => (
                             <div key={order?.id} className="p-6 bg-zinc-950 border border-zinc-900 rounded-3xl flex flex-col md:flex-row justify-between items-center gap-6">
                             <div className="text-center md:text-left">
                                <p className="text-white font-black uppercase text-xl">{order?.order_items?.[0]?.ticket_type?.event?.title || 'Evento Kasa'}</p>
                                <p className="text-neon-green font-bold text-sm tracking-widest uppercase">{order?.order_items?.[0]?.ticket_type?.name}</p>
                             </div>
                             <div className="flex flex-col items-center md:items-end gap-6 w-full md:w-auto">
                                <div className="flex flex-wrap gap-6 justify-center md:justify-end">
                                   {(() => {
                                      const currentPage = qrPages[order.id] || 0;
                                      const qrsPerPage = 4;
                                      const totalPages = Math.ceil(order.qr_codes.length / qrsPerPage);
                                      const paginatedQrs = order.qr_codes.slice(currentPage * qrsPerPage, (currentPage + 1) * qrsPerPage);
                                      
                                      return paginatedQrs.map((qr: any) => {
                                         const isBurned = !!qr.used_at;
                                         return (
                                            <div key={qr?.id} className="flex flex-col items-center gap-2">
                                               {/* QR BOX */}
                                               <div className="relative">
                                                  <div 
                                                     onClick={() => !isBurned && setSelectedQr(qr)} 
                                                     className={`relative w-24 h-24 p-2.5 rounded-2xl transition-all duration-500 shadow-xl ${
                                                        isBurned 
                                                        ? 'bg-zinc-900 opacity-50 scale-95 translate-y-2 z-0' 
                                                        : 'bg-white cursor-pointer hover:neon-border-primary z-10'
                                                     }`}
                                                  >
                                                     {/* Aplicamos grayscale SOLO al código QR si está quemado, no al contenedor entero para no opacar la etiqueta */}
                                                     <div className={isBurned ? "grayscale brightness-50" : ""}>
                                                        <QRCodeSVG value={`${BASE_URL}/ticket/${qr?.token_hash}`} size={75} />
                                                     </div>
                                                  </div>
                                                  
                                                  {/* Etiqueta USADA fuera del contenedor grayscale para que conserve su color rojo vivo */}
                                                  {isBurned && (
                                                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                                        <div className="bg-red-600 text-[10px] font-black text-white px-2 py-1 rounded uppercase tracking-tighter border-2 border-red-800 rotate-[-12deg] shadow-[0_0_15px_rgba(220,38,38,0.8)]">USADA</div>
                                                     </div>
                                                  )}
                                               </div>

                                               <p className="text-white text-[10px] font-bold uppercase text-center w-full max-w-[96px] truncate" title={qr.attendee_name || profile?.name}>
                                                  {qr.attendee_name || profile?.name}
                                               </p>

                                               {/* Botones de Compartir */}
                                               {!isBurned && (
                                                  <div className="flex gap-2 mt-1">
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
                                      });
                                   })()}
                                </div>

                                {/* Controles de Paginación */}
                                {order?.qr_codes?.length > 4 && (
                                   <div className="flex items-center gap-3 bg-zinc-900/40 rounded-full p-1.5 border border-zinc-800 shadow-xl mt-2">
                                      <button 
                                         onClick={() => setQrPages(p => ({ ...p, [order.id]: Math.max(0, (p[order.id] || 0) - 1) }))}
                                         disabled={(qrPages[order.id] || 0) === 0}
                                         className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 hover:bg-neon-purple text-zinc-400 hover:text-white transition-all disabled:opacity-20 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400"
                                      >
                                         <ChevronLeft className="w-5 h-5 ml-[-2px]" />
                                      </button>
                                      <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest px-1">
                                         Pág {(qrPages[order.id] || 0) + 1} / {Math.ceil(order.qr_codes.length / 4)}
                                      </span>
                                      <button 
                                         onClick={() => setQrPages(p => ({ ...p, [order.id]: Math.min(Math.ceil(order.qr_codes.length / 4) - 1, (p[order.id] || 0) + 1) }))}
                                         disabled={(qrPages[order.id] || 0) === Math.ceil(order.qr_codes.length / 4) - 1}
                                         className="w-8 h-8 rounded-full flex items-center justify-center bg-zinc-800 border border-zinc-700 hover:bg-neon-purple text-zinc-400 hover:text-white transition-all disabled:opacity-20 disabled:hover:bg-zinc-800 disabled:hover:text-zinc-400"
                                      >
                                         <ChevronRight className="w-5 h-5 mr-[-2px]" />
                                      </button>
                                   </div>
                                )}
                             </div>
                          </div>
                       ))}
                       {normalOrders.length > 3 && (
                          <button 
                             onClick={() => setShowAllEvents(!showAllEvents)}
                             className="w-full py-4 bg-zinc-900 border border-zinc-800 hover:bg-neon-green hover:text-black hover:border-neon-green text-zinc-400 font-black uppercase tracking-widest rounded-2xl transition-all"
                          >
                             {showAllEvents ? 'Ver menos' : `Ver todos los eventos (${normalOrders.length})`}
                          </button>
                       )}
                       </>
                    ) : (
                       <div className="p-12 border-2 border-dashed border-zinc-900 rounded-[3rem] text-center">
                          <Ticket className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                          <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Aún no tienes boletas</p>
                       </div>
                    )}
                 </div>
              </section>

              {/* SECCIÓN SHOP */}
              <section>
                 <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3 mb-8">
                    <ShoppingBag className="w-6 h-6 text-orange-500" /> Pedidos de Tienda
                 </h2>
                 {profile?.shop_orders?.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {(showAllShop ? profile?.shop_orders : profile?.shop_orders?.slice(0, 3)).map((order: any) => {
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
                                      <div className="w-24 h-24 rounded-3xl bg-zinc-900 flex flex-col items-center justify-center border-2 border-zinc-800 shrink-0">
                                         <CheckCircle className="w-8 h-8 text-zinc-700 mb-1" />
                                         <span className="text-[7px] font-black text-zinc-700 uppercase">Entregado</span>
                                      </div>
                                   ) : isPaid ? (
                                      <div onClick={() => setSelectedShopQr(order)} className={`w-24 h-24 p-3 bg-white rounded-3xl cursor-pointer hover:scale-105 transition-all shrink-0 ${isReady ? 'ring-4 ring-neon-green' : ''}`}>
                                         <QRCodeSVG value={`KASA_SHOP_DELIVER:${order?.id}:${order?.verification_token || 'legacy'}`} size={72} />
                                      </div>
                                   ) : (
                                      <div className="w-24 h-24 rounded-3xl bg-orange-500/10 flex flex-col items-center justify-center border-2 border-orange-500/20 shrink-0">
                                         <DollarSign className="w-8 h-8 text-orange-500 mb-1" />
                                         <span className="text-[7px] font-black text-orange-500 uppercase">Por Pagar</span>
                                      </div>
                                   )}
                                   <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-zinc-400 mb-1 truncate">
                                         {isReady ? '¡TU PEDIDO ESTÁ LISTO!' : order?.status === 'PENDING' ? 'Paga en la barra' : 'Preparando...'}
                                      </p>
                                      <p className="text-2xl font-black text-white truncate">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(order?.total || 0)}</p>
                                   </div>
                                </div>
                             </div>
                          );
                       })}
                       {profile?.shop_orders?.length > 3 && (
                          <div className="md:col-span-2">
                             <button 
                                onClick={() => setShowAllShop(!showAllShop)}
                                className="w-full py-4 bg-zinc-900 border border-zinc-800 hover:bg-orange-500 hover:text-white hover:border-orange-500 text-zinc-400 font-black uppercase tracking-widest rounded-2xl transition-all"
                             >
                                {showAllShop ? 'Ver menos' : `Ver todos los pedidos (${profile?.shop_orders?.length})`}
                             </button>
                          </div>
                       )}
                    </div>
                 ) : (
                    <div className="p-12 border-2 border-dashed border-zinc-900 rounded-[3rem] text-center">
                       <ShoppingBag className="w-10 h-10 text-zinc-800 mx-auto mb-4" />
                       <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Aún no hay pedidos en la barra</p>
                    </div>
                 )}
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
      {/* Modal de Selección de Avatar */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full relative shadow-2xl">
            <button 
              onClick={() => setShowAvatarModal(false)}
              className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <h2 className="text-2xl font-black uppercase text-white mb-2">Diseño de Identidad</h2>
            <p className="text-sm text-zinc-500 mb-8">Elige una silueta que represente tu estilo en la pista.</p>
            
            <div className="grid grid-cols-5 gap-4">
              {AVATAR_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = profile?.avatar === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleUpdateAvatar(opt.id)}
                    disabled={updatingAvatar}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all ${
                      isSelected 
                      ? 'bg-neon-purple/20 border-neon-purple text-neon-purple shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-600'
                    }`}
                    title={opt.label}
                  >
                    <Icon className="w-8 h-8" />
                  </button>
                );
              })}
            </div>
            {updatingAvatar && (
              <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
