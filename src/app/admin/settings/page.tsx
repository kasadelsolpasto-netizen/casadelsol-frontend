"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Save, Lock, Link as LinkIcon, AlertTriangle, Key } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '@/components/AdminGuard';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pagos' | 'general' | 'seguridad'>('pagos');
  
  // Wompi config state
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [eventsSecret, setEventsSecret] = useState('');
  const [integritySecret, setIntegritySecret] = useState('');
  const [environment, setEnvironment] = useState('sandbox'); // sandbox | production
  
  // Admin credentials state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);
  const [saveCredsMessage, setSaveCredsMessage] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch initial config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = document.cookie.split('kasa_auth_token=')[1]?.split(';')[0];
        if (!token) return router.push('/login');

        const res = await fetch('http://localhost:3001/admin/settings/wompi', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          if (data) {
            setPublicKey(data.publicKey || '');
            setPrivateKey(data.privateKey || '');
            setEventsSecret(data.eventsSecret || '');
            setIntegritySecret(data.integritySecret || '');
            setEnvironment(data.environment || 'sandbox');
          }
        }
      } catch (err) {
        console.error("Error cargando configuración:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [router]);

  const handleSavePayments = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');

    try {
      const token = document.cookie.split('kasa_auth_token=')[1]?.split(';')[0];
      const res = await fetch('http://localhost:3001/admin/settings/wompi', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ publicKey, privateKey, eventsSecret, integritySecret, environment })
      });

      if (res.ok) {
        setSaveMessage('Configuración asegurada y guardada.');
      } else {
        setSaveMessage('Fallo al guardar.');
      }
    } catch (err) {
      setSaveMessage('Error de conexión.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail && !adminPassword) {
      setSaveCredsMessage('No has ingresado ningún cambio.');
      setTimeout(() => setSaveCredsMessage(''), 3000);
      return;
    }
    
    setIsSavingCreds(true);
    setSaveCredsMessage('');

    try {
      const token = document.cookie.split('kasa_auth_token=')[1]?.split(';')[0];
      const body: any = {};
      if (adminEmail) body.email = adminEmail;
      if (adminPassword) body.password = adminPassword;

      const res = await fetch('http://localhost:3001/users/admin/credentials', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setSaveCredsMessage('Credenciales maestras actualizadas en el servidor. Reinicia sesión con los nuevos credenciales en la Bóveda la próxima vez.');
        setAdminEmail('');
        setAdminPassword('');
      } else {
        setSaveCredsMessage('Fallo al actualizar error en servidor.');
      }
    } catch (err) {
      setSaveCredsMessage('Error de conexión con el núcleo.');
    } finally {
      setIsSavingCreds(false);
      setTimeout(() => setSaveCredsMessage(''), 6000);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-6 relative">
          <Link href="/admin" className="absolute -top-6 left-0 text-zinc-500 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Volver al Tablero
          </Link>
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">
              Configuración Global
            </h1>
            <p className="text-zinc-500 mt-2 uppercase tracking-widest text-xs font-bold flex items-center gap-2">
              <Lock className="w-4 h-4" /> Sistema Sellado. Sólo Owner.
            </p>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-12">
          {/* Menú Lateral Navegación Settings */}
          <div className="lg:w-1/4 space-y-2">
             <button 
               onClick={() => setActiveTab('pagos')} 
               className={`w-full text-left px-5 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-3 border ${activeTab === 'pagos' ? 'bg-neon-purple/10 border-neon-purple text-neon-purple shadow-[0_0_15px_rgba(191,0,255,0.2)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'}`}
             >
               <CreditCard className="w-4 h-4" /> Pasarela Wompi
             </button>
             <button 
               onClick={() => setActiveTab('seguridad')} 
               className={`w-full text-left px-5 py-4 rounded-xl font-bold uppercase tracking-widest text-xs transition-all flex items-center gap-3 border ${activeTab === 'seguridad' ? 'bg-red-900/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'}`}
             >
               <Key className="w-4 h-4" /> Bóveda Suprema
             </button>
          </div>

          {/* Cuerpos de Configuración */}
          <div className="lg:w-3/4">
            {loading ? (
              <div className="glass-panel p-10 text-center animate-pulse border border-zinc-800 rounded-2xl">
                <p className="text-neon-purple uppercase font-bold tracking-widest text-sm">Descifrando datos...</p>
              </div>
            ) : (
              <>
                {activeTab === 'pagos' && (
                  <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-neon-purple animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/10 blur-3xl rounded-full"></div>
                    
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center border border-neon-purple/50">
                         <CreditCard className="w-6 h-6 text-neon-purple" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white">Integración Pasarela: Wompi</h2>
                        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">Gestión de API Keys Dinámicas</p>
                      </div>
                    </div>

                    <form onSubmit={handleSavePayments} className="space-y-6 relative z-10">
                      <div className="bg-zinc-900/50 p-4 rounded-lg flex items-start gap-4 border border-zinc-800 mb-8">
                        <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div>
                           <p className="text-xs text-zinc-300">Asegúrate de pegar exactamente las llaves que Wompi te proporciona en tu <a href="https://comercios.wompi.co/" target="_blank" rel="noreferrer" className="text-neon-purple hover:underline">Comercio Wompi</a>. Kasa del Sol usará estas llaves para procesar todos los pagos y facturación de la boletería.</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2 border-b border-zinc-800 pb-6 mb-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entorno Tecnológico</label>
                          <div className="flex gap-4">
                            <label className={`flex-1 flex items-center justify-center p-4 border rounded cursor-pointer transition-all ${environment === 'sandbox' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-black border-zinc-800 text-zinc-500'}`}>
                              <input type="radio" value="sandbox" checked={environment === 'sandbox'} onChange={() => setEnvironment('sandbox')} className="hidden" />
                              <span className="text-xs font-bold uppercase tracking-widest">Sandbox (Pruebas)</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center p-4 border rounded cursor-pointer transition-all ${environment === 'production' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'bg-black border-zinc-800 text-zinc-500'}`}>
                              <input type="radio" value="production" checked={environment === 'production'} onChange={() => setEnvironment('production')} className="hidden" />
                              <span className="text-xs font-bold uppercase tracking-widest">Productivo (Dinero Real)</span>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Llave Pública (Public Key)</label>
                          <input 
                            type="text" value={publicKey} onChange={e => setPublicKey(e.target.value)} required
                            className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none text-sm transition-all"
                            placeholder="pub_test_..."
                          />
                          <p className="text-[10px] text-zinc-600">Requerida por la aplicación FrontEnd para inicializar el pago móvil.</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/70 flex items-center gap-2">
                             Llave Privada (Private Key) <Lock className="w-3 h-3 text-red-500" />
                          </label>
                          <input 
                            type="text" value={privateKey} onChange={e => setPrivateKey(e.target.value)} required
                            className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none text-sm transition-all"
                            placeholder="prv_test_..."
                          />
                          <p className="text-[10px] text-zinc-600">Crucial para emitir URLs al Gateway y chequear transacciones desde el Backend.</p>
                        </div>

                        <div className="md:col-span-2 space-y-2 bg-[#1a0f2e]/30 p-5 rounded-lg border border-neon-purple/30 mt-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-neon-purple flex items-center gap-2">
                             Secreto de Eventos (Event Signature / Webhooks)
                          </label>
                          <input 
                            type="text" value={eventsSecret} onChange={e => setEventsSecret(e.target.value)} required
                            className="w-full bg-black/60 border border-neon-purple/30 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none text-sm transition-all"
                            placeholder="Para desencriptar notificaciones push Wompi..."
                          />
                          <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-neon-purple/20">
                            <LinkIcon className="w-4 h-4 text-zinc-400" />
                            <div className="flex-1 w-full flex items-center bg-black rounded border border-zinc-800 overflow-hidden">
                              <span className="text-zinc-500 text-xs px-3 font-mono py-2 truncate flex-1 block">
                                https://tudominio.com/api/webhooks/wompi
                              </span>
                              <button type="button" className="bg-zinc-800 text-white font-bold text-[10px] uppercase px-4 py-2.5 hover:bg-zinc-700 transition-colors">Copiar Endpoint</button>
                            </div>
                          </div>
                          <p className="text-[10px] text-zinc-500 mt-2 block w-full text-center sm:text-left">Copia la URL superior y pégala en URLs de Eventos en Wompi.</p>
                        </div>

                        <div className="md:col-span-2 space-y-2 bg-zinc-900/50 p-5 rounded-lg border border-zinc-800 mt-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/80 flex items-center gap-2">
                             Secreto de Integridad (Firma Anti-fraude)
                          </label>
                          <input 
                            type="text" value={integritySecret} onChange={e => setIntegritySecret(e.target.value)}
                            className="w-full bg-black border border-zinc-700 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-white focus:ring-1 focus:ring-white outline-none text-sm transition-all"
                            placeholder="Generalmente empieza por prod_integrity_..."
                          />
                          <p className="text-[10px] text-zinc-500">Solo cópialo de Wompi si tienes "Firma de Integridad" habilitado en tu cuenta de Bancolombia.</p>
                        </div>

                      </div>

                      <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
                        <p className={`text-xs font-bold uppercase tracking-widest ${saveMessage.includes('Error') || saveMessage.includes('Fallo') ? 'text-red-500' : 'text-neon-green'}`}>
                          {saveMessage}
                        </p>
                        <button 
                          type="submit" 
                          disabled={isSaving}
                          className="flex items-center gap-2 bg-neon-purple text-white px-8 py-3 rounded text-sm font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(191,0,255,0.5)] transition-all disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Aplicar Llaves'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'seguridad' && (
                  <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-red-500 animate-in fade-in slide-in-from-bottom-4 relative overflow-hidden bg-black/80">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/10 blur-3xl rounded-full"></div>
                    
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-red-900/20 flex items-center justify-center border border-red-900/50">
                         <Key className="w-6 h-6 text-red-500" />
                      </div>
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white">Credenciales Supremas</h2>
                        <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">Cambiar ID y Llave de la Bóveda</p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveCredentials} className="space-y-6 relative z-10">
                      <div className="bg-red-950/20 p-4 rounded-lg flex items-start gap-4 border border-red-900/50 mb-8">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div>
                           <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-300">Si cambias estas credenciales, tu acceso actual quedará derogado la próxima vez que inicies sesión en la Bóveda Roja. Mantén esta llave segura.</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Nuevo Email Maestro (Opcional)</label>
                          <input 
                            type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm transition-all"
                            placeholder="Dejar en blanco para no cambiar..."
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Nueva Contraseña Maestra (Opcional)</label>
                          <input 
                            type="text" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-sm transition-all"
                            placeholder="Dejar en blanco para no cambiar..."
                          />
                        </div>
                      </div>

                      <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
                        <p className={`text-[10px] w-2/3 leading-relaxed font-bold uppercase tracking-widest ${saveCredsMessage.includes('Fallo') || saveCredsMessage.includes('Error') || saveCredsMessage.includes('No has') ? 'text-red-500' : 'text-neon-green'}`}>
                          {saveCredsMessage}
                        </p>
                        <button 
                          type="submit" 
                          disabled={isSavingCreds}
                          className="flex shrink-0 items-center gap-2 bg-red-700 text-white px-8 py-3 rounded text-sm font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(220,38,38,0.5)] transition-all disabled:opacity-50"
                        >
                          <Lock className="w-4 h-4" /> {isSavingCreds ? 'Sobrescribiendo...' : 'Actualizar Llaves'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
