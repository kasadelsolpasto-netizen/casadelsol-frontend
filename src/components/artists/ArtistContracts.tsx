"use client";
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, FileSignature, Loader2, X } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { fmtDate } from '@/lib/artists';
import { TONE_CLASS, contractLabel, contractTone, pendingForArtist, type ContractSummary, type ContractView } from '@/lib/artist-contracts';

const msgOf = (e: unknown) => (e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');

/**
 * Contratos del artista. El que está por aceptar se anuncia arriba; al abrirlo se lee completo y se acepta con
 * un clic (o se indica que no se acepta). Los ya aceptados quedan para consulta.
 * `openId` abre un contrato de entrada (el enlace del correo trae ?contrato=<id>).
 */
export default function ArtistContracts({ openId, onChanged }: { openId?: string | null; onChanged?: () => void }) {
  const [list, setList] = useState<ContractSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<ContractView | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    try {
      setList(await apiFetch<ContractSummary[]>('/artists/me/contracts'));
    } catch {
      // sin contratos a la vista: el resto del panel sigue funcionando
    } finally {
      setLoaded(true);
    }
  }, []);

  const open = useCallback(async (id: string) => {
    setOpening(id);
    setError('');
    setDeclining(false);
    setReason('');
    try {
      setView(await apiFetch<ContractView>(`/artists/me/contracts/${id}`));
    } catch (e) {
      setDone('');
      setError(msgOf(e));
    } finally {
      setOpening(null);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (openId) open(openId);
  }, [openId, open]);

  useEffect(() => {
    if (!view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) setView(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [view, busy]);

  const finish = async (fn: () => Promise<ContractView>, text: string) => {
    setBusy(true);
    setError('');
    try {
      const saved = await fn();
      setView(saved);
      setDeclining(false);
      setDone(text);
      await load();
      onChanged?.();
    } catch (e) {
      setError(msgOf(e));
    } finally {
      setBusy(false);
    }
  };

  const accept = () => view && finish(() => apiFetch<ContractView>(`/artists/me/contracts/${view.id}/accept`, { method: 'POST', body: { accept: true, body_hash: view.body_hash } }), 'Contrato aceptado. Te enviamos una copia a tu correo.');
  const decline = () => view && finish(() => apiFetch<ContractView>(`/artists/me/contracts/${view.id}/decline`, { method: 'POST', body: { reason: reason.trim() || null } }), 'Quedó registrado que no aceptas este contrato. La organización fue avisada.');

  if (!loaded || (list.length === 0 && !view && !error)) return null;
  const pending = pendingForArtist(list);

  return (
    <section className="mb-6" aria-label="Tus contratos">
      {pending.map((c) => (
        <div key={c.id} className="mb-3 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-widest text-amber-400">Contrato por aceptar</p>
            <p className="text-sm font-black text-white break-words">{c.event?.title ?? c.title}</p>
            <p className="text-[11px] text-zinc-500">n.º {c.number}{c.event?.date ? ` · ${fmtDate(c.event.date)}` : ''}</p>
          </div>
          <button type="button" disabled={opening === c.id} onClick={() => open(c.id)} className="min-h-[44px] px-5 rounded-xl bg-neon-green text-black text-[11px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60">
            {opening === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />} Leer y aceptar
          </button>
        </div>
      ))}

      {error && !view && <p role="alert" className="mb-3 text-[11px] font-bold text-red-400">{error}</p>}

      {list.some((c) => c.status !== 'SENT') && (
        <details className="rounded-2xl border border-zinc-900 bg-zinc-950">
          <summary className="cursor-pointer list-none px-4 min-h-[44px] flex items-center text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white">Mis contratos ({list.filter((c) => c.status !== 'SENT').length})</summary>
          <ul className="divide-y divide-zinc-900 border-t border-zinc-900">
            {list.filter((c) => c.status !== 'SENT').map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => open(c.id)} className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-zinc-900/50">
                  <span className="min-w-0">
                    <span className="block text-sm font-black text-white truncate">{c.event?.title ?? c.title}</span>
                    <span className="block text-[11px] text-zinc-500">n.º {c.number}{c.signed_at ? ` · ${fmtDate(c.signed_at)}` : ''}</span>
                  </span>
                  <span className={`shrink-0 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${TONE_CLASS[contractTone(c.status)]}`}>{contractLabel(c.status, 'artist')}</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}

      {view && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Contrato n.º ${view.number}`}>
          <div className="w-full sm:max-w-2xl max-h-[94vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl">
            <header className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 border-b border-zinc-900">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Contrato n.º {view.number}</p>
                <h3 className="text-base font-black uppercase text-white break-words">{view.title}</h3>
              </div>
              <button type="button" onClick={() => !busy && setView(null)} aria-label="Cerrar" className="w-11 h-11 -mr-2 rounded-lg text-zinc-500 hover:text-white flex items-center justify-center shrink-0"><X className="w-5 h-5" /></button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="text-[13px] leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">{view.body}</div>
              {view.org?.signer_name && (
                <p className="mt-5 pt-4 border-t border-zinc-900 text-[11px] text-zinc-500">
                  Por {view.org.name}: {view.org.signer_name}{view.org.signed_at ? `, ${fmtDate(view.org.signed_at)}` : ''}.
                </p>
              )}
              {view.status === 'SIGNED' && view.signer && (
                <p className="mt-1 text-[11px] text-zinc-500">Aceptado por {view.signer.name}{view.signed_at ? `, ${fmtDate(view.signed_at)}` : ''}.{view.verify_code ? ` Código de verificación: ${view.verify_code}.` : ''}</p>
              )}
            </div>

            <footer className="px-5 py-4 border-t border-zinc-900 space-y-3">
              {done && view.status !== 'SENT' && (
                <p role="status" className={`text-xs font-bold flex items-center gap-1.5 ${view.status === 'SIGNED' ? 'text-neon-green' : 'text-zinc-300'}`}>
                  {view.status === 'SIGNED' && <CheckCircle2 className="w-4 h-4 shrink-0" />} {done}
                </p>
              )}
              {error && <p role="alert" className="text-xs font-bold text-red-400">{error}</p>}

              {view.status === 'SENT' ? (
                declining ? (
                  <>
                    <label htmlFor="decline-reason" className="block text-[10px] font-black uppercase tracking-widest text-zinc-500">Motivo (opcional)</label>
                    <textarea id="decline-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} rows={2} className="w-full bg-black/60 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" disabled={busy} onClick={() => setDeclining(false)} className="h-12 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest">Volver</button>
                      <button type="button" disabled={busy} onClick={decline} className="h-12 rounded-xl border border-red-500/50 text-red-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar: no acepto'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">Al pulsar «Acepto el contrato» declaras que lo leíste y lo aceptas en todos sus términos. Queda constancia de tu aceptación y recibes una copia en tu correo.</p>
                    <button type="button" disabled={busy} onClick={accept} className="w-full h-14 rounded-xl bg-neon-green text-black text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60">
                      {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Acepto el contrato</>}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="w-full min-h-[44px] text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400">No acepto</button>
                  </>
                )
              ) : (
                <button type="button" onClick={() => setView(null)} className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest">Cerrar</button>
              )}
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}
