"use client";
import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStatus('loading');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        throw new Error('Ha ocurrido un error inesperado al solicitar el correo.');
      }

      setStatus('success');
    } catch (err: any) {
      setError(err.message);
      setStatus('idle');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <Link href="/" className="mb-12 group">
        <h1 className="text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-neon-green via-white to-neon-purple group-hover:animate-glow transition-all">
          Kasa del Sol
        </h1>
      </Link>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-green to-transparent"></div>
        
        {status === 'success' ? (
          <div className="text-center py-6 animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-neon-green/10 text-neon-green rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-green/30 shadow-[0_0_30px_rgba(57,255,20,0.2)]">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-2 text-white uppercase tracking-widest">Enlace Enviado</h2>
            <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
              Si existe una cuenta asociada a <span className="text-white font-semibold">{email}</span>, acabamos de enviarte un enlace de recuperación.
            </p>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-8">
              <p className="text-yellow-400 text-xs font-bold uppercase tracking-wide">
                ⚠️ Por favor revisa bien tu carpeta de spam o correo no deseado por si acaso.
              </p>
            </div>
            <Link href="/login" className="text-neon-green hover:text-white uppercase tracking-widest font-bold text-xs transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver al Login
            </Link>
          </div>
        ) : (
          <div className="animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold mb-2 text-white uppercase tracking-widest">Recuperar Acceso</h2>
            <p className="text-zinc-400 mb-6 text-sm">
              Ingresa el correo electrónico asociado a tu Bóveda. Te enviaremos instrucciones de seguridad.
            </p>

            {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-zinc-800 rounded-lg py-3 pl-10 pr-4 text-white placeholder-zinc-700 outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all"
                    placeholder="raver@example.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-white text-black font-bold uppercase tracking-wider py-3.5 rounded-lg hover:bg-neon-green hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] disabled:opacity-50 transition-all flex justify-center items-center gap-2"
              >
                {status === 'loading' ? 'Enviando...' : 'Enviar Enlace Mágico'}
              </button>
            </form>

            <div className="mt-8 text-center border-t border-zinc-800 pt-6">
              <Link href="/login" className="text-zinc-500 hover:text-white uppercase tracking-widest font-bold text-xs transition-colors flex items-center justify-center gap-2 w-fit mx-auto">
                <ArrowLeft className="w-3 h-3" /> Volver atrás
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
