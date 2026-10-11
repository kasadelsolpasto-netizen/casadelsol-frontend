"use client";
import { useEffect, useState } from 'react';
import { CreditCard, Save, Lock, Link as LinkIcon, AlertTriangle, CheckCircle } from 'lucide-react';

type Gateway = 'wompi' | 'bold';

interface GatewayInfo {
  gateway: Gateway;
  effective: Gateway;
  wompiConfigured: boolean;
  boldConfigured: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  return document.cookie.split('kasa_auth_token=')[1]?.split(';')[0];
}

/**
 * Selector de pasarela activa (Wompi / Bold) + llaves de Bold.
 * Las llaves de Wompi se siguen editando en el formulario existente de esta misma pestaña.
 */
export default function PaymentGatewaySettings() {
  const [info, setInfo] = useState<GatewayInfo | null>(null);
  const [gatewayMsg, setGatewayMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [switching, setSwitching] = useState(false);

  const [apiKey, setApiKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [hasSecretKey, setHasSecretKey] = useState(false);
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [saving, setSaving] = useState(false);
  const [boldMsg, setBoldMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const webhookUrl = `${API}/orders/webhook-bold`;

  const loadInfo = async () => {
    const token = getToken();
    const res = await fetch(`${API}/admin/settings/payment-gateway`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setInfo(await res.json());
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = getToken();
        await loadInfo();
        const res = await fetch(`${API}/admin/settings/bold`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const d = await res.json();
          setApiKey(d.apiKey || '');
          setHasSecretKey(!!d.hasSecretKey);
          setEnvironment(d.environment === 'production' ? 'production' : 'sandbox');
        }
      } catch (err) {
        console.error('Error cargando configuración de pagos:', err);
      }
    };
    load();
  }, []);

  const selectGateway = async (gateway: Gateway) => {
    if (switching || info?.gateway === gateway) return;
    setSwitching(true);
    setGatewayMsg(null);
    try {
      const res = await fetch(`${API}/admin/settings/payment-gateway`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ gateway }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setGatewayMsg({ ok: true, text: `Ahora se cobra con ${gateway === 'bold' ? 'Bold' : 'Wompi'}.` });
        await loadInfo();
      } else {
        setGatewayMsg({ ok: false, text: data?.message || 'No se pudo cambiar la pasarela.' });
      }
    } catch {
      setGatewayMsg({ ok: false, text: 'Error de conexión.' });
    } finally {
      setSwitching(false);
    }
  };

  const saveBold = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBoldMsg(null);
    try {
      const res = await fetch(`${API}/admin/settings/bold`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ apiKey, secretKey, environment }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setBoldMsg({ ok: true, text: 'Llaves de Bold guardadas.' });
        setSecretKey('');
        setHasSecretKey(true);
        await loadInfo();
      } else {
        setBoldMsg({ ok: false, text: data?.message || 'Fallo al guardar.' });
      }
    } catch {
      setBoldMsg({ ok: false, text: 'Error de conexión.' });
    } finally {
      setSaving(false);
    }
  };

  const card = (g: Gateway, title: string, subtitle: string, configured: boolean) => {
    const selected = info?.gateway === g;
    return (
      <button
        type="button"
        onClick={() => selectGateway(g)}
        disabled={switching}
        className={`flex-1 text-left p-5 rounded-xl border transition-all ${
          selected ? 'bg-neon-green/10 border-neon-green' : 'bg-black/40 border-zinc-800 hover:border-zinc-600'
        } disabled:opacity-60`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-black uppercase tracking-widest text-white">{title}</span>
          {selected && <CheckCircle className="w-4 h-4 text-neon-green" />}
        </div>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{subtitle}</p>
        <p className={`text-[10px] mt-3 font-bold uppercase tracking-widest ${configured ? 'text-neon-green' : 'text-orange-400'}`}>
          {configured ? 'Llaves configuradas' : 'Sin configurar'}
        </p>
      </button>
    );
  };

  return (
    <div className="space-y-8 mb-8">
      {/* ── Selector de pasarela activa ── */}
      <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-neon-green">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-neon-green/10 flex items-center justify-center border border-neon-green/40">
            <CreditCard className="w-6 h-6 text-neon-green" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">Pasarela activa</h2>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">
              Define con cuál se cobran las entradas y la tienda
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          {card('wompi', 'Wompi', 'Bancolombia', !!info?.wompiConfigured)}
          {card('bold', 'Bold', 'Botón de pagos', !!info?.boldConfigured)}
        </div>

        {info && info.gateway !== info.effective && (
          <p className="text-xs text-orange-400 mt-4">
            Bold está seleccionada pero faltan llaves, así que el checkout está usando Wompi.
          </p>
        )}
        {gatewayMsg && (
          <p className={`text-xs font-bold uppercase tracking-widest mt-4 ${gatewayMsg.ok ? 'text-neon-green' : 'text-red-500'}`}>
            {gatewayMsg.text}
          </p>
        )}
        <p className="text-[10px] text-zinc-500 mt-4">
          El cambio aplica a los pagos nuevos. Los pagos que ya estén en curso se confirman con la pasarela con la que se iniciaron.
        </p>
      </div>

      {/* ── Llaves de Bold ── */}
      <div className="glass-panel p-8 rounded-2xl border-t-2 border-t-neon-purple">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center border border-neon-purple/50">
            <CreditCard className="w-6 h-6 text-neon-purple" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-widest text-white">Integración Pasarela: Bold</h2>
            <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest font-bold">Botón de pagos</p>
          </div>
        </div>

        <form onSubmit={saveBold} className="space-y-6">
          <div className="bg-zinc-900/50 p-4 rounded-lg flex items-start gap-4 border border-zinc-800">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-300">
              Saca las llaves en <b>bold.co → Integraciones → Llaves de integración → Botón de pagos</b>. Bold da un par para{' '}
              <b>pruebas</b> y otro para <b>producción</b>: pega el par que corresponda al entorno que elijas abajo. Mezclarlos
              genera error.
            </p>
          </div>

          <div className="space-y-2 border-b border-zinc-800 pb-6">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Entorno</label>
            <div className="flex gap-4">
              <label className={`flex-1 flex items-center justify-center p-4 border rounded cursor-pointer transition-all ${environment === 'sandbox' ? 'bg-orange-500/10 border-orange-500 text-orange-400' : 'border-zinc-800 text-zinc-500'}`}>
                <input type="radio" value="sandbox" checked={environment === 'sandbox'} onChange={() => setEnvironment('sandbox')} className="hidden" />
                <span className="text-xs font-bold uppercase tracking-widest">Pruebas</span>
              </label>
              <label className={`flex-1 flex items-center justify-center p-4 border rounded cursor-pointer transition-all ${environment === 'production' ? 'bg-neon-green/10 border-neon-green text-neon-green' : 'border-zinc-800 text-zinc-500'}`}>
                <input type="radio" value="production" checked={environment === 'production'} onChange={() => setEnvironment('production')} className="hidden" />
                <span className="text-xs font-bold uppercase tracking-widest">Producción (dinero real)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/70">Llave de identidad</label>
              <input
                type="text" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required
                className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none text-sm transition-all"
                placeholder="Llave de identidad (pública)"
              />
              <p className="text-[10px] text-zinc-600">Identifica tu comercio. Es pública.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/70 flex items-center gap-2">
                Llave secreta <Lock className="w-3 h-3 text-red-500" />
              </label>
              <input
                type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)}
                required={!hasSecretKey} autoComplete="new-password"
                className="w-full bg-black border border-zinc-800 rounded py-3 px-4 text-white font-mono tracking-wider focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none text-sm transition-all"
                placeholder={hasSecretKey ? '•••••••• guardada — déjala vacía para conservarla' : 'Llave secreta'}
              />
              <p className="text-[10px] text-zinc-600">Solo se usa en el servidor y nunca se vuelve a mostrar.</p>
            </div>
          </div>

          <div className="space-y-2 bg-[#1a0f2e]/30 p-5 rounded-lg border border-neon-purple/30">
            <label className="text-[10px] font-black uppercase tracking-widest text-neon-purple">URL del Webhook</label>
            <div className="flex items-center gap-3">
              <LinkIcon className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="flex-1 flex items-center bg-black rounded border border-zinc-800 overflow-hidden">
                <span className="text-neon-purple text-xs px-3 font-mono py-2 truncate flex-1 block">{webhookUrl}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  className="bg-zinc-800 text-white font-bold text-[10px] uppercase px-4 py-2.5 hover:bg-zinc-700 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500">
              Pégala en <b>bold.co → Integraciones → Webhooks → Configurar webhook</b>. En modo pruebas Bold no envía
              webhooks automáticos: el pago igual se confirma al volver a la página de resultado.
            </p>
          </div>

          <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
            <p className={`text-xs font-bold uppercase tracking-widest ${boldMsg?.ok ? 'text-neon-green' : 'text-red-500'}`}>
              {boldMsg?.text}
            </p>
            <button
              type="submit" disabled={saving}
              className="flex items-center gap-2 bg-neon-purple text-white px-8 py-3 rounded text-sm font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(191,0,255,0.5)] transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar llaves de Bold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
