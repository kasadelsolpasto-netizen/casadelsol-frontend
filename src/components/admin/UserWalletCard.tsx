"use client";
/**
 * Pase y saldo de un usuario dentro de su ficha del admin.
 *
 * Es la vista del dueño: ve el estado del pase, el saldo y el libro completo de movimientos, y
 * puede devolver o ajustar con un motivo (que queda guardado en la línea del libro). Se carga solo
 * cuando la ficha se abre, para no pesarle a la lista de usuarios.
 */
import { useCallback, useEffect, useState } from 'react';
import { Wallet, Loader2, Lock, Unlock, Plus, Minus, RotateCcw } from 'lucide-react';
import { API_URL as API, authFetch } from '@/lib/session';
import { describeEntry, formatCop, parsePesosToCents } from '@/lib/pass';

type Kind = 'ADJUST_CREDIT' | 'ADJUST_DEBIT' | 'REFUND';

interface Data {
  pass: { code_label: string; version: number; is_blocked: boolean; issued_at: string } | null;
  wallet: {
    balance_cents: number;
    balance_label: string;
    entries: Array<{ id: string; kind: string; amount_cents: number; note?: string | null; created_at: string }>;
  };
}

const ACTIONS: Array<{ kind: Kind; label: string; icon: typeof Plus; className: string }> = [
  { kind: 'ADJUST_CREDIT', label: 'Abonar', icon: Plus, className: 'text-neon-green border-neon-green/40' },
  { kind: 'ADJUST_DEBIT', label: 'Descontar', icon: Minus, className: 'text-orange-400 border-orange-400/40' },
  { kind: 'REFUND', label: 'Devolver', icon: RotateCcw, className: 'text-neon-purple border-neon-purple/40' },
];

export default function UserWalletCard({ userId }: { userId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [kind, setKind] = useState<Kind>('ADJUST_CREDIT');
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`${API}/pass/admin/${userId}`);
      if (res.ok) setData(await res.json());
      else setError('No se pudo cargar el pase de esta persona.');
    } catch {
      setError('Sin conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const cents = parsePesosToCents(amountText);

  const submit = async () => {
    setMsg('');
    if (cents <= 0) { setMsg('Escribe el monto.'); return; }
    if (note.trim().length < 3) { setMsg('Escribe el motivo del movimiento.'); return; }
    setBusy(true);
    try {
      const res = await authFetch(`${API}/pass/admin/${userId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, amount_cents: cents, note: note.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setAmountText(''); setNote('');
        setMsg(`Listo. Saldo: ${formatCop(body.balance_cents)}`);
        await load();
      } else {
        setMsg(body?.message || 'No se pudo registrar el movimiento.');
      }
    } catch {
      setMsg('Sin conexión con el servidor.');
    } finally {
      setBusy(false);
    }
  };

  const toggleBlock = async () => {
    if (!data?.pass) return;
    setBusy(true);
    try {
      await authFetch(`${API}/pass/admin/${userId}/blocked`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked: !data.pass.is_blocked }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-neon-green flex items-center gap-3">
        <Wallet className="w-4 h-4" /> Pase y Saldo
      </h4>

      {loading ? (
        <div className="py-10 text-center text-zinc-700"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : error ? (
        <div className="py-8 text-center border border-zinc-900 border-dashed rounded-[2rem]">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-3">{error}</p>
          <button onClick={load} className="text-zinc-400 text-[10px] font-black uppercase tracking-widest underline">Reintentar</button>
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black border border-zinc-900 rounded-2xl p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Saldo a favor</p>
              <p className="text-2xl font-black text-neon-green">{data.wallet.balance_label}</p>
            </div>
            <div className="bg-black border border-zinc-900 rounded-2xl p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">Pase</p>
              {data.pass ? (
                <>
                  <p className="text-xs font-mono text-zinc-300 tracking-widest">{data.pass.code_label}</p>
                  <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${data.pass.is_blocked ? 'text-red-400' : 'text-zinc-600'}`}>
                    {data.pass.is_blocked ? 'Bloqueado' : `Versión ${data.pass.version}`}
                  </p>
                </>
              ) : (
                <p className="text-[10px] font-bold text-zinc-600 leading-relaxed">
                  Todavía no lo ha abierto. Se emite solo cuando entra a «Mi pase».
                </p>
              )}
            </div>
          </div>

          {data.pass && (
            <button
              onClick={toggleBlock}
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 border border-zinc-800 text-zinc-400 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:border-zinc-600 transition-all disabled:opacity-50"
            >
              {data.pass.is_blocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {data.pass.is_blocked ? 'Reactivar su pase' : 'Bloquear su pase (carné perdido)'}
            </button>
          )}

          {/* Movimiento manual: siempre con motivo */}
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-[2rem] p-6 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {ACTIONS.map((a) => (
                <button
                  key={a.kind}
                  onClick={() => { setKind(a.kind); setMsg(''); }}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                    kind === a.kind ? `bg-black ${a.className}` : 'border-zinc-900 text-zinc-600'
                  }`}
                >
                  <a.icon className="w-4 h-4" /> {a.label}
                </button>
              ))}
            </div>
            <input
              value={amountText}
              onChange={(e) => { setAmountText(e.target.value); setMsg(''); }}
              inputMode="numeric"
              placeholder="Monto en pesos"
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-neon-green transition-all"
            />
            <input
              value={note}
              onChange={(e) => { setNote(e.target.value); setMsg(''); }}
              placeholder="Motivo (queda guardado en el libro)"
              maxLength={200}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-neon-green transition-all"
            />
            {msg && <p className="text-[10px] font-bold text-zinc-400">{msg}</p>}
            <button
              onClick={submit}
              disabled={busy || cents <= 0}
              className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-3.5 rounded-xl hover:bg-neon-green transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Registrar {cents > 0 ? formatCop(cents) : ''}
            </button>
          </div>

          {/* Libro de movimientos */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Libro de movimientos</p>
            {data.wallet.entries.length === 0 ? (
              <div className="text-center py-10 border border-zinc-900 border-dashed rounded-[2rem] text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em]">
                Sin movimientos
              </div>
            ) : (
              <ul className="divide-y divide-zinc-900 bg-black border border-zinc-900 rounded-2xl px-5">
                {data.wallet.entries.map((e) => {
                  const d = describeEntry(e.kind, e.amount_cents);
                  return (
                    <li key={e.id} className="flex items-center justify-between py-3 gap-3">
                      <div className="min-w-0">
                        <p className="text-zinc-300 text-xs font-bold truncate">{d.label}</p>
                        {e.note && <p className="text-zinc-600 text-[10px] font-medium truncate">{e.note}</p>}
                        <p className="text-zinc-700 text-[9px] font-black uppercase tracking-widest">
                          {new Date(e.created_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`font-black text-xs whitespace-nowrap ${d.positive ? 'text-neon-green' : 'text-orange-400'}`}>
                        {d.amount}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
