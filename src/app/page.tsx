import Link from 'next/link';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Tag } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export default async function Home() {
  let events = [];
  try {
    const res = await fetch('http://localhost:3001/events', { cache: 'no-store' });
    if (res.ok) events = await res.json();
  } catch (error) {
    console.error('Error fetching events:', error);
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero / Feed Principal */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-widest text-white mb-4">
            Próximos <span className="text-neon-green neon-text-primary">Eventos</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl text-balance">
            Navega por la cartelera de música electrónica oficial. Asegura tu entrada y vive la rave antes del Sold Out.
          </p>
        </div>

        {/* Listado / Grid de eventos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {events.map((event: any) => {
            const minPrice = event.ticket_types && event.ticket_types.length > 0
              ? Math.min(...event.ticket_types.map((t: any) => t.price))
              : 0;
            return (
            <Link href={`/events/${event.id}`} key={event.id} className="group glass-panel rounded-2xl overflow-hidden hover:neon-border-primary transition-all duration-300 transform hover:-translate-y-2 pb-1 relative">
              <div className="h-56 w-full bg-zinc-900 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
                <img 
                  src={event.flyer_url} 
                  alt={event.title}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
                />
              </div>
              
              <div className="p-6">
                <h2 className="text-2xl font-bold uppercase tracking-wider text-white group-hover:text-neon-green transition-colors mb-4 line-clamp-1">
                  {event.title}
                </h2>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-zinc-400 gap-3">
                    <Calendar className="w-4 h-4 text-neon-purple" />
                    <span>{new Date(event.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center text-sm text-zinc-400 gap-3">
                    <MapPin className="w-4 h-4 text-neon-purple" />
                    <span className="line-clamp-1">{event.venue}</span>
                  </div>
                  <div className="flex items-center text-sm text-zinc-400 gap-3">
                    <Tag className="w-4 h-4 text-neon-green" />
                    <span className="font-semibold text-zinc-200">Desde {Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(minPrice)}</span>
                  </div>
                </div>

                <div className="w-full text-center py-3 border border-zinc-700 rounded-lg text-xs uppercase tracking-widest font-bold text-zinc-300 group-hover:bg-neon-green group-hover:text-black group-hover:border-neon-green transition-all flex justify-center items-center gap-2">
                  Ver Detalles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
