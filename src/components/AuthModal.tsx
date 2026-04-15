"use client";
import { useState } from 'react';
import { ArrowRight, Lock, Mail, User, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'REGISTER') {
        const resReg = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password_hash: password })
        });
        if (!resReg.ok) throw new Error('Error al registrar usuario. Verifica tus datos o el email ya existe.');
      }

      // Siempre iniciamos sesión (sea directo o después de registrar)
      const resLogin = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }) 
      });

      if (!resLogin.ok) throw new Error('Credenciales inválidas o error de conexión');

      const data = await resLogin.json();

      // Limpiar residuos de sesión de admin anterior
      sessionStorage.removeItem('supremo_unlocked');

      document.cookie = `kasa_auth_token=${data.access_token}; path=/; max-age=86400;`;
      localStorage.setItem('kasa_user', JSON.stringify(data.user));

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md bg-[#0a0a0a] border border-zinc-800 rounded-2xl relative overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        
        {/* Glow Effects */}
        <div className={`absolute top-0 left-0 w-full h-[2px] transition-colors duration-500 ${mode === 'LOGIN' ? 'bg-gradient-to-r from-transparent via-neon-green to-transparent' : 'bg-gradient-to-r from-transparent via-neon-purple to-transparent'}`}></div>
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-black uppercase text-white tracking-widest mb-2">
            {mode === 'LOGIN' ? 'Log In' : 'Join the Kasa'}
          </h2>
          <p className="text-zinc-400 mb-6 text-sm font-semibold">
            {mode === 'LOGIN' 
              ? 'Ingresa para asegurar tus boletas y continuar el pago.' 
              : 'Únete para obtener tus boletas al instante.'}
          </p>

          {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-xs font-bold text-center uppercase">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'REGISTER' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nombre Completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className={`w-full bg-black border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all`}
                    placeholder="Techno Raver"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input 
                  type="email" 
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className={`w-full bg-black border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none transition-all ${mode === 'LOGIN' ? 'focus:border-neon-green focus:ring-1 focus:ring-neon-green' : 'focus:border-neon-purple focus:ring-1 focus:ring-neon-purple'}`}
                  placeholder="raver@example.com"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input 
                  type="password" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className={`w-full bg-black border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none transition-all ${mode === 'LOGIN' ? 'focus:border-neon-green focus:ring-1 focus:ring-neon-green' : 'focus:border-neon-purple focus:ring-1 focus:ring-neon-purple'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full mt-6 text-black font-black uppercase tracking-widest py-3.5 rounded-lg disabled:opacity-50 transition-all flex justify-center items-center gap-2 group ${
                mode === 'LOGIN' 
                  ? 'bg-white hover:bg-neon-green hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]' 
                  : 'bg-white hover:bg-neon-purple hover:text-white hover:shadow-[0_0_20px_rgba(191,0,255,0.4)]'
              }`}
            >
              {loading ? 'Procesando...' : (mode === 'LOGIN' ? 'Entrar y Pagar' : 'Registrar y Pagar')}
              {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-6 text-center pt-6 border-t border-zinc-800">
            {mode === 'LOGIN' ? (
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                ¿Primera vez en la Kasa? <button onClick={() => setMode('REGISTER')} className="text-neon-green hover:neon-text-primary transition-all ml-1">Regístrate</button>
              </p>
            ) : (
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                ¿Ya tienes cuenta? <button onClick={() => setMode('LOGIN')} className="text-neon-purple hover:neon-text-secondary transition-all ml-1">Inicia Sesión</button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
