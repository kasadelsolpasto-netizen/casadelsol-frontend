"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, ArrowLeft, Loader2, UserCheck, ShieldAlert, DoorOpen, QrCode, Check, Users, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { StaffGuard } from '@/components/StaffGuard';

type ScanStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'admitted'; name: string; ticket: string; time: string }
  | { type: 'already_used' }
  | { type: 'invalid'; message: string };

type Mode = 'qr' | 'taquilla';

export default function ScannerPage() {
  const [mode, setMode] = useState<Mode>('qr');
  const [status, setStatus] = useState<ScanStatus>({ type: 'idle' });
  const cooldownRef = useRef(false);
  const scannerRef = useRef<any>(null);

  // ── Taquilla state ────────────────────────────────────────────
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [taqForm, setTaqForm] = useState({ name: '', cedula: '', email: '', amount: '' });
  const [taqSaving, setTaqSaving] = useState(false);
  const [taqSuccess, setTaqSuccess] = useState(false);
  const [taqError, setTaqError] = useState('');
  const [taqCount, setTaqCount] = useState(0);
  const [taqRevenue, setTaqRevenue] = useState(0);

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  // Load events for taquilla
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
          if (data.length > 0) setSelectedEventId(data[0].id);
        }
      } catch {}
    };
    fetchEvents();
  }, []);

  // Fetch taquilla summary when event changes
  useEffect(() => {
    if (!selectedEventId) return;
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/walk-in/${selectedEventId}/summary`, {
          headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
          const d = await res.json();
          setTaqCount(d.totalAttendees);
          setTaqRevenue(d.totalRevenue);
        }
      } catch {}
    };
    fetchSummary();
  }, [selectedEventId, taqSuccess]);

  // ── QR Scanner ────────────────────────────────────────────────
  const scannerDivRef = useCallback((node: HTMLDivElement | null) => {
    // Cuando el div se desmonta (usuario cambia a modo taquilla), limpiamos la cámara.
    if (!node) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    // Si ya existe una instancia, no la recreamos
    if (scannerRef.current) return;

    import('html5-qrcode')
      .then(({ Html5QrcodeScanner }) => {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0],
          },
          false
        );
        scannerRef.current = scanner;
        scanner.render(
          (decodedText: string) => {
            if (cooldownRef.current) return;
            cooldownRef.current = true;
            const token = decodedText.includes('/ticket/')
              ? decodedText.split('/ticket/')[1]?.split('?')[0]?.trim()
              : decodedText.trim();
            handleScan(token).finally(() => {
              setTimeout(() => { cooldownRef.current = false; setStatus({ type: 'idle' }); }, 4000);
            });
          },
          () => {} // Ignorar errores de "no QR"
        );
      })
      .catch(err => console.error('Error cargando html5-qrcode:', err));
  }, []);

  // Limpieza al salir de la ruta por completo
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const handleScan = async (token: string) => {
    setStatus({ type: 'loading' });
    try {
      const authToken = getToken();
      if (!authToken) throw new Error('Sin sesión activa');

      // ── DETECTAR QR DE TIENDA ───────────────────────────────────
      // Formato esperado: KASA_SHOP_PAY:ID:TOKEN or KASA_SHOP_DELIVER:ID:TOKEN
      if (token.startsWith('KASA_SHOP_PAY:') || token.startsWith('KASA_SHOP_DELIVER:')) {
        const parts = token.split(':');
        const prefix = parts[0];
        const orderId = parts[1];
        const verificationToken = parts[2]; // Puede ser opcional para compatibilidad inmediata
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/shop/orders/admin/${orderId}`, {
           headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (res.ok) {
           const orderData = await res.json();

           // Validar Token de Seguridad si está presente en el QR
           if (verificationToken && orderData.verification_token && verificationToken !== orderData.verification_token) {
              throw new Error('¡TOKEN DE SEGURIDAD INVÁLIDO! Posible fraude detectado.');
           }

           setStatus({ 
             type: 'shop_order', 
             order: orderData, 
             intent: prefix.includes('PAY') ? 'PAY' : 'DELIVER' 
           });
           return;
        }
        throw new Error('Pedido de tienda no encontrado');
      }

      // ── FLUJO NORMAL DE TICKETS ────────────────────────────────
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/qrs/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (res.status === 400) { setStatus({ type: 'already_used' }); return; }
      if (!res.ok) { setStatus({ type: 'invalid', message: data.message || 'QR inválido' }); return; }
      setStatus({
        type: 'admitted',
        name: data.attendee_name || data.order?.user?.name || 'Asistente',
        ticket: data.ticket_type?.name || data.order?.order_items?.[0]?.ticket_type?.name || 'Entrada',
        time: new Date().toLocaleTimeString('es-CO'),
      });
    } catch (err: any) {
      setStatus({ type: 'invalid', message: err.message || 'Error de red' });
    }
  };

  const updateShopStatus = async (orderId: string, status: string) => {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/shop/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${getToken()}` 
            },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            setStatus({ type: 'idle' });
            alert(status === 'PAID' ? "Pago confirmado con éxito." : "Pedido entregado y quemado correctamente.");
        }
    } catch(e) { console.error(e); }
  };

  const handleTaquillaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) { setTaqError('Selecciona un evento primero.'); return; }
    if (!taqForm.amount || isNaN(Number(taqForm.amount))) { setTaqError('El costo es requerido.'); return; }
    setTaqError('');
    setTaqSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/walk-in/${selectedEventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: taqForm.name || undefined,
          cedula: taqForm.cedula || undefined,
          email: taqForm.email || undefined,
          amount: Number(taqForm.amount)
        })
      });
      if (res.ok) {
        setTaqForm({ name: '', cedula: '', email: '', amount: '' });
        setTaqSuccess(true);
        setTimeout(() => setTaqSuccess(false), 2500);
      } else {
        const d = await res.json();
        setTaqError(d.message || 'Error al registrar');
      }
    } catch { setTaqError('Error de conexión'); }
    finally { setTaqSaving(false); }
  };

  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">

        {/* Header con toggle de modo */}
        <div className="w-full bg-black/90 backdrop-blur border-b border-zinc-800 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <Link href="/" className="text-zinc-500 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>

            {/* Mode Toggle */}
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex-1 max-w-xs">
              <button onClick={() => setMode('qr')}
                className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'qr' ? 'bg-neon-green text-black shadow-[0_0_15px_rgba(57,255,20,0.3)]' : 'text-zinc-500 hover:text-white'}`}>
                <QrCode className="w-3.5 h-3.5" /> QR Scanner
              </button>
              <button onClick={() => setMode('taquilla')}
                className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${mode === 'taquilla' ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'text-zinc-500 hover:text-white'}`}>
                <DoorOpen className="w-3.5 h-3.5" /> Taquilla
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="font-black uppercase tracking-widest text-neon-green text-[10px] hidden sm:block">En vivo</span>
            </div>
          </div>
        </div>

        {/* ── QR MODE ───────────────────────────────────────────── */}
        {mode === 'qr' && (
          <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">
            <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-1 text-center">Escáner QR</h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-6 text-center">Apunta el lente al código del asistente</p>

            {/* Viewfinder */}
            <div className="w-full rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-black relative">
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-neon-green rounded-tl z-10 pointer-events-none" />
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-neon-green rounded-tr z-10 pointer-events-none" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-neon-green rounded-bl z-10 pointer-events-none" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-neon-green rounded-br z-10 pointer-events-none" />
              <div id="qr-reader" ref={scannerDivRef} className="w-full" />
            </div>

            <div className="mt-6 w-full">
              {status.type === 'idle' && (
                <div className="w-full p-5 rounded-2xl border border-zinc-800 bg-black/40 flex items-center justify-center min-h-[100px]">
                  <span className="text-zinc-600 uppercase tracking-widest text-xs font-bold animate-pulse">Esperando código…</span>
                </div>
              )}
              {status.type === 'loading' && (
                <div className="w-full p-5 rounded-2xl border border-neon-purple/40 bg-neon-purple/5 flex flex-col items-center gap-2 min-h-[100px] justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
                  <span className="uppercase text-xs font-bold tracking-widest text-neon-purple">Verificando…</span>
                </div>
              )}
              {status.type === 'admitted' && (
                <div className="w-full p-5 rounded-2xl border-2 border-neon-green bg-neon-green/5 shadow-[0_0_40px_rgba(57,255,20,0.2)] flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-neon-green/20 border-2 border-neon-green flex items-center justify-center">
                    <UserCheck className="w-8 h-8 text-neon-green" />
                  </div>
                  <p className="font-black uppercase tracking-widest text-neon-green text-2xl">✓ INGRESADO</p>
                  <p className="text-white font-black text-xl uppercase tracking-wide">{status.name}</p>
                  <p className="text-neon-green/70 text-xs font-bold uppercase tracking-widest">{status.ticket}</p>
                  <p className="text-zinc-500 text-[10px] uppercase tracking-widest">{status.time}</p>
                </div>
              )}
               {status.type === 'shop_order' && (
                <div className={`w-full p-5 rounded-3xl border-2 bg-black/80 shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95 duration-200 ${status.intent === 'PAY' ? 'border-orange-500 shadow-orange-500/20' : 'border-neon-green shadow-neon-green/20'}`}>
                  <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center ${status.intent === 'PAY' ? 'bg-orange-500/20 border-orange-500' : 'bg-neon-green/20 border-neon-green'}`}>
                    {status.intent === 'PAY' ? <DollarSign className="w-8 h-8 text-orange-500" /> : <Package className="w-8 h-8 text-neon-green" />}
                  </div>
                  
                  <div className="text-center">
                    <p className={`font-black uppercase tracking-widest text-[10px] mb-1 ${status.intent === 'PAY' ? 'text-orange-500' : 'text-neon-green'}`}>
                        {status.intent === 'PAY' ? 'Cobro en Efectivo' : 'Entrega de Productos'}
                    </p>
                    <p className="text-white font-black text-xl uppercase truncate max-w-[200px]">{status.order.user?.name || 'Invitado'}</p>
                    {status.order.user?.tags?.length > 0 && (
                      <div className="flex justify-center gap-1 mt-1">
                        {status.order.user.tags.map((t:string) => (
                          <span key={t} className={`px-1.5 py-0.5 rounded text-[7px] font-black border ${status.intent === 'PAY' ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-neon-green/20 text-neon-green border-neon-green/30'}`}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="w-full bg-black/40 rounded-2xl p-4 border border-zinc-900">
                    <div className="space-y-2 mb-4">
                      {status.order.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-[11px] font-bold">
                          <span className="text-zinc-400 group-hover:text-white transition-colors">
                             <span className={status.intent === 'PAY' ? 'text-orange-500' : 'text-neon-green'}>{item.quantity}x</span> {item.product.name}
                          </span>
                          <span className="text-white font-black">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(item.unit_price * item.quantity)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-3 border-t border-zinc-900 items-center">
                      <span className="text-[9px] font-black uppercase text-zinc-600">Total Orden</span>
                      <span className={`text-lg font-black ${status.intent === 'PAY' ? 'text-orange-500' : 'text-neon-green'}`}>
                        {Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(status.order.total)}
                      </span>
                    </div>
                  </div>

                  {status.intent === 'PAY' ? (
                     status.order.status === 'PENDING' ? (
                        <button 
                          onClick={() => updateShopStatus(status.order.id, 'PAID')}
                          className="w-full bg-orange-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_20px_rgba(249,115,22,0.2)] flex items-center justify-center gap-2"
                        >
                          <DollarSign className="w-5 h-5" /> Confirmar Cobro Caja
                        </button>
                     ) : (
                        <div className="w-full py-4 rounded-2xl border border-zinc-800 text-orange-500/50 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 bg-orange-500/5">
                           <CheckCircle className="w-4 h-4" /> Ya pagado ({status.order.status})
                        </div>
                     )
                  ) : (
                     status.order.status === 'PAID' ? (
                        <button 
                          onClick={() => updateShopStatus(status.order.id, 'DELIVERED')}
                          className="w-full bg-neon-green text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:brightness-110 active:scale-95 transition-all shadow-[0_10px_20px_rgba(57,255,20,0.2)] flex items-center justify-center gap-2"
                        >
                          <Package className="w-5 h-5" /> Quemar / Entregar Pedido
                        </button>
                     ) : status.order.status === 'DELIVERED' ? (
                        <div className="w-full py-4 rounded-2xl border border-neon-green/30 text-neon-green/50 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 bg-neon-green/5">
                           <CheckCircle className="w-4 h-4" /> Ya entregado
                        </div>
                     ) : (
                        <div className="w-full py-4 rounded-2xl border border-red-500/30 text-red-500/50 text-[10px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-2 bg-red-500/5">
                           <XCircle className="w-4 h-4" /> Pago Pendiente
                        </div>
                     )
                  )}
                </div>
              )}
              {status.type === 'already_used' && (
                <div className="w-full p-5 rounded-2xl border-2 border-orange-500 bg-orange-500/5 shadow-[0_0_30px_rgba(249,115,22,0.2)] flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8 text-orange-400" />
                  </div>
                  <p className="font-black uppercase tracking-widest text-orange-400 text-2xl">⚠ YA USADO</p>
                  <p className="text-orange-300/80 text-xs font-bold uppercase tracking-widest text-center">Este QR ya fue escaneado anteriormente</p>
                </div>
              )}
              {status.type === 'invalid' && (
                <div className="w-full p-5 rounded-2xl border-2 border-red-500 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="font-black uppercase tracking-widest text-red-400 text-2xl">✗ RECHAZADO</p>
                  <p className="text-red-400/70 text-xs font-bold uppercase tracking-widest text-center">{status.message}</p>
                </div>
              )}
            </div>
            <p className="mt-6 text-center text-[10px] text-zinc-700 uppercase tracking-widest">El escáner se reinicia automáticamente después de cada lectura</p>
          </div>
        )}

        {/* ── TAQUILLA MODE ─────────────────────────────────────── */}
        {mode === 'taquilla' && (
          <div className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
            <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-1 text-center">Taquilla en Puerta</h1>
            <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-6 text-center">Registra asistentes que pagan en efectivo</p>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-orange-400 mb-1">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Registrados</span>
                </div>
                <p className="text-3xl font-black">{taqCount}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 text-neon-green mb-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Recaudado</span>
                </div>
                <p className="text-3xl font-black">${taqRevenue.toLocaleString()}</p>
              </div>
            </div>

            {/* Event selector */}
            <div className="mb-5">
              <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-2">Evento Activo</label>
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-white font-bold text-sm focus:border-orange-500 outline-none transition-colors">
                {events.length === 0 && <option value="">Sin eventos publicados</option>}
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.title} – {new Date(ev.date).toLocaleDateString()}</option>
                ))}
              </select>
            </div>

            {/* Form */}
            <form onSubmit={handleTaquillaSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Nombre <span className="text-zinc-600">(opcional)</span></label>
                <input type="text" placeholder="Ej: Juan Pérez" value={taqForm.name} onChange={e => setTaqForm({...taqForm, name: e.target.value})}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-orange-500 outline-none transition-colors text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Cédula <span className="text-zinc-600">(opcional)</span></label>
                <input type="text" placeholder="Ej: 1234567890" value={taqForm.cedula} onChange={e => setTaqForm({...taqForm, cedula: e.target.value})}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-orange-500 outline-none transition-colors text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Correo <span className="text-zinc-600">(opcional)</span></label>
                <input type="email" placeholder="Ej: juan@email.com" value={taqForm.email} onChange={e => setTaqForm({...taqForm, email: e.target.value})}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-orange-500 outline-none transition-colors text-sm" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Costo de entrada (COP) <span className="text-red-500">*</span></label>
                <input type="number" placeholder="Ej: 50000" value={taqForm.amount} onChange={e => setTaqForm({...taqForm, amount: e.target.value})}
                  className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-orange-500 outline-none transition-colors text-sm font-black text-lg" />
              </div>

              {taqError && <p className="text-red-400 text-xs font-bold uppercase tracking-widest">{taqError}</p>}

              <button type="submit" disabled={taqSaving || !selectedEventId}
                className={`w-full mt-1 font-black uppercase tracking-widest py-5 rounded-2xl transition-all flex justify-center items-center gap-2 text-sm shadow-lg ${taqSuccess ? 'bg-neon-green text-black shadow-[0_0_30px_rgba(57,255,20,0.4)]' : 'bg-orange-500 hover:bg-orange-400 text-white hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]'}`}>
                {taqSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : taqSuccess ? <><Check className="w-5 h-5" /> ¡Registrado con éxito!</> : <><DoorOpen className="w-5 h-5" /> Registrar Asistente</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </StaffGuard>
  );
}
