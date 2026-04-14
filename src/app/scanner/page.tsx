"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ArrowLeft, Loader2, UserCheck, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { StaffGuard } from '@/components/StaffGuard';

type ScanStatus =
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'admitted'; name: string; ticket: string; time: string }
  | { type: 'already_used' }
  | { type: 'invalid'; message: string };

export default function ScannerPage() {
  const [status, setStatus] = useState<ScanStatus>({ type: 'idle' });
  const cooldownRef = useRef(false);
  const scannerRef = useRef<any>(null);

  // ── Callback ref: se llama cuando el div entra al DOM ─────────────────────
  // Esto soluciona el race condition con StaffGuard que renderiza async
  const scannerDivRef = useCallback((node: HTMLDivElement | null) => {
    if (!node || scannerRef.current) return; // ya inicializado o nodo no disponible

    import('html5-qrcode')
      .then(({ Html5QrcodeScanner }) => {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            rememberLastUsedCamera: true,
            supportedScanTypes: [0], // 0 = SCAN_TYPE_CAMERA
          },
          /* verbose= */ false
        );

        scannerRef.current = scanner;

        scanner.render(
          (decodedText: string) => {
            if (cooldownRef.current) return;
            cooldownRef.current = true;
            handleScan(decodedText).finally(() => {
              setTimeout(() => {
                cooldownRef.current = false;
                setStatus({ type: 'idle' });
              }, 4000);
            });
          },
          () => {} // ignorar errores de frame vacío
        );
      })
      .catch((err) => console.error('Error cargando html5-qrcode:', err));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Limpieza al desmontar
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
      const tokenRow = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
      const authToken = tokenRow?.split('=')[1];
      if (!authToken) throw new Error('Sin sesión activa');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/qrs/scan`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ token }),
        }
      );

      const data = await res.json();

      if (res.status === 400) {
        setStatus({ type: 'already_used' });
        return;
      }

      if (!res.ok) {
        setStatus({ type: 'invalid', message: data.message || 'QR inválido o falso' });
        return;
      }

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

  return (
    <StaffGuard>
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">

        {/* Header */}
        <div className="w-full bg-black/80 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-bold uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4" /> Salir
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
            <span className="font-black uppercase tracking-widest text-neon-green text-xs">Punto de Control</span>
          </div>
          <div className="w-16" />
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col items-center px-4 py-6 max-w-md mx-auto w-full">
          <h1 className="text-2xl font-black uppercase tracking-widest text-white mb-1 text-center">
            Escáner QR
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest font-bold mb-6 text-center">
            Apunta el lente al código del asistente
          </p>

          {/* Viewfinder — ref callback activa el scanner cuando el div existe */}
          <div className="w-full rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.9)] bg-black relative">
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-neon-green rounded-tl z-10 pointer-events-none" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-neon-green rounded-tr z-10 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-neon-green rounded-bl z-10 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-neon-green rounded-br z-10 pointer-events-none" />
            {/* El div interno activa el scanner via callback ref */}
            <div id="qr-reader" ref={scannerDivRef} className="w-full" />
          </div>

          {/* Status feedback */}
          <div className="mt-6 w-full">

            {status.type === 'idle' && (
              <div className="w-full p-5 rounded-2xl border border-zinc-800 bg-black/40 flex items-center justify-center min-h-[100px]">
                <span className="text-zinc-600 uppercase tracking-widest text-xs font-bold animate-pulse">
                  Esperando código…
                </span>
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

            {status.type === 'already_used' && (
              <div className="w-full p-5 rounded-2xl border-2 border-orange-500 bg-orange-500/5 shadow-[0_0_30px_rgba(249,115,22,0.2)] flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-orange-500/20 border-2 border-orange-500 flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8 text-orange-400" />
                </div>
                <p className="font-black uppercase tracking-widest text-orange-400 text-2xl">⚠ YA USADO</p>
                <p className="text-orange-300/80 text-xs font-bold uppercase tracking-widest text-center">
                  Este QR ya fue escaneado anteriormente
                </p>
              </div>
            )}

            {status.type === 'invalid' && (
              <div className="w-full p-5 rounded-2xl border-2 border-red-500 bg-red-500/5 shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col items-center gap-2 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="font-black uppercase tracking-widest text-red-400 text-2xl">✗ RECHAZADO</p>
                <p className="text-red-400/70 text-xs font-bold uppercase tracking-widest text-center">
                  {status.message}
                </p>
              </div>
            )}
          </div>

          <p className="mt-6 text-center text-[10px] text-zinc-700 uppercase tracking-widest">
            El escáner se reinicia automáticamente después de cada lectura
          </p>
        </div>
      </div>
    </StaffGuard>
  );
}
