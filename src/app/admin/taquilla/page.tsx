"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Loader2, ArrowRight, DoorOpen } from 'lucide-react';

export default function TaquillaIndexPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const tokenRow = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
        const token = tokenRow ? tokenRow.split('=')[1] : null;
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/admin/all`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) setEvents(await res.json());
      } finally { setLoading(false); }
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
      <header className="mb-12 border-b border-zinc-800 pb-6">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <DoorOpen className="w-5 h-5 text-orange-400" />
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
            Taquilla en Puerta
          </h1>
        </div>
        <p className="text-zinc-500 uppercase tracking-widest text-xs font-bold">
          Selecciona un evento para registrar asistentes que pagan en efectivo a la entrada.
        </p>
      </header>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="w-10 h-10 text-orange-400 animate-spin" /></div>
      ) : events.length === 0 ? (
        <div className="p-16 text-center border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center">
          <Calendar className="w-16 h-16 text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest">No hay eventos disponibles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map(event => (
            <Link href={`/admin/taquilla/${event.id}`} key={event.id}
              className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 group hover:border-orange-500/60 transition-all bg-black flex flex-col cursor-pointer">
              <div className="h-28 relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                {event.flyer_url && (
                  <img src={event.flyer_url} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-70 transition-opacity duration-300 group-hover:scale-105" />
                )}
                <div className={`absolute top-3 right-3 px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest ${event.status === 'PUBLISHED' ? 'bg-neon-green text-black' : 'bg-zinc-700 text-zinc-400'}`}>
                  {event.status === 'PUBLISHED' ? 'Activo' : 'Archivado'}
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-black uppercase tracking-widest text-white text-lg leading-tight mb-2 truncate">{event.title}</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="mt-auto pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Abrir Taquilla</span>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-orange-400 transform transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
