"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, DollarSign, Users, Ticket, Download, DoorOpen, ArrowRight, CheckCircle } from 'lucide-react';

export default function EventSalesStatsPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [walkIns, setWalkIns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
        const authToken = tokenRow ? tokenRow.split('=')[1] : null;
        const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const headers = { 'Authorization': `Bearer ${authToken}` };

        const [statsRes, walkInRes] = await Promise.all([
          fetch(`${API}/events/admin/${params.id}/stats`, { headers }),
          fetch(`${API}/walk-in/${params.id}`, { headers })
        ]);

        if (statsRes.ok) setData(await statsRes.json());
        else setError(true);
        if (walkInRes.ok) setWalkIns(await walkInRes.json());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [params.id]);

  if (loading) return <div className="min-h-screen bg-[#050505] flex justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-neon-green" /></div>;
  if (error || !data) return <div className="min-h-screen bg-[#050505] text-red-500 p-20 font-black tracking-widest text-xl text-center">Error cargando métricas.</div>;

  const walkInRevenue = walkIns.reduce((s, x) => s + x.amount, 0);
  const totalCombinedRevenue = data.totalRevenue + walkInRevenue;

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto bg-[#050505] text-white">
      <Link href="/admin/sales" className="inline-flex items-center gap-2 text-zinc-500 hover:text-neon-green transition-colors mb-6 uppercase font-bold tracking-widest text-xs">
        <ArrowLeft className="w-4 h-4" /> Volver al Tablero Global
      </Link>

      <header className="mb-10 lg:flex justify-between items-end gap-10">
        <div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-white leading-tight">{data.event.title}</h1>
          <p className="text-zinc-500 mt-2 uppercase tracking-widest text-sm font-bold flex items-center gap-2">
            <span>{new Date(data.event.date).toLocaleDateString()}</span> &bull; <span>{data.event.venue}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-6 lg:mt-0">
          <Link href={`/admin/taquilla/${data.event.id}`}
            className="flex items-center justify-center gap-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 font-bold uppercase tracking-widest text-xs py-3 px-5 rounded-lg transition-colors">
            <DoorOpen className="w-4 h-4" /> Abrir Taquilla
          </Link>
          <button className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-white font-bold uppercase tracking-widest text-xs py-3 px-5 rounded-lg hover:border-zinc-600 transition-colors">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
        </div>
      </header>

      {/* METRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-blue-500 bg-black">
          <div className="flex items-center gap-2 mb-3 text-blue-500">
            <DollarSign className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Wompi (Online)</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">${data.totalRevenue.toLocaleString()} <span className="text-xs text-zinc-600">COP</span></p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-orange-500 bg-black">
          <div className="flex items-center gap-2 mb-3 text-orange-400">
            <DoorOpen className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Taquilla (Efectivo)</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">${walkInRevenue.toLocaleString()} <span className="text-xs text-zinc-600">COP</span></p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">{walkIns.length} asistentes</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-neon-green bg-black">
          <div className="flex items-center gap-2 mb-3 text-neon-green">
            <Users className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Auditorio</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">{data.totalScanned} <span className="text-base text-zinc-600">/ {data.totalTicketsSold}</span></p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">QRs escaneados</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-neon-purple bg-black">
          <div className="flex items-center gap-2 mb-3 text-neon-purple">
            <Ticket className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Total Combinado</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">${totalCombinedRevenue.toLocaleString()} <span className="text-xs text-zinc-600">COP</span></p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">Online + Efectivo</p>
        </div>
      </div>

      {/* ANALITICA DE CONVERSION */}
      <h2 className="text-lg font-black uppercase tracking-widest text-white mb-4 mt-8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-pink-500 inline-block"></span> Embudo de Conversión
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
        <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-yellow-500 bg-black">
          <div className="flex items-center gap-2 mb-3 text-yellow-500">
            <Users className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Visitas a la Página</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">{data.event.page_views || 0} <span className="text-xs text-zinc-600">USUARIOS</span></p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">Vistas únicas por sesión</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-pink-500 bg-black">
          <div className="flex items-center gap-2 mb-3 text-pink-500">
            <ArrowRight className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Interacción de Compra</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">{data.event.checkout_clicks || 0} <span className="text-xs text-zinc-600">CLICS</span></p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">Aperturas del Checkout</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-neon-green bg-black">
          <div className="flex items-center gap-2 mb-3 text-neon-green">
            <CheckCircle className="w-5 h-5" />
            <h3 className="font-black uppercase tracking-widest text-[10px]">Ventas Totales</h3>
          </div>
          <p className="text-3xl md:text-4xl font-black tracking-tighter">{data.totalTicketsSold || 0} <span className="text-xs text-zinc-600">TICKETS</span></p>
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1 font-bold">
             Conversión: {data.event.page_views > 0 ? Math.round((data.totalTicketsSold / data.event.page_views) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ORDENES ONLINE */}
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Órdenes Digitales (Wompi)
          </h2>
          <div className="glass-panel bg-black rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Cliente</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Tickets</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Monto</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 hidden sm:table-cell whitespace-nowrap">Ref.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {data.orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-white text-sm">{order.user?.name || 'Invitado'}</div>
                        <div className="text-xs text-zinc-500">{order.user?.email || 'N/A'}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        {order.order_items.map((item: any, idx: number) => (
                          <div key={idx} className="text-xs font-bold">{item.quantity}x <span className="text-neon-purple">{item.ticket_type?.name}</span></div>
                        ))}
                      </td>
                      <td className="p-4 whitespace-nowrap"><div className="text-sm font-black text-neon-green">${order.total.toLocaleString()}</div></td>
                      <td className="p-4 hidden sm:table-cell whitespace-nowrap">
                        <div className="text-xs font-mono text-zinc-500 bg-zinc-900 p-1.5 rounded">{order.payment_ref?.substring(0, 12) || 'N/A'}</div>
                      </td>
                    </tr>
                  ))}
                  {data.orders.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">Sin compras online registradas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* TAQUILLA EN PUERTA */}
        <div>
          <h2 className="text-lg font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span> Taquilla en Puerta (Efectivo)
          </h2>
          <div className="glass-panel bg-black rounded-2xl border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/50">
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Asistente</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Cédula</th>
                    <th className="p-4 text-xs font-bold uppercase tracking-widest text-zinc-400 whitespace-nowrap">Pagó</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {walkIns.map((sale: any) => (
                    <tr key={sale.id} className="hover:bg-zinc-900/30 transition-colors">
                      <td className="p-4 whitespace-nowrap">
                        <div className="font-bold text-white text-sm">{sale.name || <span className="text-zinc-500 italic text-xs">Anónimo</span>}</div>
                        {sale.email && <div className="text-xs text-zinc-500">{sale.email}</div>}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-zinc-400">{sale.cedula || '—'}</div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="text-sm font-black text-orange-400">${sale.amount.toLocaleString()}</div>
                        <div className="text-[10px] text-zinc-600">{new Date(sale.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                      </td>
                    </tr>
                  ))}
                  {walkIns.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">Sin registros de taquilla</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
