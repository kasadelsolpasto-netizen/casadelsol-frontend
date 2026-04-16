"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, MapPin, Loader2, ArrowRight, ShoppingBag, 
  TrendingUp, Clock, CreditCard, Users, DollarSign, X, CheckCircle 
} from 'lucide-react';

export default function AdminSalesPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'shop'>('events');
  const [events, setEvents] = useState<any[]>([]);
  const [shopMetrics, setShopMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      if (activeTab === 'events') {
        const res = await fetch(`${API}/events/admin/all`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) setEvents(await res.json());
      } else {
        const res = await fetch(`${API}/shop/orders/admin/metrics`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) setShopMetrics(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const markAsReady = async (orderId: string) => {
    try {
        const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
        const authToken = tokenRow ? tokenRow.split('=')[1] : null;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/shop/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${authToken}` 
            },
            body: JSON.stringify({ status: 'READY' })
        });
        if (res.ok) {
            setSelectedOrder(null);
            fetchData();
        }
    } catch(e) { console.error(e); }
  };

  useEffect(() => { fetchData(); }, [activeTab]);

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto pb-32">
      <header className="mb-12 border-b border-zinc-900 pb-10">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
          Ventas & Métricas
        </h1>
        
        {/* TAB NAVIGATION */}
        <div className="flex gap-2 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-900 w-fit">
           <button 
             onClick={() => setActiveTab('events')}
             className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'events' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-600 hover:text-white'}`}
           >
             <Calendar className="w-4 h-4" /> Ventas Eventos
           </button>
           <button 
             onClick={() => setActiveTab('shop')}
             className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'shop' ? 'bg-zinc-900 text-white shadow-xl' : 'text-zinc-600 hover:text-white'}`}
           >
             <ShoppingBag className="w-4 h-4" /> Ventas Tienda
           </button>
        </div>
      </header>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-32 gap-4">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
          <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Sincronizando Bóveda...</span>
        </div>
      ) : activeTab === 'events' ? (
        // ── EVENT SALES VIEW ──────────────────────────────────────────
        events.length === 0 ? (
          <div className="p-20 text-center border-2 border-zinc-900 border-dashed rounded-[3rem] flex flex-col items-center">
            <Calendar className="w-16 h-16 text-zinc-800 mb-4" />
            <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs font-black">No hay eventos para analizar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {events.map(event => (
              <Link href={`/admin/sales/${event.id}`} key={event.id} className="bg-zinc-950 rounded-[2.5rem] overflow-hidden border border-zinc-900 group hover:border-orange-500/50 transition-all flex flex-col cursor-pointer hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                <div className="h-40 relative overflow-hidden bg-zinc-900 border-b border-zinc-900 flex items-center justify-center">
                   {event.flyer_url ? (
                     <img src={event.flyer_url} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-all group-hover:scale-110" />
                   ) : (
                     <Calendar className="w-12 h-12 text-zinc-800" />
                   )}
                </div>
                <div className="p-8 flex-1 flex flex-col">
                   <h3 className="font-black uppercase tracking-tighter text-white text-xl leading-tight mb-4 truncate">{event.title}</h3>
                   <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-black uppercase tracking-widest">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(event.date).toLocaleDateString('es-CO')}
                   </div>
                   <div className="mt-8 pt-6 border-t border-zinc-900 flex items-center justify-between">
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500">
                           <Users className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-white uppercase">{event._count?.orders || 0} ORDENES</span>
                     </div>
                     <ArrowRight className="w-5 h-5 text-zinc-800 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                   </div>
                </div>
              </Link>
            ))}
          </div>
        )
      ) : (
        // ── SHOP SALES VIEW ───────────────────────────────────────────
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
             <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[2.5rem] border-t-4 border-t-orange-500 relative overflow-hidden">
                <TrendingUp className="absolute top-8 right-8 w-10 h-10 text-orange-500/10" />
                <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Ventas Semana Actual</h4>
                <p className="text-3xl font-black text-white">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(shopMetrics?.weeklyRevenue || 0)}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                   <Clock className="w-3 h-3" /> Lun - Dom
                </div>
             </div>
             <div className="bg-zinc-950 border border-zinc-900 p-8 rounded-[2.5rem] border-t-4 border-t-neon-green relative overflow-hidden">
                <TrendingUp className="absolute top-8 right-8 w-10 h-10 text-neon-green/10" />
                <h4 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Ventas Fin de Semana</h4>
                <p className="text-3xl font-black text-white">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(shopMetrics?.weekendRevenue || 0)}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                   <Clock className="w-3 h-3" /> Vie - Dom
                </div>
             </div>
             <div className="bg-zinc-900/30 border border-zinc-900 p-8 rounded-[2.5rem] border-t-4 border-t-zinc-700 relative overflow-hidden">
                <Users className="absolute top-8 right-8 w-10 h-10 text-zinc-700/10" />
                <h4 className="text-[10px] font-black text-zinc-700 uppercase tracking-widest mb-2">Total Transacciones</h4>
                <p className="text-3xl font-black text-zinc-500">{shopMetrics?.recentOrders?.length || 0}</p>
                <div className="mt-4 flex items-center gap-1.5 text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                   Historial Reciente
                </div>
             </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 rounded-[3rem] overflow-hidden">
             <div className="p-8 border-b border-zinc-900 flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white">Historial de Compras Shop</h3>
                <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest tracking-widest">Últimas 100 operaciones</span>
             </div>
             <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-900/50">
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Fecha / Hora</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Cliente</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Pago</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500">Estado</th>
                      <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {shopMetrics?.recentOrders?.map((order: any) => (
                      <tr 
                        key={order.id} 
                        className="hover:bg-zinc-900/50 transition-colors group"
                      >
                        <td 
                          className="px-8 py-6 cursor-pointer"
                          onClick={() => setSelectedOrder(order)}
                        >
                           <p className="text-white text-xs font-black">{new Date(order.created_at).toLocaleDateString('es-CO')}</p>
                           <p className="text-[10px] text-zinc-600 font-bold">{new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                        </td>
                        <td 
                          className="px-8 py-6"
                          onClick={() => setSelectedOrder(order)}
                        >
                           <div className="flex flex-col gap-1">
                              <span className="text-white font-black text-xs uppercase">{order.user?.name || 'Invitado'}</span>
                              <div className="flex gap-1">
                                 {order.user?.tags?.slice(0, 2).map((t: string) => (
                                   <span key={t} className="text-[7px] font-black bg-zinc-900 text-zinc-400 px-1 py-0.5 rounded border border-zinc-800">{t}</span>
                                 ))}
                              </div>
                           </div>
                        </td>
                        <td 
                          className="px-8 py-6"
                          onClick={() => setSelectedOrder(order)}
                        >
                           <div className="flex items-center gap-2">
                              {order.payment_type === 'VIRTUAL' ? <CreditCard className="w-4 h-4 text-neon-purple" /> : <DollarSign className="w-4 h-4 text-orange-500" />}
                              <span className="text-[10px] font-black text-zinc-500 uppercase">{order.payment_type}</span>
                           </div>
                        </td>
                        <td 
                          className="px-8 py-6"
                        >
                           <div className="flex items-center gap-4">
                             <span className={`px-2 py-1 rounded text-[8px] font-black border uppercase tracking-widest ${
                               order.status === 'PAID' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 
                               order.status === 'READY' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 
                               order.status === 'DELIVERED' ? 'bg-zinc-900 text-zinc-600 border-zinc-800' : 
                               'bg-zinc-900 text-zinc-600 border-zinc-800'
                             }`}>
                               {order.status}
                             </span>

                             {order.status === 'PAID' && (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   markAsReady(order.id);
                                 }}
                                 className="px-3 py-1 bg-neon-green text-black font-black uppercase text-[8px] tracking-widest rounded-lg hover:brightness-110 shadow-lg transition-all"
                               >
                                 Listo
                               </button>
                             )}
                           </div>
                        </td>
                        <td 
                          className="px-8 py-6 text-right"
                          onClick={() => setSelectedOrder(order)}
                        >
                           <span className="text-white font-black text-sm group-hover:text-orange-500 transition-colors">
                              {Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(order.total)}
                           </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in zoom-in duration-200">
           <div className="bg-zinc-950 border border-zinc-900 w-full max-w-xl rounded-[3.5rem] p-12 shadow-2xl relative">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="absolute top-8 right-8 p-3 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-all shadow-xl"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="flex items-center gap-4 mb-10">
                 <div className="w-16 h-16 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-orange-500">
                    <ShoppingBag className="w-8 h-8" />
                 </div>
                 <div>
                    <h2 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Detalle de Operación</h2>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Orden #{selectedOrder.id.slice(-6).toUpperCase()}</h3>
                 </div>
              </div>

              <div className="bg-zinc-900/40 border border-zinc-900 rounded-3xl p-8 mb-8 space-y-6">
                 {selectedOrder.items.map((item: any) => (
                   <div key={item.id} className="flex justify-between items-center text-sm font-bold">
                      <div className="flex items-center gap-3">
                         <span className="w-8 h-8 bg-black border border-zinc-800 rounded flex items-center justify-center text-[10px] font-black text-orange-500">{item.quantity}x</span>
                         <span className="text-white uppercase truncate max-w-[200px]">{item.product.name}</span>
                      </div>
                      <span className="text-zinc-500">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(item.unit_price * item.quantity)}</span>
                   </div>
                 ))}
                 <div className="pt-6 border-t border-zinc-800 flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase text-zinc-500 tracking-widest">Total Transacción</span>
                    <span className="text-2xl font-black text-white">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(selectedOrder.total)}</span>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-center">
                 <div className="bg-zinc-900/20 p-5 rounded-2xl border border-zinc-900">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Método de Pago</p>
                    <p className="text-xs font-black text-white uppercase">{selectedOrder.payment_type}</p>
                 </div>
                 <div className="bg-zinc-900/20 p-5 rounded-2xl border border-zinc-900">
                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Referencia</p>
                    <p className="text-[9px] font-bold text-zinc-500 truncate px-2">{selectedOrder.payment_ref || 'N/A'}</p>
                 </div>
              </div>

              <div className="mt-10 pt-8 border-t border-zinc-900 flex items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500">
                       <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                       <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">Comprador Identificado</p>
                       <p className="text-xs font-black text-white uppercase">{selectedOrder.user?.name || 'Invitado'}</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-xl text-[9px] font-black border uppercase tracking-widest ${
                       selectedOrder.status === 'PAID' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 
                       selectedOrder.status === 'READY' ? 'bg-neon-green/10 text-neon-green border-neon-green/30' : 
                       selectedOrder.status === 'DELIVERED' ? 'bg-zinc-900 text-zinc-600 border-zinc-800' :
                       'bg-zinc-900 text-zinc-600 border-zinc-800'
                    }`}>
                       {selectedOrder.status}
                    </span>

                    {selectedOrder.status === 'PAID' && (
                       <button 
                         onClick={() => markAsReady(selectedOrder.id)}
                         className="px-6 py-2 bg-neon-green text-black font-black uppercase text-[10px] tracking-widest rounded-xl hover:brightness-110 shadow-[0_10px_20px_rgba(57,255,20,0.2)] transition-all"
                       >
                         Pedido Listo
                       </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
