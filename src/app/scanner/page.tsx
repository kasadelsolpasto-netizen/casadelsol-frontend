"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, ArrowLeft, Loader2, ShieldAlert, DoorOpen, QrCode, DollarSign, CreditCard, Search, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { StaffGuard } from '@/components/StaffGuard';

type ScanStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'admitted'; name: string; ticket: string; time: string }
  | { type: 'shop_success'; name: string; total: number }
  | { type: 'shop_error'; message: string }
  | { type: 'shop_order'; order: any; intent: 'PAY' | 'DELIVER' }
  | { type: 'already_used' }
  | { type: 'invalid'; message: string };

type DniStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'admitted'; name: string; ticket: string; dni: string }
  | { type: 'already_used'; message: string }
  | { type: 'not_found'; message: string };

type Mode = 'qr' | 'taquilla';

export default function ScannerPage() {
  const [mode, setMode] = useState<Mode>('qr');
  const [status, setStatus] = useState<ScanStatus>({ type: 'idle' });
  const cooldownRef = useRef(false);
  const scannerRef = useRef<any>(null);

  // ── Un solo estado de evento compartido por todos los modos ──
  const [events, setEvents] = useState<any[]>([]);
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

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Cargar lista de eventos — solo los recientes (últimos 30 días) y pasados
  useEffect(() => {
    fetch(`${API}/events`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json())
      .then((all: any[]) => {
        const now = new Date();
        const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // hace 30 días
        // Eventos pasados o de hoy, ordenados del más reciente al más antiguo
        const recent = all
          .filter(ev => new Date(ev.date) <= now)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10); // máximo 10
        setEvents(recent);
      })
      .catch(() => {});
  }, []);

  // Resumen taquilla cuando cambia el evento activo
  useEffect(() => {
    if (!activeEventId) return;
    fetch(`${API}/walk-in/${activeEventId}/summary`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setTaqCount(d.totalAttendees); setTaqRevenue(d.totalRevenue); } })
      .catch(() => {});
  }, [activeEventId, taqSuccess]);

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
        handleScan(token).finally(() => { setTimeout(() => { cooldownRef.current = false; setStatus({ type: 'idle' }); }, 4000); });
      }, () => {});
    }).catch(err => console.error('html5-qrcode error:', err));
  }, [activeEventId]);

  useEffect(() => () => { if (scannerRef.current) { scannerRef.current.clear().catch(() => {}); scannerRef.current = null; } }, []);

  const handleScan = async (token: string) => {
    setStatus({ type: 'loading' });
    try {
      const authToken = getToken();
      if (!authToken) throw new Error('Sin sesión activa');

      if (token.startsWith('KASA_SHOP_PAY:') || token.startsWith('KASA_SHOP_DELIVER:')) {
        const parts = token.split(':');
        const prefix = parts[0]; const orderId = parts[1]; const verificationToken = parts[2];
        const res = await fetch(`${API}/shop/orders/admin/${orderId}`, { headers: { Authorization: `Bearer ${authToken}` } });
        if (res.ok) {
          const o = await res.json();
          if (verificationToken && o.verification_token && verificationToken !== o.verification_token) { setStatus({ type: 'shop_error', message: '¡TOKEN INVÁLIDO! Posible fraude.' }); return; }
          if (prefix.includes('PAY') && o.status === 'PENDING') { setStatus({ type: 'shop_order', order: o, intent: 'PAY' }); return; }
          if (o.status === 'DELIVERED') { setStatus({ type: 'shop_error', message: 'ERROR: PEDIDO YA ENTREGADO' }); return; }
          if (o.status === 'PENDING') { setStatus({ type: 'shop_error', message: 'ERROR: PAGO PENDIENTE (Cobrar primero)' }); return; }
          if (['PAID', 'READY'].includes(o.status)) {
            const upd = await fetch(`${API}/shop/orders/${o.id}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` }, body: JSON.stringify({ status: 'DELIVERED' }) });
            if (upd.ok) { setStatus({ type: 'shop_success', name: o.user?.name || 'Invitado', total: o.total }); return; }
          }
          setStatus({ type: 'shop_error', message: 'ESTADO DESCONOCIDO: ' + o.status }); return;
        }
        setStatus({ type: 'shop_error', message: 'ERROR: QR NO PERTENECE A LA TIENDA' }); return;
      }

      const res = await fetch(`${API}/qrs/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ token, event_id: activeEventId || undefined }),
      });
      const data = await res.json();
      if (res.status === 400) { setStatus({ type: 'already_used' }); return; }
      if (!res.ok) { setStatus({ type: 'invalid', message: data.message || 'QR inválido' }); return; }
      setStatus({ type: 'admitted', name: data.attendee_name || data.order?.user?.name || 'Asistente', ticket: data.ticket_type?.name || 'Entrada', time: new Date().toLocaleTimeString('es-CO') });
    } catch (err: any) { setStatus({ type: 'invalid', message: err.message || 'Error de red' }); }
  };

  const updateShopStatus = async (orderId: string, newStatus: string) => {
    const res = await fetch(`${API}/shop/orders/${orderId}/status`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ status: newStatus }) });
    if (res.ok) setStatus({ type: 'idle' });
  };

  const handleTaquillaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaqSaving(true); setTaqError('');
    try {
      const res = await fetch(`${API}/walk-in/${activeEventId}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ ...taqForm, amount: Number(taqForm.amount) }) });
      if (res.ok) { setTaqForm({ name: '', cedula: '', email: '', amount: '' }); setTaqSuccess(true); setTimeout(() => setTaqSuccess(false), 2500); }
      else { const d = await res.json(); setTaqError(d.message || 'Error'); }
    } catch { setTaqError('Error de conexión'); }
    finally { setTaqSaving(false); }
  };

  const handleDniSearch = async () => {
    if (!dniInput.trim()) return;
    setDniStatus({ type: 'loading' }); setDniInput('');
    try {
      const res = await fetch(`${API}/qrs/scan-by-dni`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ dni: dniInput.trim(), event_id: activeEventId }) });
      const data = await res.json();
      if (res.ok) setDniStatus({ type: 'admitted', name: data.attendee_name || 'Asistente', ticket: data.ticket_type?.name || 'Entrada', dni: data.attendee_dni || dniInput });
      else if (res.status === 400) setDniStatus({ type: 'already_used', message: data.message || 'Entrada ya utilizada.' });
      else setDniStatus({ type: 'not_found', message: data.message || 'No encontrado.' });
    } catch { setDniStatus({ type: 'not_found', message: 'Error de conexión.' }); }
    setTimeout(() => { setDniStatus({ type: 'idle' }); dniInputRef.current?.focus(); }, 6000);
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

          <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-md mx-auto w-full gap-6">
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-full bg-neon-green/10 border border-neon-green/30 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-neon-green" />
              </div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-2">¿Cuál es el evento?</h1>
              <p className="text-zinc-500 text-sm">Selecciona el evento activo. Esta elección aplica para el scanner QR, verificación por cédula y taquilla.</p>
            </div>

            <div className="w-full flex flex-col gap-3">
              {events.length === 0 && (
                <div className="text-center text-zinc-600 py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /><p className="text-xs">Cargando eventos…</p></div>
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
            <button onClick={() => { setActiveEventId(''); setStatus({ type: 'idle' }); setDniStatus({ type: 'idle' }); }}
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
                <div className="w-full p-5 rounded-2xl border border-neon-purple/40 bg-neon-purple/5 flex items-center justify-center min-h-[100px]">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
                </div>
              )}
              {(status.type === 'admitted' || status.type === 'shop_success') && (
                <div className="w-full p-10 rounded-[3rem] border-8 border-neon-green bg-neon-green shadow-[0_0_100px_rgba(57,255,20,0.5)] flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200">
                  <div className="w-24 h-24 rounded-full bg-black flex items-center justify-center"><CheckCircle className="w-16 h-16 text-neon-green" /></div>
                  <h2 className="font-black uppercase tracking-tighter text-black text-6xl italic">LISTO</h2>
                  <div className="text-center">
                    <p className="text-black font-black text-2xl uppercase leading-tight">{status.name}</p>
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
