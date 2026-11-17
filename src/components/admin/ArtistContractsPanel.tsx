"use client";
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileText, Loader2, Send, Settings2 } from 'lucide-react';
import FormModal, { Field, inputCls } from '@/components/ui/FormModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { fmtDate, type ArtistBookingView } from '@/lib/artists';
import {
  TONE_CLASS, canAssignContract, contractForBooking, contractLabel, contractTone,
  type BookingContractResult, type ContractSummary, type ContractView,
} from '@/lib/artist-contracts';

type Template = {
  org: { razon_social: string; nit: string; representante: string; representante_doc: string; domicilio: string; ciudad: string; correo_archivo: string };
  title: string;
  body: string;
  vars: Array<{ key: string; label: string }>;
};
type Legal = { legal_name: string | null; doc_type: string | null; doc_number: string | null; address: string | null };

const DOC_TYPES = ['cédula de ciudadanía', 'cédula de extranjería', 'pasaporte', 'NIT', 'permiso por protección temporal'];
const msgOf = (e: unknown) => (e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');

/**
 * Contratos del artista, vistos por el administrador. Por cada evento en el que está programado: indicar el
 * contrato (de la plantilla o con texto propio), enviarlo, recordarlo, anularlo y ver su estado. El artista lo
 * acepta con un clic desde su perfil. También se editan aquí la plantilla, los datos de la organización que
 * contrata y la identificación del artista que figura en el contrato.
 */
export default function ArtistContractsPanel({ artistId, bookings, legal, onChanged }: { artistId: string; bookings: ArtistBookingView[]; legal: Legal; onChanged: () => void }) {
  const [contracts, setContracts] = useState<ContractSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [assign, setAssign] = useState<ArtistBookingView | null>(null);
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const [customBody, setCustomBody] = useState('');
  const [viewing, setViewing] = useState<ContractView | null>(null);
  const [toVoid, setToVoid] = useState<ContractSummary | null>(null);
  const [tpl, setTpl] = useState<Template | null>(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [fLegal, setFLegal] = useState({ legal_name: '', doc_type: DOC_TYPES[0], doc_number: '', address: '' });

  const load = useCallback(async () => {
    try {
      setContracts(await apiFetch<ContractSummary[]>(`/artists/${artistId}/contracts`));
    } catch (e) {
      setNotice({ tone: 'error', text: msgOf(e) });
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string | ((r: any) => { tone: 'ok' | 'warn'; text: string })) => {
    setBusy(true);
    setFormError('');
    try {
      const r = await fn();
      setAssign(null);
      setToVoid(null);
      setTplOpen(false);
      setLegalOpen(false);
      setViewing(null);
      await load();
      onChanged();
      setNotice(typeof ok === 'string' ? { tone: 'ok', text: ok } : ok(r));
    } catch (e) {
      setFormError(msgOf(e));
    } finally {
      setBusy(false);
    }
  };

  const sentNotice = (r: BookingContractResult | (ContractView & { email_sent?: boolean })) => {
    if ('warning' in r && r.warning) return { tone: 'warn' as const, text: r.warning };
    return {
      tone: 'ok' as const,
      text: r.email_sent === false ? 'Contrato enviado. El correo de aviso no salió: avísale al artista que lo tiene en su perfil.' : 'Contrato enviado. El artista lo acepta con un clic desde su perfil.',
    };
  };

  const openTemplate = async () => {
    setFormError('');
    try {
      setTpl(await apiFetch<Template>('/artists/contract-template'));
      setTplOpen(true);
    } catch (e) {
      setNotice({ tone: 'error', text: msgOf(e) });
    }
  };

  const openView = async (c: ContractSummary) => {
    try {
      setViewing(await apiFetch<ContractView>(`/artists/${artistId}/contracts/${c.id}`));
    } catch (e) {
      setNotice({ tone: 'error', text: msgOf(e) });
    }
  };

  const openLegal = () => {
    setFormError('');
    setFLegal({ legal_name: legal.legal_name ?? '', doc_type: legal.doc_type || DOC_TYPES[0], doc_number: legal.doc_number ?? '', address: legal.address ?? '' });
    setLegalOpen(true);
  };

  const legalMissing = !legal.legal_name || !legal.doc_number;
  const btn = 'h-9 px-3 rounded-lg border border-zinc-700 text-[10px] font-black uppercase tracking-widest text-zinc-200 hover:border-neon-purple disabled:opacity-50 inline-flex items-center gap-1.5';

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-white">Contratos</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={openLegal} className={btn}>Identificación del artista</button>
          <button type="button" onClick={openTemplate} className={btn}><Settings2 className="w-3.5 h-3.5" /> Plantilla y organización</button>
        </div>
      </div>

      {legalMissing && (
        <p className="mb-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 text-[11px] font-bold text-amber-300 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          Falta el nombre legal o el documento del artista. Sin ellos el contrato no se puede enviar: complétalos en «Identificación del artista» o pídele que los llene en su perfil.
        </p>
      )}
      {notice && (
        <p role="status" className={`mb-3 p-3 rounded-xl border text-[11px] font-bold flex items-start gap-2 ${notice.tone === 'ok' ? 'border-neon-green/30 text-neon-green' : notice.tone === 'warn' ? 'border-amber-500/30 text-amber-300' : 'border-red-500/30 text-red-400'}`}>
          {notice.tone === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />} {notice.text}
        </p>
      )}

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 text-zinc-600 animate-spin" /></div>
      ) : bookings.length === 0 ? (
        <p className="p-6 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-2xl">Agrega al artista a un evento para indicarle su contrato.</p>
      ) : (
        <ul className="space-y-2">
          {bookings.map((b) => {
            const c = contractForBooking(contracts, b.id);
            return (
              <li key={b.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-wide text-white truncate">{b.event.title}</p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {fmtDate(b.event.date)}
                    {c ? ` · n.º ${c.number}` : ''}
                    {c?.status === 'SIGNED' && c.signed_at ? ` · aceptado el ${fmtDate(c.signed_at)}` : ''}
                    {c?.status === 'SENT' ? (c.viewed_at ? ' · el artista ya lo abrió' : ' · sin abrir') : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${c ? TONE_CLASS[contractTone(c.status)] : TONE_CLASS.muted}`}>
                    {c ? contractLabel(c.status, 'admin') : 'Sin contrato'}
                  </span>
                  {c && <button type="button" onClick={() => openView(c)} className={btn}><FileText className="w-3.5 h-3.5" /> Ver</button>}
                  {c?.status === 'DRAFT' && (
                    <button type="button" disabled={busy} onClick={() => act(() => apiFetch(`/artists/${artistId}/contracts/${c.id}/send`, { method: 'POST' }), sentNotice).then(() => undefined)} className={`${btn} !border-neon-green/50 !text-neon-green`}>
                      <Send className="w-3.5 h-3.5" /> Enviar
                    </button>
                  )}
                  {c?.status === 'DRAFT' && (
                    <button type="button" disabled={busy} onClick={() => act(() => apiFetch(`/artists/${artistId}/contracts/${c.id}`, { method: 'DELETE' }), 'Borrador eliminado.')} className={btn}>Borrar</button>
                  )}
                  {c?.status === 'SENT' && (
                    <>
                      <button type="button" disabled={busy} onClick={() => act(() => apiFetch(`/artists/${artistId}/contracts/${c.id}/remind`, { method: 'POST' }), 'Se le recordó al artista por correo.')} className={btn}>Recordar</button>
                      <button type="button" disabled={busy} onClick={() => { setFormError(''); setToVoid(c); }} className={btn}>Anular</button>
                    </>
                  )}
                  {canAssignContract(c) && (
                    <button type="button" onClick={() => { setFormError(''); setMode('template'); setCustomBody(''); setAssign(b); }} className={`${btn} !bg-white !text-black !border-white`}>
                      Indicar contrato
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {formError && !assign && !toVoid && !tplOpen && !legalOpen && <p role="alert" className="mt-3 text-[11px] font-bold text-red-400">{formError}</p>}

      {/* Indicar el contrato de una participación */}
      <FormModal
        open={!!assign}
        title={assign ? `Contrato · ${assign.event.title}` : 'Contrato'}
        submitLabel="Enviar al artista"
        busy={busy}
        error={formError}
        onClose={() => !busy && setAssign(null)}
        onSubmit={() => {
          if (!assign) return;
          if (mode === 'custom' && !customBody.trim()) {
            setFormError('Escribe o pega el texto del contrato.');
            return;
          }
          act(() => apiFetch<BookingContractResult>(`/artists/${artistId}/bookings/${assign.id}/contract`, { method: 'POST', body: { mode, body: mode === 'custom' ? customBody : undefined } }), sentNotice);
        }}
      >
        <ContractModePicker mode={mode} onMode={setMode} body={customBody} onBody={setCustomBody} />
      </FormModal>

      {/* Ver contrato */}
      <FormModal open={!!viewing} title={viewing ? `Contrato n.º ${viewing.number}` : ''} submitLabel="Cerrar" hideCancel onSubmit={() => setViewing(null)} onClose={() => setViewing(null)}>
        {viewing && (
          <>
            <p className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${TONE_CLASS[contractTone(viewing.status)]}`}>{contractLabel(viewing.status, 'admin')}</p>
            {viewing.missing && viewing.missing.length > 0 && <p className="text-[11px] font-bold text-amber-300">Datos sin llenar: {viewing.missing.join(', ')}.</p>}
            <p className="text-xs font-black uppercase tracking-wide text-white">{viewing.title}</p>
            <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-zinc-800 bg-black/60 p-3 text-[12px] leading-relaxed text-zinc-300 whitespace-pre-wrap break-words">{viewing.body}</div>
            {viewing.signer && (
              <p className="text-[11px] text-zinc-400">
                Aceptado por {viewing.signer.name}
                {viewing.signer.doc_number ? ` (${viewing.signer.doc_type} n.º ${viewing.signer.doc_number})` : ''} el {fmtDate(viewing.signed_at)}
                {viewing.sign_method === 'CLICK' ? ', con un clic desde su sesión.' : ', con código enviado a su correo.'}
              </p>
            )}
            {viewing.verify_code && <p className="text-[11px] text-zinc-500">Código de verificación: <span className="font-mono text-zinc-300">{viewing.verify_code}</span>{viewing.intact === false ? ' · ⚠ el texto guardado no coincide con su huella' : ''}</p>}
            {viewing.decline_reason && <p className="text-[11px] text-red-400">Motivo del artista: {viewing.decline_reason}</p>}
            {viewing.void_reason && <p className="text-[11px] text-zinc-400">Motivo de la anulación: {viewing.void_reason}</p>}
          </>
        )}
      </FormModal>

      <ConfirmDialog
        open={!!toVoid}
        title="Anular contrato"
        confirmLabel="Anular"
        tone="danger"
        busy={busy}
        error={formError}
        onCancel={() => !busy && setToVoid(null)}
        onConfirm={() => toVoid && act(() => apiFetch(`/artists/${artistId}/contracts/${toVoid.id}/void`, { method: 'POST', body: {} }), 'Contrato anulado. Puedes indicar uno nuevo.')}
      >
        El contrato n.º {toVoid?.number} dejará de estar disponible para el artista. Queda en el historial como anulado.
      </ConfirmDialog>

      {/* Identificación del artista */}
      <FormModal
        open={legalOpen}
        title="Identificación del artista"
        submitLabel="Guardar"
        busy={busy}
        error={formError}
        onClose={() => !busy && setLegalOpen(false)}
        onSubmit={() =>
          act(
            () => apiFetch(`/artists/${artistId}`, { method: 'PUT', body: { legal_name: fLegal.legal_name.trim() || null, doc_type: fLegal.doc_type, doc_number: fLegal.doc_number.trim() || null, address: fLegal.address.trim() || null } }),
            'Identificación guardada.',
          )
        }
      >
        <Field label="Nombre legal completo"><input value={fLegal.legal_name} onChange={(e) => setFLegal({ ...fLegal, legal_name: e.target.value })} maxLength={120} className={inputCls} /></Field>
        <Field label="Tipo de documento">
          <select value={fLegal.doc_type} onChange={(e) => setFLegal({ ...fLegal, doc_type: e.target.value })} className={inputCls}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Número de documento"><input value={fLegal.doc_number} onChange={(e) => setFLegal({ ...fLegal, doc_number: e.target.value })} maxLength={30} className={inputCls} /></Field>
        <Field label="Domicilio (opcional)"><input value={fLegal.address} onChange={(e) => setFLegal({ ...fLegal, address: e.target.value })} maxLength={200} className={inputCls} /></Field>
      </FormModal>

      {/* Plantilla y datos de la organización */}
      <FormModal
        open={tplOpen && !!tpl}
        title="Plantilla del contrato"
        submitLabel="Guardar"
        busy={busy}
        error={formError}
        onClose={() => !busy && setTplOpen(false)}
        onSubmit={() => tpl && act(() => apiFetch('/artists/contract-template', { method: 'PUT', body: { org: tpl.org, title: tpl.title, body: tpl.body } }), 'Plantilla guardada.')}
      >
        {tpl && (
          <>
            <p className="text-[11px] font-bold text-zinc-500">Datos de la organización que contrata. Son obligatorios la razón social, el NIT y el representante legal con su documento.</p>
            <Field label="Razón social"><input value={tpl.org.razon_social} onChange={(e) => setTpl({ ...tpl, org: { ...tpl.org, razon_social: e.target.value } })} maxLength={160} className={inputCls} /></Field>
            <Field label="NIT"><input value={tpl.org.nit} onChange={(e) => setTpl({ ...tpl, org: { ...tpl.org, nit: e.target.value } })} maxLength={30} className={inputCls} /></Field>
            <Field label="Representante legal"><input value={tpl.org.representante} onChange={(e) => setTpl({ ...tpl, org: { ...tpl.org, representante: e.target.value } })} maxLength={120} className={inputCls} /></Field>
            <Field label="Documento del representante"><input value={tpl.org.representante_doc} onChange={(e) => setTpl({ ...tpl, org: { ...tpl.org, representante_doc: e.target.value } })} maxLength={60} className={inputCls} placeholder="cédula de ciudadanía n.º …" /></Field>
            <Field label="Domicilio"><input value={tpl.org.domicilio} onChange={(e) => setTpl({ ...tpl, org: { ...tpl.org, domicilio: e.target.value } })} maxLength={200} className={inputCls} /></Field>
            <Field label="Ciudad"><input value={tpl.org.ciudad} onChange={(e) => setTpl({ ...tpl, org: { ...tpl.org, ciudad: e.target.value } })} maxLength={80} className={inputCls} /></Field>
            <Field label="Correo de archivo" hint="Recibe copia de cada contrato aceptado."><input type="email" value={tpl.org.correo_archivo} onChange={(e) => setTpl({ ...tpl, org: { ...tpl.org, correo_archivo: e.target.value } })} maxLength={200} className={inputCls} /></Field>
            <Field label="Título del contrato"><input value={tpl.title} onChange={(e) => setTpl({ ...tpl, title: e.target.value })} maxLength={160} className={inputCls} /></Field>
            <Field label="Texto de la plantilla" hint={`Los datos entre llaves se llenan solos: ${tpl.vars.map((v) => `{{${v.key}}}`).join(' ')}`}>
              <textarea value={tpl.body} onChange={(e) => setTpl({ ...tpl, body: e.target.value })} rows={12} maxLength={40000} className={`${inputCls} h-auto py-3 font-mono text-[12px]`} />
            </Field>
          </>
        )}
      </FormModal>
    </section>
  );
}

/** Selector compartido: contrato de la plantilla o con texto propio. */
export function ContractModePicker({
  mode, onMode, body, onBody, allowNone = false,
}: {
  mode: 'none' | 'template' | 'custom';
  onMode: (m: any) => void;
  body: string;
  onBody: (s: string) => void;
  allowNone?: boolean;
}) {
  const options: Array<{ key: 'none' | 'template' | 'custom'; label: string }> = [
    ...(allowNone ? [{ key: 'none' as const, label: 'Sin contrato' }] : []),
    { key: 'template', label: 'Plantilla' },
    { key: 'custom', label: 'Texto propio' },
  ];
  return (
    <>
      <Field label="Contrato" hint={mode === 'none' ? 'Podrás indicarlo después desde «Contratos».' : mode === 'template' ? 'Sale de la plantilla con los datos del evento, el cachet y el artista. Se le envía de una vez y lo acepta con un clic.' : 'Pega o escribe el texto. Puedes usar datos entre llaves, por ejemplo {{nombre_artistico}}, {{evento}}, {{evento_fecha}}, {{cachet}}.'}>
        <div role="radiogroup" aria-label="Contrato" className={`grid gap-1 p-1 rounded-xl bg-black border border-zinc-900 ${options.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {options.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={mode === o.key} onClick={() => onMode(o.key)} className={`h-10 rounded-lg text-[10px] font-black uppercase tracking-widest ${mode === o.key ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </Field>
      {mode === 'custom' && (
        <Field label="Texto del contrato">
          <textarea value={body} onChange={(e) => onBody(e.target.value)} rows={10} maxLength={40000} className={`${inputCls} h-auto py-3 text-[12px]`} />
        </Field>
      )}
    </>
  );
}
