import Link from 'next/link';
import { Calendar, MapPin, Tag } from 'lucide-react';

export default async function EventsFeed() {
  let events = [];
  try {
    const res = await fetch('http://localhost:3001/events', { cache: 'no-store' });
    if (res.ok) events = await res.json();
  } catch (error) {
    console.error('Error fetching events:', error);
  }

  return (
    <div className="min-h-screen py-20 px-4 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-12">
        <div>
          <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-white mb-2">
            Próximos <span className="text-neon-green neon-text-primary">Eventos</span>
          </h1>
          <p className="text-zinc-400">Asegura tu entrada antes del Sold Out.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events.map((event: any) => {
            const minPrice = event.ticket_types && event.ticket_types.length > 0
              ? Math.min(...event.ticket_types.map((t: any) => t.price))
              : 0;
            return (
          <Link href={`/events/${event.id}`} key={event.id} className="group glass-panel rounded-2xl overflow-hidden hover:neon-border-primary transition-all duration-300">
            <div className="h-48 w-full bg-zinc-900 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10"></div>
              <img 
                src={event.flyer_url} 
                alt={event.title}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100" 
              />
            </div>
            
            <div className="p-6">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-white group-hover:text-neon-green transition-colors mb-4 line-clamp-1">
                {event.title}
              </h2>
              
              <div className="space-y-2 mb-6">
                <div className="flex items-center text-sm text-zinc-400 gap-2">
                  <Calendar className="w-4 h-4 text-neon-purple" />
                  <span>{new Date(event.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center text-sm text-zinc-400 gap-2">
                  <MapPin className="w-4 h-4 text-neon-purple" />
                  <span className="line-clamp-1">{event.venue}</span>
                </div>
                <div className="flex items-center text-sm text-zinc-400 gap-2">
                  <Tag className="w-4 h-4 text-neon-green" />
                  <span>Desde {Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(minPrice)}</span>
                </div>
              </div>

              <div className="w-full text-center py-2 border border-zinc-700 rounded text-xs uppercase tracking-widest font-bold group-hover:bg-neon-green group-hover:text-black group-hover:border-neon-green transition-all">
                Ver Detalles
              </div>
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
