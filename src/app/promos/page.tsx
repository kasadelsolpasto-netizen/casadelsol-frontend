"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

export default function PromosPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrPages, setQrPages] = useState<Record<string, number>>({});
  const [selectedQr, setSelectedQr] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('kasa_user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    
    const user = JSON.parse(userStr);
    
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    if (!token) {
      router.push('/login');
      return;
    }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${user.id}/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching profile:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-neon-purple animate-spin mb-4" />
        <p className="text-zinc-500 font-black uppercase tracking-widest animate-pulse text-sm">Cargando Promociones...</p>
      </div>
    );
  }

  const promoOrders = profile?.orders?.filter((o: any) => o?.qr_codes?.length > 0 && o?.payment_ref === 'COURTESY') || [];

  return (
    <div className="min-h-screen bg-[#050505] pt-32 pb-24 px-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-neon-purple/5 to-transparent pointer-events-none"></div>
      <div className="fixed -top-40 -right-40 w-96 h-96 bg-neon-purple/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <header className="mb-12 text-center">
           <div className="inline-flex items-center gap-2 bg-neon-purple/10 border border-neon-purple/30 text-neon-purple px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <Zap className="w-4 h-4" /> Beneficios Exclusivos
           </div>
           <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter text-white mb-4">Mis Promos</h1>
           <p className="text-zinc-500 font-bold max-w-lg mx-auto">
             Aquí encontrarás todas tus entradas de cortesía y promociones especiales otorgadas por Kasa del Sol.
           </p>
        </header>

        <section className="space-y-6">
           {promoOrders.length > 0 ? (
              promoOrders.map((order: any) => (
                 <div key={order?.id} className="p-8 bg-zinc-950 border border-neon-purple/30 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.05)]">
                    <div className="absolute top-0 left-0 w-full h-full bg-neon-purple/5 opacity-50 pointer-events-none"></div>
                    <div className="text-center md:text-left relative z-10 w-full md:w-1/2">
                       <div className="inline-flex items-center gap-1.5 bg-neon-purple text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                         <Zap className="w-3 h-3" /> Cortesía Oficial
                       </div>
                       <h3 className="text-white font-black uppercase text-2xl md:text-3xl leading-none mb-2">{order?.order_items?.[0]?.ticket_type?.event?.title || 'Evento Kasa'}</h3>
                       <p className="text-neon-purple font-black text-sm tracking-widest uppercase mb-4">{order?.order_items?.[0]?.ticket_type?.name}</p>
                       <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          <span>{order.qr_codes.length} {order.qr_codes.length === 1 ? 'Entrada' : 'Entradas'}</span>
                          <span>•</span>
                          <span>Transferible</span>
                       </div>
                    </div>
                    
                    <div className="flex flex-col items-center md:items-end gap-6 w-full md:w-auto relative z-10">
                       <div className="flex flex-wrap gap-6 justify-center md:justify-end">
                          {(() => {
                             const currentPage = qrPages[order.id] || 0;
                             const qrsPerPage = 2; // Mostrar 2 QRs a la vez por espacio
                             const totalPages = Math.ceil(order.qr_codes.length / qrsPerPage);
                             const paginatedQrs = order.qr_codes.slice(currentPage * qrsPerPage, (currentPage + 1) * qrsPerPage);
                             
                             return paginatedQrs.map((qr: any) => {
                                const isBurned = !!qr.used_at;
                                return (
                                   <div key={qr?.id} className="flex flex-col items-center gap-3">
                                      <div className="relative group">
                                         <div 
                                            onClick={() => !isBurned && setSelectedQr(qr)} 
                                            className={`relative w-32 h-32 p-3 rounded-3xl transition-all duration-500 shadow-2xl ${
                                               isBurned 
                                               ? 'bg-zinc-900 opacity-50 scale-95 z-0' 
                                               : 'bg-white cursor-pointer ring-4 ring-neon-purple/50 group-hover:ring-neon-purple group-hover:scale-105 z-10'
                                            }`}
                                         >
                                            <div className={isBurned ? "grayscale brightness-50" : ""}>
                                               <QRCodeSVG value={`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/ticket/${qr?.token_hash}`} size={104} />
                                            </div>
                                         </div>
                                         {isBurned && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                                               <div className="bg-red-600 text-xs font-black text-white px-3 py-1.5 rounded uppercase tracking-tighter border-2 border-red-800 rotate-[-12deg] shadow-[0_0_20px_rgba(220,38,38,0.8)]">USADA</div>
                                            </div>
                                         )}
                                      </div>
                                      <p className="text-white text-[11px] font-bold uppercase text-center w-full max-w-[120px] truncate bg-zinc-900/50 px-2 py-1 rounded-lg" title={qr.attendee_name || profile?.name}>
                                         {qr.attendee_name || profile?.name}
                                      </p>
                                   </div>
                                );
                             });
                          })()}
                       </div>
                       
                       {order?.qr_codes?.length > 2 && (
                          <div className="flex items-center gap-4 bg-black/40 rounded-full p-2 border border-zinc-800 shadow-xl mt-2 backdrop-blur-md">
                             <button 
                                onClick={() => setQrPages(p => ({ ...p, [order.id]: Math.max(0, (p[order.id] || 0) - 1) }))}
                                disabled={(qrPages[order.id] || 0) === 0}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-neon-purple hover:border-neon-purple text-zinc-400 hover:text-black transition-all disabled:opacity-20 disabled:hover:bg-zinc-900 disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
                             >
                                <ChevronLeft className="w-6 h-6 ml-[-2px]" />
                             </button>
                             <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest px-2">
                                Pág {(qrPages[order.id] || 0) + 1} / {Math.ceil(order.qr_codes.length / 2)}
                             </span>
                             <button 
                                onClick={() => setQrPages(p => ({ ...p, [order.id]: Math.min(Math.ceil(order.qr_codes.length / 2) - 1, (p[order.id] || 0) + 1) }))}
                                disabled={(qrPages[order.id] || 0) === Math.ceil(order.qr_codes.length / 2) - 1}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900 border border-zinc-800 hover:bg-neon-purple hover:border-neon-purple text-zinc-400 hover:text-black transition-all disabled:opacity-20 disabled:hover:bg-zinc-900 disabled:hover:text-zinc-400 disabled:hover:border-zinc-800"
                             >
                                <ChevronRight className="w-6 h-6 mr-[-2px]" />
                             </button>
                          </div>
                       )}
                    </div>
                 </div>
              ))
           ) : (
              <div className="py-24 px-6 border-2 border-dashed border-zinc-900 rounded-[3rem] text-center bg-zinc-950/50 backdrop-blur-sm">
                 <div className="w-24 h-24 bg-neon-purple/10 rounded-full flex items-center justify-center mx-auto mb-6">
                   <Zap className="w-12 h-12 text-neon-purple/50" />
                 </div>
                 <h2 className="text-2xl font-black uppercase text-white mb-2">No tienes promociones</h2>
                 <p className="text-zinc-500 font-bold max-w-sm mx-auto mb-8">
                    Aún no te han otorgado ninguna entrada de cortesía o beneficio especial.
                 </p>
                 <Link href="/" className="inline-block bg-white text-black font-black uppercase tracking-widest text-xs px-8 py-4 rounded-full hover:bg-zinc-200 transition-colors">
                    Ver Eventos
                 </Link>
              </div>
           )}
        </section>
      </div>

      {/* Modal QR Detail */}
      {selectedQr && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedQr(null)}>
            <div className="bg-zinc-950 p-10 rounded-[3rem] shadow-[0_0_50px_rgba(168,85,247,0.2)] max-w-sm w-full relative border border-neon-purple/30" onClick={e => e.stopPropagation()}>
               <button onClick={() => setSelectedQr(null)} className="absolute top-6 right-6 text-zinc-500 hover:text-white bg-zinc-900 rounded-full p-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
               </button>
               
               <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 text-neon-purple bg-neon-purple/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                     <Zap className="w-3 h-3" /> Cortesía Oficial
                  </div>
                  <h3 className="text-2xl font-black uppercase text-white leading-tight mb-2">Entrada VIP</h3>
                  <p className="text-zinc-400 font-bold text-sm uppercase tracking-widest">{selectedQr.attendee_name || profile?.name}</p>
               </div>

               <div className="bg-white p-6 rounded-3xl w-64 h-64 mx-auto mb-8 relative ring-8 ring-neon-purple/20">
                  <QRCodeSVG 
                     value={`${process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'}/ticket/${selectedQr.token_hash}`} 
                     size={208} 
                     level="H"
                     className="w-full h-full"
                  />
                  {/* Decorative corners */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-neon-purple rounded-tl-lg"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-neon-purple rounded-tr-lg"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-neon-purple rounded-bl-lg"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-neon-purple rounded-br-lg"></div>
               </div>

               <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest text-center">
                  Muestra este código en la entrada
               </p>
            </div>
         </div>
      )}
    </div>
  );
}
