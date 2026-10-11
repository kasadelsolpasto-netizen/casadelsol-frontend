"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, ArrowLeft, Loader2, ShieldAlert, DoorOpen, QrCode, DollarSign, CreditCard, Search, ChevronDown, WifiOff, RefreshCw, LogIn } from 'lucide-react';
import Link from 'next/link';
import { StaffGuard } from '@/components/StaffGuard';
import { API_URL as API, authFetch, getAuthToken, refreshSession } from '@/lib/session';
import { postScan, type ScanResult } from '@/lib/scan-client';

type ProblemKind = 'network' | 'server' | 'rate' | 'session' | 'forbidden';

type ScanStatus =
  | { type: 'idle' }
  | { type: 'loading'; note?: string }
  | { type: 'admitted'; name: string; ticket: string; time: string; replayed?: boolean }
  | { type: 'shop_success'; name: string; total: number }
  | { type: 'shop_error'; message: string }
  | { type: 'shop_order'; order: any; intent: 'PAY' | 'DELIVER' }
  | { type: 'already_used'; usedAt?: string; usedBy?: string }
  | { type: 'wrong_event'; message: string }
  | { type: 'invalid'; message: string }
  | { type: 'problem'; kind: ProblemKind; message: string };

type DniStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'admitted'; name: string; ticket: string; dni: string }
  | { type: 'already_used'; message: string }
  | { type: 'not_found'; message: string }
  | { type: 'error'; message: string };

type Mode = 'qr' | 'taquilla';
type NetState = { state: 'checking' | 'ok' | 'slow' | 'down'; ms?: number; dbDown?: boolean };

const PROBLEM_TITLE: Record<ProblemKind, string> = {
  network: 'SIN CONEXIÓN',
  server: 'SERVIDOR NO RESPONDE',
  rate: 'ESPERA UN MOMENTO',
  session: 'SESIÓN VENCIDA',
  forbidden: 'SIN PERMISO DE STAFF',
};

const refreshToken = async () => {
  const r = await refreshSession();
  return r.ok ? r.token : null;
};

const sinceText = (iso?: string) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return '';
  const m = Math.floor(Math.max(0, Date.now() - t) / 60000);
  if (m < 1) return 'hace instantes';
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h ${m % 60} min`;
};

const vibrate = (pattern: number | number[]) => {
  try { navigator.vibrate?.(pattern); } catch { /* no soportado */ }
};

/** Texto para fallos que NO son "entrada inválida" (cédula / taquilla). */
const problemText = (r: ScanResult): string => {
  switch (r.kind) {
    case 'session_expired': return 'Sesión vencida. Inicia sesión de nuevo.';
    case 'rate_limited': return 'Demasiadas consultas seguidas. Espera unos segundos.';
    case 'forbidden': return r.message;
    case 'server_error': return 'El servidor no respondió. Intenta de nuevo (la cédula sigue escrita).';
    case 'network': return 'Sin conexión con el servidor. Intenta de nuevo (la cédula sigue escrita).';
    default: return 'No se pudo completar la consulta.';
  }
};

function StatusStrip({ net, sessionExpired }: { net: NetState; sessionExpired: boolean }) {
  if (sessionExpired) {
    return (
      <Link href="/login?redirect=/scanner" className="flex items-center justify-center gap-2 w-full bg-red-600 text-white text-[11px] font-black uppercase tracking-widest py-2">
        <LogIn className="w-3.5 h-3.5" /> Sesión vencida · toca aquí para iniciar sesión
      </Link>
    );
  }
  const cfg =
    net.state === 'ok' ? { cls: 'bg-neon-green/10 text-neon-green', label: `EN LÍNEA · ${net.ms} ms` }
    : net.state === 'slow' ? { cls: 'bg-yellow-500/15 text-yellow-400', label: `CONEXIÓN LENTA · ${net.ms} ms` }
    : net.state === 'down' ? { cls: 'bg-red-600 text-white animate-pulse', label: net.dbDown ? 'SERVIDOR SIN BASE DE DATOS · AVISA AL ADMIN' : 'SIN CONEXIÓN CON EL SERVIDOR' }
    : { cls: 'bg-zinc-900 text-zinc-500', label: 'COMPROBANDO CONEXIÓN…' };
  return <div className={`w-full text-center text-[10px] font-black uppercase tracking-widest py-1 ${cfg.cls}`}>{cfg.label}</div>;
}

export default function ScannerPage() {
  const [mode, setMode] = useState<Mode>('qr');
  const [status, setStatus] = useState<ScanStatus>({ type: 'idle' });
  const cooldownRef = useRef(false);
  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<{ token: string; scanId?: string; assumeSent?: boolean } | null>(null);

  const [net, setNet] = useState<NetState>({ state: 'checking' });
  const [sessionExpired, setSessionExpired] = useState(false);

  // ── Un solo estado de evento compartido por todos los modos ──
  const [events, setEvents] = useState<any[]>([]);
  const [eventsState, setEventsState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeEventId, setActiveEventId] = useState(''); // vacío = pantalla de selección

  // ── Taquilla ─────────────────────────────────────────────────
  const [taqForm, setTaqForm] = useState({ name: '', cedula: '', email: '', amount: '' });
  const [taqSaving, setTaqSaving] = useState(false);
  const [taqSuccess, setTaqSuccess] = useState(false);
  const [taqError, setTaqError] = useState('');
  const [taqCount, setTaqCount] = useState(0);
  const [taqRevenue, setTaqRevenue] = useState(0);

  // ── Cédula ───────────────────────────────────────────────────
  const [dniInput, setDniInput] = useState('');
  const [dniStatus, setDniStatus] = useState<DniStatus>({ type: 'idle' });
  const dniInputRef = useRef<HTMLInputElement>(null);

  // ── Salud de la conexión (también mantiene despierto el servidor de Render) ──
  useEffect(() => {
    let stop = false;
    const ping = async () => {
      const t0 = performance.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      try {
        const r = await fetch(`${API}/health`, { signal: ctrl.signal, cache: 'no-store' });
        const j = await r.json().catch(() => null);
        const ms = Math.round(performance.now() - t0);
        if (stop) return;
        if (!r.ok) setNet({ state: 'down' });
        else if (j && j.ok === false) setNet({ state: 'down', dbDown: true });
        else setNet({ state: ms > 2500 ? 'slow' : 'ok', ms });
      } catch {
        if (!stop) setNet({ state: 'down' });
      } finally {
        clearTimeout(timer);
      }
    };
    ping();
    const id = setInterval(ping, 25000);
    window.addEventListener('online', ping);
    return () => { stop = true; clearInterval(id); window.removeEventListener('online', ping); };
  }, []);

  // ── Mantener la sesión viva mientras el scanner está abierto ──
  useEffect(() => {
    const id = setInterval(async () => {
      const r = await refreshSession();
      if (r.ok) {
        setSessionExpired(false);
        if (r.user.role !== 'STAFF' && r.user.role !== 'OWNER') {
          setStatus({ type: 'problem', kind: 'forbidden', message: 'Tu cuenta ya no tiene permisos de staff (modo descanso). Pide al admin que la reactive.' });
        }
      } else if (r.reason === 'expired') {
        setSessionExpired(true);
      }
    }, 20 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // ── Que el celular no apague la pantalla (se pierde la cámara) ──
  useEffect(() => {
    let lock: any = null;
    const request = async () => {
      try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* no soportado / sin permiso */ }
    };
    request();
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      try { lock?.release?.(); } catch { /* noop */ }
    };
  }, []);

  // Cargar lista de eventos — desde hace 7 días hacia el futuro (máx. 10)
  const loadEvents = useCallback(async () => {
    setEventsState('loading');
    try {
      const r = await authFetch(`${API}/events`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const all: any[] = await r.json();
      const now = Date.now();
      const recent = all
        .filter(ev => new Date(ev.date).getTime() >= now - 7 * 24 * 60 * 60 * 1000)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 10);
      setEvents(recent);
      setEventsState('ready');
    } catch {
      setEventsState('error');
    }
  }, []);
  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Resumen taquilla cuando cambia el evento activo
  useEffect(() => {
    if (!activeEventId) return;
    authFetch(`${API}/walk-in/${activeEventId}/summary`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setTaqCount(d.totalAttendees); setTaqRevenue(d.totalRevenue); } })
      .catch(() => {});
  }, [activeEventId, taqSuccess]);

  // ── Resultado de un escaneo → pantalla. Devuelve true si la pantalla debe quedarse hasta que el staff actúe ──
  const applyScanResult = (r: ScanResult): boolean => {
    lastScanRef.current = { token: lastScanRef.current?.token || '', scanId: r.scanId, assumeSent: r.maybeProcessed };
    switch (r.kind) {
      case 'ok':
        vibrate(120);
        setStatus({
          type: 'admitted',
          name: r.data.attendee_name || r.data.order?.user?.name || 'Asistente',
          ticket: r.data.ticket_type?.name || 'Entrada',
          time: new Date().toLocaleTimeString('es-CO'),
          replayed: r.replayed,
        });
        return false;
      case 'already_used':
        vibrate([200, 100, 200]);
        setStatus({ type: 'already_used', usedAt: r.usedAt, usedBy: r.usedBy });
        return false;
      case 'wrong_event':
        vibrate([200, 100, 200]);
        setStatus({ type: 'wrong_event', message: r.message });
        return false;
      case 'invalid':
        vibrate([200, 100, 200]);
        setStatus({ type: 'invalid', message: r.message });
        return false;
      case 'forbidden':
        setStatus({ type: 'problem', kind: 'forbidden', message: r.message });
        return true;
      case 'session_expired':
        setSessionExpired(true);
        setStatus({ type: 'problem', kind: 'session', message: 'Tu sesión venció. Inicia sesión de nuevo para seguir escaneando.' });
        return true;
      case 'rate_limited':
        setStatus({ type: 'problem', kind: 'rate', message: 'Demasiadas lecturas seguidas. Espera unos segundos y pulsa REINTENTAR.' });
        return true;
      case 'server_error':
        setStatus({ type: 'problem', kind: 'server', message: 'El servidor no respondió. Pulsa REINTENTAR: si la entrada ya había quedado registrada, aparecerá LISTO igualmente.' });
        return true;
      case 'network':
      default:
        setStatus({ type: 'problem', kind: 'network', message: 'No hay conexión con el servidor. Pulsa REINTENTAR: si la entrada ya había quedado registrada, aparecerá LISTO igualmente.' });
        return true;
    }
  };

  // QR de la tienda (cobro / entrega de pedidos)
  const handleShopToken = async (token: string): Promise<boolean> => {
    const parts = token.split(':');
    const prefix = parts[0]; const orderId = parts[1]; const verificationToken = parts[2];
    const res = await authFetch(`${API}/shop/orders/admin/${orderId}`);
    if (res.status === 401) {
      setSessionExpired(true);
      setStatus({ type: 'problem', kind: 'session', message: 'Tu sesión venció. Inicia sesión de nuevo para seguir escaneando.' });
      return true;
    }
    if (res.ok) {
      const o = await res.json();
      if (verificationToken && o.verification_token && verificationToken !== o.verification_token) { setStatus({ type: 'shop_error', message: '¡TOKEN INVÁLIDO! Posible fraude.' }); return false; }
      if (prefix.includes('PAY') && o.status === 'PENDING') { setStatus({ type: 'shop_order', order: o, intent: 'PAY' }); return true; }
      if (o.status === 'DELIVERED') { setStatus({ type: 'shop_error', message: 'ERROR: PEDIDO YA ENTREGADO' }); return false; }
      if (o.status === 'PENDING') { setStatus({ type: 'shop_error', message: 'ERROR: PAGO PENDIENTE (Cobrar primero)' }); return false; }
      if (['PAID', 'READY'].includes(o.status)) {
        const upd = await authFetch(`${API}/shop/orders/${o.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'DELIVERED' }) });
        if (upd.ok) { setStatus({ type: 'shop_success', name: o.user?.name || 'Invitado', total: o.total }); return false; }
      }
      setStatus({ type: 'shop_error', message: 'ESTADO DESCONOCIDO: ' + o.status }); return false;
    }
    if (res.status >= 500 || res.status === 429) {
      setStatus({ type: 'problem', kind: res.status === 429 ? 'rate' : 'server', message: 'El servidor no respondió. Pulsa REINTENTAR.' });
      return true;
    }
    setStatus({ type: 'shop_error', message: 'ERROR: QR NO PERTENECE A LA TIENDA' }); return false;
  };

  const runQrScan = async (token: string, retryOf?: { scanId?: string; assumeSent?: boolean }): Promise<boolean> => {
    setStatus({ type: 'loading' });
    lastScanRef.current = { token, scanId: retryOf?.scanId, assumeSent: retryOf?.assumeSent };
    try {
      if (!getAuthToken()) {
        setSessionExpired(true);
        setStatus({ type: 'problem', kind: 'session', message: 'Tu sesión venció. Inicia sesión de nuevo para seguir escaneando.' });
        return true;
      }
      if (token.startsWith('KASA_SHOP_PAY:') || token.startsWith('KASA_SHOP_DELIVER:')) {
        return await handleShopToken(token);
      }
      const result = await postScan({
        url: `${API}/qrs/scan`,
        body: { token, event_id: activeEventIdRef.current || undefined },
        getToken: getAuthToken,
        refreshToken,
        scanId: retryOf?.scanId,
        assumeSent: retryOf?.assumeSent,
        onRetry: (attempt, reason) => setStatus({ type: 'loading', note: reason === 'rate_limited' ? 'Muchas lecturas, esperando…' : `Reintentando (${attempt + 1})…` }),
      });
      return applyScanResult(result);
    } catch {
      setStatus({ type: 'problem', kind: 'network', message: 'Algo falló al leer el código. Pulsa REINTENTAR.' });
      return true;
    }
  };

  // El callback de la cámara se crea una sola vez: siempre llama a la versión más reciente.
  const activeEventIdRef = useRef(activeEventId);
  activeEventIdRef.current = activeEventId;
  const runQrScanRef = useRef(runQrScan);
  runQrScanRef.current = runQrScan;

  const finishScan = (sticky: boolean) => {
    if (sticky) return; // errores de conexión/sesión: se quedan en pantalla hasta REINTENTAR o CERRAR
    setTimeout(() => { cooldownRef.current = false; setStatus({ type: 'idle' }); }, 4000);
  };

  const closeStatus = () => { cooldownRef.current = false; setStatus({ type: 'idle' }); };

  const retryLast = () => {
    const last = lastScanRef.current;
    if (!last?.token) return closeStatus();
    runQrScanRef.current(last.token, { scanId: last.scanId, assumeSent: last.assumeSent }).then(finishScan);
  };

  // Scanner QR
  const scannerDivRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      if (scannerRef.current) { scannerRef.current.clear().catch(() => {}); scannerRef.current = null; }
      return;
    }
    if (scannerRef.current) return;
    import('html5-qrcode').then(({ Html5QrcodeScanner }) => {
      const scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true, supportedScanTypes: [0] }, false);
      scannerRef.current = scanner;
      scanner.render((decodedText: string) => {
        if (cooldownRef.current) return;
        cooldownRef.current = true;
        const token = decodedText.includes('/ticket/') ? decodedText.split('/ticket/')[1]?.split('?')[0]?.trim() : decodedText.trim();
        runQrScanRef.current(token).then(finishScan).catch(() => { cooldownRef.current = false; });
      }, () => {});
    }).catch(err => console.error('html5-qrcode error:', err));
  }, [activeEventId]);

  useEffect(() => () => { if (scannerRef.current) { scannerRef.current.clear().catch(() => {}); scannerRef.current = null; } }, []);

  const updateShopStatus = async (orderId: string, newStatus: string) => {
    const res = await authFetch(`${API}/shop/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) closeStatus();
  };

  const handleTaquillaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaqSaving(true); setTaqError('');
    try {
      const res = await authFetch(`${API}/walk-in/${activeEventId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...taqForm, amount: Number(taqForm.amount) }) });
      if (res.ok) { setTaqForm({ name: '', cedula: '', email: '', amount: '' }); setTaqSuccess(true); setTimeout(() => setTaqSuccess(false), 2500); }
      else if (res.status === 401) { setSessionExpired(true); setTaqError('Sesión vencida. Inicia sesión de nuevo.'); }
      else if (res.status === 429) { setTaqError('Demasiados registros seguidos. Espera unos segundos.'); }
      else { const d = await res.json().catch(() => ({})); setTaqError(d.message || 'Error'); }
    } catch { setTaqError('Error de conexión'); }
    finally { setTaqSaving(false); }
  };

  const handleDniSearch = async () => {
    const dni = dniInput.trim();
    if (!dni) return;
    setDniStatus({ type: 'loading' });
    let conclusive = true;
    try {
      const r = await postScan({
        url: `${API}/qrs/scan-by-dni`,
        body: { dni, event_id: activeEventId },
        getToken: getAuthToken,
        refreshToken,
        autoRetryUnsafe: false, // sin idempotencia: no repetir solo tras un corte (podría quemar dos entradas)
      });
      if (r.kind === 'session_expired') setSessionExpired(true);
      if (r.kind === 'ok') {
        setDniStatus({ type: 'admitted', name: r.data.attendee_name || 'Asistente', ticket: r.data.ticket_type?.name || 'Entrada', dni: r.data.attendee_dni || dni });
      } else if (r.kind === 'already_used') {
        setDniStatus({ type: 'already_used', message: r.message || 'Entrada ya utilizada.' });
      } else if (r.kind === 'invalid' || r.kind === 'wrong_event') {
        setDniStatus({ type: 'not_found', message: r.message || 'No encontrado.' });
      } else {
        conclusive = false; // la cédula queda escrita para volver a intentar
        setDniStatus({ type: 'error', message: problemText(r) });
      }
    } catch {
      conclusive = false;
      setDniStatus({ type: 'error', message: 'Algo falló. Intenta de nuevo (la cédula sigue escrita).' });
    }
    if (conclusive) setDniInput('');
    setTimeout(() => { setDniStatus({ type: 'idle' }); dniInputRef.current?.focus(); }, conclusive ? 6000 : 9000);
  };

  const activeEvent = events.find(e => e.id === activeEventId);

  // ══════════════════════════════════════════════════════════════
  // PANTALLA DE SELECCIÓN DE EVENTO (si no hay evento activo)
  // ══════════════════════════════════════════════════════════════
  if (!activeEventId) {
    return (
      <StaffGuard>
        <div className="min-h-screen bg-[#050505] text-white flex flex-col">
          <div className="w-full bg-black/90 border-b border-zinc-800 px-4 py-3">
            <div className="max-w-md mx-auto flex items-center gap-4">
              <Link href="/" className="text-zinc-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
              <span className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Modo Evento</span>
            </div>
          </div>
          <StatusStrip net={net} sessionExpired={sessionExpired} />

          <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full gap-6">
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-neon-green" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">¿Cuál es el evento?</h1>
              <p className="text-zinc-500 text-sm">Selecciona el evento activo. Esta elección aplica para el scanner QR, verificación por cédula y taquilla.</p>
            </div>

            <div className="w-full flex flex-col gap-3">
              {eventsState === 'loading' && (
                <div className="text-center text-zinc-600 py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /><p className="text-xs">Cargando eventos…</p></div>
              )}
              {eventsState === 'error' && (
                <div className="text-center bg-red-600/10 border border-red-600/40 rounded-2xl p-6">
                  <WifiOff className="w-8 h-8 text-red-500 mx-auto mb-2" />
                  <p className="text-red-400 text-sm font-bold mb-3">No se pudo cargar la lista de eventos.</p>
                  <button onClick={loadEvents} className="inline-flex items-center gap-2 bg-white text-black font-black uppercase text-xs tracking-widest px-5 py-3 rounded-xl active:scale-95"><RefreshCw className="w-4 h-4" /> Reintentar</button>
                </div>
              )}
              {eventsState === 'ready' && events.length === 0 && (
                <div className="text-center bg-zinc-900 border border-zinc-700 rounded-2xl p-6">
                  <p className="text-zinc-300 text-sm font-bold mb-1">No hay eventos de los últimos 7 días ni próximos.</p>
                  <p className="text-zinc-500 text-xs mb-3">Si esperabas ver uno, revisa en el admin que esté creado y publicado.</p>
                  <button onClick={loadEvents} className="inline-flex items-center gap-2 bg-white text-black font-black uppercase text-xs tracking-widest px-5 py-3 rounded-xl active:scale-95"><RefreshCw className="w-4 h-4" /> Actualizar</button>
                </div>
              )}
              {events.map(ev => (
                <button key={ev.id} onClick={() => setActiveEventId(ev.id)}
                  className="w-full text-left bg-zinc-900 border border-zinc-700 hover:border-neon-green hover:bg-neon-green/5 rounded-2xl p-5 transition-all group">
                  <p className="font-black text-white uppercase tracking-wide group-hover:text-neon-green transition-colors">{ev.title}</p>
                  <p className="text-zinc-500 text-xs mt-1">{new Date(ev.date).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p className="text-zinc-600 text-xs">{ev.venue}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </StaffGuard>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PANTALLA PRINCIPAL (evento ya seleccionado)
  // ══════════════════════════════════════════════════════════════
  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
        {/* Barra superior */}
        <div className="w-full bg-black/90 border-b border-zinc-800 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-md mx-auto flex items-center gap-3">
            <Link href="/" className="text-zinc-500 hover:text-white shrink-0"><ArrowLeft className="w-5 h-5" /></Link>

            {/* Evento activo — clic para cambiar */}
            <button onClick={() => { setActiveEventId(''); setStatus({ type: 'idle' }); setDniStatus({ type: 'idle' }); cooldownRef.current = false; }}
              className="flex-1 flex items-center gap-2 bg-neon-green/10 border border-neon-green/30 rounded-xl px-3 py-2 hover:bg-neon-green/20 transition-colors min-w-0">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse shrink-0" />
              <span className="text-neon-green text-xs font-black uppercase tracking-widest truncate">{activeEvent?.title}</span>
              <ChevronDown className="w-3 h-3 text-neon-green/60 shrink-0" />
            </button>

            {/* Tabs QR / Taquilla */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
              <button onClick={() => setMode('qr')} className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-black uppercase transition-all ${mode === 'qr' ? 'bg-neon-green text-black' : 'text-zinc-500'}`}><QrCode className="w-3.5 h-3.5" /> QR</button>
              <button onClick={() => setMode('taquilla')} className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-xs font-black uppercase transition-all ${mode === 'taquilla' ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}><DoorOpen className="w-3.5 h-3.5" /> Taquilla</button>
            </div>
          </div>
        </div>
        <StatusStrip net={net} sessionExpired={sessionExpired} />

        {/* ── Modo QR ── */}
        {mode === 'qr' && (
          <div className="flex-1 flex flex-col items-center px-4 py-4 max-w-md mx-auto w-full">
            <div className="w-full rounded-2xl overflow-hidden border-2 border-zinc-800 bg-black relative mb-6">
              <div id="qr-reader" ref={scannerDivRef} className="w-full" />
            </div>
            <div className="w-full">
              {status.type === 'idle' && (
                <div className="w-full p-5 rounded-2xl border border-zinc-800 bg-black/40 flex items-center justify-center min-h-[100px]">
                  <span className="text-zinc-600 uppercase text-xs font-bold animate-pulse">Esperando código…</span>
                </div>
              )}
              {status.type === 'loading' && (
                <div className="w-full p-5 rounded-2xl border border-neon-purple/40 bg-neon-purple/5 flex flex-col items-center justify-center gap-2 min-h-[100px]">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
                  {status.note && <span className="text-neon-purple text-[11px] font-black uppercase tracking-widest">{status.note}</span>}
                </div>
              )}
              {(status.type === 'admitted' || status.type === 'shop_success') && (
                <div className="w-full p-10 rounded-[3rem] border-8 border-neon-green bg-neon-green shadow-[0_0_100px_rgba(57,255,20,0.5)] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                  <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center"><CheckCircle className="w-16 h-16 text-neon-green" /></div>
                  <h2 className="font-black uppercase tracking-tighter text-black text-6xl italic">LISTO</h2>
                  <div className="text-center">
                    <p className="text-black font-black text-2xl uppercase leading-tight">{status.name}</p>
                    {status.type === 'admitted' && status.ticket && <p className="text-black/70 font-black text-lg uppercase">{status.ticket}</p>}
                    {status.type === 'admitted' && status.replayed && <p className="text-black/60 font-bold text-xs uppercase mt-1">Registrada hace instantes (reintento)</p>}
                    {status.type === 'shop_success' && <p className="text-black/60 font-black text-xl">{Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(status.total)}</p>}
                  </div>
                </div>
              )}
              {(status.type === 'shop_error' || status.type === 'already_used' || status.type === 'invalid') && (
                <div className="w-full p-10 rounded-[3rem] border-8 border-red-600 bg-red-600 shadow-[0_0_100px_rgba(220,38,38,0.5)] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center"><ShieldAlert className="w-16 h-16 text-red-600" /></div>
                  <h2 className="font-black uppercase tracking-tighter text-white text-4xl italic text-center">
                    {status.type === 'already_used' ? 'YA QUEMADO' : status.message}
                  </h2>
                  {status.type === 'already_used' && (status.usedAt || status.usedBy) && (
                    <p className="text-white/90 font-bold text-sm uppercase tracking-wide text-center">
                      {[sinceText(status.usedAt), status.usedBy ? `por ${status.usedBy}` : ''].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              )}
              {status.type === 'wrong_event' && (
                <div className="w-full p-10 rounded-[3rem] border-8 border-orange-500 bg-orange-500 shadow-[0_0_100px_rgba(249,115,22,0.5)] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center"><XCircle className="w-16 h-16 text-orange-500" /></div>
                  <h2 className="font-black uppercase tracking-tighter text-white text-3xl italic text-center">EVENTO INCORRECTO</h2>
                  <p className="text-white/90 font-bold text-sm text-center">Esta entrada es de otro evento.</p>
                </div>
              )}
              {status.type === 'problem' && (
                <div className="w-full p-8 rounded-[2.5rem] border-8 border-amber-400 bg-amber-400 shadow-[0_0_80px_rgba(251,191,36,0.4)] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                  <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center">
                    {status.kind === 'session' ? <LogIn className="w-10 h-10 text-amber-400" /> : <WifiOff className="w-10 h-10 text-amber-400" />}
                  </div>
                  <h2 className="font-black uppercase tracking-tighter text-black text-3xl italic text-center">{PROBLEM_TITLE[status.kind]}</h2>
                  <p className="text-black/80 font-bold text-sm text-center">{status.message}</p>
                  <div className="w-full flex gap-3">
                    {status.kind === 'session' ? (
                      <Link href="/login?redirect=/scanner" className="flex-1 bg-black text-white font-black uppercase tracking-widest text-center py-4 rounded-2xl">Iniciar sesión</Link>
                    ) : status.kind !== 'forbidden' ? (
                      <button onClick={retryLast} className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-black uppercase tracking-widest py-4 rounded-2xl active:scale-95"><RefreshCw className="w-5 h-5" /> Reintentar</button>
                    ) : null}
                    <button onClick={closeStatus} className="flex-1 bg-white/80 text-black font-black uppercase tracking-widest py-4 rounded-2xl active:scale-95">Cerrar</button>
                  </div>
                </div>
              )}
              {status.type === 'shop_order' && status.intent === 'PAY' && (
                <div className="w-full p-6 rounded-[2.5rem] border-4 border-orange-500 bg-orange-500/10 flex flex-col items-center gap-4 animate-in zoom-in-95">
                  <DollarSign className="w-10 h-10 text-orange-500" />
                  <p className="font-black uppercase text-orange-500 text-xl">COBRO EN CAJA</p>
                  <div className="text-center">
                    <p className="text-white font-black text-2xl uppercase">{status.order.user?.name || 'Invitado'}</p>
                    <p className="text-orange-500 text-3xl font-black">{Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(status.order.total)}</p>
                  </div>
                  <button onClick={() => updateShopStatus(status.order.id, 'PAID')} className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl text-xl shadow-[0_10px_30px_rgba(249,115,22,0.4)]">CONFIRMAR PAGO</button>
                  <button onClick={closeStatus} className="text-zinc-400 text-xs font-bold uppercase tracking-widest underline">Cancelar</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Modo Taquilla ── */}
        {mode === 'taquilla' && (
          <div className="p-4 max-w-md mx-auto w-full flex flex-col gap-5">

            {/* VERIFICAR POR CÉDULA */}
            <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-neon-green" />
                <h2 className="text-base font-black uppercase tracking-widest text-white">Verificar por Cédula</h2>
              </div>
              <div className="flex gap-2">
                <input ref={dniInputRef} type="tel" inputMode="numeric" pattern="[0-9]*"
                  placeholder="Número de cédula" value={dniInput}
                  onChange={e => { setDniInput(e.target.value.replace(/\D/g, '')); setDniStatus({ type: 'idle' }); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleDniSearch(); }}
                  className="flex-1 bg-black border border-zinc-700 rounded-xl px-4 py-4 text-2xl font-black text-white outline-none focus:border-neon-green tracking-widest font-mono"
                  autoComplete="off" />
                <button onClick={handleDniSearch} disabled={!dniInput.trim() || dniStatus.type === 'loading'}
                  className="bg-neon-green text-black font-black px-5 rounded-xl hover:bg-neon-green/80 transition-colors disabled:opacity-40 active:scale-95 flex items-center">
                  {dniStatus.type === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>
              {dniStatus.type === 'admitted' && (
                <div className="mt-3 p-5 rounded-2xl border-4 border-neon-green bg-neon-green animate-in zoom-in-95 duration-200 flex flex-col items-center gap-2">
                  <CheckCircle className="w-12 h-12 text-black" />
                  <p className="text-black font-black text-3xl uppercase tracking-tight">{dniStatus.name}</p>
                  <p className="text-black/70 font-bold text-sm">{dniStatus.ticket}</p>
                  <p className="text-black/50 font-mono text-xs">CC {dniStatus.dni}</p>
                  <p className="text-black font-black text-xl mt-1">✅ ENTRADA VÁLIDA — QUEMADA</p>
                </div>
              )}
              {dniStatus.type === 'already_used' && (
                <div className="mt-3 p-5 rounded-2xl border-4 border-red-600 bg-red-600 animate-in zoom-in-95 duration-200 flex flex-col items-center gap-2">
                  <ShieldAlert className="w-12 h-12 text-white" />
                  <p className="text-white font-black text-xl uppercase text-center">⛔ YA UTILIZADA</p>
                  <p className="text-white/80 text-sm text-center font-bold">{dniStatus.message}</p>
                </div>
              )}
              {dniStatus.type === 'not_found' && (
                <div className="mt-3 p-5 rounded-2xl border-4 border-orange-500 bg-orange-500/20 animate-in zoom-in-95 duration-200 flex flex-col items-center gap-2">
                  <XCircle className="w-12 h-12 text-orange-400" />
                  <p className="text-orange-400 font-black text-xl uppercase text-center">⚠️ NO ENCONTRADA</p>
                  <p className="text-zinc-300 text-sm text-center">{dniStatus.message}</p>
                </div>
              )}
              {dniStatus.type === 'error' && (
                <div className="mt-3 p-5 rounded-2xl border-4 border-amber-400 bg-amber-400/20 animate-in zoom-in-95 duration-200 flex flex-col items-center gap-2">
                  <WifiOff className="w-12 h-12 text-amber-400" />
                  <p className="text-amber-400 font-black text-xl uppercase text-center">NO SE PUDO VERIFICAR</p>
                  <p className="text-zinc-300 text-sm text-center">{dniStatus.message}</p>
                </div>
              )}
            </div>

            {/* REGISTRAR ASISTENTE */}
            <div className="bg-zinc-900/80 border border-zinc-700 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <DoorOpen className="w-5 h-5 text-orange-400" />
                <h2 className="text-base font-black uppercase tracking-widest text-white">Registrar Asistente</h2>
              </div>
              <form onSubmit={handleTaquillaSubmit} className="flex flex-col gap-3">
                <input placeholder="Nombre" value={taqForm.name} onChange={e => setTaqForm({ ...taqForm, name: e.target.value })}
                  className="bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-400" />
                <input placeholder="Costo" type="number" value={taqForm.amount} onChange={e => setTaqForm({ ...taqForm, amount: e.target.value })}
                  className="bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white outline-none focus:border-orange-400" />
                {taqError && <p className="text-red-400 text-xs font-bold text-center">{taqError}</p>}
                {taqSuccess && <div className="bg-neon-green/20 border border-neon-green rounded-xl p-3 text-neon-green text-center font-black text-sm uppercase tracking-widest animate-in zoom-in-95">✅ Registrado</div>}
                <button type="submit" disabled={taqSaving} className="bg-orange-500 hover:bg-orange-400 text-white py-4 rounded-xl font-black uppercase tracking-widest transition-colors disabled:opacity-50">
                  {taqSaving ? 'Registrando...' : 'Registrar'}
                </button>
              </form>
              {(taqCount > 0 || taqRevenue > 0) && (
                <div className="mt-4 flex gap-3">
                  <div className="flex-1 bg-black/60 rounded-xl p-3 text-center border border-zinc-800">
                    <p className="text-xl font-black text-white">{taqCount}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">asistentes</p>
                  </div>
                  <div className="flex-1 bg-black/60 rounded-xl p-3 text-center border border-zinc-800">
                    <p className="text-xl font-black text-neon-green">{Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(taqRevenue)}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">recaudado</p>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </StaffGuard>
  );
}
