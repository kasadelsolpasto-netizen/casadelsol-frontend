"use client";
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

export function GlobalOrderReadyAlert() {
  const router = useRouter();
  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Recuperar pedidos descartados anteriormente de localStorage
  const getDismissedOrders = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('kasa_dismissed_orders');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  };

  const addDismissedOrder = (id: string) => {
    const dismissed = getDismissedOrders();
    if (!dismissed.includes(id)) {
      const updated = [...dismissed, id];
      localStorage.setItem('kasa_dismissed_orders', JSON.stringify(updated));
    }
  };

  const checkOrdersStatus = async (userId: string, token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${userId}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const dismissed = getDismissedOrders();
        const activeReady = (data.shop_orders || []).filter((o: any) => 
          o.status === 'READY' && !dismissed.includes(o.id)
        );
        setReadyOrders(activeReady);
        setIsVisible(activeReady.length > 0);
      }
    } catch (err) {
      console.error("Error global polling orders:", err);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedUser = localStorage.getItem('kasa_user');
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    if (!storedUser || !token) return;
    const user = JSON.parse(storedUser);

    // ── CONFIGURACIÓN INICIAL ───────────────────────────────────────────
    checkOrdersStatus(user.id, token);

    // ── SOCKET.IO (REAL-TIME) ──────────────────────────────────────────
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socketRef.current = io(API_URL, { query: { userId: user.id } });

    socketRef.current.on('user_shop_event', (data: any) => {
      if (data.type === 'ORDER_READY') {
        const dismissed = getDismissedOrders();
        if (!dismissed.includes(data.orderId)) {
          // Si llega una nueva, forzamos re-check o añadimos a mano
          checkOrdersStatus(user.id, token);
          
          // Sonido y Vibración
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          }
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200, 100, 200]);
          }
        }
      }
    });

    // ── PRECARGAR AUDIO ────────────────────────────────────────────────
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const dismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Descartamos todos los IDs actuales que son READY
    readyOrders.forEach(o => addDismissedOrder(o.id));
    setIsVisible(false);
  };

  const goToProfile = () => {
    const storedUser = localStorage.getItem('kasa_user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      router.push(`/profile/${user.id}`);
    }
  };

  if (!isVisible || readyOrders.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-32 z-[300] flex flex-col items-center pointer-events-none px-6">
      <div 
        onClick={goToProfile}
        className="bg-red-600 text-white p-8 rounded-[3rem] shadow-[0_30px_90px_rgba(220,38,38,0.8)] border-[6px] border-white animate-[shake_0.5s_infinite] flex flex-col items-center gap-4 pointer-events-auto max-w-sm w-full cursor-pointer hover:scale-105 transition-transform relative"
      >
        <button 
          onClick={dismiss}
          className="absolute -top-4 -right-4 w-10 h-10 bg-black text-white rounded-full border-4 border-white flex items-center justify-center hover:bg-zinc-900 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-4">
          <Zap className="w-10 h-10 animate-ping" />
          <h2 className="text-3xl font-black uppercase italic leading-none text-shadow-lg">¡¡YAAAAAAAA!!</h2>
          <Zap className="w-10 h-10 animate-ping" />
        </div>
        
        <p className="font-black uppercase text-sm tracking-tighter text-center leading-tight">
          ¡TU PEDIDO ESTÁ LISTO!<br />
          <span className="text-2xl">¡CORRE A LA BARRA AHORA MISMO!</span><br />
          💨💨💨💨💨💨💨
        </p>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: rotate(0deg) scale(1); }
          25% { transform: rotate(-1deg) scale(1.02); }
          75% { transform: rotate(1deg) scale(1.02); }
        }
        .text-shadow-lg {
          text-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }
      `}</style>
    </div>
  );
}
