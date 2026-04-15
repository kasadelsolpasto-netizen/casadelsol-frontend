"use client";
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Server } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya hay sesión activa, redirigir al lugar correcto
  useEffect(() => {
    const rawUser = localStorage.getItem('kasa_user');
    if (rawUser) {
      try {
        const user = JSON.parse(rawUser);
        if (user.role === 'OWNER') {
          router.replace('/admin');
        } else {
          // Usuario normal/staff que llegó aquí → mandarlo al home
          router.replace('/');
        }
      } catch {
        localStorage.removeItem('kasa_user');
      }
    }
  }, [router]);

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
        throw new Error('Credenciales inválidas o acceso denegado pibe');
      }

      const data = await res.json();

      if (data.user?.role !== 'OWNER') {
        throw new Error('ACCESO DENEGADO: No tienes privilegios de administrador supremo.');
      }
      
      document.cookie = `kasa_auth_token=${data.access_token}; path=/; max-age=86400;`;
      localStorage.setItem('kasa_user', JSON.stringify(data.user));

      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-[#050000]">
      {/* Brand */}
      <div className="mb-12 group flex items-center gap-3">
        <Server className="w-10 h-10 text-red-600 animate-pulse" />
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest text-red-600">
            Kasa Root
          </h1>
          <p className="text-red-900 text-xs font-bold uppercase tracking-widest">Master Control Panel</p>
        </div>
      </div>

      <div className="w-full max-w-md bg-black/80 border-2 border-red-900/50 p-8 rounded-xl relative overflow-hidden shadow-[0_0_50px_rgba(255,0,0,0.15)]">
        {/* Top border glowing line */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-red-600 to-transparent"></div>
        
        <h2 className="text-xl font-black mb-2 text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          ACCESO RESTRINGIDO
        </h2>
        <p className="text-red-500/70 mb-6 text-sm font-semibold">Identificación requerida para el panel de administración.</p>
        
        {error && <div className="mb-6 p-3 bg-red-950 border border-red-600 rounded-lg text-red-500 text-sm py-4 font-bold max-w-full text-center">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-red-800">Admin Email</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-red-950/20 border border-red-900/50 rounded-lg py-3 px-4 text-white placeholder-red-900/50 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
                placeholder="root@system"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black uppercase tracking-widest text-red-800">Root Password</label>
            </div>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-red-950/20 border border-red-900/50 rounded-lg py-3 px-4 text-white placeholder-red-900/50 outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-8 bg-black border-2 border-red-600 text-red-600 font-black uppercase tracking-widest py-3.5 rounded-lg hover:bg-red-600 hover:text-black hover:shadow-[0_0_30px_rgba(255,0,0,0.5)] disabled:opacity-50 transition-all flex justify-center items-center gap-2 group"
          >
            {loading ? 'DESENCRIPTANDO...' : 'INICIAR SESIÓN MATRIZ'}
            {!loading && <KeyRound className="w-5 h-5 group-hover:rotate-90 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-red-900/30 pt-6">
          <Link href="/" className="text-red-900 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-1">
            Volver al mundo mortal
          </Link>
        </div>
      </div>
    </div>
  );
}
