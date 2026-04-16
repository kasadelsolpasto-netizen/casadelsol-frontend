"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { CheckCircle, XCircle, ArrowLeft, Loader2, UserCheck, ShieldAlert, DoorOpen, QrCode, Check, Users, DollarSign, Package } from 'lucide-react';
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

  const scannerDivRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }
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
              setTimeout(() => { 
                cooldownRef.current = false; 
                setStatus({ type: 'idle' }); 
              }, 4000);
            });
          },
          () => {}
        );
      })
      .catch(err => console.error('Error cargando html5-qrcode:', err));
  }, []);

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

      if (token.startsWith('KASA_SHOP_PAY:') || token.startsWith('KASA_SHOP_DELIVER:')) {
        const parts = token.split(':');
        const prefix = parts[0];
        const orderId = parts[1];
        const verificationToken = parts[2];
        
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/shop/orders/admin/${orderId}`, {
           headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (res.ok) {
           const orderData = await res.json();

           if (verificationToken && orderData.verification_token && verificationToken !== orderData.verification_token) {
              throw new Error('¡TOKEN INVÁLIDO! Posible fraude.');
           }

           // --- COBRO EN CAJA ---
           if (prefix.includes('PAY')) {
              setStatus({ type: 'shop_order', order: orderData, intent: 'PAY' });
              return;
           }

           // --- ENTREGA AUTOMÁTICA ---
           if (orderData.status === 'DELIVERED') {
              setStatus({ type: 'shop_error', message: '¡ALERTA! ESTE PEDIDO YA FUE ENTREGADO' });
              return;
           }

           if (['PAID', 'READY'].includes(orderData.status)) {
              const updateRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/shop/orders/${orderData.id}/status`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                 body: JSON.stringify({ status: 'DELIVERED' })
              });

              if (updateRes.ok) {
                 setStatus({ type: 'shop_success', name: orderData.user?.name || 'Invitado', total: orderData.total });
                 return;
              }
           }

           if (orderData.status === 'PENDING') {
              throw new Error('PAGO PENDIENTE. Cobra en caja primero.');
           }

           setStatus({ type: 'shop_order', order: orderData, intent: 'DELIVER' });
           return;
        }
        throw new Error('Pedido no encontrado');
      }

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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            setStatus({ type: 'idle' });
            alert(status === 'PAID' ? "Pago confirmado." : "Pedido entregado.");
        }
    } catch(e) { console.error(e); }
  };

  const handleTaquillaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) { setTaqError('Selecciona un evento.'); return; }
    setTaqSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/walk-in/${selectedEventId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ ...taqForm, amount: Number(taqForm.amount) })
      });
      if (res.ok) {
        setTaqForm({ name: '', cedula: '', email: '', amount: '' });
        setTaqSuccess(true);
        setTimeout(() => setTaqSuccess(false), 2500);
      } else {
        const d = await res.json();
        setTaqError(d.message || 'Error');
      }
    } catch { setTaqError('Error de conexión'); }
    finally { setTaqSaving(false); }
  };

  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
        <div className="w-full bg-black/90 border-b border-zinc-800 px-4 py-3 sticky top-0 z-20">
          <div className="max-w-md mx-auto flex items-center justify-between gap-4">
            <Link href="/" className="text-zinc-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex-1 max-w-xs">
              <button onClick={() => setMode('qr')} className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition-all ${mode === 'qr' ? 'bg-neon-green text-black' : 'text-zinc-500'}`}><QrCode className="w-3.5 h-3.5" /> Scanner</button>
              <button onClick={() => setMode('taquilla')} className={`flex items-center gap-2 flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase transition-all ${mode === 'taquilla' ? 'bg-orange-500 text-white' : 'text-zinc-500'}`}><DoorOpen className="w-3.5 h-3.5" /> Taquilla</button>
            </div>
          </div>
        </div>

        {mode === 'qr' && (
          <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">
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
                <div className="w-full p-5 rounded-2xl border border-neon-purple/40 bg-neon-purple/5 flex flex-col items-center gap-2 min-h-[100px] justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-neon-purple" />
                </div>
              )}
              
              {status.type === 'admitted' && (
                <div className="w-full p-8 rounded-[3rem] border-4 border-neon-green bg-neon-green/10 shadow-[0_0_60px_rgba(57,255,20,0.3)] flex flex-col items-center gap-4 animate-in zoom-in-95">
                  <div className="w-20 h-20 rounded-full bg-neon-green border-4 border-black flex items-center justify-center"><CheckCircle className="w-10 h-10 text-black" /></div>
                  <p className="font-black uppercase text-neon-green text-3xl">✓ ADMITIDO</p>
                  <p className="text-white font-black text-2xl uppercase text-center leading-tight">{status.name}</p>
                </div>
              )}

              {status.type === 'shop_success' && (
                <div className="w-full p-8 rounded-[3rem] border-4 border-neon-green bg-neon-green/10 shadow-[0_0_60px_rgba(57,255,20,0.3)] flex flex-col items-center gap-4 animate-in zoom-in-95">
                  <div className="w-20 h-20 rounded-full bg-neon-green border-4 border-black flex items-center justify-center"><Package className="w-10 h-10 text-black" /></div>
                  <p className="font-black uppercase text-neon-green text-3xl">✓ LISTO</p>
                  <div className="text-center">
                    <p className="text-white font-black text-2xl uppercase leading-tight">{status.name}</p>
                    <p className="text-neon-green text-xl font-black">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(status.total)}</p>
                  </div>
                </div>
              )}

              {status.type === 'shop_error' && (
                <div className="w-full p-8 rounded-[3rem] border-4 border-red-600 bg-red-600/10 shadow-[0_0_60px_rgba(220,38,38,0.3)] flex flex-col items-center gap-4 animate-in zoom-in-95">
                  <div className="w-20 h-20 rounded-full bg-red-600 border-4 border-white flex items-center justify-center"><ShieldAlert className="w-10 h-10 text-white animate-pulse" /></div>
                  <p className="font-black uppercase text-red-500 text-3xl">✗ ERROR</p>
                  <p className="text-white font-black text-lg uppercase text-center">{status.message}</p>
                </div>
              )}

              {status.type === 'shop_order' && status.intent === 'PAY' && (
                <div className="w-full p-6 rounded-[2.5rem] border-2 border-orange-500 bg-orange-500/10 flex flex-col items-center gap-4">
                  <DollarSign className="w-10 h-10 text-orange-500" />
                  <p className="font-black uppercase text-orange-500">Cobro en Caja</p>
                  <p className="text-white font-black text-xl">{status.order.user?.name || 'Invitado'}</p>
                  <button onClick={() => updateShopStatus(status.order.id, 'PAID')} className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl">Confirmar Pago</button>
                </div>
              )}

              {status.type === 'already_used' && (
                <div className="w-full p-8 rounded-[3rem] border-4 border-orange-500 bg-orange-500/10 flex flex-col items-center gap-4">
                  <ShieldAlert className="w-12 h-12 text-orange-500" />
                  <p className="font-black uppercase text-orange-500 text-2xl">YA USADO</p>
                </div>
              )}

              {status.type === 'invalid' && (
                <div className="w-full p-8 rounded-[3rem] border-4 border-red-600 bg-red-600/10 flex flex-col items-center gap-4">
                  <XCircle className="w-12 h-12 text-red-600" />
                  <p className="text-white font-black text-center">{status.message}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {mode === 'taquilla' && (
          <div className="p-6 max-w-md mx-auto w-full flex flex-col gap-6">
            <h1 className="text-2xl font-black uppercase text-center">Registrar Asistente</h1>
            <input placeholder="Nombre" value={taqForm.name} onChange={e => setTaqForm({...taqForm, name: e.target.value})} className="bg-zinc-900 p-4 rounded-xl outline-none" />
            <input placeholder="Costo" type="number" value={taqForm.amount} onChange={e => setTaqForm({...taqForm, amount: e.target.value})} className="bg-zinc-900 p-4 rounded-xl outline-none" />
            <button onClick={handleTaquillaSubmit} className="bg-orange-500 py-4 rounded-xl font-black uppercase">Registrar</button>
          </div>
        )}
      </div>
    </StaffGuard>
  );
}
