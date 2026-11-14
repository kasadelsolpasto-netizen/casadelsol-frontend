"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Loader2, Send, X } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Pager from '@/components/ui/Pager';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { paginate } from '@/lib/paging';
import { BATCH_SIZE, MAX_ROWS, buildImport, chunk, parseDelimited, templateCsv, type ImportRow, type TicketTypeLite } from '@/lib/courtesy-import';
import { COURTESY_KIND_HINT, COURTESY_KIND_LABEL, type CourtesyKind } from '@/lib/partners';

type Existing = { email?: string | null; ticket_type_id?: string | null };

/** Lo que responde el servidor por cada persona del lote. */
interface BulkAnswer {
  status: 'error' | 'claimed_auto' | 'pending';
  message?: string;
  email_sent?: boolean;
}

interface Report {
  sent: number;
  /** Ya tenían cuenta: la entrada quedó directo en su cuenta. */
  direct: number;
  /** Cuenta nueva: les llegó un correo con el enlace para reclamarla. */
  byLink: number;
  /** De las de enlace, a cuantas SI les salio el correo. */
  byLinkMailed: number;
  noMail: string[];
  failed: { email: string; message: string }[];
  notTried: number;
  stoppedBecause: string;
}

const inputCls = 'w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors';
const MAX_FILE_BYTES = 2 * 1024 * 1024;

const STATUS_LABEL: Record<ImportRow['status'], { text: string; cls: string }> = {
  ok: { text: 'Lista', cls: 'text-neon-green' },
  error: { text: 'Error', cls: 'text-red-400' },
  dup_file: { text: 'Repetida', cls: 'text-yellow-400' },
  already: { text: 'Ya enviada', cls: 'text-yellow-400' },
};

/**
 * Carga masiva de cortesías: se sube un Excel (.xlsx) o CSV, o se pega lo copiado de Excel / Google Sheets.
 * Primero se muestra una vista previa con lo que está bien y lo que no; solo se envía al confirmar, en lotes pequeños.
 */
export default function CourtesyBulkImport({
  eventId,
  eventTitle,
  ticketTypes,
  canSetKind = true,
  existing,
  onDone,
}: {
  eventId: string;
  eventTitle: string;
  ticketTypes: Array<TicketTypeLite & { transferable_default?: boolean; unlimited?: boolean; available?: number }>;
  /** false cuando quien emite no está habilitado para decidir cortesías libres: todo sale personal. */
  canSetKind?: boolean;
  existing: Existing[];
  onDone: () => void;
}) {
  const [defaultType, setDefaultType] = useState(ticketTypes[0]?.id ?? '');
  const [defaultKind, setDefaultKind] = useState<CourtesyKind>(ticketTypes[0]?.transferable_default ? 'LIBRE' : 'PERSONAL');
  const [table, setTable] = useState<unknown[][] | null>(null);
  const [source, setSource] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [readError, setReadError] = useState('');
  const [reading, setReading] = useState(false);
  const [includeAlready, setIncludeAlready] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);
  const [page, setPage] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Si cambia el evento, se limpia todo lo anterior.
  useEffect(() => {
    setDefaultType(ticketTypes[0]?.id ?? '');
    setTable(null);
    setReport(null);
    setReadError('');
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!defaultType && ticketTypes[0]) setDefaultType(ticketTypes[0].id);
  }, [ticketTypes, defaultType]);

  // Mientras se envía, avisar si intentan cerrar la pestaña.
  useEffect(() => {
    if (!sending) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [sending]);

  const parsed = useMemo(
    () => (table ? buildImport(table, ticketTypes, defaultType, existing, { defaultKind, canSetKind }) : null),
    [table, ticketTypes, defaultType, existing, defaultKind, canSetKind],
  );

  const sendable = useMemo(
    () => (parsed?.rows ?? []).filter((r) => r.status === 'ok' || (includeAlready && r.status === 'already')),
    [parsed, includeAlready],
  );
  const counts = useMemo(() => {
    const c = { ok: 0, error: 0, dup_file: 0, already: 0 };
    for (const r of parsed?.rows ?? []) c[r.status]++;
    return c;
  }, [parsed]);

  const shown = useMemo(() => (parsed?.rows ?? []).filter((r) => !onlyProblems || r.status !== 'ok'), [parsed, onlyProblems]);
  const view = paginate(shown, page, 10);

  const reset = () => {
    setTable(null);
    setSource('');
    setPasteText('');
    setReadError('');
    setReport(null);
    setPage(1);
    setIncludeAlready(false);
    setOnlyProblems(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const loadTable = (rows: unknown[][], from: string) => {
    setReport(null);
    setPage(1);
    setIncludeAlready(false);
    setOnlyProblems(false);
    if (rows.every((r) => r.every((c) => String(c ?? '').trim() === ''))) {
      setTable(null);
      setReadError('No encontré datos. Revisa que el archivo tenga filas con nombre y correo.');
      return;
    }
    setReadError('');
    setSource(from);
    setTable(rows);
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setReadError('');
    const name = file.name.toLowerCase();
    if (file.size > MAX_FILE_BYTES) return setReadError('El archivo es muy pesado (máximo 2 MB). Debe tener solo las filas de las personas.');
    if (name.endsWith('.xls')) return setReadError('Ese es un Excel antiguo (.xls). Ábrelo y guárdalo como Excel (.xlsx) o CSV, y súbelo de nuevo.');
    setReading(true);
    try {
      if (name.endsWith('.xlsx')) {
        const { readSheet } = await import('read-excel-file/browser');
        loadTable((await readSheet(file)) as unknown[][], file.name);
      } else if (name.endsWith('.csv') || name.endsWith('.tsv') || name.endsWith('.txt')) {
        loadTable(parseDelimited(await file.text()), file.name);
      } else {
        setReadError('Formato no admitido. Sube un Excel (.xlsx) o un CSV. Si usas Google Sheets: Archivo → Descargar → Excel (.xlsx).');
      }
    } catch {
      setReadError('No pude leer el archivo. Verifica que no esté dañado ni protegido con contraseña.');
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const downloadCsv = () => {
    const blob = new Blob([templateCsv(ticketTypes.map((t) => t.name))], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-cortesias.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const send = async () => {
    const todo = sendable;
    setConfirming(false);
    setSending(true);
    setReport(null);
    setProgress({ done: 0, total: todo.length });
    const rep: Report = { sent: 0, direct: 0, byLink: 0, byLinkMailed: 0, noMail: [], failed: [], notTried: 0, stoppedBecause: '' };
    const batches = chunk(todo, BATCH_SIZE);
    let done = 0;
    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      try {
        const res = await apiFetch<BulkAnswer[]>(`/courtesies/bulk/${eventId}`, {
          method: 'POST',
          body: {
            courtesies: batch.map((r) => ({
              name: r.name, email: r.email, dni: r.dni, ticket_type_id: r.ticket_type_id,
              quantity: r.quantity, kind: r.kind,
            })),
          },
        });
        const list = Array.isArray(res) ? res : [];
        batch.forEach((row, i) => {
          const r = list[i];
          if (!r || r.status === 'error') {
            rep.failed.push({ email: row.email, message: r?.message || 'No se pudo crear esta cortesía.' });
          } else {
            rep.sent++;
            if (r.status === 'claimed_auto') rep.direct++;
            else {
              rep.byLink++;
              if (r.email_sent !== false) rep.byLinkMailed++;
            }
            if (r.email_sent === false) rep.noMail.push(row.email);
          }
        });
      } catch (e) {
        rep.stoppedBecause = e instanceof ApiError ? e.message : 'Se perdió la conexión con el servidor.';
        rep.notTried = batches.slice(b).reduce((n, x) => n + x.length, 0);
        break;
      }
      done += batch.length;
      setProgress({ done, total: todo.length });
    }
    setSending(false);
    setReport(rep);
    setTable(null);
    setSource('');
    setPasteText('');
    onDone();
  };

  const typeCount = ticketTypes.length;
  const confirmText = `Se enviarán ${sendable.length} ${sendable.length === 1 ? 'cortesía' : 'cortesías'} del evento "${eventTitle}".`;

  return (
    <div className="space-y-4">
      {/* Resultado del último envío */}
      {report && (
        <div role="status" className={`rounded-xl border p-4 ${report.stoppedBecause || report.failed.length ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-neon-green/40 bg-neon-green/5'}`}>
          <p className="text-sm font-black uppercase tracking-wide text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" /> {report.sent} {report.sent === 1 ? 'cortesía enviada' : 'cortesías enviadas'}
          </p>
          {report.sent > 0 && (
            <p className="text-xs text-zinc-400 mt-1">
              {report.direct > 0 && `${report.direct} ya tenían cuenta: la entrada quedó directo en su cuenta. `}
              {report.byLinkMailed > 0 && `${report.byLinkMailed} recibirán un correo con el enlace para reclamarla.`}
            </p>
          )}
          {report.stoppedBecause && (
            <p className="text-xs text-yellow-300 mt-2">
              Se detuvo el envío: {report.stoppedBecause} Quedaron {report.notTried} sin enviar. Vuelve a subir el mismo archivo: las que ya se enviaron se omiten solas.
            </p>
          )}
          {report.noMail.length > 0 && (
            <div className="mt-2 text-xs text-yellow-300">
              <p className="font-bold">Se crearon, pero el correo NO salió ({report.noMail.length}). Si es cuenta nueva, copia el enlace desde la lista y envíaselo tú:</p>
              <p className="break-all text-zinc-400">{report.noMail.join(', ')}</p>
            </div>
          )}
          {report.failed.length > 0 && (
            <div className="mt-2 text-xs text-red-300">
              <p className="font-bold">No se pudieron crear ({report.failed.length}):</p>
              <ul className="mt-1 space-y-0.5 text-zinc-400 max-h-32 overflow-auto">
                {report.failed.map((f, i) => (
                  <li key={i} className="break-all">{f.email}: {f.message}</li>
                ))}
              </ul>
            </div>
          )}
          <button type="button" onClick={reset} className="mt-3 h-10 px-4 rounded-xl border border-zinc-700 text-white text-[11px] font-black uppercase tracking-widest hover:border-zinc-500">
            Nueva carga
          </button>
        </div>
      )}

      {!report && (
        <>
          <div>
            <label htmlFor="bulk-type" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Denominación de cortesía para todos</label>
            <select
              id="bulk-type"
              value={defaultType}
              onChange={(e) => {
                setDefaultType(e.target.value);
                const t = ticketTypes.find((x) => x.id === e.target.value);
                if (t?.transferable_default) setDefaultKind('LIBRE');
              }}
              disabled={sending || typeCount === 0}
              className={`${inputCls} appearance-none`}
            >
              {ticketTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.unlimited === false && t.available !== undefined ? ` · quedan ${t.available}` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-zinc-600 mt-1.5">Se usa cuando el archivo no trae la columna «Denominación» o la celda va vacía. No es una boleta de venta: las cortesías tienen su propio cupo.</p>
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Clase para todos</label>
            <div className="grid grid-cols-2 gap-2">
              {(['PERSONAL', 'LIBRE'] as CourtesyKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDefaultKind(k)}
                  disabled={sending || !canSetKind}
                  className={`h-10 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-40 ${
                    (canSetKind ? defaultKind : 'PERSONAL') === k
                      ? k === 'LIBRE'
                        ? 'bg-neon-green/10 border-neon-green text-neon-green'
                        : 'bg-neon-purple/10 border-neon-purple text-neon-purple'
                      : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {COURTESY_KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 mt-1.5">
              {canSetKind
                ? `${COURTESY_KIND_HINT[defaultKind]} El archivo puede traer una columna «Clase» para decidirlo fila por fila.`
                : 'No estás habilitado para emitir cortesías libres: todas saldrán personales.'}
            </p>
          </div>

          {!table && (
            <>
              <div className="rounded-xl border border-dashed border-zinc-700 p-4 text-center">
                <FileSpreadsheet className="w-6 h-6 text-neon-purple mx-auto mb-2" aria-hidden="true" />
                <p className="text-xs font-bold text-zinc-300 mb-3">Sube un Excel (.xlsx) o un CSV con las personas.</p>
                <input
                  ref={fileRef}
                  id="bulk-file"
                  type="file"
                  accept=".xlsx,.csv,.tsv,.txt"
                  className="sr-only"
                  onChange={(e) => onFile(e.target.files?.[0])}
                  disabled={reading || sending}
                />
                <label htmlFor="bulk-file" className="inline-flex h-11 px-5 items-center gap-2 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-widest cursor-pointer hover:bg-neon-purple hover:text-white transition-colors">
                  {reading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Elegir archivo
                </label>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] font-bold">
                  <a href="/plantillas/plantilla-cortesias.xlsx" download className="inline-flex items-center gap-1 text-neon-purple hover:underline"><Download className="w-3 h-3" /> Plantilla Excel</a>
                  <button type="button" onClick={downloadCsv} className="inline-flex items-center gap-1 text-neon-purple hover:underline"><Download className="w-3 h-3" /> Plantilla CSV</button>
                </div>
              </div>

              <div>
                <label htmlFor="bulk-paste" className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">O pega aquí lo copiado de Excel o Google Sheets</label>
                <textarea
                  id="bulk-paste"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className={`${inputCls} h-32 font-mono text-sm`}
                  placeholder={'Nombre\tCédula\tCorreo\nJuan Pérez\t1000000001\tjuan@correo.com'}
                />
                <button
                  type="button"
                  onClick={() => loadTable(parseDelimited(pasteText), 'texto pegado')}
                  disabled={!pasteText.trim()}
                  className="mt-2 h-11 w-full rounded-xl border border-zinc-700 text-white text-[11px] font-black uppercase tracking-widest hover:border-zinc-500 disabled:opacity-40"
                >
                  Revisar lo pegado
                </button>
              </div>
              <p className="text-[11px] text-zinc-600">Columnas: Nombre y Correo son obligatorias; Cédula y Tipo de entrada, opcionales. Pueden ir en cualquier orden. Máximo {MAX_ROWS} personas por carga.</p>
            </>
          )}

          {readError && <p role="alert" className="text-xs font-bold text-red-400">{readError}</p>}

          {table && parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-zinc-300 truncate">Archivo: {source}</p>
                <button type="button" onClick={reset} disabled={sending} className="shrink-0 h-9 px-3 rounded-lg border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:text-white hover:border-zinc-600 disabled:opacity-40">
                  <X className="w-3 h-3" /> Cambiar
                </button>
              </div>

              {parsed.tooMany ? (
                <p role="alert" className="text-xs font-bold text-red-400">El archivo trae {parsed.total} personas y el máximo por carga es {MAX_ROWS}. Divídelo en varios archivos.</p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg border border-zinc-800 bg-black p-2"><p className="text-lg font-black text-neon-green">{counts.ok}</p><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Listas</p></div>
                    <div className="rounded-lg border border-zinc-800 bg-black p-2"><p className={`text-lg font-black ${counts.error ? 'text-red-400' : 'text-zinc-500'}`}>{counts.error}</p><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Con error</p></div>
                    <div className="rounded-lg border border-zinc-800 bg-black p-2"><p className={`text-lg font-black ${counts.dup_file ? 'text-yellow-400' : 'text-zinc-500'}`}>{counts.dup_file}</p><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Repetidas</p></div>
                    <div className="rounded-lg border border-zinc-800 bg-black p-2"><p className={`text-lg font-black ${counts.already ? 'text-yellow-400' : 'text-zinc-500'}`}>{counts.already}</p><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Ya enviadas</p></div>
                  </div>

                  {!parsed.headerFound && (
                    <p className="text-[11px] text-zinc-500">
                      No encontré títulos de columnas; deduje cuál es el nombre, la cédula y el correo por su contenido. La cantidad y la clase
                      no se deducen sin títulos: se usan 1 y la clase elegida arriba. Revísalo en la lista.
                    </p>
                  )}

                  {counts.already > 0 && (
                    <label className="flex items-start gap-2 text-[11px] text-zinc-400 cursor-pointer">
                      <input type="checkbox" checked={includeAlready} onChange={(e) => setIncludeAlready(e.target.checked)} className="mt-0.5" />
                      Enviar también a quienes ya tienen una cortesía de esta denominación en este evento (se les daría otra).
                    </label>
                  )}
                  {counts.error + counts.dup_file + counts.already > 0 && (
                    <label className="flex items-center gap-2 text-[11px] text-zinc-400 cursor-pointer">
                      <input type="checkbox" checked={onlyProblems} onChange={(e) => { setOnlyProblems(e.target.checked); setPage(1); }} /> Ver solo las que tienen problema
                    </label>
                  )}

                  <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl bg-black overflow-hidden">
                    {view.rows.map((r) => (
                      <li key={r.line} className="px-3 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{r.name || '(sin nombre)'}</p>
                            <p className="text-[11px] text-zinc-500 truncate">
                              {r.email || '(sin correo)'}{r.ticket_type_name ? ` · ${r.ticket_type_name}` : ''}{r.dni ? ` · ${r.dni}` : ''}
                              {r.quantity > 1 ? ` · ${r.quantity} cortesías` : ''} · {COURTESY_KIND_LABEL[r.kind]}
                            </p>
                          </div>
                          <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest ${STATUS_LABEL[r.status].cls}`}>{STATUS_LABEL[r.status].text}</span>
                        </div>
                        {r.message && <p className={`text-[11px] mt-0.5 ${r.status === 'error' ? 'text-red-300' : 'text-yellow-300'}`}>Fila {r.line}: {r.message}</p>}
                      </li>
                    ))}
                    {view.rows.length === 0 && <li className="px-3 py-4 text-center text-xs text-zinc-500">No hay filas para mostrar.</li>}
                  </ul>
                  {view.p.totalPages > 1 && <Pager p={view.p} onPage={setPage} />}

                  {sending && (
                    <div aria-live="polite">
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden"><div className="h-full bg-neon-green transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} /></div>
                      <p className="text-[11px] text-zinc-400 mt-1">Enviando… {progress.done} de {progress.total}. No cierres esta pestaña.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={sending || sendable.length === 0}
                    className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-neon-purple hover:text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4" />} Enviar {sendable.length} {sendable.length === 1 ? 'cortesía' : 'cortesías'}
                  </button>
                  {sendable.length === 0 && <p className="text-[11px] text-zinc-500 text-center">No hay filas listas para enviar. Corrige el archivo y súbelo de nuevo.</p>}
                </>
              )}
            </div>
          )}
        </>
      )}

      <ConfirmDialog open={confirming} title="Enviar cortesías" confirmLabel={`Enviar ${sendable.length}`} onConfirm={send} onCancel={() => setConfirming(false)}>
        <p>{confirmText}</p>
        <p className="mt-2 text-zinc-400">Cada persona recibe un correo. Si ya tiene cuenta, la entrada le aparece directo en su cuenta. No se puede deshacer en bloque; se pueden anular una por una desde la lista.</p>
      </ConfirmDialog>
    </div>
  );
}
