import Link from 'next/link';
import Image from 'next/image';
export const dynamic = 'force-dynamic';
import { ArrowLeft, ArrowRight, Calendar, MapPin, Tag } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { InstallAppButton } from '@/components/InstallAppButton';

export default async function Home() {
  let events = [];
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001'}/events`, { cache: 'no-store' });
    if (res.ok) events = await res.json();
  } catch (error) {
    console.error('Error fetching events:', error);
  }

  return (
    <div className="min-h-screen">

      {/* Hero / Feed Principal */}
      <main className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-16">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-widest text-white mb-4">
            Próximos <span className="text-white drop-shadow-[0_0_15px_rgba(57,255,20,0.8)] [text-shadow:0_0_20px_#39ff14]">Eventos</span>
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
            <Link href={`/events/${event.id}`} key={event.id} className="group relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-[0_0_30px_rgba(57,255,20,0.15)] transform hover:-translate-y-2 transition-all duration-300 block p-[1px] bg-zinc-800/50">
              {/* Animación Neón de fondo */}
              <div className="absolute top-[-150%] left-[-50%] w-[200%] h-[400%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_70%,#39ff14_85%,#bf00ff_100%)] opacity-30 group-hover:opacity-100 transition-opacity duration-1000 point-events-none" />
              
              {/* Contenido protegido interno */}
              <div className="relative bg-[#050505] rounded-[15px] overflow-hidden z-10 h-full flex flex-col glass-panel border border-zinc-800/80">
                <div className="h-56 w-full bg-zinc-900 relative overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10"></div>
                  {event.flyer_url && (
                    <Image 
                      src={event.flyer_url} 
                      alt={event.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100" 
                    />
                  )}
                </div>
                
                <div className="p-6 flex-1 flex flex-col">
                  <h2 className="text-2xl font-bold uppercase tracking-wider text-white group-hover:text-neon-green transition-colors mb-4 line-clamp-1">
                    {event.title}
                  </h2>
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-center text-sm text-zinc-400 gap-3">
                      <Calendar className="w-4 h-4 text-neon-purple" />
                      <span>{new Date(event.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric' })}</span>
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

                  <div className="w-full text-center py-3 border border-zinc-700 rounded-lg text-[10px] uppercase tracking-[0.2em] font-black text-zinc-300 group-hover:bg-neon-green group-hover:text-black group-hover:border-neon-green group-hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] transition-all flex justify-center items-center gap-2">
                    Ver Detalles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>

        {/* PWA Instalador Móvil */}
        <div className="mt-16 flex justify-center">
          <InstallAppButton />
        </div>
      </main>
    </div>
  );
}
