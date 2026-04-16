"use client";
import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight, ArrowLeft, Lock, Mail, User, X, Ticket,
  CheckCircle, ChevronRight, Users, Trash2, Pencil,
  ChevronDown, ChevronUp, AlertTriangle, PlusCircle, Eye, EyeOff
} from 'lucide-react';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';

interface CheckoutWizardProps {
  isOpen: boolean;
  onClose: () => void;
  ticketType: any;
  onLaunchWompi: (attendees: any[], hp: string, recaptchaToken: string) => void;
  isLoading: boolean;
  error: string;
}

type AuthMode = 'LOGIN' | 'REGISTER';
type Step = 'auth' | 'quantity' | 'attendees' | 'confirm';

const EMPTY_ATTENDEE = () => ({ attendee_name: '', attendee_dni: '', attendee_email: '' });

export default function CheckoutWizard({
  isOpen, onClose, ticketType, onLaunchWompi, isLoading, error
}: CheckoutWizardProps) {
  const [step, setStep] = useState<Step>('auth');
  const { executeRecaptcha } = useGoogleReCaptcha();
  const hasSiteKey = !!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    console.log('🔍 [DEBUG-AUTH] CheckoutWizard State:', {
      step,
      hasSiteKey,
      siteKeyPrefix: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.substring(0, 6),
      isRecaptchaReady: !!executeRecaptcha
    });
  }, [executeRecaptcha, hasSiteKey, step]);

  // Auth
  const [authMode, setAuthMode] = useState<AuthMode>('LOGIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [hp, setHp] = useState(''); // Honeypot field

  const passwordsMatch = authPassword.length >= 8 && authPassword === authConfirmPassword;

  // Quantity + attendees
  const [quantity, setQuantity] = useState(1);
  const [attendees, setAttendees] = useState<any[]>([EMPTY_ATTENDEE()]);
  const [currentAttendeeIdx, setCurrentAttendeeIdx] = useState(0);

  // Confirm step: which card is expanded for editing
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  // Confirm step: which idx is pending deletion confirmation
  const [deleteConfirmIdx, setDeleteConfirmIdx] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // On open: detect auth
  useEffect(() => {
    if (!isOpen) return;
    setDeleteConfirmIdx(null);
    setExpandedIdx(null);
    const token = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='))?.split('=')[1];
    if (token) {
      try {
        const u = JSON.parse(localStorage.getItem('kasa_user') || 'null');
        setAttendees([{ attendee_name: u?.name || '', attendee_dni: '', attendee_email: u?.email || '' }]);
        setQuantity(1);
        setStep('quantity');
      } catch { setStep('auth'); }
    } else {
      setStep('auth');
      setQuantity(1);
      setAttendees([EMPTY_ATTENDEE()]);
    }
  }, [isOpen]);

  // Sync attendees array size with quantity
  useEffect(() => {
    setAttendees(prev => {
      const next = [...prev];
      while (next.length < quantity) next.push(EMPTY_ATTENDEE());
      next.splice(quantity);
      return next;
    });
    setCurrentAttendeeIdx(0);
  }, [quantity]);

  if (!isOpen) return null;

  const fmt = (n: number) =>
    Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const totalPrice = (ticketType?.price || 0) * attendees.length;

  // ─── AUTH ────────────────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authMode === 'REGISTER') {
      if (authPassword.length < 8) {
        setAuthError('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (authPassword !== authConfirmPassword) {
        setAuthError('Las contraseñas no coinciden.');
        return;
      }
    }

    try {
      if (!executeRecaptcha) {
        setAuthError('El sistema de seguridad se está cargando. Por favor espera un momento...');
        setAuthLoading(false);
        return;
      }
      const recaptchaToken = await executeRecaptcha(authMode === 'LOGIN' ? 'login' : 'register');

      if (authMode === 'REGISTER') {
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/register`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'recaptcha-token': recaptchaToken
          },
          body: JSON.stringify({ name: authName, email: authEmail, password_hash: authPassword, hp })
        });
        if (!r.ok) throw new Error('El email ya existe o los datos son inválidos.');
      }
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'recaptcha-token': recaptchaToken
        },
        body: JSON.stringify({ email: authEmail, password: authPassword, hp })
      });
      if (!r.ok) throw new Error('Email o contraseña inválidos.');
      const data = await r.json();
      document.cookie = `kasa_auth_token=${data.access_token}; path=/; max-age=86400;`;
      localStorage.setItem('kasa_user', JSON.stringify(data.user));
      setAttendees([{ attendee_name: data.user?.name || '', attendee_dni: '', attendee_email: data.user?.email || '' }]);
      setStep('quantity');
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // ─── ATTENDEE WIZARD (step: attendees) ────────────────────────────────────
  const currentAttendee = attendees[currentAttendeeIdx] || EMPTY_ATTENDEE();
  const updateCurrent = (field: string, value: string) => {
    const copy = [...attendees];
    copy[currentAttendeeIdx] = { ...copy[currentAttendeeIdx], [field]: value };
    setAttendees(copy);
  };
  const canAdvance = currentAttendee.attendee_name.trim() && currentAttendee.attendee_dni.trim() && currentAttendee.attendee_email.trim();

  const goNext = () => {
    if (currentAttendeeIdx < attendees.length - 1) setCurrentAttendeeIdx(i => i + 1);
    else { setExpandedIdx(null); setDeleteConfirmIdx(null); setStep('confirm'); }
  };
  const goPrev = () => {
    if (currentAttendeeIdx > 0) setCurrentAttendeeIdx(i => i - 1);
    else setStep('quantity');
  };

  // ─── CONFIRM: edit inline ────────────────────────────────────────────────────
  const updateConfirmAttendee = (idx: number, field: string, value: string) => {
    const copy = [...attendees];
    copy[idx] = { ...copy[idx], [field]: value };
    setAttendees(copy);
  };

  // ─── CONFIRM: delete ────────────────────────────────────────────────────────
  const deleteAttendee = (idx: number) => {
    const next = attendees.filter((_, i) => i !== idx);
    setAttendees(next);
    setQuantity(next.length);
    setDeleteConfirmIdx(null);
    setExpandedIdx(null);
  };

  const allConfirmValid = attendees.every(a => a.attendee_name.trim() && a.attendee_dni.trim() && a.attendee_email.trim());

  // ─── TOP ACCENT COLOR ────────────────────────────────────────────────────────
  const accentGradient =
    step === 'auth' ? 'from-transparent via-neon-purple to-transparent' :
    step === 'quantity' ? 'from-transparent via-neon-green to-transparent' :
    step === 'attendees' ? 'from-transparent via-blue-500 to-transparent' :
    'from-transparent via-neon-green to-transparent';

  const inputCls = 'w-full bg-black border border-zinc-800 rounded-xl py-3 px-4 text-white text-sm placeholder-zinc-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all';

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md overflow-y-auto flex justify-center items-start pt-6 pb-6 px-4 sm:items-center sm:pt-4 sm:pb-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      {/* Sheet: Scrollable outer wrapper prevents keyboard from cutting inputs */}
      <div
        className="w-full max-w-md bg-[#090909] border border-zinc-800/80 rounded-2xl relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col mt-auto mb-auto max-h-[calc(100dvh-3rem)] sm:max-h-[85dvh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Accent line */}
        <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r transition-all duration-500 ${accentGradient}`} />

        {/* Close btn */}
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-white transition-colors z-10 p-1">
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable body */}
        <div ref={scrollRef} className="overflow-y-auto flex-1 overscroll-contain">

          {/* ═══════════ STEP: AUTH ═══════════════════════════════════════════ */}
          {step === 'auth' && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-neon-purple/15 border border-neon-purple/30 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4 text-neon-purple" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-widest leading-none">Accede a la Kasa</h2>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-0.5">Para asegurar tu entrada</p>
                </div>
              </div>

              {authError && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold uppercase text-center">
                  {authError}
                </div>
              )}

              <div className="flex bg-black border border-zinc-800 rounded-xl p-1 mb-5">
                <button onClick={() => setAuthMode('LOGIN')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${authMode === 'LOGIN' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}>
                  Iniciar Sesión
                </button>
                <button onClick={() => setAuthMode('REGISTER')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${authMode === 'REGISTER' ? 'bg-neon-purple text-white' : 'text-zinc-500 hover:text-white'}`}>
                  Registrarse
                </button>
              </div>

              <GoogleSignInButton className="mb-4" />

              <div className="flex items-center gap-4 mb-4">
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">o con tu email</span>
                <div className="h-[1px] flex-1 bg-zinc-800"></div>
              </div>

              <form onSubmit={handleAuth} className="space-y-3.5">
                {/* Honeypot perimetral */}
                <div className="absolute -left-[9999px] -top-[9999px] opacity-0 pointer-events-none">
                  <input type="text" tabIndex={-1} value={hp} onChange={e => setHp(e.target.value)} placeholder="Confirm Request" />
                </div>
                {authMode === 'REGISTER' && (
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                    <input type="text" required value={authName} onChange={e => setAuthName(e.target.value)}
                      placeholder="Nombre completo"
                      className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder-zinc-700 outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all" />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                  <input type="email" required value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder-zinc-700 outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all" />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                  <input type={showPassword ? "text" : "password"} required minLength={authMode === 'REGISTER' ? 8 : undefined} value={authPassword} onChange={e => setAuthPassword(e.target.value)}
                    placeholder="Contraseña"
                    className={`w-full bg-black border rounded-xl py-3 pl-10 pr-12 text-white text-sm placeholder-zinc-700 outline-none transition-all ${
                        authMode === 'REGISTER' && authPassword.length > 0
                          ? (authPassword.length >= 8 ? 'border-neon-green/30 ring-1 ring-neon-green/10' : 'border-red-500/30 ring-1 ring-red-500/10')
                          : 'border-zinc-800 focus:border-neon-green focus:ring-1 focus:ring-neon-green'
                    }`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {authMode === 'REGISTER' && (
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                    <input type={showConfirm ? "text" : "password"} required value={authConfirmPassword} onChange={e => setAuthConfirmPassword(e.target.value)}
                      placeholder="Confirmar contraseña"
                      className={`w-full bg-black border rounded-xl py-3 pl-10 pr-12 text-white text-sm placeholder-zinc-700 outline-none transition-all ${
                          authConfirmPassword.length > 0
                            ? (passwordsMatch ? 'border-neon-green/30 ring-1 ring-neon-green/10' : 'border-red-500/30 ring-1 ring-red-500/10')
                            : 'border-zinc-800 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple'
                      }`} />
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors">
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {authConfirmPassword.length > 0 && (
                      <div className="absolute -bottom-5 right-1">
                        {passwordsMatch 
                          ? <span className="text-[9px] text-neon-green font-black uppercase tracking-widest animate-pulse">✓ Coinciden</span>
                          : <span className="text-[9px] text-red-500 font-black uppercase tracking-widest">✗ Diferentes</span>
                        }
                      </div>
                    )}
                  </div>
                )}
                <button type="submit" disabled={authLoading || !executeRecaptcha || !hasSiteKey}
                  className="w-full bg-white hover:bg-neon-green text-black font-black uppercase tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 mt-2">
                  {!hasSiteKey ? 'Error: Falta Site Key' : !executeRecaptcha ? 'Cargando Seguridad...' : authLoading ? 'Verificando...' : authMode === 'LOGIN' ? 'Entrar y Comprar' : 'Crear cuenta y Comprar'}
                  {!authLoading && executeRecaptcha && hasSiteKey && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>
            </div>
          )}

          {/* ═══════════ STEP: QUANTITY ═══════════════════════════════════════ */}
          {step === 'quantity' && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-neon-green/10 border border-neon-green/25 flex items-center justify-center shrink-0">
                  <Ticket className="w-4 h-4 text-neon-green" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-widest leading-none">¿Cuántas entradas?</h2>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-0.5">{ticketType?.name}</p>
                </div>
              </div>

              {/* Ticket info pill */}
              <div className="flex items-center justify-between bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 mb-5">
                <span className="text-zinc-300 text-sm font-bold">{ticketType?.name}</span>
                <div className="text-right">
                  <span className="text-white font-black">{fmt(ticketType?.price)}</span>
                  <span className="text-zinc-600 text-xs ml-1">c/u</span>
                </div>
              </div>

              {/* Big quantity selector */}
              <div className="flex items-stretch bg-black border border-zinc-800 rounded-xl overflow-hidden mb-5">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} disabled={quantity <= 1}
                  className="flex-1 text-3xl font-black text-white hover:bg-zinc-900 transition-colors disabled:opacity-25 active:scale-95 py-5 border-r border-zinc-800">
                  −
                </button>
                <div className="flex-1 flex flex-col items-center justify-center py-5 select-none">
                  <span className="text-5xl font-black text-white leading-none">{quantity}</span>
                  <span className="text-[10px] text-zinc-600 uppercase tracking-widest mt-1">
                    {quantity === 1 ? 'entrada' : 'entradas'}
                  </span>
                </div>
                <button onClick={() => setQuantity(q => Math.min(q + 1, ticketType?.available || 10))}
                  disabled={quantity >= (ticketType?.available || 10)}
                  className="flex-1 text-3xl font-black text-white hover:bg-zinc-900 transition-colors disabled:opacity-25 active:scale-95 py-5 border-l border-zinc-800">
                  +
                </button>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center bg-neon-green/5 border border-neon-green/20 rounded-xl px-4 py-3.5 mb-5">
                <span className="text-zinc-300 text-sm font-bold uppercase tracking-widest">Total</span>
                <span className="text-neon-green font-black text-xl">{fmt(totalPrice)}</span>
              </div>

              <button onClick={() => { setCurrentAttendeeIdx(0); setStep('attendees'); }}
                className="w-full bg-neon-green text-black font-black uppercase tracking-widest py-4 rounded-xl hover:shadow-[0_0_20px_rgba(57,255,20,0.35)] transition-all flex items-center justify-center gap-2 group active:scale-[0.98]">
                Continuar
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* ═══════════ STEP: ATTENDEES (one card at a time) ════════════════ */}
          {step === 'attendees' && (
            <div className="p-6">
              {/* Progress dots */}
              <div className="flex gap-1.5 mb-5">
                {attendees.map((_, i) => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                    i < currentAttendeeIdx ? 'bg-neon-green' :
                    i === currentAttendeeIdx ? 'bg-neon-green/50 animate-pulse' : 'bg-zinc-800'
                  }`} />
                ))}
              </div>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center font-black text-blue-400 text-sm shrink-0 select-none">
                  {currentAttendeeIdx + 1}
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-widest leading-none">
                    {currentAttendeeIdx === 0 ? 'Tus datos' : `Asistente ${currentAttendeeIdx + 1}`}
                  </h2>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-0.5">
                    {currentAttendeeIdx + 1} de {attendees.length}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-1.5">Nombre Completo *</label>
                  <input autoFocus type="text" value={currentAttendee.attendee_name}
                    onChange={e => updateCurrent('attendee_name', e.target.value)}
                    placeholder="Juan Pérez"
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-1.5">Cédula / Documento *</label>
                  <input type="text" inputMode="numeric" value={currentAttendee.attendee_dni}
                    onChange={e => updateCurrent('attendee_dni', e.target.value)}
                    placeholder="1 000 000 000"
                    className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-1.5">Correo Electrónico *</label>
                  <input type="email" value={currentAttendee.attendee_email}
                    onChange={e => updateCurrent('attendee_email', e.target.value)}
                    placeholder="juan@correo.com"
                    className={inputCls} />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={goPrev}
                  className="flex items-center gap-1.5 px-5 py-3.5 rounded-xl border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest active:scale-95 shrink-0">
                  <ArrowLeft className="w-4 h-4" /> Atrás
                </button>
                <button onClick={goNext} disabled={!canAdvance}
                  className="flex-1 py-3.5 rounded-xl bg-white text-black font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 group hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]">
                  {currentAttendeeIdx < attendees.length - 1 ? 'Siguiente' : 'Revisar'}
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {/* ═══════════ STEP: CONFIRM ════════════════════════════════════════ */}
          {step === 'confirm' && (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-neon-green/10 border border-neon-green/25 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-neon-green" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-widest leading-none">Revisa tu compra</h2>
                  <p className="text-[11px] text-zinc-500 uppercase tracking-widest mt-0.5">Edita o elimina antes de pagar</p>
                </div>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold uppercase text-center">
                  {error}
                </div>
              )}

              {/* Attendee list */}
              <div className="space-y-2 mb-4">
                {attendees.map((att, idx) => {
                  const isExpanded = expandedIdx === idx;
                  const isPendingDelete = deleteConfirmIdx === idx;
                  const isValid = att.attendee_name.trim() && att.attendee_dni.trim() && att.attendee_email.trim();

                  return (
                    <div key={idx}
                      className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                        isPendingDelete ? 'border-red-500/50 bg-red-500/5' :
                        isExpanded ? 'border-blue-500/50 bg-blue-500/5' :
                        isValid ? 'border-zinc-800 bg-black/40' : 'border-orange-500/50 bg-orange-500/5'
                      }`}>

                      {/* Card header */}
                      <div className="flex items-center gap-3 p-3.5">
                        {/* Number bubble */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] shrink-0 ${
                          isValid ? 'bg-neon-green/20 border border-neon-green/40 text-neon-green' : 'bg-orange-500/20 border border-orange-500/40 text-orange-400'
                        }`}>{idx + 1}</div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate leading-tight">
                            {att.attendee_name || <span className="text-orange-400 text-xs">Sin nombre</span>}
                          </p>
                          <p className="text-zinc-500 text-[11px] truncate">
                            {att.attendee_email || 'Sin correo'}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* Edit toggle */}
                          <button
                            onClick={() => { setExpandedIdx(isExpanded ? null : idx); setDeleteConfirmIdx(null); }}
                            className={`p-2 rounded-lg transition-colors ${isExpanded ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                            title="Editar">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                          </button>
                          {/* Delete — only if more than 1 */}
                          {attendees.length > 1 && (
                            <button
                              onClick={() => { setDeleteConfirmIdx(isPendingDelete ? null : idx); setExpandedIdx(null); }}
                              className={`p-2 rounded-lg transition-colors ${isPendingDelete ? 'bg-red-500/20 text-red-400' : 'text-zinc-600 hover:text-red-400 hover:bg-red-500/10'}`}
                              title="Eliminar">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Delete confirm panel */}
                      {isPendingDelete && (
                        <div className="border-t border-red-500/20 bg-red-500/5 px-4 py-3 flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <p className="text-red-300 text-xs font-bold flex-1">¿Eliminar a {att.attendee_name || 'este asistente'}?</p>
                          <button onClick={() => setDeleteConfirmIdx(null)}
                            className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors font-bold uppercase tracking-widest">
                            No
                          </button>
                          <button onClick={() => deleteAttendee(idx)}
                            className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-widest">
                            Sí, eliminar
                          </button>
                        </div>
                      )}

                      {/* Inline edit form */}
                      {isExpanded && !isPendingDelete && (
                        <div className="border-t border-blue-500/20 px-4 py-4 space-y-3">
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-1">Nombre Completo</label>
                            <input type="text" value={att.attendee_name}
                              onChange={e => updateConfirmAttendee(idx, 'attendee_name', e.target.value)}
                              className={inputCls} placeholder="Juan Pérez" />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-1">Cédula / Documento</label>
                            <input type="text" inputMode="numeric" value={att.attendee_dni}
                              onChange={e => updateConfirmAttendee(idx, 'attendee_dni', e.target.value)}
                              className={inputCls} placeholder="1 000 000 000" />
                          </div>
                          <div>
                            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-1">Correo Electrónico</label>
                            <input type="email" value={att.attendee_email}
                              onChange={e => updateConfirmAttendee(idx, 'attendee_email', e.target.value)}
                              className={inputCls} placeholder="juan@correo.com" />
                          </div>
                          <button onClick={() => setExpandedIdx(null)}
                            className="w-full py-2.5 text-xs font-black uppercase tracking-widest text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-colors flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Listo
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add another attendee button */}
              {attendees.length < (ticketType?.available || 10) && (
                <button
                  onClick={() => {
                    const next = [...attendees, EMPTY_ATTENDEE()];
                    setAttendees(next);
                    setQuantity(next.length);
                    setExpandedIdx(next.length - 1); // auto-expand the new card
                    setDeleteConfirmIdx(null);
                  }}
                  className="w-full mb-3 py-3 rounded-xl border border-dashed border-zinc-700 hover:border-neon-green/60 text-zinc-500 hover:text-neon-green transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 group active:scale-[0.98]"
                >
                  <PlusCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  Añadir otra entrada
                </button>
              )}

              {/* Total bar */}
              <div className="flex justify-between items-center bg-neon-green/5 border border-neon-green/20 rounded-xl px-4 py-3.5 mb-4">
                <div>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{attendees.length}× {ticketType?.name}</p>
                  <p className="text-white font-black text-lg leading-tight">{fmt(totalPrice)}</p>
                </div>
                <button onClick={() => { setExpandedIdx(null); setDeleteConfirmIdx(null); setStep('quantity'); }}
                  className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest underline transition-colors">
                  Cambiar
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button onClick={() => { setExpandedIdx(null); setDeleteConfirmIdx(null); setCurrentAttendeeIdx(attendees.length - 1); setStep('attendees'); }}
                  className="flex items-center gap-1.5 px-4 py-3.5 rounded-xl border border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white transition-all text-xs font-black uppercase tracking-widest active:scale-95 shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (!executeRecaptcha) return;
                    const token = await executeRecaptcha('checkout');
                    onLaunchWompi(attendees, hp, token); 
                  }}
                  disabled={isLoading || !allConfirmValid}
                  className="flex-1 py-4 rounded-xl bg-neon-green text-black font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:shadow-[0_0_25px_rgba(57,255,20,0.45)] disabled:opacity-50 disabled:cursor-not-allowed group active:scale-[0.98]">
                  {isLoading ? 'Abriendo Wompi...' : `Pagar ${fmt(totalPrice)}`}
                  {!isLoading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </button>
              </div>

              {!allConfirmValid && (
                <p className="text-center text-orange-400 text-[10px] uppercase tracking-widest font-bold mt-3">
                  Completa los datos de todos los asistentes para continuar
                </p>
              )}
            </div>
          )}

        </div>
        {/* Safe-area spacer for iOS */}
        <div className="h-safe-area-bottom pb-env-safe" />
      </div>
    </div>
  );
}
