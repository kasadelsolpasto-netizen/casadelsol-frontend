"use client";
import Link from 'next/link';
import { User, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('kasa_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch(e) {}
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('kasa_user');
    sessionStorage.removeItem('supremo_unlocked');
    document.cookie = 'kasa_auth_token=; path=/; max-age=0;';
    setUser(null);
    router.push('/login');
  };

  if (!mounted) return <header className="h-20 w-full bg-black/50 border-b border-zinc-800/50"></header>;

  return (
    <header className="w-full relative z-20 border-b border-zinc-800/50 bg-black/50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-neon-green to-neon-purple hover:animate-glow transition-all">
          Kasa del Sol
        </Link>
        <div className="flex items-center gap-4">
          {!user ? (
            <>
              <Link href="/login" className="text-sm font-bold uppercase tracking-wider text-zinc-300 hover:text-white transition-colors">
                Iniciar Sesión
              </Link>
              <Link href="/register" className="hidden md:flex items-center gap-2 bg-neon-purple text-white px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:shadow-[0_0_15px_rgba(191,0,255,0.4)] transition-all">
                Registrarse
              </Link>
            </>
          ) : (
            <div className="relative group/menu py-4"> {/* py-4 to increase hover catch area */}
              <button className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neon-green hover:text-white transition-colors cursor-pointer">
                <User className="w-5 h-5" />
                {user.name?.split(' ')[0]}
              </button>
              
              <div className="absolute right-0 top-full w-56 glass-panel rounded-xl border border-zinc-800 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all flex flex-col py-2 z-50 shadow-2xl translate-y-2 group-hover/menu:translate-y-0">
                {/* Perfil para todos los usuarios */}
                <Link href={`/profile/${user.id}`} className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-zinc-300 hover:text-neon-green hover:bg-zinc-900/50 transition-colors">
                  Mi Perfil & Bóveda
                </Link>
                {/* Herramientas exclusivas por rol */}
                {user.role === 'STAFF' && (
                  <Link href="/scanner" className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-colors border-y border-orange-500/20">
                    Modo Trabajador
                  </Link>
                )}
                {user.role === 'OWNER' && (
                  <Link href="/admin" className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-neon-purple hover:bg-neon-purple/10 transition-colors">
                    Dashboard Supremo
                  </Link>
                )}
                <div className="h-px bg-zinc-800/80 my-1 mx-2" />
                <button onClick={logout} className="w-full px-5 py-3 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-zinc-900/50 transition-colors text-left flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Cerrar Sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
