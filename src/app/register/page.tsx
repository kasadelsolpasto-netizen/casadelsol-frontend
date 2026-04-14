"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowRight, Lock, Mail, User } from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password_hash: password })
      });

      if (!res.ok) {
        throw new Error('Error al registrar usuario. Verifica tus datos.');
      }
      
      const loginRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        document.cookie = `kasa_auth_token=${data.access_token}; path=/; max-age=86400;`;
        localStorage.setItem('kasa_user', JSON.stringify(data.user));
        router.push('/');
      } else {
        router.push('/login');
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      {/* Brand */}
      <Link href="/" className="mb-12 group">
        <h1 className="text-4xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-neon-purple via-white to-neon-green group-hover:animate-glow transition-all">
          Kasa del Sol
        </h1>
        <div className="h-0.5 w-0 group-hover:w-full bg-neon-purple transition-all duration-300 mx-auto mt-2 neon-border-secondary"></div>
      </Link>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden">
        {/* Top border glowing line */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-purple to-transparent"></div>
        
        <h2 className="text-2xl font-bold mb-2 text-white">Join the Kasa</h2>
        <p className="text-zinc-400 mb-6 text-sm">Regístrate para comprar tickets, guardar tus QRs y recibir notificaciones.</p>
        
        {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">{error}</div>}

        <GoogleSignInButton className="mb-6" />

        <div className="flex items-center gap-4 mb-6">
          <div className="h-[1px] flex-1 bg-zinc-800"></div>
          <span className="text-zinc-500 text-xs uppercase font-bold tracking-widest">o regístrate con tu email</span>
          <div className="h-[1px] flex-1 bg-zinc-800"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Nombre Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-black/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                placeholder="Techno Raver"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-black/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
                placeholder="raver@example.com"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Password</label>
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
            className="w-full mt-8 bg-white text-black font-bold uppercase tracking-wider py-3.5 rounded-lg hover:bg-neon-purple hover:shadow-[0_0_20px_rgba(191,0,255,0.4)] hover:text-white disabled:opacity-50 transition-all flex justify-center items-center gap-2 group"
          >
            {loading ? 'Registrando...' : 'Registrarme'}
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-zinc-800/50 pt-6">
          <p className="text-zinc-500 text-sm">
            ¿Ya tienes cuenta? <Link href="/login" className="text-neon-purple hover:neon-text-secondary transition-all font-semibold">Inicia Sesión</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
