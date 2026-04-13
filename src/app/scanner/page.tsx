"use client";
import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { StaffGuard } from '@/components/StaffGuard';

export default function ScannerPage() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    // Only mount to the DOM element "reader"
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 280, height: 280 }, rememberLastUsedCamera: true },
      false
    );

    let isProcessing = false;

    scanner.render(
      (decodedText) => {
        if (isProcessing) return;
        isProcessing = true;
        setScanResult(decodedText);
        
        handleScan(decodedText).finally(() => {
          setTimeout(() => {
            isProcessing = false;
            setScanResult(null);
            setStatus(null);
          }, 3500); // Darle 3.5 segundos al portero para leer antes del proximo escaneo
        });
      },
      (err) => {
        // Ignorar fallos de cuadros vacios
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Scanner clear fail", e));
    };
  }, []);

  const handleScan = async (token: string) => {
    setLoading(true);
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;

      if (!authToken) throw new Error("No tienes sesión");

      const res = await fetch('http://localhost:3001/qrs/scan', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` 
        },
        body: JSON.stringify({ token })
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus({ success: false, message: data.message });
      } else {
        setStatus({ success: true, message: `ACCESO CONCEDIDO: ${data.order.user.name}` });
      }
    } catch (err: any) {
      setStatus({ success: false, message: err.message || 'Error de red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <StaffGuard>
      <div className="min-h-screen bg-black text-white flex flex-col items-center">
        <div className="w-full bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between z-10">
          <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Salir
          </Link>
          <span className="font-black uppercase tracking-widest text-neon-purple text-xs">Punto de Control</span>
        </div>

        <div className="w-full max-w-md p-6 flex flex-col items-center mt-8">
          <h1 className="text-2xl font-black uppercase tracking-widest mb-2 text-center text-neon-green">Escáner de Acceso</h1>
          <p className="text-zinc-500 text-sm mb-8 text-center uppercase tracking-widest font-semibold">Apunta el lente al QR del Raver</p>

          {/* CONTENEDOR DEL ESCÁNER */}
          <div id="reader" className="w-full bg-black border-2 border-zinc-800 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)]"></div>

          {/* FEEDBACK VISUAL INMEDIATO PARA EL STAFF */}
          <div className="mt-8 w-full h-32 flex flex-col items-center justify-center text-center">
            {loading && (
               <div className="flex flex-col items-center text-zinc-400 animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-neon-purple" />
                  <span className="uppercase text-xs font-bold tracking-widest">Verificando en Base de Datos...</span>
               </div>
            )}

            {status && !loading && (
               <div className={`w-full p-6 rounded-2xl border-2 flex flex-col items-center ${status.success ? 'bg-neon-green/10 border-neon-green text-neon-green shadow-[0_0_30px_rgba(57,255,20,0.2)]' : 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.2)]'}`}>
                  {status.success ? <CheckCircle className="w-12 h-12 mb-2" /> : <XCircle className="w-12 h-12 mb-2" />}
                  <p className="font-black uppercase tracking-widest text-lg">{status.success ? 'Adelante' : 'Rechazado'}</p>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1">{status.message}</p>
               </div>
            )}
            
            {!status && !loading && (
              <div className="w-full p-6 glass-panel rounded-2xl border border-zinc-800 flex items-center justify-center h-full">
                 <span className="text-zinc-600 uppercase tracking-widest text-xs font-bold animate-pulse">Esperando Código...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </StaffGuard>
  );
}
