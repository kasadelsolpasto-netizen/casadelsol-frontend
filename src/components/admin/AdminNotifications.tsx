"use client";
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Bell, ShoppingBag, X, CheckCircle, DollarSign } from 'lucide-react';

interface ShopEvent {
  type: 'NEW_ORDER' | 'PAYMENT_CONFIRMED';
  orderId: string;
  customerName: string;
  total: number;
  paymentType: string;
}

export default function AdminNotifications() {
  const [notification, setNotification] = useState<ShopEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // ── CONFIGURACIÓN DEL SOCKET ─────────────────────────────────────
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socketRef.current = io(API_URL);

    socketRef.current.on('shop_event', (data: ShopEvent) => {
      console.log('✅ Notificación recibida:', data);
      triggerNotification(data);
    });

    // ── PRECARGAR SONIDO ─────────────────────────────────────────────
    // Usamos un sonido de "venta" potente y premium
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3'); 
    audioRef.current.volume = 1.0;

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const triggerNotification = (data: ShopEvent) => {
    setNotification(data);
    setIsVisible(true);

    // ── SONIDO Y VIBRACIÓN ───────────────────────────────────────────
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio play blocked by browser policies until user interacts."));
    }

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]); // Patrón de vibración potente
    }

    // Auto-ocultar después de 8 segundos
    setTimeout(() => {
      setIsVisible(false);
    }, 8000);
  };

  if (!isVisible || !notification) return null;

  const isPaid = notification.type === 'PAYMENT_CONFIRMED';

  return (
    <div className="fixed bottom-10 right-10 z-[200] animate-in slide-in-from-right-10 duration-500 max-w-sm w-full">
      <div className={`relative overflow-hidden p-6 rounded-[2.5rem] border-2 shadow-2xl backdrop-blur-xl ${
        isPaid 
          ? 'bg-neon-green/10 border-neon-green shadow-neon-green/20' 
          : 'bg-orange-500/10 border-orange-500 shadow-orange-500/20'
      }`}>
        {/* Glow Effects */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 blur-3xl rounded-full opacity-20 ${isPaid ? 'bg-neon-green' : 'bg-orange-500'}`} />
        
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-4 items-start">
           <div className={`p-4 rounded-2xl flex items-center justify-center shrink-0 border ${
             isPaid ? 'bg-neon-green/20 border-neon-green text-neon-green' : 'bg-orange-500/20 border-orange-500 text-orange-500'
           }`}>
              {isPaid ? <CheckCircle className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
           </div>

           <div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isPaid ? 'text-neon-green' : 'text-orange-500'}`}>
                 {isPaid ? '¡Pago Confirmado!' : 'Nueva Orden Pendiente'}
              </p>
              <h4 className="text-white font-black text-lg leading-tight mb-2">
                 {notification.customerName}
              </h4>
              <p className="text-zinc-400 text-xs font-bold leading-relaxed mb-4">
                 {isPaid 
                   ? `¡Venta de la tienda completada! Recibidos ${Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(notification.total)} vía ${notification.paymentType}.`
                   : `Ha solicitado un pedido por ${Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(notification.total)}. Cobrar en caja.`
                 }
              </p>

              <div className="flex items-center gap-2">
                 <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                    isPaid ? 'bg-neon-green/20 border-neon-green/30 text-neon-green' : 'bg-orange-500/20 border-orange-500/30 text-orange-500'
                 }`}>
                    {isPaid ? 'Entregar Productos' : 'Pendiente de Cobro'}
                 </span>
                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">#{notification.orderId.slice(-4).toUpperCase()}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
