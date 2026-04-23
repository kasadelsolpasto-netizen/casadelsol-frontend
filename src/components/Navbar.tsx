"use client";
import Link from 'next/link';
import { 
  Home, 
  Ticket, 
  ShoppingBag, 
  Tag, 
  Shield, 
  User, 
  LogOut, 
  LayoutDashboard,
  Settings,
  ChevronDown
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { UserAvatar } from '@/components/UserAvatar';

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [brandLogo, setBrandLogo] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const syncUser = () => {
      const stored = localStorage.getItem('kasa_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch(e) {}
      } else {
        setUser(null);
      }
    };

    const fetchBrand = async () => {
      const cachedLogo = localStorage.getItem('kasa_brand_logo');
      if (cachedLogo) setBrandLogo(cachedLogo);

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/settings/brand`);
        if (res.ok) {
          const data = await res.json();
          if (data.logoBase64 && data.logoBase64 !== cachedLogo) {
             setBrandLogo(data.logoBase64);
             localStorage.setItem('kasa_brand_logo', data.logoBase64);
          }
        }
      } catch(e) {}
    };

    syncUser();
    fetchBrand();
    window.addEventListener('storage', syncUser);
    return () => window.removeEventListener('storage', syncUser);
  }, []);

  const logout = () => {
    localStorage.removeItem('kasa_user');
    sessionStorage.removeItem('supremo_unlocked');
    document.cookie = 'kasa_auth_token=; path=/; max-age=0;';
    setUser(null);
    router.push('/login');
  };

  const isActive = (path: string) => pathname === path;

  if (!mounted) return <header className="h-28 w-full bg-black/50 border-b border-zinc-800/50"></header>;

  return (
    <header className="w-full relative z-[100] border-b border-zinc-900 bg-[#050505]/80 backdrop-blur-xl">
      {/* NIVEL 1: BRANDING & PROFILE */}
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-zinc-900/50">
        <Link href="/" className="flex items-center gap-3 group">
          {brandLogo ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:shadow-neon-green/30 transition-all duration-500">
               <img src={brandLogo} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10" />
          )}
          <span className="font-black uppercase tracking-[0.2em] text-sm text-white group-hover:text-neon-green transition-colors">
            Kasa del Sol
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {!user ? (
            <div className="flex items-center gap-6">
               <Link href="/login" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-all">
                  Login
               </Link>
               <Link href="/register" className="bg-white text-black px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-neon-green transition-all shadow-xl">
                  Unirse
               </Link>
            </div>
          ) : (
            <div className="relative group/user py-4">
               <button className="flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-800 pl-4 pr-3 py-2 rounded-full transition-all">
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">{user.name?.split(' ')[0]}</span>
                  <UserAvatar avatarId={user.avatar} className="w-6 h-6" />
                  <ChevronDown className="w-3 h-3 text-zinc-600 group-hover/user:rotate-180 transition-transform duration-300" />
               </button>

               <div className="absolute right-0 top-full mt-1 w-64 bg-black border border-zinc-800 rounded-3xl opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all duration-300 shadow-2xl overflow-hidden py-3 z-[110]">
                  <div className="px-5 py-4 border-b border-zinc-900 mb-2">
                     <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nombre de Raver</p>
                     <p className="text-sm font-black text-white">{user.name}</p>
                  </div>
                  
                  {user.role === 'OWNER' && (
                    <>
                      <Link href="/admin" className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-900 transition-colors group/item">
                         <LayoutDashboard className="w-4 h-4 text-neon-purple group-hover/item:scale-110 transition-transform" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Dashboard Supremo</span>
                      </Link>
                      <Link href="/admin/shop" className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-900 transition-colors group/item border-t border-zinc-900">
                         <ShoppingBag className="w-4 h-4 text-orange-500 group-hover/item:scale-110 transition-transform" />
                         <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Inventario Barra</span>
                      </Link>
                    </>
                  )}

                  {user.role === 'STAFF' && (
                    <Link href="/scanner" className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-900 transition-colors group/item">
                       <Settings className="w-4 h-4 text-orange-500 group-hover/item:scale-110 transition-transform" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Modo Trabajador</span>
                    </Link>
                  )}

                  <button onClick={logout} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/10 transition-colors group/item text-left">
                     <LogOut className="w-4 h-4 text-red-500 group-hover/item:scale-110 transition-transform" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Cerrar Sesión</span>
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* NIVEL 2: ICONIC NAVIGATION (ACCIONES TÁCTICAS) */}
      <nav className="h-16 max-w-2xl mx-auto flex items-center justify-around px-4">
         <Link href="/" className={`flex flex-col items-center gap-1 group relative ${isActive('/') ? 'text-neon-green' : 'text-zinc-600 hover:text-zinc-300'}`}>
            <Home className={`w-6 h-6 transition-all ${isActive('/') ? 'drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]' : 'group-hover:scale-110'}`} />
            <span className="text-[8px] font-black uppercase tracking-wider">Inicio</span>
            {isActive('/') && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-neon-green shadow-[0_0_10px_#39FF14]" />}
         </Link>

         <Link href="/#eventos" className={`flex flex-col items-center gap-1 group relative ${pathname === '/events' ? 'text-white' : 'text-zinc-600 hover:text-zinc-300'}`}>
            <Ticket className="w-6 h-6 transition-all group-hover:scale-110" />
            <span className="text-[8px] font-black uppercase tracking-wider">Eventos</span>
         </Link>

         <Link href="/shop" className={`flex flex-col items-center gap-1 group relative ${isActive('/shop') ? 'text-orange-500' : 'text-zinc-600 hover:text-zinc-300'}`}>
            <ShoppingBag className={`w-6 h-6 transition-all ${isActive('/shop') ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'group-hover:scale-110'}`} />
            <span className="text-[8px] font-black uppercase tracking-wider">Tienda</span>
            {isActive('/shop') && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" />}
         </Link>

         {user && (
           <>
              <Link href={`/promos`} className={`flex flex-col items-center gap-1 group relative ${pathname?.includes('promos') ? 'text-orange-500' : 'text-zinc-600 hover:text-zinc-300'}`}>
                 <Tag className={`w-6 h-6 transition-all ${pathname?.includes('promos') ? 'drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'group-hover:scale-110'}`} />
                 <span className="text-[8px] font-black uppercase tracking-wider">Promos</span>
                 {pathname?.includes('promos') && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-orange-500 shadow-[0_0_10px_#f97316]" />}
              </Link>

              <Link href={`/profile/${user.id}`} className={`flex flex-col items-center gap-1 group relative ${pathname?.includes(user.id) && !pathname?.includes('promos') ? 'text-neon-purple' : 'text-zinc-600 hover:text-zinc-300'}`}>
                 <Shield className={`w-6 h-6 transition-all ${isActive(`/profile/${user.id}`) ? 'drop-shadow-[0_0_8px_rgba(191,0,255,0.5)]' : 'group-hover:scale-110'}`} />
                 <span className="text-[8px] font-black uppercase tracking-wider">Bóveda</span>
                 {isActive(`/profile/${user.id}`) && <div className="absolute -bottom-2 w-1 h-1 rounded-full bg-neon-purple shadow-[0_0_10px_#bf00ff]" />}
              </Link>
           </>
         )}
      </nav>
    </header>
  );
}
