"use client";
import { useEffect, useState } from 'react';
import { Lock, ArrowRight, Loader2, Play } from 'lucide-react';
import Link from 'next/link';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const isUnlocked = sessionStorage.getItem('supremo_unlocked');
    if (isUnlocked === 'true') {
      setUnlocked(true);
    }
    setChecking(false);
  }, []);

  const handleSupremoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (data.success && data.token) {
        // Desbloqueo Visual
        sessionStorage.setItem('supremo_unlocked', 'true');
        
        // Sincronizar las cookies y el localstorage para que JWT funcione
        document.cookie = `kasa_auth_token=${data.token}; path=/; max-age=86400;`;
        localStorage.setItem('kasa_user', JSON.stringify(data.user));

        setUnlocked(true);
      } else {
        setError(data.message || 'Error de Autenticación Suprema');
        setTimeout(() => setLoading(false), 800);
        return;
      }
    } catch (err) {
      setError('Error en la conexión con el núcleo');
    }
    setLoading(false);
  };

  if (checking) {
    return <div className="min-h-screen bg-black" />; // Evita flasheos
  }

  // SI NO ESTÁ DESBLOQUEADO, RENDERIZA ESTE FORMULARIO BRUTAL Y NADA MÁS.
  if (!unlocked) {
    return (
      <div className="fixed inset-0 z-[99999] bg-[#070000] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
        {/* Efecto Darkweb */}
        <div className="absolute top-[-30%] right-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[150px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[-30%] left-[-10%] w-[50%] h-[50%] bg-neon-purple/5 blur-[150px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-sm relative z-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-red-950/30 border border-red-900/50 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
               <Lock className="w-8 h-8 text-red-600 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-[0.3em] text-red-600">Bóveda Suprema</h1>
            <p className="text-[10px] text-zinc-500 font-mono mt-2 uppercase tracking-widest text-center">Protocolo de acceso restringido.<br/>Ingresa la llave maestra (.env)</p>
          </div>

          <form onSubmit={handleSupremoLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] text-red-500 uppercase tracking-widest font-black block">Identidad (Email)</label>
              <input 
                type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-black border-b border-red-900/50 py-3 text-red-200 outline-none focus:border-red-500 font-mono tracking-wider transition-colors placeholder-red-900/20"
                placeholder="supremo@..."
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-red-500 uppercase tracking-widest font-black block">Llave Encriptada</label>
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-black border-b border-red-900/50 py-3 text-red-200 outline-none focus:border-red-500 font-mono tracking-wider transition-colors placeholder-red-900/20"
                placeholder="**********"
              />
            </div>

            {error && (
               <div className="bg-red-950 border border-red-900 text-red-500 p-3 flex border-l-4 text-[10px] font-bold uppercase tracking-widest">
                 {error}
               </div>
            )}

            <button 
              type="submit" disabled={loading}
              className="w-full bg-red-800 hover:bg-red-600 text-black px-6 py-4 rounded font-black uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] flex justify-center items-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Play className="w-4 h-4 fill-black" />}
              {loading ? 'Validando...' : 'Desbloquear'}
            </button>
            <div className="flex justify-center pt-6">
               <Link href="/" className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                 <ArrowRight className="w-3 h-3 rotate-180" /> Evacuar al Sitio Público
               </Link>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SI LA LLAVE FUE VÁLIDA, ENTONCES Y SOLO ENTONCES DEJAMOS RENDERIZAR EL DASHBOARD REAL
  return <>{children}</>;
}
