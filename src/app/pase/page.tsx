"use client";
/**
 * MI PASE — el QR permanente de la persona.
 *
 * Es la pantalla que se abre en la puerta y en la barra, así que está pensada para funcionar
 * en lo peor: sin señal muestra la última copia guardada (el QR sigue siendo el mismo, no caduca),
 * sube el brillo mientras está abierta y no deja que el celular apague la pantalla.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowLeft, Loader2, Wallet, RefreshCw, ShieldAlert, Plus,
  Copy, Check, ShoppingBag, Ticket, Lock, Unlock,
} from 'lucide-react';
import { API_URL as API, authFetch } from '@/lib/session';
import { formatSavedAt, isTransientFailure, loadOffline, saveOffline } from '@/lib/offline-tickets';
import { openBoldCheckout } from '@/lib/bold';
import {
  TOPUP_PRESETS_CENTS, describeEntry, formatCop, formatPassCode, parsePesosToCents,
} from '@/lib/pass';

const OFFLINE_KEY = 'pase';

interface PassData {
  pass: { code: string; code_label: string; version: number; is_blocked: boolean; qr_payload?: string };
  user: { name: string; email: string; avatar?: string | null } | null;
  wallet: {
    balance_cents: number;
    balance_label: string;
    entries: Array<{ id: string; kind: string; amount_cents: number; note?: string | null; created_at: string }>;
  };
}

export default function PasePage() {
  const router = useRouter();
  const [data, setData] = useState<PassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [offlineSince, setOfflineSince] = useState<number | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<'' | 'rotate' | 'block' | 'topup'>('');
  const [copied, setCopied] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [topupError, setTopupError] = useState('');
  const confirmedRef = useRef(false);

  // ── Cargar el pase ────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await authFetch(`${API}/pass/me`);
      if (res.ok) {
        const fresh: PassData = await res.json();
        setData(fresh);
        saveOffline(OFFLINE_KEY, fresh);
        setOfflineSince(null);
      } else if (res.status === 401) {
        router.push('/login?redirect=/pase');
      } else if (isTransientFailure(res.status)) {
        showOffline();
      } else {
        setMsg('No pudimos cargar tu pase. Intenta de nuevo.');
        showOffline();
      }
    } catch {
      showOffline();
    } finally {
      setLoading(false);
    }
  }, [router]);

  const showOffline = () => {
    const copy = loadOffline<PassData>(OFFLINE_KEY);
    if (!copy) return;
    setData((prev) => prev ?? copy.data);
    setOfflineSince(copy.saved_at);
  };

  useEffect(() => { load(); }, [load]);

  // ── Que el celular no apague la pantalla mientras se muestra el QR ──
  useEffect(() => {
    let lock: any = null;
    const request = async () => {
      try { lock = await (navigator as any).wakeLock?.request('screen'); } catch { /* no soportado */ }
    };
    request();
    const onVisible = () => { if (document.visibilityState === 'visible') request(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      try { lock?.release?.(); } catch { /* noop */ }
    };
  }, []);

  // ── Acciones ──────────────────────────────────────────────────
  const rotate = async () => {
    if (!confirm('Se generará un QR nuevo y el anterior (y el carné impreso, si lo tienes) dejará de servir. ¿Continuar?')) return;
    setBusy('rotate'); setMsg('');
    try {
      const res = await authFetch(`${API}/pass/me/rotate`, { method: 'POST' });
      if (res.ok) { setMsg('Listo: tu pase anterior ya no sirve. Este es el nuevo.'); await load(true); }
      else setMsg('No se pudo regenerar el pase. Intenta de nuevo.');
    } catch { setMsg('Sin conexión con el servidor.'); }
    finally { setBusy(''); }
  };

  const toggleBlock = async () => {
    if (!data) return;
    const blocked = !data.pass.is_blocked;
    setBusy('block'); setMsg('');
    try {
      const res = await authFetch(`${API}/pass/me/blocked`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      });
      if (res.ok) { setMsg(blocked ? 'Pase bloqueado: nadie puede usarlo.' : 'Pase reactivado.'); await load(true); }
      else setMsg('No se pudo cambiar el estado del pase.');
    } catch { setMsg('Sin conexión con el servidor.'); }
    finally { setBusy(''); }
  };

  const copyCode = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.pass.code_label || formatPassCode(data.pass.code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* sin permiso de portapapeles */ }
  };

  // ── Recarga en línea (misma pasarela activa que el resto del sitio) ──
  const startTopup = async (cents: number) => {
    setTopupError('');
    if (cents <= 0) { setTopupError('Escribe cuánto quieres recargar.'); return; }
    setBusy('topup');
    try {
      const res = await authFetch(`${API}/pass/me/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: cents }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) { setTopupError(result?.message || 'No se pudo abrir la recarga.'); return; }

      // Bold: modal, y el resultado se confirma en /checkout/bold-result
      if (result.gateway === 'bold' && result.bold) {
        await openBoldCheckout({ ...result.bold, redirectionUrl: `${window.location.origin}/checkout/bold-result` });
        setShowTopup(false);
        return;
      }

      // Wompi: widget + respaldo por el servidor cuando devuelve APPROVED
      if (!result.wompiData || typeof (window as any).WidgetCheckout !== 'function') {
        setTopupError('La pasarela aún está cargando. Intenta en unos segundos.');
        return;
      }
      confirmedRef.current = false;
      const checkout = new (window as any).WidgetCheckout({
        currency: 'COP',
        amountInCents: result.wompiData.amountInCents,
        reference: result.wompiData.reference,
        publicKey: result.wompiData.publicKey,
        signature: { integrity: result.wompiData.signature },
        redirectUrl: `${window.location.origin}/pase`,
      });
      checkout.open(async (wompiResult: any) => {
        const tx = wompiResult?.transaction;
        if (tx?.status !== 'APPROVED' || confirmedRef.current) return;
        confirmedRef.current = true;
        // El navegador no es fuente de verdad: el servidor verifica con Wompi antes de abonar.
        await authFetch(`${API}/pass/me/topup/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topupId: result.topupId, wompiTransactionId: tx.id }),
        }).catch(() => undefined);
        setShowTopup(false);
        setMsg('¡Recarga recibida! Tu saldo ya está disponible.');
        await load(true);
      });
    } catch (e: any) {
      setTopupError(e?.message || 'No se pudo abrir la recarga.');
    } finally {
      setBusy('');
    }
  };

  // ══════════════════════════════════════════════════════════════
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-purple animate-spin mb-4" />
        <p className="text-zinc-600 text-xs font-black uppercase tracking-widest">Abriendo tu pase…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="w-12 h-12 text-yellow-500 mb-5" />
        <p className="text-zinc-300 font-bold mb-6 max-w-sm">No pudimos cargar tu pase y no hay copia guardada en este dispositivo.</p>
        <button onClick={() => load()} className="bg-neon-purple text-white px-7 py-3 rounded font-black uppercase tracking-widest text-xs">
          Reintentar
        </button>
      </div>
    );
  }

  const { pass, user, wallet } = data;
  const typedCents = parsePesosToCents(amountText);

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      <Script src="https://checkout.wompi.co/widget.js" strategy="afterInteractive" />

      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-zinc-900">
        <div className="max-w-md mx-auto px-5 py-3 flex items-center gap-4">
          <Link href="/" className="text-zinc-500 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <span className="text-zinc-300 text-sm font-black uppercase tracking-widest">Mi pase</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 py-8 space-y-6">
        {offlineSince && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-center text-[11px] font-bold leading-relaxed text-yellow-300">
            Sin conexión. Este es tu pase guardado el {formatSavedAt(offlineSince)}; el QR es el mismo y sigue
            sirviendo en la puerta. El saldo puede estar desactualizado.
          </div>
        )}
        {msg && (
          <div className="rounded-xl border border-neon-green/30 bg-neon-green/10 px-4 py-3 text-center text-[11px] font-bold text-neon-green">
            {msg}
          </div>
        )}

        {/* ── EL QR ─────────────────────────────────────────────── */}
        <section className={`rounded-2xl border p-6 text-center ${pass.is_blocked ? 'border-red-600/50 bg-red-950/20' : 'border-neon-purple/30 bg-zinc-950'}`}>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neon-purple mb-1">Pase Kasa del Sol</p>
          <h1 className="text-xl font-black uppercase text-white mb-5">{user?.name || 'Raver'}</h1>

          {pass.is_blocked ? (
            <div className="bg-black border border-red-600/40 rounded-xl py-14 px-6">
              <Lock className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <p className="text-red-400 text-xs font-black uppercase tracking-widest">Pase bloqueado</p>
              <p className="text-zinc-500 text-[11px] mt-2 leading-relaxed">
                No sirve en la puerta ni en la barra hasta que lo reactives o generes uno nuevo.
              </p>
            </div>
          ) : pass.qr_payload ? (
            <div className="bg-white p-5 rounded-xl inline-block shadow-[0_0_40px_rgba(191,0,255,0.25)]">
              <QRCodeSVG value={pass.qr_payload} size={216} level="M" />
            </div>
          ) : (
            <div className="bg-black border border-zinc-800 rounded-xl py-14 px-6 text-zinc-500 text-[11px] font-bold">
              Conéctate una vez para descargar tu QR en este dispositivo.
            </div>
          )}

          <button
            onClick={copyCode}
            className="mt-5 inline-flex items-center gap-2 text-zinc-400 hover:text-white font-mono text-sm tracking-[0.2em]"
            title="Copiar el código del carné"
          >
            {pass.code_label || formatPassCode(pass.code)}
            {copied ? <Check className="w-3.5 h-3.5 text-neon-green" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <p className="text-zinc-600 text-[10px] mt-2 leading-relaxed">
            Este QR no caduca. Si la cámara falla, el staff puede escribir ese código.
          </p>
        </section>

        {/* ── SALDO ────────────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-1">Saldo a favor</p>
              <p className="text-4xl font-black text-neon-green">{wallet.balance_label ?? formatCop(wallet.balance_cents)}</p>
            </div>
            <Wallet className="w-7 h-7 text-zinc-700" />
          </div>
          <p className="text-zinc-500 text-[11px] leading-relaxed mb-5">
            Lo gastas en la barra mostrando este mismo QR. También puedes abonar efectivo en taquilla.
          </p>

          {!showTopup ? (
            <button
              onClick={() => { setShowTopup(true); setTopupError(''); }}
              className="w-full flex items-center justify-center gap-2 bg-neon-green text-black py-3.5 rounded-xl font-black uppercase tracking-widest text-xs"
            >
              <Plus className="w-4 h-4" /> Recargar saldo
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {TOPUP_PRESETS_CENTS.map((c) => (
                  <button
                    key={c}
                    disabled={busy === 'topup'}
                    onClick={() => startTopup(c)}
                    className="border border-zinc-700 hover:border-neon-green hover:text-neon-green text-zinc-200 py-3 rounded-lg font-black text-sm disabled:opacity-50"
                  >
                    {formatCop(c)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={amountText}
                  onChange={(e) => { setAmountText(e.target.value); setTopupError(''); }}
                  inputMode="numeric"
                  placeholder="Otro monto"
                  className="flex-1 bg-black border border-zinc-800 rounded-lg px-4 py-3 text-white font-bold placeholder:text-zinc-600 focus:border-neon-green outline-none"
                />
                <button
                  disabled={busy === 'topup' || typedCents <= 0}
                  onClick={() => startTopup(typedCents)}
                  className="bg-neon-green text-black px-5 rounded-lg font-black uppercase text-xs tracking-widest disabled:opacity-40"
                >
                  {busy === 'topup' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pagar'}
                </button>
              </div>
              {topupError && <p className="text-red-400 text-[11px] font-bold">{topupError}</p>}
              <button onClick={() => setShowTopup(false)} className="w-full text-zinc-500 text-[10px] font-black uppercase tracking-widest py-1">
                Cancelar
              </button>
            </div>
          )}
        </section>

        {/* ── MOVIMIENTOS ──────────────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">Últimos movimientos</p>
          {wallet.entries.length === 0 ? (
            <p className="text-zinc-600 text-[11px] font-bold py-3">Todavía no tienes movimientos.</p>
          ) : (
            <ul className="divide-y divide-zinc-900">
              {wallet.entries.map((e) => {
                const d = describeEntry(e.kind, e.amount_cents);
                return (
                  <li key={e.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 pr-3">
                      <p className="text-zinc-200 text-xs font-bold truncate">{e.note || d.label}</p>
                      <p className="text-zinc-600 text-[10px] font-bold">
                        {new Date(e.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`font-black text-sm whitespace-nowrap ${d.positive ? 'text-neon-green' : 'text-zinc-400'}`}>
                      {d.amount}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── ATAJOS ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/shop" className="flex items-center justify-center gap-2 border border-zinc-800 bg-zinc-950 py-3.5 rounded-xl text-zinc-300 font-black uppercase text-[10px] tracking-widest">
            <ShoppingBag className="w-4 h-4" /> Barra
          </Link>
          <Link href="/events" className="flex items-center justify-center gap-2 border border-zinc-800 bg-zinc-950 py-3.5 rounded-xl text-zinc-300 font-black uppercase text-[10px] tracking-widest">
            <Ticket className="w-4 h-4" /> Eventos
          </Link>
        </div>

        {/* ── SEGURIDAD DEL PASE ───────────────────────────────── */}
        <section className="rounded-2xl border border-zinc-900 bg-black p-5 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600">¿Perdiste el carné?</p>
          <button
            onClick={toggleBlock}
            disabled={!!busy}
            className="w-full flex items-center justify-center gap-2 border border-zinc-700 text-zinc-300 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
          >
            {pass.is_blocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            {pass.is_blocked ? 'Reactivar mi pase' : 'Bloquear mi pase'}
          </button>
          <button
            onClick={rotate}
            disabled={!!busy}
            className="w-full flex items-center justify-center gap-2 border border-red-900/60 text-red-400 py-3 rounded-lg font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
          >
            {busy === 'rotate' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Generar un QR nuevo
          </button>
          <p className="text-zinc-600 text-[10px] leading-relaxed">
            Bloquearlo lo deja inservible al instante y lo puedes reactivar. Generar uno nuevo anula para
            siempre el anterior. Tu saldo y tus entradas no se tocan en ninguno de los dos casos.
          </p>
        </section>
      </main>
    </div>
  );
}
