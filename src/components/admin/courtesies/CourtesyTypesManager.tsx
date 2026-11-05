"use client";
import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, Infinity as InfinityIcon, X, Check } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/kasa-api';
import { courtesyTypeQuota, type CourtesyType } from '@/lib/partners';

/**
 * Denominaciones DE CORTESÍA del evento: la métrica propia de las cortesías.
 *
 * Una cortesía ya no se emite «a nombre de» una boleta que se vende (preventa, full): tiene su propia
 * estantería, con su propio cupo, y nunca causa dinero. Aquí se crean esas estanterías: Prensa, Staff,
 * Lista VIP, Cortesía general...
 */
export default function CourtesyTypesManager({
  eventId,
  types,
  onChanged,
}: {
  eventId: string;
  types: CourtesyType[];
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourtesyType | null>(null);
  const [form, setForm] = useState({ name: '', capacity: '50', unlimited: false, transferable_default: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setEditing(null);
    setForm({ name: '', capacity: '50', unlimited: false, transferable_default: false });
    setError('');
  };

  const startCreate = () => {
    reset();
    setOpen(true);
  };

  const startEdit = (t: CourtesyType) => {
    setEditing(t);
    setForm({
      name: t.name,
      capacity: String(t.unlimited ? 50 : t.capacity),
      unlimited: t.unlimited,
      transferable_default: t.transferable_default,
    });
    setError('');
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setError('');
    const body = {
      name: form.name,
      capacity: form.unlimited ? 0 : Number(form.capacity),
      unlimited: form.unlimited,
      transferable_default: form.transferable_default,
    };
    try {
      if (editing) await apiFetch(`/courtesies/types/${editing.id}`, { method: 'PUT', body });
      else await apiFetch(`/courtesies/events/${eventId}/types`, { method: 'POST', body });
      reset();
      setOpen(false);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo guardar la denominación.');
    }
    setBusy(false);
  };

  const remove = async (t: CourtesyType) => {
    if (!confirm(`¿Borrar la denominación «${t.name}»? Solo se puede si nunca se emitió una cortesía con ella.`)) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/courtesies/types/${t.id}`, { method: 'DELETE' });
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo borrar la denominación.');
    }
    setBusy(false);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-black uppercase text-white">Denominaciones de cortesía</h2>
          <p className="text-[11px] font-bold text-zinc-500 mt-1 max-w-md">
            Las cortesías tienen su propia cuenta: no salen de las boletas que se venden y nunca suman dinero.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="shrink-0 flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:border-neon-purple text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg transition-all"
        >
          <Plus className="w-3 h-3" /> Nueva
        </button>
      </div>

      {error && <p className="mb-3 text-xs font-bold text-red-400">{error}</p>}

      <div className="space-y-2">
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-3 bg-black border border-zinc-900 rounded-xl px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-sm truncate">{t.name}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                {t.unlimited ? (
                  <span className="flex items-center gap-1"><InfinityIcon className="w-3 h-3" /> Sin tope</span>
                ) : (
                  <span>Emitidas {courtesyTypeQuota(t)}</span>
                )}
                {t.transferable_default && <span className="text-neon-green">· Nacen libres</span>}
              </p>
            </div>
            <button type="button" onClick={() => startEdit(t)} disabled={busy} className="p-2 bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition-colors disabled:opacity-40" title="Editar" aria-label="Editar">
              <Pencil className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => remove(t)} disabled={busy} className="p-2 bg-zinc-900 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-40" title="Borrar" aria-label="Borrar">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {types.length === 0 && !open && (
          <p className="text-xs font-bold text-zinc-500 py-4">
            Este evento todavía no tiene denominaciones. Al emitir la primera cortesía se le crea «Cortesía general» sin tope.
          </p>
        )}
      </div>

      {open && (
        <div className="mt-4 bg-black border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-neon-purple">
              {editing ? `Editar «${editing.name}»` : 'Nueva denominación'}
            </h3>
            <button type="button" onClick={() => { reset(); setOpen(false); }} className="text-zinc-600 hover:text-white" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ej. Prensa, Staff, Lista VIP"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.unlimited} onChange={(e) => setForm({ ...form, unlimited: e.target.checked })} className="accent-neon-purple" />
            <span className="text-xs font-bold text-zinc-300">Sin tope de cortesías</span>
          </label>

          {!form.unlimited && (
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Cupo</label>
              <input
                type="number"
                min={1}
                value={form.capacity}
                onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-purple"
              />
              <p className="text-[10px] font-bold text-zinc-600 mt-1">
                Cuántas cortesías de esta denominación se pueden emitir en total. No puede quedar por debajo de las ya emitidas.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.transferable_default}
              onChange={(e) => setForm({ ...form, transferable_default: e.target.checked })}
              className="accent-neon-green"
            />
            <span className="text-xs font-bold text-zinc-300">Sus cortesías nacen libres (transferibles)</span>
          </label>

          <button
            type="button"
            onClick={save}
            disabled={busy || !form.name.trim()}
            className="w-full bg-white text-black font-black uppercase tracking-widest text-xs py-3 rounded-lg hover:bg-neon-purple hover:text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Guardar</>}
          </button>
        </div>
      )}
    </div>
  );
}
