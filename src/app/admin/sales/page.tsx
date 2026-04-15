"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Loader2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminSalesPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/admin/all`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) setEvents(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      <header className="mb-12 border-b border-zinc-800 pb-6">
        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-blue-500">
          Inteligencia de Ventas
        </h1>
        <p className="text-zinc-500 mt-2 uppercase tracking-widest text-xs font-bold">
          Selecciona un evento para analizar sus finanzas, asistentes en puerta y métricas de recaudación.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 text-neon-green animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="glass-panel p-16 text-center border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center">
          <Calendar className="w-16 h-16 text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest">No hay eventos para analizar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <Link href={`/admin/sales/${event.id}`} key={event.id} className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 group hover:border-neon-green transition-all bg-black flex flex-col block cursor-pointer">
              <div className="h-32 relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                {event.flyer_url && (
                  <img src={event.flyer_url} alt="" className="w-full h-full object-cover opacity-50 group-hover:opacity-80 transition-opacity duration-300 group-hover:scale-105" />
                )}
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-black uppercase tracking-widest text-white text-lg leading-tight mb-2 truncate" title={event.title}>{event.title}</h3>
                <div className="space-y-1.5 mb-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    <span className="text-neon-purple">{event._count?.orders || 0}</span> Transacciones Globales
                  </div>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-neon-green transform transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
