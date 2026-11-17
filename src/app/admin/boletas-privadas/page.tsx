"use client";
import { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronRight, ArrowLeft, Loader2, EyeOff } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import PrivateTicketsPanel from '@/components/admin/PrivateTicketsPanel';

/**
 * Boletas privadas: entradas con el precio que se decida, que no aparecen en la página del evento y solo
 * compra quien tenga su enlace. Es la forma de venderle a un público concreto sin publicarlo para todos.
 */
export default function PrivateTicketsAdminPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = await apiFetch<any[]>('/partners/me/events');
        setEvents(rows.map((r) => r.event));
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'No se pudieron cargar los eventos.');
      }
      setLoading(false);
    })();
  }, []);

  const fmtDate = useMemo(
    () => (d: string) => new Date(d).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' }),
    [],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-[#050505] p-6 lg:p-12 font-sans pb-24">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors font-bold text-sm uppercase tracking-widest"
          >
            <ArrowLeft className="w-4 h-4" /> Volver a Eventos
          </button>
          <header className="mb-8">
            <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-white mb-2">{selected.title}</h1>
            <p className="text-neon-purple font-black tracking-widest uppercase text-sm">Boletas privadas</p>
          </header>
          <PrivateTicketsPanel eventId={selected.id} eventTitle={selected.title} minPrice={null} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] p-6 lg:p-12 font-sans pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-white mb-4 flex items-center gap-3">
            <EyeOff className="w-8 h-8 text-neon-purple" /> Boletas privadas
          </h1>
          <p className="text-zinc-400 font-bold max-w-2xl">
            Entradas con el precio que decidas, fuera de la página del evento: solo las compra quien tenga el enlace.
            Sirven para venderle a un público concreto sin que toda la comunidad lo vea.
          </p>
        </header>

        {error && <p className="mb-6 text-sm font-bold text-red-400">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <button
              key={event.id}
              onClick={() => setSelected(event)}
              className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-neon-purple/50 group text-left transition-all flex flex-col"
            >
              <div className="p-6 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-neon-purple" />
                  <span className="text-xs font-black uppercase text-neon-purple">{fmtDate(event.date)}</span>
                </div>
                <h3 className="text-xl font-black uppercase text-white">{event.title}</h3>
              </div>
              <div className="bg-zinc-900/50 p-4 border-t border-zinc-900 flex justify-between items-center group-hover:bg-neon-purple group-hover:border-neon-purple transition-all">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-black">Gestionar enlaces</span>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-black" />
              </div>
            </button>
          ))}
          {events.length === 0 && !error && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
              <EyeOff className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-500 font-bold">No hay eventos activos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
