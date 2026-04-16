"use client";
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, ArrowRight, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const hasSiteKey = !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!token) {
    return (
      <div className="text-center animate-in fade-in">
        <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2 text-white uppercase tracking-widest">Enlace Inválido</h2>
        <p className="text-zinc-400 mb-6 text-sm">El enlace de recuperación está incompleto o corrupto.</p>
        <Link href="/forgot-password" className="text-neon-purple hover:text-white uppercase tracking-widest font-bold text-xs transition-colors">
          Solicitar nuevo enlace
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (password.length < 8) {
      setStatus('error');
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('error');
      setErrorMsg('Las contraseñas no coinciden. Intenta de nuevo.');
      return;
    }

    setStatus('loading');

    try {
      if (!executeRecaptcha) {
        setErrorMsg('El sistema de seguridad se está cargando. Por favor, espera un momento.');
        setStatus('idle');
        return;
      }
      const recaptchaToken = await executeRecaptcha('reset_password');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/reset-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'recaptcha-token': recaptchaToken
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'El enlace ha expirado o es inválido.');
      }

      setStatus('success');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="text-center py-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 bg-neon-green/10 text-neon-green rounded-full flex items-center justify-center mx-auto mb-4 border border-neon-green/30 shadow-[0_0_30px_rgba(57,255,20,0.2)]">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold mb-2 text-white uppercase tracking-widest">Bóveda Asegurada</h2>
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
          Tu contraseña ha sido actualizada con éxito. Redirigiendo al acceso...
        </p>
      </div>
    );
  }

  const passwordsMatch = password.length >= 8 && password === confirmPassword;

  return (
    <div className="animate-in fade-in duration-300">
      <h2 className="text-2xl font-bold mb-2 text-white uppercase tracking-widest">Nueva Contraseña</h2>
      <p className="text-zinc-400 mb-6 text-sm">
        Ingresa tu nueva clave de acceso. Recuerda usar al menos 8 caracteres.
      </p>

      {status === 'error' && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nueva Contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-black/50 border rounded-lg py-3 pl-10 pr-12 text-white placeholder-zinc-700 outline-none transition-all ${
                password.length > 0
                  ? password.length >= 8 ? 'border-neon-green/50 ring-1 ring-neon-green/20' : 'border-red-500/50 ring-1 ring-red-500/20'
                  : 'border-zinc-800'
              }`}
              placeholder="Mínimo 8 caracteres"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2 !mb-8">
          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex justify-between">
            Confirmar Contraseña
            {password.length >= 8 && confirmPassword.length > 0 && (
              passwordsMatch 
                ? <span className="text-neon-green lowercase tracking-normal animate-pulse">✓ coinciden</span>
                : <span className="text-red-500 lowercase tracking-normal">✗ no coinciden</span>
            )}
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input
              type={showConfirm ? "text" : "password"}
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full bg-black/50 border rounded-lg py-3 pl-10 pr-12 text-white placeholder-zinc-700 outline-none transition-all ${
                confirmPassword.length > 0
                  ? passwordsMatch ? 'border-neon-green/50 ring-1 ring-neon-green/20 shadow-[0_0_15px_rgba(57,255,20,0.1)]' : 'border-red-500/50 ring-1 ring-red-500/20'
                  : 'border-zinc-800'
              }`}
              placeholder="Repite la contraseña"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || !executeRecaptcha || !hasSiteKey}
          className="w-full bg-white text-black font-bold uppercase tracking-wider py-3.5 rounded-lg hover:bg-neon-green hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] disabled:opacity-50 transition-all flex justify-center items-center gap-2 group"
        >
          {!hasSiteKey ? 'Error: Falta Site Key' : !executeRecaptcha ? 'Cargando Seguridad...' : status === 'loading' ? 'Guardando...' : 'Cambiar Contraseña'}
          {status !== 'loading' && executeRecaptcha && hasSiteKey && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
        </button>
      </form>
    </div>
  );
}

// ── Wrapper con Suspense requerido por Next.js para useSearchParams ──
export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <Link href="/" className="mb-12 group">
        <h1 className="text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-neon-purple via-white to-neon-green group-hover:animate-glow transition-all">
          Kasa del Sol
        </h1>
      </Link>

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-purple to-transparent"></div>
        <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-neon-purple border-t-transparent animate-spin" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
