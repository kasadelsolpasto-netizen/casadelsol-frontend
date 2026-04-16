"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Lock, Mail, User, Eye, EyeOff } from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();
  const hasSiteKey = !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    console.log('🔍 [DEBUG-AUTH] RegisterPage State:', {
      hasSiteKey,
      siteKeyPrefix: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.substring(0, 6),
      isRecaptchaReady: !!executeRecaptcha
    });
  }, [executeRecaptcha, hasSiteKey]);

  const [hp, setHp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordsMatch = password.length >= 8 && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);

    try {
      if (!executeRecaptcha) {
        setError('El sistema de seguridad se está cargando. Por favor espera un momento...');
        setLoading(false);
        return;
      }
      const recaptchaToken = await executeRecaptcha('register');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'recaptcha-token': recaptchaToken
        },
        body: JSON.stringify({ name, email, password_hash: password, hp })
      });

      if (res.ok) {
        const data = await res.json();
        document.cookie = `kasa_auth_token=${data.access_token}; path=/; max-age=86400;`;
        localStorage.setItem('kasa_user', JSON.stringify(data.user));
        router.push(`/profile/${data.user.id}`);
      } else {
        const errData = await res.json().catch(() => ({ message: 'Error al registrar usuario.' }));
        throw new Error(errData.message || 'Error al registrar usuario. Verifica tus datos.');
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
          {/* Honeypot */}
          <input type="text" name="hp" value={hp} onChange={e => setHp(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" />

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
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full bg-black/50 border rounded-lg py-3 pl-10 pr-12 text-white placeholder-zinc-700 outline-none transition-all ${
                  password.length > 0
                    ? password.length >= 8 ? 'border-neon-green/50 ring-1 ring-neon-green/20' : 'border-red-500/50 ring-1 ring-red-500/20'
                    : 'border-zinc-800'
                }`}
                placeholder="Mínimo 8 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex justify-between">
              Confirmar Contraseña
              {password.length >= 8 && confirmPassword.length > 0 && (
                passwordsMatch 
                  ? <span className="text-[10px] text-neon-green font-black animate-pulse">✓ COINCIDEN</span>
                  : <span className="text-[10px] text-red-500 font-black">✗ NO COINCIDEN</span>
              )}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
              <input 
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className={`w-full bg-black/50 border rounded-lg py-3 pl-10 pr-12 text-white placeholder-zinc-700 outline-none transition-all ${
                  confirmPassword.length > 0
                    ? passwordsMatch ? 'border-neon-green/50 ring-1 ring-neon-green/20 shadow-[0_0_15px_rgba(57,255,20,0.1)]' : 'border-red-500/50 ring-1 ring-red-500/20'
                    : 'border-zinc-800'
                }`}
                placeholder="Repite tu contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading || !executeRecaptcha || !hasSiteKey}
            className="w-full mt-8 bg-white text-black font-bold uppercase tracking-wider py-3.5 rounded-lg hover:bg-neon-purple hover:shadow-[0_0_20px_rgba(191,0,255,0.4)] hover:text-white disabled:opacity-50 transition-all flex justify-center items-center gap-2 group"
          >
            {!hasSiteKey ? 'Error: Falta Site Key' : !executeRecaptcha ? 'Cargando Seguridad...' : loading ? 'Registrando...' : 'Registrarme'}
            {!loading && executeRecaptcha && hasSiteKey && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
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
