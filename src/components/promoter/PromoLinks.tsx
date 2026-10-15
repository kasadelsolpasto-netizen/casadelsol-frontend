"use client";

import { useState } from 'react';
import { Copy, MessageCircle, AlertTriangle } from 'lucide-react';
import { discountedTotal } from '@/lib/promoter-tiers';
import { codesForEvent } from '@/lib/promoter-codes';
import { isEventSalesClosed, isFreeStage, pickStage } from '@/lib/sale-stage';
import { buildPromoLinkMessage, linkState, promoLinkUrl } from '@/lib/promo-links';
import { whatsappLink } from '@/lib/whatsapp';

const money = (n: number) =>
  Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });

/**
 * Enlaces de venta ONLINE del promotor, uno por evento y código. El cliente abre el enlace, paga en línea y la venta
 * queda a nombre del código del promotor con su descuento ya aplicado. Cada enlace es una fila corta: código, precio de
 * la etapa vigente (tachado si hay descuento) y dos botones, WhatsApp y Copiar (WhatsApp se abre en el celular del
 * promotor, sin API: ahí elige el chat del cliente).
 */
export default function PromoLinks({ events, codes }: { events: any[]; codes: any[] }) {
  const [copiedKey, setCopiedKey] = useState('');
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const list = (Array.isArray(events) ? events : [])
    .filter((ev) => !isEventSalesClosed(ev.date))
    .map((ev) => ({ ev, evCodes: codesForEvent<any>(codes, ev.id) }))
    .filter((x) => x.evCodes.length > 0)
    .sort((a, b) => new Date(a.ev.date).getTime() - new Date(b.ev.date).getTime());

  const copy = async (key: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2500);
    } catch {
      // Sin permiso para copiar: el enlace sigue disponible por WhatsApp
    }
  };

  return (
    <section aria-label="Enlaces de venta online">
      <p className="text-xs font-bold text-zinc-500 mb-4">
        El cliente abre tu enlace, paga en línea y la venta queda a tu nombre con tu descuento. Ese dinero llega pagado: no
        tienes que cobrarlo ni entregarlo.
      </p>

      {list.length === 0 && (
        <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-8 text-center text-xs font-bold text-zinc-500">
          No hay eventos abiertos con tu código por ahora.
        </div>
      )}

      <div className="space-y-4">
        {list.map(({ ev, evCodes }) => {
          const tickets: any[] = Array.isArray(ev.ticket_types) ? ev.ticket_types : [];
          const allFree = tickets.length > 0 && tickets.every((t) => isFreeStage(t));
          const stage = pickStage<any>(tickets);
          const current = stage.current;
          const noStageNotice = (() => {
            if (current) return '';
            if (stage.soldOut) return 'La etapa actual está agotada.';
            return stage.next?.sale_start
              ? `Ninguna etapa está a la venta ahora. La siguiente (${stage.next.name}) abre el ${fmtDateTime(stage.next.sale_start)}`
              : 'Este evento no tiene ninguna etapa a la venta ahora.';
          })();

          return (
            <div key={ev.id} className="rounded-2xl bg-zinc-950 border border-zinc-900 overflow-hidden">
              <div className="px-4 py-3 border-b border-zinc-900">
                <p className="text-sm font-black text-white uppercase leading-tight">{ev.title}</p>
                <p className="text-[11px] font-bold text-zinc-500">
                  {new Date(ev.date).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long' })}
                </p>
              </div>

              {allFree ? (
                <p className="p-4 text-xs font-bold text-zinc-400">
                  Este evento es gratis: no hay enlace de venta online. Las entradas gratis las entregas desde la pestaña «Vender».
                </p>
              ) : (
                <ul className="divide-y divide-zinc-900">
                  {evCodes.map((c: any) => {
                    const key = `${ev.id}:${c.id}`;
                    const st = linkState(c);
                    const url = promoLinkUrl(origin, ev.id, c.code);
                    const perc = st.ok ? st.discountPerc : 0;
                    const base = current ? Number(current.price) : 0;
                    const final = current ? discountedTotal(base, perc, 1) : 0;
                    const waHref = whatsappLink(
                      null,
                      buildPromoLinkMessage({
                        eventTitle: ev.title,
                        url,
                        stageName: current?.name ?? null,
                        basePrice: current ? money(base) : null,
                        finalPrice: current ? money(final) : null,
                        discountPerc: perc,
                      }),
                    );
                    return (
                      <li key={key} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-mono font-bold text-neon-green truncate">{c.code}</p>
                            <p className="text-[11px] font-bold text-zinc-500">
                              {c.event_id ? '' : 'Vale para todos los eventos'}
                              {!c.event_id && current ? ' · ' : ''}
                              {current ? current.name : ''}
                            </p>
                          </div>
                          {current && (
                            <div className="text-right shrink-0">
                              {perc > 0 && <p className="text-[11px] font-bold text-zinc-500 line-through leading-none">{money(base)}</p>}
                              <p className="text-lg font-black text-white leading-tight">{money(final)}</p>
                              {perc > 0 && <p className="text-[10px] font-black text-neon-purple uppercase tracking-widest">-{perc}% con tu código</p>}
                            </div>
                          )}
                        </div>

                        {!current && <p className="mt-2 text-[11px] font-bold text-yellow-300">{noStageNotice}</p>}

                        {st.ok ? (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-11 bg-[#25D366] hover:bg-[#25D366]/90 text-black text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2"
                            >
                              <MessageCircle className="w-4 h-4" /> WhatsApp
                            </a>
                            <button
                              type="button"
                              onClick={() => copy(key, url)}
                              className="h-11 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2"
                            >
                              <Copy className="w-4 h-4" /> {copiedKey === key ? '¡Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-red-400">{st.message}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
