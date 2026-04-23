"use client";
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { QrCode, CalendarPlus, Users, Activity, Ticket, ArrowLeft, DoorOpen, ShoppingBag, Zap } from 'lucide-react';
import AdminLogoutButton from '@/components/AdminLogoutButton';
import AdminNotifications from '@/components/admin/AdminNotifications';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Si estamos en la página de login de admin, no aplicar el bloqueo
    if (pathname === '/admin/login') {
      setIsAuthorized(true);
      return;
    }

    const rawUser = localStorage.getItem('kasa_user');
    if (!rawUser) {
      // Sin sesión local → el usuario no es admin, mandar al home público
      router.push('/');
      return;
    }

    try {
      const user = JSON.parse(rawUser);
      // HARD CLIENT-SIDE GUARD: SOLO OWNER puede entrar al /admin
      if (user.role !== 'OWNER') {
        router.push('/');
        return;
      }
      setIsAuthorized(true);
    } catch {
      // Token corrupto → limpiar y mandar al home
      localStorage.removeItem('kasa_user');
      router.push('/');
    }
  }, [router, pathname]);

  if (!isAuthorized) {
    return <div className="min-h-screen bg-black text-red-600 font-black uppercase tracking-widest flex items-center justify-center animate-pulse">Bloqueo de Seguridad Activado...</div>;
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex bg-[#050505]">
      {/* Sidebar Navigation */}
      <aside className="hidden md:flex w-64 border-r border-zinc-800 bg-black/80 backdrop-blur fixed h-full flex-col pt-8 z-50">
        <div className="px-6 mb-8">
          <Link href="/">
            <h2 className="text-2xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-neon-purple to-neon-green hover:animate-glow transition-all">
              Kasa / Admin
            </h2>
          </Link>
          <p className="text-xs text-zinc-500 uppercase tracking-widest mt-1">Owner Dashboard</p>
          
          <button onClick={() => router.back()} className="mt-4 flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-widest transition-colors bg-zinc-900/50 py-2 px-3 rounded-lg border border-zinc-800 w-full justify-center hover:border-zinc-500">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver Atrás
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          <Link href="/admin" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname === '/admin' ? 'bg-zinc-900 border border-zinc-800 text-white font-bold neon-border-primary' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <Activity className={`w-4 h-4 ${pathname === '/admin' ? 'text-neon-green' : 'group-hover:text-neon-green'} transition-all`} /> Vista General
          </Link>
          <Link href="/admin/events" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname.startsWith('/admin/events') ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <CalendarPlus className={`w-4 h-4 ${pathname.startsWith('/admin/events') ? 'text-neon-purple' : 'group-hover:text-neon-purple'} transition-all`} /> Gestión Eventos
          </Link>
          <Link href="/admin/shop" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname.startsWith('/admin/shop') ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <ShoppingBag className={`w-4 h-4 ${pathname.startsWith('/admin/shop') ? 'text-orange-500' : 'group-hover:text-orange-500'} transition-all`} /> Inventario Shop
          </Link>
          <Link href="/admin/sales" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname.startsWith('/admin/sales') ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <Ticket className={`w-4 h-4 ${pathname.startsWith('/admin/sales') ? 'text-neon-green' : 'group-hover:text-neon-green'} transition-all`} /> Ventas & Métricas
          </Link>
          <Link href="/admin/staff" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname.startsWith('/admin/staff') ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <Users className="w-4 h-4 group-hover:text-neon-purple transition-all" /> Equipo & Staff
          </Link>
          <Link href="/admin/users" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname.startsWith('/admin/users') ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <Users className={`w-4 h-4 ${pathname.startsWith('/admin/users') ? 'text-neon-green' : 'group-hover:text-neon-green'} transition-all`} /> Comunidad (Ratings)
          </Link>
          <Link href="/admin/promoters" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname.startsWith('/admin/promoters') ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <Activity className={`w-4 h-4 ${pathname.startsWith('/admin/promoters') ? 'text-neon-purple' : 'group-hover:text-neon-purple'} transition-all`} /> Promotores
          </Link>
          <Link href="/admin/courtesies" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group ${pathname.startsWith('/admin/courtesies') ? 'bg-zinc-900 border border-zinc-800 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <Zap className={`w-4 h-4 ${pathname.startsWith('/admin/courtesies') ? 'text-neon-purple' : 'group-hover:text-neon-purple'} transition-all`} /> Cortesías VIP
          </Link>
          <Link href="/admin/settings" className={`flex items-center gap-3 px-4 py-3 rounded-lg tracking-wider text-sm transition-all group border border-dashed hover:border-solid hover:border-neon-purple ${pathname.startsWith('/admin/settings') ? 'bg-zinc-900 border-neon-purple text-white font-bold' : 'border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900'}`}>
            <Activity className="w-4 h-4 group-hover:text-neon-purple transition-all" /> Configuraciones
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <AdminLogoutButton />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="md:ml-64 flex-1 w-full bg-[#050505]">
        {children}
      </main>
      <AdminNotifications />
    </div>
  );
}
