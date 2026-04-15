import Link from 'next/link';
import { QrCode, CalendarPlus } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-800">
          <h1 className="text-xl md:text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">
            Panel de Operaciones
          </h1>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest hidden md:inline-block">Sistema en Línea</span>
            </div>
          </div>
        </header>

        {/* Dash metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass-panel bg-black/40 p-6 rounded-2xl border border-zinc-800 border-t-2 border-t-neon-green shadow-sm hover:border-zinc-700 transition-colors">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Ingresos Locales</h3>
            <p className="text-4xl font-black text-white">$1,450 <span className="text-xs font-black uppercase text-neon-green neon-text-primary ml-2">+12%</span></p>
          </div>
          <div className="glass-panel bg-black/40 p-6 rounded-2xl border border-zinc-800 border-t-2 border-t-neon-purple shadow-sm hover:border-zinc-700 transition-colors">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">QRs Autorizados</h3>
            <p className="text-4xl font-black text-white">45 / 300 <span className="text-xs font-black uppercase text-zinc-500 ml-2">tickets</span></p>
          </div>
          <div className="glass-panel bg-black/40 p-6 rounded-2xl border border-zinc-800 border-t-2 border-t-[#00ffff] shadow-sm hover:border-zinc-700 transition-colors">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Eventos Publicados</h3>
            <p className="text-4xl font-black text-white">2 <span className="text-xs font-black uppercase text-zinc-500 ml-2">activos</span></p>
          </div>
        </div>

        {/* Quick action section */}
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 mb-6">Accesos Rápidos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/admin/events" className="group glass-panel bg-black p-8 rounded-2xl hover:border-neon-purple transition-all flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden border border-zinc-800">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-neon-purple transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
               <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center group-hover:bg-neon-purple/20 transition-all">
                 <CalendarPlus className="w-8 h-8 text-neon-purple" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-widest text-white mb-2 group-hover:neon-text-secondary transition-all">Manager de Eventos</h3>
                  <p className="text-xs text-zinc-400 font-bold max-w-xs">Configura, oculta, actualiza o lanza nuevos eventos para la comunidad.</p>
               </div>
            </Link>

            <Link href="/scanner" className="group glass-panel bg-black p-8 rounded-2xl hover:border-neon-green transition-all flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden border border-zinc-800">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-neon-green transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
               <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center group-hover:bg-neon-green/20 transition-all">
                 <QrCode className="w-8 h-8 text-neon-green" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-widest text-white mb-2 group-hover:neon-text-primary transition-all">Lanzar Escáner QR</h3>
                  <p className="text-xs text-zinc-400 font-bold max-w-xs">Activa la cámara nativa para validar asistentes en la entrada.</p>
               </div>
            </Link>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
