import Link from 'next/link';
import { QrCode, CalendarPlus, Users, Activity, Ticket } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import AdminLogoutButton from '@/components/AdminLogoutButton';

export default function AdminDashboard() {
  return (
    <AdminGuard>
      <div className="min-h-screen flex">
        {/* Sidebar Navigation */}
        <aside className="hidden md:flex w-64 border-r border-zinc-800 bg-black/80 backdrop-blur fixed h-full flex-col pt-8 z-20">
          <div className="px-6 mb-12">
            <Link href="/">
              <h2 className="text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-neon-purple to-neon-green hover:animate-glow transition-all">
                Kasa / Admin
              </h2>
            </Link>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Owner Dashboard</p>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-bold tracking-wider text-sm neon-border-primary">
              <Activity className="w-4 h-4 text-neon-green" /> Vista General
            </Link>
            <Link href="/admin/events/new" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg tracking-wider text-sm transition-all group">
              <CalendarPlus className="w-4 h-4 group-hover:text-neon-purple transition-all" /> Crear Evento
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg tracking-wider text-sm transition-all group">
              <Ticket className="w-4 h-4 group-hover:text-neon-green transition-all" /> Estadísticas Ventas
            </Link>
            <Link href="/admin/staff" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg tracking-wider text-sm transition-all group">
              <Users className="w-4 h-4 group-hover:text-neon-purple transition-all" /> Equipo & Staff
            </Link>
            <Link href="/admin/settings" className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg tracking-wider text-sm transition-all group border border-dashed border-zinc-800 hover:border-neon-purple">
              <Activity className="w-4 h-4 group-hover:text-neon-purple transition-all" /> Configuraciones
            </Link>
          </nav>

          <div className="p-4 border-t border-zinc-800">
            <AdminLogoutButton />
          </div>
        </aside>

        {/* Main Content (Offset by sidebar logic) */}
        <main className="md:ml-64 flex-1 p-6 md:p-8">
          <header className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-800">
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white">Panel de Operaciones</h1>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
                <span className="text-xs text-zinc-400 uppercase tracking-widest hidden md:inline-block">Sistema en Línea</span>
              </div>
            </div>
          </header>

          {/* Dash metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-neon-green shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Ingresos Locales</h3>
              <p className="text-4xl font-black text-white">$1,450 <span className="text-sm font-normal text-neon-green neon-text-primary">+12%</span></p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-neon-purple">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">QRs Autorizados</h3>
              <p className="text-4xl font-black text-white">45 / 300 <span className="text-sm font-normal text-zinc-500">tickets</span></p>
            </div>
            <div className="glass-panel p-6 rounded-2xl border-t-2 border-t-[#00ffff]">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Eventos Publicados</h3>
              <p className="text-4xl font-black text-white">2 <span className="text-sm font-normal text-zinc-500">activos</span></p>
            </div>
          </div>

          {/* Quick action section */}
          <div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-zinc-300 mb-6">Accesos Rápidos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/admin/events/new" className="group glass-panel p-8 rounded-2xl hover:border-neon-purple transition-all flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
                 <div className="absolute inset-x-0 bottom-0 h-1 bg-neon-purple transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                 <div className="w-16 h-16 rounded-full bg-neon-purple/10 flex items-center justify-center group-hover:bg-neon-purple/20 transition-all">
                   <CalendarPlus className="w-8 h-8 text-neon-purple" />
                 </div>
                 <div>
                    <h3 className="font-bold uppercase tracking-widest text-white mb-2 group-hover:neon-text-secondary transition-all">Publicar Evento</h3>
                    <p className="text-xs text-zinc-400">Configura un nuevo evento, flyers y tipología de tickets.</p>
                 </div>
              </Link>

              <Link href="/scanner" className="group glass-panel p-8 rounded-2xl hover:border-neon-green transition-all flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
                 <div className="absolute inset-x-0 bottom-0 h-1 bg-neon-green transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                 <div className="w-16 h-16 rounded-full bg-neon-green/10 flex items-center justify-center group-hover:bg-neon-green/20 transition-all">
                   <QrCode className="w-8 h-8 text-neon-green" />
                 </div>
                 <div>
                    <h3 className="font-bold uppercase tracking-widest text-white mb-2 group-hover:neon-text-primary transition-all">Lanzar Escáner QR</h3>
                    <p className="text-xs text-zinc-400">Abre la cámara web para el personal encargado en puerta (Staff).</p>
                 </div>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
