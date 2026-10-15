"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronRight, ClipboardList, Download, DoorOpen, LayoutDashboard, Loader2, Users } from 'lucide-react';
import { apiFetch, withQuery } from '@/lib/kasa-api';
import { buildOrdersCsv, formatCOP, type PromoterRow, type Summary } from '@/lib/sales-view';
import MoneyCards from '@/components/admin/sales/MoneyCards';
import PromoterDebt from '@/components/admin/sales/PromoterDebt';
import OrdersList from '@/components/admin/sales/OrdersList';
import WalkInList from '@/components/admin/sales/WalkInList';
import SettlementsHistory from '@/components/admin/sales/SettlementsHistory';

type EventStats = {
  event: { id: string; title: string; date: string; venue: string; page_views?: number; checkout_clicks?: number };
  totalScanned: number;
  totalTicketsSold: number;
  summary: Summary;
  promoters: PromoterRow[];
};

type WalkIn = { id: string; name?: string | null; email?: string | null; cedula?: string | null; amount: number; created_at: string };

type Tab = 'resumen' | 'promotores' | 'ventas';

const TABS: { key: Tab; label: string; Icon: typeof Users }[] = [
  { key: 'resumen', label: 'Resumen', Icon: LayoutDashboard },
  { key: 'promotores', label: 'Promotores', Icon: Users },
  { key: 'ventas', label: 'Ventas', Icon: ClipboardList },
];

function isTab(value: string): value is Tab {
  return value === 'resumen' || value === 'promotores' || value === 'ventas';
}

/**
 * Ventas de un evento, en tres pestañas para que no se vea amontonado:
 *  - Resumen: el dinero separado (online / por cobrar / liquidado / taquilla) y el embudo.
 *  - Promotores: lo que cada uno vendió online y lo que debe en efectivo (aquí se le liquida) + historial de liquidaciones.
 *  - Ventas: la lista de compradores paginada y la taquilla en puerta.
 * Las pestañas se montan la primera vez que se abren y conservan su estado (promotor abierto, página, filtros) al cambiar.
 */
export default function EventSalesStatsPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<EventStats | null>(null);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [tab, setTab] = useState<Tab>('resumen');
  const [visited, setVisited] = useState<Tab[]>(['resumen']);

  const goTab = useCallback((next: Tab) => {
    setTab(next);
    setVisited((v) => (v.includes(next) ? v : [...v, next]));
    try {
      // Conserva el state de Next (history.state) y solo cambia el #hash: así el enlace /…#promotores abre esa pestaña.
      const base = window.location.pathname + window.location.search;
      window.history.replaceState(window.history.state, '', next === 'resumen' ? base : `${base}#${next}`);
    } catch {
      /* sin history: la pestaña igual cambia */
    }
  }, []);

  // Si llegan con #promotores o #ventas, abrir esa pestaña.
  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '');
    if (isTab(fromHash) && fromHash !== 'resumen') goTab(fromHash);
  }, [goTab]);

  // pageSize=1: aquí solo se necesitan los totales y los promotores; las filas las pagina cada lista.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [stats, walk] = await Promise.all([
          apiFetch<EventStats>(withQuery(`/events/admin/${params.id}/stats`, { page: 1, pageSize: 1 })),
          apiFetch<WalkIn[]>(`/walk-in/${params.id}`).catch(() => [] as WalkIn[]),
        ]);
        if (!alive) return;
        setData(stats);
        setWalkIns(Array.isArray(walk) ? walk : []);
        setError('');
      } catch (e: any) {
        if (alive) setError(e?.message || 'No se pudieron cargar las métricas.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [params.id, refreshKey]);

  const onChanged = useCallback(() => setRefreshKey((k) => k + 1), []);

  const exportCsv = async () => {
    if (!data || exporting) return;
    setExporting(true);
    setExportError('');
    try {
      const all = await apiFetch<{ orders: any[] }>(`/events/admin/${params.id}/stats`);
      const csv = buildOrdersCsv(all.orders ?? []);
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = data.event.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      a.href = url;
      a.download = `ventas-${slug || 'evento'}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(e?.message || 'No se pudo exportar.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex justify-center py-40">
        <Loader2 className="w-10 h-10 animate-spin text-neon-green" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#050505] text-white px-4 py-24 text-center">
        <p className="font-black tracking-widest text-lg text-red-500">{error || 'Error cargando métricas.'}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRefreshKey((k) => k + 1);
          }}
          className="mt-6 h-11 px-6 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black uppercase tracking-widest hover:border-zinc-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const walkInTotal = walkIns.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const views = data.event.page_views || 0;
  // Solo las compras online salen de la página (las de efectivo y gratis las registra el promotor), y nunca pasa de 100%.
  const onlineOrders = data.summary.online.orders;
  const conversion = views > 0 ? Math.min(100, Math.round((onlineOrders / views) * 100)) : 0;
  const debtors = data.promoters.filter((p) => p.cash_pending.amount > 0).length;
  const owes = data.summary.cash_pending.amount > 0;
  const dateLabel = new Date(data.event.date).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 md:py-10">
        <Link href="/admin/sales" className="inline-flex items-center gap-2 text-zinc-500 hover:text-neon-green transition-colors mb-5 uppercase font-bold tracking-widest text-xs min-h-[44px]">
          <ArrowLeft className="w-4 h-4" /> Volver al tablero
        </Link>

        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-widest leading-tight break-words">{data.event.title}</h1>
            <p className="mt-1 text-zinc-500 uppercase tracking-widest text-xs font-bold">
              {dateLabel} · {data.event.venue}
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/admin/taquilla/${data.event.id}`}
              className="flex-1 md:flex-none h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 font-black uppercase tracking-widest text-[11px] transition-colors"
            >
              <DoorOpen className="w-4 h-4" /> Taquilla
            </Link>
            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting}
              className="flex-1 md:flex-none h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white hover:border-zinc-600 font-black uppercase tracking-widest text-[11px] transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} CSV
            </button>
          </div>
        </header>
        {exportError && <p className="-mt-4 mb-6 text-xs font-bold text-red-400">{exportError}</p>}

        <div role="tablist" aria-label="Secciones del evento" className="mb-6 grid grid-cols-3 gap-1 p-1 rounded-2xl bg-zinc-950 border border-zinc-900">
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                id={`tab-${key}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`panel-${key}`}
                onClick={() => goTab(key)}
                className={`relative h-11 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors ${
                  active ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0 hidden min-[400px]:block" />
                <span>{label}</span>
                {key === 'promotores' && debtors > 0 && (
                  <span
                    aria-label={`${debtors} ${debtors === 1 ? 'promotor debe' : 'promotores deben'} efectivo`}
                    className="absolute -top-1.5 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-orange-500 text-black text-[10px] font-black leading-[18px] text-center"
                  >
                    {debtors}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div id="panel-resumen" role="tabpanel" aria-labelledby="tab-resumen" hidden={tab !== 'resumen'}>
          <MoneyCards summary={data.summary} walkInTotal={walkInTotal} walkInCount={walkIns.length} scanned={data.totalScanned} />

          {owes && (
            <button
              type="button"
              onClick={() => goTab('promotores')}
              className="mb-8 w-full min-h-[56px] rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-orange-500/15 transition-colors"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-widest text-orange-400">Efectivo por cobrar</span>
                <span className="block text-sm font-black text-white">
                  {formatCOP(data.summary.cash_pending.amount)} en {debtors} {debtors === 1 ? 'promotor' : 'promotores'}
                </span>
              </span>
              <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-orange-400">
                Liquidar <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )}

          <section aria-label="Embudo de conversión" className="rounded-2xl bg-zinc-950 border border-zinc-900 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Embudo de conversión</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xl sm:text-2xl font-black">{views.toLocaleString('es-CO')}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Visitas</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black">{(data.event.checkout_clicks || 0).toLocaleString('es-CO')}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Abrieron checkout</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black">{conversion}%</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Compraron online</p>
              </div>
            </div>
          </section>
        </div>

        {visited.includes('promotores') && (
          <div id="panel-promotores" role="tabpanel" aria-labelledby="tab-promotores" hidden={tab !== 'promotores'}>
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-950 border border-zinc-900 border-t-2 border-t-orange-500 p-4 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-1">Por cobrar</p>
                <p className="text-xl font-black text-white whitespace-nowrap">{formatCOP(data.summary.cash_pending.amount)}</p>
              </div>
              <div className="rounded-2xl bg-zinc-950 border border-zinc-900 border-t-2 border-t-green-500 p-4 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">Liquidado</p>
                <p className="text-xl font-black text-white whitespace-nowrap">{formatCOP(data.summary.cash_settled.amount)}</p>
              </div>
            </div>

            <PromoterDebt eventId={data.event.id} promoters={data.promoters} refreshKey={refreshKey} onChanged={onChanged} />

            <SettlementsHistory eventId={data.event.id} refreshKey={refreshKey} />
          </div>
        )}

        {visited.includes('ventas') && (
          <div id="panel-ventas" role="tabpanel" aria-labelledby="tab-ventas" hidden={tab !== 'ventas'}>
            <OrdersList eventId={data.event.id} summary={data.summary} promoters={data.promoters} refreshKey={refreshKey} onChanged={onChanged} />

            <WalkInList walkIns={walkIns} />
          </div>
        )}
      </div>
    </div>
  );
}
