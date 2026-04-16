"use client";
import { useEffect, useState } from 'react';
import { 
  ShoppingBag, Plus, Minus, X, CreditCard, 
  DollarSign, Loader2, Package, CheckCircle2,
  ChevronRight,
  ArrowLeft,
  ShoppingCart,
  Zap,
  QrCode as QrIcon
} from 'lucide-react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';

export default function PublicShopPage() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderResult, setOrderResult] = useState<any>(null);

  const fetchData = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/shop/products/catalog`);
      if (res.ok) {
        const data = await res.json();
        const available = data.filter((p: any) => p.stock > 0);
        setProducts(available);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  // ── REDIRIGIR AUTOMÁTICAMENTE DESPUÉS DE LA COMPRA ──────────────
  useEffect(() => {
    if (orderResult) {
      const timer = setTimeout(() => {
        router.push('/profile');
      }, 4000); 
      return () => clearTimeout(timer);
    }
  }, [orderResult, router]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId) {
        const newQty = Math.max(1, i.qty + delta);
        return { ...i, qty: newQty };
      }
      return i;
    }));
  };

  const total = cart.reduce((acc, current) => acc + (current.product.price * current.qty), 0);

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleCheckout = async (paymentType: 'VIRTUAL' | 'CASH') => {
    const token = getToken();
    if (!token) {
        setShowAuthModal(true);
        return;
    }

    setIsCheckingOut(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/shop/orders/checkout`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          paymentType,
          items: cart.map(i => ({ productId: i.product.id, quantity: i.qty }))
        })
      });

      if (res.ok) {
        const result = await res.json();
        
        if (paymentType === 'VIRTUAL' && result.wompiData) {
           const checkout = new (window as any).WidgetCheckout({
             currency: 'COP',
             amountInCents: result.wompiData.amountInCents,
             reference: result.wompiData.reference,
             publicKey: result.wompiData.publicKey,
             signature: { integrity: result.wompiData.signature },
             redirectUrl: `${window.location.origin}/profile`
           });
           checkout.open((result: any) => {
             const transaction = result.transaction;
             if (transaction.status === 'APPROVED') {
                setOrderResult({ ...result, status: 'PAID' });
                setCart([]);
                setShowCart(false);
             }
           });
        } else {
           setOrderResult(result);
           setCart([]);
           setShowCart(false);
        }
      } else {
        const err = await res.json();
        alert(err.message || "Error al procesar la orden.");
      }
    } catch (err) { console.error(err); } finally { setIsCheckingOut(false); }
  };

  if (orderResult) {
    const isPaid = orderResult.status === 'PAID' || orderResult.paymentType === 'VIRTUAL';

    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500">
         <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 border-4 animate-bounce ${isPaid ? 'bg-neon-green/10 border-neon-green' : 'bg-orange-500/10 border-orange-500'}`}>
            {isPaid ? <CheckCircle2 className="w-14 h-14 text-neon-green" /> : <DollarSign className="w-14 h-14 text-orange-500" />}
         </div>
         
         <h1 className="text-4xl font-black uppercase tracking-tighter text-white mb-6">
            ¡GRACIAS POR TU COMPRA!
         </h1>
         
         <div className="bg-zinc-900/40 border border-zinc-800 p-10 rounded-[3.5rem] w-full max-w-sm mb-12 shadow-2xl relative overflow-hidden group">
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${isPaid ? 'from-neon-green/50 to-transparent' : 'from-orange-500/50 to-transparent'}`} />
            
            <p className="text-white font-black text-lg leading-tight uppercase mb-6">
                Apenas esté listo tu pedido acércate a la barra a recibirlo.
            </p>
            
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
               ESTADO: {isPaid ? 'PAGADO' : 'PENDIENTE DE COBRO'}
            </p>

            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-4">
               <div className="h-full bg-orange-500 animate-[progress_4s_linear]" />
            </div>
            <p className="text-zinc-600 text-[8px] font-black uppercase tracking-widest">
               Redirigiendo a tu Bóveda en 4 segundos...
            </p>
         </div>

         <div className="flex flex-col gap-3 w-full max-w-sm">
            <Link href="/profile" className="w-full bg-white text-black font-black uppercase tracking-widest py-5 rounded-2xl hover:bg-neon-green transition-all shadow-xl">
                 Ir a mi Bóveda
            </Link>
         </div>

         <style jsx>{`
            @keyframes progress {
               from { width: 0%; }
               to { width: 100%; }
            }
         `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] pb-32">
      <Script src="https://checkout.wompi.co/widget.js" strategy="lazyOnload" />
      
      {/* Dynamic Header */}
      <div className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-zinc-900 px-6 py-6 flex justify-between items-center overflow-hidden">
         <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500"><Zap className="w-5 h-5" /></div>
            <div>
               <h1 className="text-lg font-black uppercase tracking-tighter text-white">Bar de la Kasa</h1>
               <span className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">Servicio en vivo • {products.length} productos disponibles</span>
            </div>
         </div>
         <button onClick={() => setShowCart(true)} className="relative p-3 bg-zinc-900 rounded-xl text-white hover:bg-zinc-800 transition-all shadow-lg active:scale-90">
            <ShoppingCart className="w-5 h-5" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg animate-bounce">
                {cart.reduce((a,c) => a+c.qty, 0)}
              </span>
            )}
         </button>
      </div>

      <main className="px-5 py-8">
         {loading ? (
            <div className="py-20 flex flex-col items-center gap-4">
               <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
               <span className="text-[9px] font-black text-zinc-700 uppercase tracking-widest">Abriendo Carta...</span>
            </div>
         ) : (
           <div className="grid grid-cols-2 gap-4">
              {products.map(p => (
                <div key={p.id} className="bg-zinc-950 border border-zinc-900 rounded-[2.5rem] p-4 flex flex-col group active:scale-[0.98] transition-all">
                   <div className="relative mb-4 aspect-square rounded-[2rem] overflow-hidden bg-zinc-900 border border-zinc-800 shadow-inner">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-8 h-8 text-zinc-800" /></div>
                      )}
                   </div>
                   
                   <div className="px-1 flex-1 flex flex-col">
                      <h3 className="text-white font-black uppercase text-xs tracking-tight mb-1 truncate">{p.name}</h3>
                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-4">{p.category?.name || 'Varios'}</p>
                      
                      <div className="mt-auto flex items-center justify-between">
                         <span className="text-sm font-black text-orange-500">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(p.price)}</span>
                         <button 
                            disabled={p.stock <= 0}
                            onClick={() => addToCart(p)}
                            className="w-10 h-10 bg-white text-black rounded-xl flex items-center justify-center hover:bg-neon-green transition-all shadow-xl disabled:opacity-20 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300"
                         >
                            <Plus className="w-4 h-4" />
                         </button>
                      </div>
                   </div>
                </div>
              ))}
           </div>
         )}
      </main>

      {/* FLOAT BOTTOM BAR (SI HAY CARRITO) */}
      {cart.length > 0 && !showCart && (
        <div className="fixed bottom-8 left-0 right-0 px-6 z-40 animate-in slide-in-from-bottom-10">
           <button onClick={() => setShowCart(true)} className="w-full bg-white text-black p-5 rounded-2xl flex justify-between items-center shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 transition-all">
              <div className="flex items-center gap-3">
                 <div className="bg-black text-white w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black">{cart.reduce((a,c) => a+c.qty, 0)}</div>
                 <span className="font-black uppercase tracking-widest text-[10px]">Ver mi Pedido</span>
              </div>
              <span className="text-sm font-black">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(total)}</span>
           </button>
        </div>
      )}

      {/* CART DRAWER (MOBILE) */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in slide-in-from-bottom duration-500 overflow-hidden">
           <header className="px-6 py-8 flex justify-between items-center border-b border-zinc-900">
              <button onClick={() => setShowCart(false)} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors">
                 <ArrowLeft className="w-5 h-5" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Volver</span>
              </button>
              <h2 className="text-xl font-black uppercase tracking-tighter text-white">Tu Carrito</h2>
              <div className="w-8" />
           </header>

           <div className="flex-1 overflow-y-auto px-6 py-8 no-scrollbar">
              <div className="space-y-6">
                 {cart.map(item => (
                   <div key={item.product.id} className="flex gap-4 items-center">
                      <img src={item.product.image_url} alt="" className="w-20 h-20 rounded-2xl object-cover bg-zinc-900 border border-zinc-800" />
                      <div className="flex-1">
                         <h4 className="text-sm font-bold text-white uppercase">{item.product.name}</h4>
                         <p className="text-orange-500 font-black text-xs">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(item.product.price)}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-zinc-900 px-3 py-2 rounded-xl">
                         <button onClick={() => updateQty(item.product.id, -1)} className="p-1 hover:text-white text-zinc-500 transition-colors"><Minus className="w-3 h-3" /></button>
                         <span className="text-xs font-black text-white w-4 text-center">{item.qty}</span>
                         <button onClick={() => updateQty(item.product.id, 1)} className="p-1 hover:text-white text-zinc-500 transition-colors"><Plus className="w-3 h-3" /></button>
                      </div>
                      <button onClick={() => removeFromCart(item.product.id)} className="p-2 text-zinc-800 hover:text-red-500"><X className="w-4 h-4" /></button>
                   </div>
                 ))}
              </div>

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                   <ShoppingBag className="w-16 h-16 mb-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Tu bóveda está vacía</span>
                </div>
              )}
           </div>

           <div className="p-8 bg-zinc-950 border-t border-zinc-900 space-y-6">
              <div className="flex justify-between items-center mb-4 px-2">
                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Total a pagar</span>
                 <span className="text-2xl font-black text-white">{Intl.NumberFormat('es-CO', {style:'currency', currency:'COP', maximumFractionDigits:0}).format(total)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                 <button 
                   disabled={isCheckingOut || cart.length === 0}
                   onClick={() => handleCheckout('CASH')}
                   className="flex flex-col items-center p-4 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-orange-500/50 hover:bg-orange-500/5 transition-all group disabled:opacity-30"
                 >
                    <DollarSign className="w-6 h-6 text-orange-500 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Pagar en Efectivo</span>
                 </button>
                 <button 
                   disabled={isCheckingOut || cart.length === 0}
                   onClick={() => handleCheckout('VIRTUAL')}
                   className="flex flex-col items-center p-4 bg-zinc-900 border border-zinc-800 rounded-3xl hover:border-neon-purple/50 hover:bg-neon-purple/5 transition-all group disabled:opacity-30"
                 >
                    <CreditCard className="w-6 h-6 text-neon-purple mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Pago Virtual</span>
                 </button>
              </div>

              {isCheckingOut && (
                <div className="text-center py-2 animate-pulse text-[8px] font-black text-orange-500 uppercase tracking-[0.3em]">
                   Procesando con la Central de Pagos...
                 </div>
              )}
           </div>
        </div>
      )}

      {/* AUTH MODAL (FASE FINAL) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-green via-neon-purple to-neon-green" />
              
              <button 
                onClick={() => setShowAuthModal(false)}
                className="absolute top-6 right-6 p-2 bg-zinc-900 rounded-full text-zinc-500 hover:text-white transition-all shadow-xl"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                 <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-neon-green mb-6 border border-zinc-800 shadow-xl">
                    <User className="w-8 h-8" />
                 </div>
                 
                 <h2 className="text-xl font-black uppercase text-white mb-2">Bóveda de Identidad</h2>
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-relaxed mb-10">
                    Necesitas identificarte como Raver de la Kasa para realizar compras en el local y recibir notificaciones de pedido.
                 </p>

                 <div className="flex flex-col gap-4 w-full">
                    <Link 
                       href="/login?redirect=/shop"
                       className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-neon-green transition-all shadow-xl flex items-center justify-center gap-2 group"
                    >
                       Identificarme <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Link 
                       href="/register?redirect=/shop"
                       className="w-full py-4 bg-zinc-900 border border-zinc-800 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl hover:border-neon-purple/50 transition-all flex items-center justify-center gap-2"
                    >
                       Unirme al Ritual
                    </Link>
                 </div>
                 
                 <button 
                   onClick={() => setShowAuthModal(false)}
                   className="mt-8 text-[9px] font-black uppercase tracking-widest text-zinc-700 hover:text-zinc-400 transition-colors"
                 >
                   Continuar como Invitado (Solo Ver)
                 </button>
              </div>
           </div>
        </div>
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
