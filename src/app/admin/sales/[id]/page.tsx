"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, DollarSign, Users, Ticket, Download, AlertCircle, HardDrive } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EventSalesStatsPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
        const authToken = tokenRow ? tokenRow.split('=')[1] : null;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/admin/${params.id}/stats`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          setData(await res.json());
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-neon-green" /></div>;
  if (error || !data) return <div className="min-h-screen bg-[#050505] text-red-500 p-20 font-black tracking-widest text-xl text-center">Error cargando métricas.</div>;

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto bg-[#050505] text-white">
      <Link href="/admin/sales" className="inline-flex items-center gap-2 text-zinc-500 hover:text-neon-green transition-colors mb-6 uppercase font-bold tracking-widest text-xs">
        <ArrowLeft className="w-4 h-4" /> Volver al Tablero Global
      </Link>
      
      <header className="mb-10 lg:flex justify-between items-end gap-10">
        <div>
           <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-white leading-tight">
             {data.event.title}
           </h1>
           <p className="text-zinc-500 mt-2 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
             <span>{new Date(data.event.date).toLocaleDateString()}</span> &bull; <span>{data.event.venue}</span>
           </p>
        </div>
        <button className="mt-6 lg:mt-0 flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-white font-bold uppercase tracking-widest text-xs py-3 px-6 rounded-lg hover:border-zinc-600 transition-colors">
          <Download className="w-4 h-4" /> Exportar Reporte CSV
        </button>
      </header>

      {/* METRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
         <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-blue-500 bg-black">
           <div className="flex items-center gap-3 mb-4 text-blue-500">
              <DollarSign className="w-6 h-6" />
              <h3 className="font-black uppercase tracking-widest text-xs">Total Recaudado (Wompi)</h3>
           </div>
           <p className="text-4xl md:text-5xl font-black tracking-tighter">
             ${data.totalRevenue.toLocaleString()} <span className="text-sm text-zinc-600">COP</span>
           </p>
         </div>

         <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-neon-green bg-black">
           <div className="flex items-center gap-3 mb-4 text-neon-green">
              <Users className="w-6 h-6" />
              <h3 className="font-black uppercase tracking-widest text-xs">Auditorio (Ingresados)</h3>
           </div>
           <p className="text-4xl md:text-5xl font-black tracking-tighter">
             {data.totalScanned} <span className="text-xl text-zinc-600">/ {data.totalTicketsSold}</span>
           </p>
           <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2 font-bold">Han cruzado la puerta</p>
         </div>

         <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-neon-purple bg-black">
           <div className="flex items-center gap-3 mb-4 text-neon-purple">
              <Ticket className="w-6 h-6" />
              <h3 className="font-black uppercase tracking-widest text-xs">Tickets Vendidos</h3>
           </div>
           <p className="text-4xl md:text-5xl font-black tracking-tighter">
             {data.totalTicketsSold}
           </p>
           <p className="text-xs text-zinc-500 uppercase tracking-widest mt-2 font-bold">Ventas Exitosas Totales</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* TABLA DE ASISTENTES ONLINE */}
         <div className="lg:col-span-2">
           <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
             Órdenes Digitales (Compradores)
           </h2>
           <div className="glass-panel bg-black rounded-2xl border border-zinc-800 overflow-hidden">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="border-b border-zinc-800 bg-zinc-900/50">
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Cliente</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Tickets</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400">Monto</th>
                     <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 hidden sm:table-cell">Wompi ID</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800">
                   {data.orders.map((order: any) => (
                     <tr key={order.id} className="hover:bg-zinc-900/30 transition-colors">
                       <td className="p-4">
                         <div className="font-bold text-white text-sm">{order.user?.name || 'Invitado'}</div>
                         <div className="text-xs text-zinc-500">{order.user?.email || 'N/A'}</div>
                       </td>
                       <td className="p-4">
                         {order.order_items.map((item: any, idx: number) => (
                           <div key={idx} className="text-xs font-bold text-zinc-300">
                             {item.quantity}x <span className="text-neon-purple">{item.ticket_type?.name}</span>
                           </div>
                         ))}
                       </td>
                       <td className="p-4">
                         <div className="text-sm font-black text-neon-green">${order.total.toLocaleString()}</div>
                       </td>
                       <td className="p-4 hidden sm:table-cell">
                         <div className="text-xs font-mono text-zinc-500 bg-zinc-900 p-1.5 rounded inline-block">
                           {order.payment_ref?.substring(0, 15) || 'N/A'}...
                         </div>
                       </td>
                     </tr>
                   ))}
                   {data.orders.length === 0 && (
                     <tr>
                       <td colSpan={4} className="p-10 text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">
                         Aún no hay compras registradas en línea
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
         </div>

         {/* MODULO EFECTIVO PLACEHOLDER */}
         <div className="lg:col-span-1">
           <h2 className="text-xl font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
             Módulo Taquilla
           </h2>
           <div className="glass-panel bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
              <HardDrive className="w-16 h-16 text-zinc-700 mb-6 relative z-10" />
              <h3 className="font-black text-xl uppercase tracking-widest text-zinc-500 mb-3 relative z-10">Ventas en Efectivo</h3>
              <p className="text-xs text-zinc-600 font-bold max-w-xs leading-relaxed relative z-10">
                Esta sección de registro de pagos manuales en puerta será implementada en la Próxima Etapa Administrativa.
              </p>
              <div className="mt-8 bg-zinc-950 text-zinc-700 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-zinc-900 relative z-10">
                 Próximamente
              </div>
           </div>
         </div>

      </div>
    </div>
  );
}
