"use client";
import Link from 'next/link';
import { QrCode, CalendarPlus, Loader2, Users, ShoppingBag, DoorOpen } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
        const authToken = tokenRow ? tokenRow.split('=')[1] : null;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/admin/dashboard-stats`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) setStats(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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
        {loading ? (
          <div className="flex justify-center p-12 mb-12"><Loader2 className="w-10 h-10 animate-spin text-neon-green" /></div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="glass-panel bg-black/40 p-6 rounded-2xl border border-zinc-800 border-t-2 border-t-neon-green shadow-sm hover:border-zinc-700 transition-colors">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Ingresos (Últ. 30 días)</h3>
              <p className="text-3xl lg:text-4xl font-black text-white">${stats.revenue.total.toLocaleString()} <span className="text-[10px] font-black uppercase text-zinc-500 ml-1">COP</span></p>
            </div>
            <div className="glass-panel bg-black/40 p-6 rounded-2xl border border-zinc-800 border-t-2 border-t-neon-purple shadow-sm hover:border-zinc-700 transition-colors">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Auditorio Acumulado (QRs)</h3>
              <p className="text-3xl lg:text-4xl font-black text-white">{stats.qrs.scanned} <span className="text-xs font-black uppercase text-zinc-500 ml-1">/ {stats.qrs.total} tickets</span></p>
            </div>
            <div className="glass-panel bg-black/40 p-6 rounded-2xl border border-zinc-800 border-t-2 border-t-[#00ffff] shadow-sm hover:border-zinc-700 transition-colors">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Ecosistema</h3>
              <p className="text-3xl lg:text-4xl font-black text-white">{stats.events.active} <span className="text-xs font-black uppercase text-zinc-500 ml-1">Eventos Activos</span></p>
            </div>
          </div>
        ) : (
          <div className="p-10 mb-12 border border-zinc-800 border-dashed rounded-2xl text-center text-zinc-500 text-sm font-bold uppercase tracking-widest">
            Sin conexión al servidor de la bóveda
          </div>
        )}

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
                  <h3 className="font-black uppercase tracking-widest text-white mb-2 group-hover:neon-text-primary transition-all">Punto de Control</h3>
                  <p className="text-xs text-zinc-400 font-bold max-w-xs">Activa la cámara nativa para validar escáner o registrar asistentes libres en taquilla.</p>
               </div>
            </Link>

            <Link href="/admin/users" className="group glass-panel bg-black p-8 rounded-2xl hover:border-[#00ffff] transition-all flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden border border-zinc-800">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-[#00ffff] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
               <div className="w-16 h-16 rounded-full bg-[#00ffff]/10 flex items-center justify-center group-hover:bg-[#00ffff]/20 transition-all">
                 <Users className="w-8 h-8 text-[#00ffff]" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-widest text-white mb-2 group-hover:neon-text-cyan transition-all">Gestión Comunidad</h3>
                  <p className="text-xs text-zinc-400 font-bold max-w-xs">Administra la base de datos de usuarios y asigna calificaciones internas de comportamiento.</p>
               </div>
            </Link>

            <Link href="/admin/taquilla" className="group glass-panel bg-black/60 p-8 rounded-2xl hover:border-orange-500 transition-all flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden border border-zinc-800">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-orange-500 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
               <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-all">
                 <DoorOpen className="w-8 h-8 text-orange-500" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-widest text-white mb-2 group-hover:neon-text-orange transition-all">Taquilla en Puerta</h3>
                  <p className="text-xs text-zinc-400 font-bold max-w-xs">Registra ingresos manuales y ventas directas en la entrada del evento.</p>
               </div>
            </Link>

            <Link href="/admin/shop" className="group glass-panel bg-black/60 p-8 rounded-2xl hover:border-[#FFD700] transition-all flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden border border-zinc-800">
               <div className="absolute inset-x-0 bottom-0 h-1 bg-[#FFD700] transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
               <div className="w-16 h-16 rounded-full bg-[#FFD700]/10 flex items-center justify-center group-hover:bg-[#FFD700]/20 transition-all">
                 <ShoppingBag className="w-8 h-8 text-[#FFD700]" />
               </div>
               <div>
                  <h3 className="font-black uppercase tracking-widest text-white mb-2 group-hover:neon-text-orange transition-all">Inventario de Shop</h3>
                  <p className="text-xs text-zinc-400 font-bold max-w-xs">Crea productos, ajusta precios, gestiona categorías y controla el stock de la barra.</p>
               </div>
            </Link>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
