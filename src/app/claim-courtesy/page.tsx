"use client";
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Ticket, CheckCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import Link from 'next/link';

function ClaimCourtesyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courtesy, setCourtesy] = useState<any>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token no proporcionado.');
      setLoading(false);
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiEndpoint}/courtesies/claim/${token}`);
      const data = await res.json();

      if (res.ok) {
        setCourtesy(data);
        setName(data.name);
        setEmail(data.email);
      } else {
        setError(data.message || 'Enlace inválido o expirado.');
      }
    } catch (e) {
      setError('Error de conexión.');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiEndpoint}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      
      const data = await res.json();
      if (res.ok && data.access_token) {
        document.cookie = `kasa_auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem('kasa_user', JSON.stringify(data.user));
        
        // Redirigir a la bóveda
        router.push(`/profile/${data.user.id}`);
      } else {
        setError(data.message || 'Error al crear la cuenta. Si ya tienes cuenta, inicia sesión directamente en Kasa del Sol.');
      }
    } catch (e) {
      setError('Error de conexión al registrar.');
    }
    setRegistering(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-neon-purple animate-spin mb-4" />
        <p className="text-zinc-500 font-black uppercase tracking-widest animate-pulse text-sm">Validando Enlace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-950/30 rounded-full flex items-center justify-center mb-6 border border-red-900/50">
          <Ticket className="w-10 h-10 text-red-500 opacity-50" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white mb-2">Enlace no Válido</h1>
        <p className="text-zinc-500 font-bold max-w-md mb-8">{error}</p>
        <Link href="/" className="bg-white text-black font-black uppercase tracking-widest text-xs px-8 py-3 rounded-full hover:bg-zinc-200 transition-colors">
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col lg:flex-row">
      {/* Lado de Información del Evento */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-900 p-8 lg:p-16 flex flex-col justify-center min-h-[40vh]">
        <div className="absolute top-0 left-0 w-full h-full bg-neon-purple/5 opacity-50 pointer-events-none"></div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-neon-purple/20 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="relative z-10 max-w-lg">
          <div className="inline-flex items-center gap-2 bg-neon-purple/20 border border-neon-purple/50 text-neon-purple px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6">
            <Zap className="w-3 h-3" /> Cortesía Oficial
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-black uppercase tracking-tighter text-white leading-none mb-4">
            ¡Estás Invitado!
          </h1>
          <p className="text-zinc-400 font-bold text-lg mb-8">
            Kasa del Sol te ha otorgado una entrada de cortesía para el evento <span className="text-white">"{courtesy?.event?.title}"</span>.
          </p>

          <div className="bg-black/50 border border-zinc-800 p-6 rounded-2xl backdrop-blur-md">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">Detalles de tu Entrada</p>
            <div className="flex justify-between items-center border-b border-zinc-900 pb-4 mb-4">
              <span className="text-white font-bold">{courtesy?.ticket_type?.name}</span>
              <span className="text-neon-green font-black">GRATIS</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-zinc-500">A nombre de:</span>
              <span className="text-white font-bold uppercase">{courtesy?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lado de Registro */}
      <div className="flex-1 flex flex-col justify-center p-8 lg:p-16 relative">
        <div className="max-w-md w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl font-black uppercase text-white mb-2">Reclama tu Entrada</h2>
            <p className="text-zinc-500 font-bold text-sm">
              Crea tu cuenta segura en Kasa del Sol para acceder a tu Bóveda (donde se guardará tu código QR único).
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Nombre Completo</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 flex justify-between">
                Correo Electrónico <span className="text-neon-green flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Verificado</span>
              </label>
              <input 
                type="email" 
                value={email} 
                disabled
                className="w-full bg-black border border-zinc-900 rounded-xl px-4 py-3 text-zinc-500 cursor-not-allowed opacity-70"
              />
              <p className="text-[10px] text-zinc-600 mt-2 font-bold">La cortesía está vinculada a este correo.</p>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Crea una Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors"
              />
            </div>

            <button 
              type="submit" 
              disabled={registering || password.length < 8}
              className="w-full mt-4 bg-neon-purple text-black font-black uppercase tracking-widest py-4 rounded-xl hover:shadow-[0_0_20px_rgba(168,85,247,0.4)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Reclamar Entrada <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-zinc-600 font-bold">
            ¿Ya tienes cuenta con este correo? <br/>
            <Link href="/login" className="text-neon-purple hover:underline">Inicia sesión aquí</Link> y tu cortesía se asignará automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ClaimCourtesyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="w-8 h-8 text-neon-purple animate-spin" /></div>}>
      <ClaimCourtesyContent />
    </Suspense>
  );
}
