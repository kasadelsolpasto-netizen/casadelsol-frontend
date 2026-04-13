"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Lock, Mail, Briefcase, Music } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingStaffData, setPendingStaffData] = useState<any>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }) 
      });

      if (!res.ok) {
        throw new Error('Credenciales inválidas o error de conexión');
      }

      const data = await res.json();
      
      document.cookie = `kasa_auth_token=${data.access_token}; path=/; max-age=86400;`;
      localStorage.setItem('kasa_user', JSON.stringify(data.user));

      if (data.user?.role === 'OWNER') {
        router.push('/admin');
      } else if (data.user?.role === 'STAFF') {
        setPendingStaffData(data.user);
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectStaffMode = (mode: 'WORK' | 'RITUAL') => {
    if (mode === 'RITUAL') {
      router.push(`/profile/${pendingStaffData.id}`);
    } else {
      router.push('/scanner'); // Redirige a UI operativa
    }
  };

  if (pendingStaffData) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070000] flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
         <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay"></div>
         <div className="relative z-10 w-full max-w-4xl text-center">
            <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest mb-4">Selector de Identidad</h1>
            <p className="text-zinc-500 uppercase tracking-widest text-sm font-bold mb-12">¿De qué lado de la fiesta estás hoy?</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <button onClick={() => selectStaffMode('RITUAL')} className="glass-panel p-12 border-2 border-transparent hover:border-neon-purple bg-black/60 hover:bg-neon-purple/10 flex flex-col items-center justify-center rounded-2xl transition-all group shadow-2xl">
                  <Music className="w-16 h-16 text-zinc-500 group-hover:text-neon-purple mb-6 transition-colors" />
                  <h2 className="text-2xl font-black uppercase text-white tracking-widest">Modo Fiesta</h2>
                  <p className="text-zinc-500 text-sm mt-4 font-semibold max-w-xs">Accede a tus boletas personales, perfil civil y beneficios.</p>
               </button>
               <button onClick={() => selectStaffMode('WORK')} className="glass-panel p-12 border-2 border-transparent hover:border-neon-green bg-black/60 hover:bg-neon-green/10 flex flex-col items-center justify-center rounded-2xl transition-all group shadow-2xl">
                  <Briefcase className="w-16 h-16 text-zinc-500 group-hover:text-neon-green mb-6 transition-colors" />
                  <h2 className="text-2xl font-black uppercase text-white tracking-widest">Modo Trabajo</h2>
                  <p className="text-zinc-500 text-sm mt-4 font-semibold max-w-xs">Activa el escáner de redención operativa y tus herramientas.</p>
               </button>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4">
      {/* Brand */}
      <Link href="/" className="mb-12 group">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-neon-green via-white to-neon-purple group-hover:animate-glow transition-all">
          Kasa del Sol
        </h1>
        <div className="h-0.5 w-0 group-hover:w-full bg-neon-green transition-all duration-300 mx-auto mt-2 neon-border-primary"></div>
      </Link>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden">
        {/* Top border glowing line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-green to-transparent"></div>
        
        <h2 className="text-2xl font-bold mb-2 text-white">Log In</h2>
        <p className="text-zinc-400 mb-6 text-sm">Ingresa al portal para conseguir tus entradas y QRs de acceso.</p>
        
        {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
                placeholder="raver@example.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Password</label>
              <Link href="#" className="text-xs text-neon-purple hover:neon-text-secondary transition-all">Forgot it?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-black/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-white text-black font-bold uppercase tracking-wider py-3.5 rounded-lg hover:bg-neon-green hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] disabled:opacity-50 transition-all flex justify-center items-center gap-2 group"
          >
            {loading ? 'Entrando...' : 'Entrar'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-800/50 pt-6">
          <p className="text-zinc-500 text-sm">
            ¿Primera vez en la Kasa? <Link href="/register" className="text-neon-green hover:neon-text-primary transition-all font-semibold">Regístrate</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
