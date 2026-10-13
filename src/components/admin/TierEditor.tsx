"use client";
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { MAX_TIERS, type TierDraft } from '@/lib/promoter-tiers';

interface Props {
  tiers: TierDraft[];
  onChange: (tiers: TierDraft[]) => void;
}

/**
 * Editor de escalones de un código de promotor: "N entradas · X % · hasta tal fecha".
 * El orden de la lista es el orden de uso: se usa el primer escalón que no haya vencido y tenga cupo.
 */
export default function TierEditor({ tiers, onChange }: Props) {
  const setRow = (i: number, patch: Partial<TierDraft>) =>
    onChange(tiers.map((t, k) => (k === i ? { ...t, ...patch } : t)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= tiers.length) return;
    const next = [...tiers];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const input =
    'w-full bg-black border border-zinc-800 rounded-lg px-2 py-1.5 text-sm focus:border-neon-purple outline-none';
  const label = 'block text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-1';

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Escalones de descuento (opcional)</p>

      {tiers.length === 0 && (
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
          Sin escalones se usa el descuento y el límite de siempre.
        </p>
      )}

      {tiers.map((t, i) => {
        const locked = (t.sold ?? 0) > 0;
        return (
          <div key={t.id ?? `nuevo-${i}`} className="bg-black/60 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-neon-purple uppercase tracking-widest">Escalón {i + 1}</span>
              <span className="text-[10px] text-zinc-500">{t.id ? `vendidas ${t.sold ?? 0}` : 'nuevo'}</span>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                  className="p-1 text-zinc-500 hover:text-white disabled:opacity-25" title="Usar antes">
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === tiers.length - 1}
                  className="p-1 text-zinc-500 hover:text-white disabled:opacity-25" title="Usar después">
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => onChange(tiers.filter((_, k) => k !== i))} disabled={locked}
                  className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-25 disabled:hover:text-zinc-500"
                  title={locked ? 'Ya tiene ventas: para cerrarlo baja la cantidad al número vendido' : 'Quitar escalón'}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className={label}>Entradas</label>
                <input type="number" min={Math.max(1, t.sold ?? 1)} placeholder="10" value={t.quantity}
                  onChange={(e) => setRow(i, { quantity: e.target.value })} className={input} />
              </div>
              <div>
                <label className={label}>Descuento %</label>
                <input type="number" min="0" max="100" placeholder="20" value={t.discount_perc}
                  onChange={(e) => setRow(i, { discount_perc: e.target.value })} className={input} />
              </div>
              <div>
                <label className={label}>Hasta</label>
                <input type="date" value={t.valid_until}
                  onChange={(e) => setRow(i, { valid_until: e.target.value })} className={input} />
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={() => onChange([...tiers, { quantity: '', discount_perc: '', valid_until: '' }])}
        disabled={tiers.length >= MAX_TIERS}
        className="w-full py-2 rounded-lg border border-dashed border-zinc-700 hover:border-neon-purple/60 text-zinc-500 hover:text-neon-purple transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-40">
        <Plus className="w-3.5 h-3.5" /> Agregar escalón
      </button>

      {tiers.length > 0 && (
        <p className="text-[10px] text-zinc-500 leading-relaxed">
          Se usa el primer escalón que no haya vencido y tenga cupo; una compra no se parte entre escalones.
          Con escalones, el descuento general del código no se usa. La fecha vale hasta las 11:59 p. m. de ese día (hora Colombia).
        </p>
      )}
    </div>
  );
}
