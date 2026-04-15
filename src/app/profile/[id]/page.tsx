"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, QrCode, User, Star, MapPin, Calendar, CheckCircle, X, Lock, Share2, DoorOpen, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { InstallAppButton } from '@/components/InstallAppButton';

export default function ProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQr, setSelectedQr] = useState<any>(null);
  const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://casadelsol-frontend.vercel.app';

  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [passMsg, setPassMsg] = useState('');

  const passwordsMatch = newPassword.length >= 8 && newPassword === confirmPassword;

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || newName.length < 3) return setProfileMsg('Nombre muy corto.');
    setProfileMsg('Guardando...');
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${params.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newName })
      });
      if (res.ok) {
        setProfileMsg('Perfil actualizado.');
        setProfile({ ...profile, name: newName });
        // Actualizar localstorage para el navbar
        const localUser = JSON.parse(localStorage.getItem('kasa_user') || '{}');
        localUser.name = newName;
        localStorage.setItem('kasa_user', JSON.stringify(localUser));
        window.dispatchEvent(new Event('storage'));
      } else {
        setProfileMsg('Error al guardar.');
      }
    } catch (err) {
      setProfileMsg('Error de red.');
    }
  };
  
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) return setPassMsg('Mínimo 8 caracteres.');
    if (newPassword !== confirmPassword) return setPassMsg('No coinciden.');
    
    setPassMsg('Actualizando...');
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${params.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        setPassMsg('¡Bóveda Asegurada!');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPassMsg('Error al encriptar.');
      }
    } catch (err) {
      setPassMsg('Error de conexión.');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;

      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/${params.id}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setNewName(data.name);
          
          // Sincronizar el rol en duro para que el Navbar reaccione si lo degradaron
          const localStr = localStorage.getItem('kasa_user');
          if (localStr) {
            try {
              const localUser = JSON.parse(localStr);
              if (localUser.role !== data.role || localUser.name !== data.name) {
                localUser.role = data.role;
                localUser.name = data.name;
                localStorage.setItem('kasa_user', JSON.stringify(localUser));
                window.dispatchEvent(new Event('storage'));
              }
            } catch(e) {}
          }
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-[#070000] flex flex-col items-center justify-center overflow-hidden">
        {/* Ruido Estática Oscura */}
        <div className="absolute inset-0 z-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-60 mix-blend-overlay animate-pulse"></div>
        
        {/* Rejilla CRT de Seguridad Roja */}
        <div className="absolute inset-0 z-10 pointer-events-none opacity-90" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 1px, rgba(12,0,0,0.9) 2px, rgba(12,0,0,0.9) 4px)' }}></div>
        
        {/* Flash de sangre central para el mecanismo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-900/20 blur-3xl rounded-full animate-pulse"></div>

        <div className="relative z-20 flex flex-col items-center w-full px-6">
            
            {/* The Vault Mechanism */}
            <div className="relative w-32 h-32 md:w-48 md:h-48 mb-12 flex items-center justify-center">
               {/* Outer Rotating Ring */}
               <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-red-900/30 animate-[spin_3s_linear_infinite]"></div>
               <div className="absolute inset-2 rounded-full border-b-2 border-l-2 border-red-600/50 animate-[spin_2s_linear_infinite_reverse]"></div>
               
               {/* Inner Hexagon Pulsing */}
               <div className="absolute w-16 h-16 md:w-24 md:h-24 bg-red-950/40 border border-red-500/50 rotate-45 animate-pulse shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center">
                 <div className="w-8 h-8 md:w-12 md:h-12 bg-black border border-red-700/80 -rotate-45 flex items-center justify-center overflow-hidden relative">
                    <div className="w-full h-[1px] bg-red-500 shadow-[0_0_10px_red] absolute top-0 animate-[ping_1.5s_infinite]"></div>
                    <Lock className="w-4 h-4 md:w-5 md:h-5 text-red-500 animate-pulse shadow-sm" />
                 </div>
               </div>
            </div>

            {/* Texto Glitch (Super Responsivo) */}
            <div className="text-xl md:text-3xl font-black uppercase tracking-[0.3em] flex flex-col text-center relative w-full items-center justify-center mb-8">
              <span className="text-red-900 animate-bounce absolute opacity-80 blur-[2px] translate-x-1 -translate-y-1">ABRIENDO BÓVEDA</span>
              <span className="text-red-600 absolute -translate-x-[2px] translate-y-[2px] mix-blend-screen opacity-90 animate-ping">ABRIENDO BÓVEDA</span>
              <span className="text-zinc-300 mix-blend-screen relative z-10 text-shadow-sm">ABRIENDO BÓVEDA</span>
            </div>

            {/* Subtext Hack */}
            <p className="text-[10px] md:text-xs text-red-500/60 font-bold uppercase tracking-[0.4em] font-mono text-center flex flex-col gap-2 w-full">
              <span>DECRYPTING SOUL DATA...</span>
              <span className="opacity-50 tracking-widest text-[8px] md:text-[10px]">AUTH_TOKEN ACCEPTED</span>
            </p>
        </div>
      </div>
    );
  }

  const isStaff = profile?.role === 'STAFF' || profile?.role === 'OWNER';
  const staffType = profile?.staff_access?.permissions?.classification;

  return (
    <div className="min-h-screen pb-20">
      {/* ── BARRA DE NAV EXCLUSIVA PARA STAFF ──────────────────── */}
      {isStaff && (
        <div className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-800">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neon-green">Staff Activo</span>
            </div>
            <div className="flex items-center gap-2">
              <a href="/scanner"
                className="flex items-center gap-2 bg-neon-green/10 border border-neon-green/40 hover:bg-neon-green/20 hover:border-neon-green text-neon-green font-black uppercase tracking-widest text-[10px] py-2 px-3 rounded-lg transition-all">
                <QrCode className="w-3.5 h-3.5" /> Scanner QR
              </a>
              <a href="/scanner"
                className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/40 hover:bg-orange-500/20 hover:border-orange-500 text-orange-400 font-black uppercase tracking-widest text-[10px] py-2 px-3 rounded-lg transition-all">
                <DoorOpen className="w-3.5 h-3.5" /> Taquilla
              </a>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <ShieldCheck className="w-4 h-4 text-neon-purple" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">{staffType || 'Staff'}</span>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-zinc-800 pb-8 relative">
          <div className="flex items-center gap-6">
            <div className={`w-24 h-24 rounded-full bg-zinc-900 border-2 flex items-center justify-center p-1 border-neon-purple`}>
               <div className="w-full h-full rounded-full border border-dashed border-zinc-700 flex items-center justify-center group cursor-pointer hover:border-white transition-colors">
                   <User className="w-10 h-10 text-zinc-500 group-hover:text-white transition-colors" />
               </div>
            </div>
            <div>
              <h1 className="text-4xl font-black uppercase tracking-widest text-white mb-2">{profile?.name}</h1>
              <p className="text-zinc-400 font-semibold">{profile?.email}</p>
              <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border bg-neon-purple/20 border-neon-purple/50 text-neon-purple`}>
                <Star className="w-3 h-3" /> Nivel: {isStaff ? (staffType || 'ADMINISTRADOR') : 'Raver VIP'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-xl font-bold uppercase tracking-widest text-white flex items-center gap-3">
                <QrCode className="w-5 h-5 text-neon-green" /> Boletas Personales
              </h2>
                {profile?.orders && profile.orders.length > 0 ? (
                  <div className="space-y-4">
                    {profile.orders.map((order: any) => {
                       const isPending = order.status === 'PENDING';
                       
                       return (
                         <div key={order.id} className={`glass-panel p-6 rounded-2xl border-l-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group transition-colors ${isPending ? 'border-l-orange-500 opacity-60' : 'border-l-neon-green hover:bg-zinc-900/50'}`}>
                           <div>
                             <h3 className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                               <Calendar className="w-3 h-3" /> {new Date(order.created_at).toLocaleDateString()}
                             </h3>
                             <p className="font-black uppercase text-white text-xl">{order.order_items[0]?.ticket_type?.event?.title || 'Evento Kasa'}</p>
                             <p className={`text-sm font-semibold mt-1 ${isPending ? 'text-orange-500' : 'text-neon-green'}`}>
                               {order.order_items[0]?.ticket_type?.name} <span className="text-zinc-500 font-normal">({Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(order.total)})</span>
                             </p>
                           </div>
                           
                           {isPending ? (
                             <div className="flex sm:flex-col items-center gap-2 pt-4 sm:pt-0 border-t border-zinc-800 sm:border-0 w-full sm:w-auto justify-between sm:justify-start">
                                <div className="w-24 h-24 bg-black/50 border border-dashed border-orange-500/50 rounded-lg flex items-center justify-center p-2 text-center animate-pulse">
                                  <span className="text-[10px] text-orange-500 font-bold uppercase tracking-widest leading-tight">Verificando Pago...</span>
                                </div>
                                <span className="text-[10px] text-orange-500/70 uppercase font-bold tracking-widest mt-2 px-2">Esperando a Wompi</span>
                             </div>
                           ) : (
                             <div className="flex flex-wrap items-center gap-4 pt-4 sm:pt-0 border-t border-zinc-800 sm:border-0 w-full justify-start sm:justify-end">
                                {order.qr_codes && order.qr_codes.map((qr: any) => (
                                  <div key={qr.id} className="flex flex-col items-center gap-1.5 group/qr">
                                     <div onClick={() => {if(!qr.used_at) setSelectedQr(qr)}} className={`w-24 h-24 bg-white p-2 border border-zinc-700 rounded-lg flex items-center justify-center transition-all shadow-lg ${qr.used_at ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-neon-green hover:border-neon-green hover:scale-110'}`}>
                                        <QRCodeSVG value={qr.token_hash ? `${BASE_URL}/ticket/${qr.token_hash}` : 'kasa-legacy'} size={80} level={"H"} includeMargin={false} />
                                     </div>
                                     <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest text-center truncate w-24">
                                       {qr.attendee_name || 'Titular'}<br/>
                                       <span className={qr.used_at ? "text-red-500" : "text-neon-green"}>{qr.used_at ? 'USADO' : 'VÁLIDO'}</span>
                                     </span>
                                     {/* Share button */}
                                     {!qr.used_at && (
                                       <Link
                                         href={`/ticket/${qr.token_hash}`}
                                         target="_blank"
                                         className="flex items-center gap-1 text-[9px] text-zinc-500 hover:text-neon-green uppercase tracking-widest font-bold transition-colors w-24 justify-center"
                                       >
                                         <Share2 className="w-2.5 h-2.5" /> Compartir
                                       </Link>
                                     )}
                                  </div>
                                ))}
                             </div>
                           )}
                         </div>
                       );
                    })}
                  </div>
                ) : (
                  <div className="border border-dashed border-zinc-800 rounded-2xl p-12 text-center bg-black/20">
                    <Ticket className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500 font-bold uppercase tracking-widest mb-4">La bóveda de asitencia está vacía</p>
                    <Link href="/" className="text-xs bg-neon-green text-black font-bold uppercase px-4 py-2 rounded">Conseguir Tickets</Link>
                  </div>
                )}
              </div>

              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {!isStaff && (
                  <section className="bg-gradient-to-br from-neon-purple/20 to-black border border-neon-purple/30 p-6 rounded-2xl relative overflow-hidden">
                     <div className="absolute -top-10 -right-10 w-24 h-24 bg-neon-purple/20 blur-xl rounded-full"></div>
                     <h3 className="text-lg font-bold uppercase tracking-widest text-white mb-2">Beneficios Kasa</h3>
                     <p className="text-sm text-zinc-400 mb-5 relative z-10">Muestra tu QR en barras para redimir beneficios.</p>
                     <div className="bg-black/60 py-3 px-4 rounded border border-zinc-800 flex justify-between items-center relative z-10">
                       <span className="text-xs font-bold uppercase tracking-widest text-zinc-300">Merch Oficial</span>
                       <span className="text-neon-green font-black">15% OFF</span>
                     </div>
                  </section>
                )}

                <section className="glass-panel p-6 rounded-2xl">
                  <h3 className="text-base font-bold uppercase tracking-widest text-zinc-200 mb-6 flex items-center gap-2">
                    Seguridad de Cuenta
                  </h3>
                  <form onSubmit={handleProfileUpdate} className="space-y-4 mb-8">
                     <div className="space-y-2">
                       <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black flex justify-between">
                         Nombre de Raver 
                         {profileMsg && <span className="text-neon-purple lowercase tracking-normal">{profileMsg}</span>}
                       </label>
                       <input 
                         type="text" 
                         value={newName} 
                         onChange={e => setNewName(e.target.value)}
                         className="w-full bg-zinc-900 border border-zinc-800 rounded py-2 px-3 text-white text-sm outline-none focus:border-neon-purple transition-colors" 
                       />
                     </div>
                     <button type="submit" className="text-[10px] bg-zinc-800 hover:bg-neon-purple text-white font-bold uppercase py-1 px-3 rounded transition-all">
                       Guardar Nombre
                     </button>
                  </form>
                  <div className="space-y-2 pt-2 border-t border-zinc-800/50 mb-6">
                     <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">Email (Identidad)</label>
                     <input type="text" readOnly defaultValue={profile?.email} className="w-full bg-black/30 border border-zinc-900 rounded py-2 px-3 text-zinc-500 text-xs outline-none cursor-not-allowed" />
                  </div>
                     <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                       <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black flex justify-between">
                         Nueva Contraseña 
                       </label>
                       <input 
                         type="password" 
                         placeholder="Ingresa nueva llave secreta" 
                         value={newPassword}
                         onChange={e => setNewPassword(e.target.value)}
                         className={`w-full bg-black/50 border rounded py-2 px-3 text-white text-sm outline-none transition-all font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans ${passwordsMatch ? 'border-neon-green/50 ring-1 ring-neon-green/20' : 'border-zinc-800 focus:border-neon-purple'}`} 
                       />
                     </div>
                     <div className="space-y-2 pt-2">
                       <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black flex justify-between">
                         Confirmar Contraseña
                         {passwordsMatch && <span className="text-neon-green lowercase tracking-normal animate-pulse">✓ coinciden</span>}
                         {passMsg && <span className={`lowercase tracking-normal ${passMsg.includes('Error') || passMsg.includes('No coincide') ? 'text-red-500' : 'text-neon-green'}`}>{passMsg}</span>}
                       </label>
                       <input 
                         type="password" 
                         placeholder="Repite la nueva llave" 
                         value={confirmPassword}
                         onChange={e => setConfirmPassword(e.target.value)}
                         className={`w-full bg-black/50 border rounded py-2 px-3 text-white text-sm outline-none transition-all font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans ${passwordsMatch ? 'border-neon-green/50 ring-1 ring-neon-green/20 shadow-[0_0_15px_rgba(57,255,20,0.05)]' : 'border-zinc-800 focus:border-neon-purple'}`} 
                       />
                     </div>
                     <button type="submit" disabled={!passwordsMatch && newPassword.length > 0} className="w-full mt-2 bg-transparent border border-zinc-700 hover:border-neon-purple hover:bg-neon-purple/10 text-white font-bold uppercase tracking-widest text-xs py-3 rounded transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                       Actualizar Contraseña
                     </button>
                  </form>
                </section>
              </div>
        </div>

        {/* APP INSTALLER BANNER EN LA BÓVEDA */}
        <div className="mt-16 w-full text-center border-t border-zinc-800/50 pt-8 mt-20">
           <InstallAppButton />
        </div>
      </main>

      {selectedQr && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 animate-in fade-in duration-200" onClick={() => setSelectedQr(null)}>
          <button className="absolute top-8 right-8 text-white bg-zinc-800 p-3 rounded-full hover:bg-neon-purple hover:scale-110 transition-all" onClick={(e) => { e.stopPropagation(); setSelectedQr(null); }}>
            <X className="w-6 h-6" />
          </button>
          
          <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-[0_0_60px_rgba(57,255,20,0.3)] animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <QRCodeSVG 
             value={selectedQr?.token_hash ? `${BASE_URL}/ticket/${selectedQr.token_hash}` : 'kasa-legacy'}
               size={280} 
               level={"H"} 
               includeMargin={false} 
               className="w-[60vw] max-w-[300px] h-auto"
            />
          </div>
          
          <div className="mt-10 flex flex-col items-center bg-black/50 border border-zinc-800 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs mb-2">Entrada Válida Para</p>
            <p className="text-neon-green font-black uppercase tracking-widest text-center text-xl sm:text-2xl mb-1">{selectedQr.attendee_name || profile?.name}</p>
            <p className="text-zinc-500 font-semibold uppercase tracking-widest text-center text-xs">C.C. {selectedQr.attendee_dni || 'REGISTRADO'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
