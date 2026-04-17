"use client";
import { useEffect, useState } from 'react';
import { 
  ShoppingBag, Check7 as Check, X, Clock, 
  Truck, DollarSign, User, Calendar, 
  Loader2, Search, Filter, AlertCircle,
  CreditCard,
  CheckCircle2,
  Package
} from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

export default function ShopOrdersAdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'PAID' | 'DELIVERED'>('ALL');
  const [search, setSearch] = useState('');
  const [lastOrderCount, setLastOrderCount] = useState(0);

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const playNotification = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/shop/orders/admin/all`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Detectar si hay órdenes nuevas para el sonido
        const pendingCount = data.filter((o:any) => o.status === 'PENDING' || o.status === 'PAID').length;
        if (pendingCount > lastOrderCount && lastOrderCount !== 0) {
          playNotification();
        }
        setLastOrderCount(pendingCount);
        setOrders(data);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { 
    fetchOrders(); 
    // Tiempo Real: Polling cada 10 segundos
    const interval = setInterval(() => fetchOrders(true), 10000);
    return () => clearInterval(interval);
  }, [lastOrderCount]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/shop/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchOrders();
    } catch (err) { console.error(err); }
  };

  const filteredOrders = orders.filter(o => {
    const matchesFilter = filter === 'ALL' || o.status === filter;
    const matchesSearch = o.user?.name?.toLowerCase().includes(search.toLowerCase()) || 
                          o.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <AdminGuard>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Truck className="w-6 h-6 text-orange-500" />
             </div>
             <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1">Central de Pedidos</h1>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Operativa de Tienda y Barra</p>
             </div>
          </div>
          
          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 self-stretch md:self-auto">
             {['ALL', 'PENDING', 'PAID', 'DELIVERED'].map((f) => (
                <button 
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                >
                  {f === 'ALL' ? 'Todos' : f === 'PENDING' ? 'Pendientes' : f === 'PAID' ? 'Pagados' : 'Entregados'}
                </button>
             ))}
          </div>
        </header>

        <div className="mb-8 relative max-w-xl">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
           <input 
             type="text" 
             placeholder="Buscar pedido por ID o nombre de cliente..." 
             value={search}
             onChange={e => setSearch(e.target.value)}
             className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-orange-500 transition-all font-medium"
           />
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
             <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
             <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-loose">Escaneando Bóveda de Órdenes...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-700">
             {filteredOrders.length === 0 ? (
               <div className="py-32 text-center bg-zinc-950/20 border border-dashed border-zinc-900 rounded-[3rem]">
                  <ShoppingBag className="w-16 h-16 text-zinc-900 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No hay pedidos registrados en esta categoría</p>
               </div>
             ) : (
               filteredOrders.map(order => (
                <div key={order.id} className={`bg-zinc-950 border rounded-3xl p-6 transition-all hover:border-zinc-700 ${order.status === 'PENDING' ? 'border-orange-500/30' : 'border-zinc-900'}`}>
                   <div className="flex flex-col md:grid md:grid-cols-[1fr_200px_200px] gap-6 items-start md:items-center">
                      
                      <div className="flex gap-4 items-start w-full">
                         <div className={`p-4 rounded-2xl flex items-center justify-center flex-shrink-0 ${order.status === 'PENDING' ? 'bg-orange-500/10 text-orange-500' : order.status === 'PAID' ? 'bg-neon-green/10 text-neon-green' : 'bg-zinc-900 text-zinc-600'}`}>
                             {order.status === 'PENDING' ? <Clock className="w-6 h-6" /> : order.status === 'PAID' ? <DollarSign className="w-6 h-6" /> : <Package className="w-6 h-6" />}
                         </div>
                         <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-3 mb-1">
                               <h3 className="font-black text-white text-lg uppercase tracking-tighter truncate">Order #{order.id.slice(-6)}</h3>
                               <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${order.payment_type === 'VIRTUAL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                                  {order.payment_type}
                               </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-zinc-500 font-bold uppercase text-[9px] tracking-widest">
                               <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.user?.name || 'Invitado'}</span>
                               <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(order.created_at).toLocaleTimeString()}</span>
                            </div>
                            {order.user?.tags?.length > 0 && (
                               <div className="flex flex-wrap gap-1 mt-3">
                                  {order.user.tags.map((t: string) => (
                                    <span key={t} className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 text-[8px] font-black border border-orange-500/20">{t}</span>
                                  ))}
                               </div>
                            )}
                         </div>
                      </div>

                      <div className="w-full bg-black/40 p-3 rounded-2xl border border-zinc-900 group">
                         <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2 px-1">Items del pedido</p>
                         <div className="space-y-1">
                            {order.items.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-center text-[10px] font-bold text-zinc-300 bg-zinc-900/50 px-2 py-1.5 rounded-lg border border-transparent group-hover:border-zinc-800 transition-all">
                                 <span className="truncate mr-2"><span className="text-orange-500 font-black">{item.quantity}x</span> {item.product.name}</span>
                                 <span className="flex-shrink-0 text-zinc-500">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(item.unit_price * item.quantity)}</span>
                              </div>
                            ))}
                         </div>
                         <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total</span>
                            <span className="text-sm font-black text-orange-500">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(order.total)}</span>
                         </div>
                      </div>

                      <div className="w-full flex md:flex-col gap-2">
                         {(order.status === 'PENDING' || order.status === 'PAID' || order.status === 'READY') && (
                            <button 
                              onClick={() => {
                                if(confirm('¿Rechazar pedido por falta de stock? Esto devolverá los productos al inventario.')) {
                                  updateStatus(order.id, 'CANCELED');
                                }
                              }}
                              className="flex-1 bg-zinc-900 text-red-500 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 transition-all flex items-center justify-center gap-2 border border-red-500/20"
                            >
                               <X className="w-4 h-4" /> Rechazar por Stock
                            </button>
                         )}

                         {order.status === 'PENDING' && (
                            <button 
                              onClick={() => updateStatus(order.id, 'PAID')}
                              className="flex-1 bg-neon-green text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                               <CreditCard className="w-4 h-4" /> Cobrar (Cash)
                            </button>
                         )}
                         {(order.status === 'PAID' || order.status === 'READY') && (
                            <button 
                              onClick={() => updateStatus(order.id, 'DELIVERED')}
                              className="flex-1 bg-white text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-neon-green transition-all flex items-center justify-center gap-2"
                            >
                               <Truck className="w-4 h-4" /> Entregar Pedido
                            </button>
                         )}
                         {order.status === 'DELIVERED' && (
                            <div className="flex-1 border border-zinc-900 text-zinc-600 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 opacity-50">
                               <CheckCircle2 className="w-4 h-4" /> Finalizado
                            </div>
                         )}
                      </div>

                   </div>
                </div>
               ))
             )}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
