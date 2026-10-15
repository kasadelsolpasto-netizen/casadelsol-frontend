"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket, CheckCircle2, AlertTriangle, Loader2, ChevronLeft, ChevronDown, ClipboardList, Link2, MessageCircle, Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { discountedTotal, formatTierDate, tierMessage, tierStatus } from '@/lib/promoter-tiers';
import { buildTicketsMessage, ticketUrl, whatsappLink } from '@/lib/whatsapp';
import { codesForEvent, pickPromoterCode } from '@/lib/promoter-codes';
import { isEventSalesClosed, isFreeStage, pickStage } from '@/lib/sale-stage';
import PromoLinks from '@/components/promoter/PromoLinks';
import PromoterSummary from '@/components/promoter/PromoterSummary';
import PromoterSales, { type SalesFilter } from '@/components/promoter/PromoterSales';
import { apiFetch } from '@/lib/kasa-api';
import type { Summary } from '@/lib/sales-view';

type SoldInfo = {
  buyerName: string;
  buyerEmail: string;
  eventTitle: string;
  tickets: { token: string; attendee_name: string | null }[];
};

const money = (n: number) =>
  Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });

/**
 * Entradas de la ÚLTIMA venta, para entregarlas en el momento: el QR en pantalla (el cliente lo escanea o le toma foto)
 * y el envío por WhatsApp. Son las MISMAS entradas que ya le llegaron por correo (mismo enlace /ticket/<token>).
 */
function SoldTickets({ sold, onClose }: { sold: SoldInfo; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const urls = sold.tickets.map((t) => ticketUrl(origin, t.token));
  // Sin número: WhatsApp se abre en el celular de quien vende y ahí elige el chat del cliente.
  const waHref = whatsappLink(null, buildTicketsMessage({ buyerName: sold.buyerName, eventTitle: sold.eventTitle, urls }));

  const copyLinks = async () => {
    try {
      await navigator.clipboard.writeText(urls.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Sin permiso para copiar: el enlace sigue disponible por WhatsApp
    }
  };

  return (
    <div className="mb-6 bg-zinc-950 border border-neon-green/30 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-black uppercase text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-neon-green" /> {sold.tickets.length === 1 ? 'Entrada lista' : `${sold.tickets.length} entradas listas`}
          </h2>
          <p className="text-xs font-bold text-zinc-500 mt-1">
            Para {sold.buyerName}. También se las enviamos a {sold.buyerEmail}.
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest shrink-0">
          Cerrar
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {sold.tickets.map((t, i) => (
          <div key={t.token} className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-2xl bg-white">
              <QRCodeSVG value={urls[i]} size={176} level="H" includeMargin={false} bgColor="white" fgColor="#000000" />
            </div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">
              Entrada {i + 1}{t.attendee_name ? ` · ${t.attendee_name}` : ''}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3 bg-[#25D366] hover:bg-[#25D366]/90 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
        </a>
        <button
          type="button"
          onClick={copyLinks}
          className="flex-1 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex justify-center items-center gap-2"
        >
          <Copy className="w-4 h-4" /> {copied ? '¡Copiado!' : urls.length === 1 ? 'Copiar enlace' : 'Copiar enlaces'}
        </button>
      </div>

      <p className="mt-3 text-[11px] font-bold text-zinc-500">
        «Enviar por WhatsApp» abre tu WhatsApp con el mensaje y los enlaces ya escritos: elige el chat del cliente y envíalo.
      </p>
      <p className="mt-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
        Es el mismo QR del correo y se puede usar una sola vez en la puerta.
      </p>
    </div>
  );
}

export default function PromoterDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'vender' | 'ventas' | 'enlaces'>('vender');
  const [summary, setSummary] = useState<{ totals: Summary; events: Array<{ event: { id: string; title: string } }> } | null>(null);
  const [salesKind, setSalesKind] = useState<SalesFilter>('ALL');
  const [salesKey, setSalesKey] = useState(0); // sube cuando se registra una venta, para que "Mis ventas" se recargue
  
  // Form state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [chosenCodeId, setChosenCodeId] = useState(''); // solo si el promotor tiene varios códigos que valen para el evento
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerDni, setBuyerDni] = useState('');
  const [sold, setSold] = useState<SoldInfo | null>(null); // entradas de la última venta
  
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const getToken = () => {
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    return tokenRow ? tokenRow.split('=')[1] : null;
  };

  // Resumen de lo que vendió y lo que debe entregar. Si falla, el panel sigue funcionando (solo no muestra el resumen).
  const loadSummary = async () => {
    try {
      setSummary(await apiFetch('/promoters/me/summary'));
    } catch {
      // se vuelve a intentar en la próxima venta o recarga
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const token = getToken();
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Fetch User Profile
        const lsUser = localStorage.getItem('kasa_user');
        const userId = lsUser ? JSON.parse(lsUser).id : null;
        if (!userId) {
          router.push('/login');
          return;
        }

        const resProfile = await fetch(`${API_URL}/users/${userId}/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!resProfile.ok) throw new Error('Error cargando perfil');
        const profileData = await resProfile.json();
        
        if (!profileData.promoter_codes || profileData.promoter_codes.length === 0) {
          router.push('/profile/' + userId); // No es promotor
          return;
        }
        
        setProfile(profileData);
        loadSummary();

        // Fetch Events
        const resEvents = await fetch(`${API_URL}/events`);
        if (resEvents.ok) {
          setEvents(await resEvents.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  // El promotor no elige boleto: se vende la etapa que está abierta ahora (por fechas y cupos), igual que en la web.
  const stage = selectedEvent ? pickStage<any>(selectedEvent.ticket_types) : null;
  const selectedTicket: any = stage?.current ?? null;
  // Entrada de $0 (evento gratis): no hay nada que cobrar ni descuento que mostrar.
  const isFree: boolean = !!selectedTicket && isFreeStage(selectedTicket);
  const stageNotice: string = (() => {
    if (!selectedEvent || selectedTicket) return '';
    const opens = stage?.next?.sale_start
      ? ` La siguiente etapa (${stage.next.name}) abre el ${fmtDateTime(stage.next.sale_start)}`
      : '';
    if (stage?.soldOut) return `La etapa actual está agotada.${opens}`;
    return opens ? `Ninguna etapa está a la venta ahora.${opens}` : 'Este evento no tiene ninguna etapa a la venta ahora.';
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) {
      setErrorMsg('Falta elegir el evento.');
      return;
    }
    if (!selectedTicket) {
      setErrorMsg(stageNotice);
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      setErrorMsg('La cantidad debe ser 1 o más.');
      return;
    }
    if (quantity > selectedTicket.available) {
      setErrorMsg(`En esta etapa ${selectedTicket.available === 1 ? 'solo queda 1 entrada' : `solo quedan ${selectedTicket.available} entradas`}.`);
      return;
    }
    if (!myCode) {
      setErrorMsg('No tienes un código activo que aplique a este evento. Habla con el administrador.');
      return;
    }
    if (quotaLeft !== null && quantity > quotaLeft) {
      setErrorMsg(
        quotaLeft === 0
          ? `Ya entregaste todas las entradas que permite tu código (${myCode.ticket_limit}).`
          : `Tu código solo permite ${quotaLeft === 1 ? '1 entrada más' : `${quotaLeft} entradas más`}. Reduce la cantidad a ${quotaLeft} (o menos).`,
      );
      return;
    }
    if (noTier || overTier) {
      setErrorMsg(noTier ? 'No tienes descuentos vigentes.' : 'La cantidad supera lo que queda en tu escalón actual.');
      return;
    }
    // Mismas reglas que aplica el servidor a cada entrada: así el error sale ANTES de enviar y dice qué campo es.
    const dniClean = buyerDni.replace(/[\s.,\-_]/g, '');
    const missing: string[] = [];
    if (!buyerName.trim()) missing.push('el nombre completo');
    if (!buyerEmail.trim()) missing.push('el correo electrónico');
    if (!dniClean) missing.push('la cédula o documento');
    if (missing.length > 0) {
      setErrorMsg(`Falta ${missing.join(', ').replace(/, ([^,]*)$/, ' y $1')} del cliente.`);
      return;
    }
    if (buyerName.trim().length > 120) {
      setErrorMsg('El nombre del cliente es muy largo (máximo 120 letras).');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(buyerEmail.trim())) {
      setErrorMsg('El correo del cliente no parece válido (ejemplo: nombre@correo.com).');
      return;
    }
    if (/^0*$/.test(dniClean) || dniClean.length > 30) {
      setErrorMsg('La cédula o documento del cliente no es válido (no puede ser solo ceros ni tener más de 30 caracteres).');
      return;
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    setSold(null);
    setSubmitting(true);

    try {
      const attendees = Array(quantity).fill({
        ticket_type_id: selectedTicket.id,
        attendee_name: buyerName,
        attendee_email: buyerEmail,
        attendee_dni: buyerDni
      });

      const res = await fetch(`${API_URL}/orders/promoter-cash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          buyerName,
          buyerEmail,
          buyerDni,
          attendees,
          promoterCode: myCode.code
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Error al registrar la venta.');
      }

      const soldTickets: { token: string; attendee_name: string | null }[] = Array.isArray(data?.tickets) ? data.tickets : [];
      setSuccessMsg(`${isFree ? 'Entradas registradas.' : 'Venta registrada.'} Le enviamos ${soldTickets.length === 1 ? 'la entrada' : 'las entradas'} a ${buyerEmail}.`);
      setSold(
        soldTickets.length > 0
          ? { buyerName, buyerEmail, eventTitle: data?.eventTitle || selectedEvent?.title || '', tickets: soldTickets }
          : null
      );
      
      // Reset form
      setSelectedEventId('');
      setQuantity(1);
      setBuyerName('');
      setBuyerEmail('');
      setBuyerDni('');
      setChosenCodeId('');

      // Actualiza el resumen y la lista de "Mis ventas"
      loadSummary();
      setSalesKey((k) => k + 1);

      // Refresh profile to update stats
      const resProfile = await fetch(`${API_URL}/users/${profile.id}/profile`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (resProfile.ok) {
        setProfile(await resProfile.json());
      }

      // Refrescar cupos y etapa vigente: la venta descuenta cupos y puede cerrar la etapa. Si falla, la venta ya quedó hecha.
      try {
        const resEvents = await fetch(`${API_URL}/events`);
        if (resEvents.ok) setEvents(await resEvents.json());
      } catch {
        // se refresca solo en la próxima carga
      }
      
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
       <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-neon-green animate-spin mb-4" />
          <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Cargando Panel...</p>
       </div>
    );
  }

  // El código que vale para el evento elegido (antes siempre era el primero que devolviera la base de datos).
  const eventCodes: any[] = codesForEvent<any>(profile?.promoter_codes, selectedEventId);
  const myCode: any = pickPromoterCode<any>(profile?.promoter_codes, selectedEventId, chosenCodeId);
  // Con escalones se usa el vigente (lo calcula el servidor); sin escalones, el descuento del código de siempre.
  const hasTiers = (myCode?.tiers?.length ?? 0) > 0;
  const currentTier = myCode?.current_tier ?? null;
  const activeDiscount: number | null = hasTiers ? (currentTier ? currentTier.discount_perc : null) : (myCode?.discount_perc ?? 0);
  const noTier = hasTiers && !currentTier;
  const overTier = hasTiers && currentTier != null && quantity > currentTier.remaining;
  const finalPrice = selectedTicket && activeDiscount != null ? discountedTotal(selectedTicket.price, activeDiscount, quantity) : 0;
  // Precio por entrada y total SIN descuento, para mostrarlos tachados cuando hay descuento.
  const unitPrice: number = selectedTicket ? (activeDiscount != null ? discountedTotal(selectedTicket.price, activeDiscount, 1) : selectedTicket.price) : 0;
  const baseTotal: number = selectedTicket ? discountedTotal(selectedTicket.price, 0, quantity) : 0;
  // Cupo del código (límite de entradas que el administrador le dio a este promotor): es lo mismo que valida el servidor.
  const quotaLeft: number | null = myCode?.ticket_limit ? Math.max(0, myCode.ticket_limit - (myCode.tickets_sold || 0)) : null;

  return (
    <div className="min-h-screen pb-24 bg-[#050505]">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-10">
        <header className="mb-4">
          <Link href={`/profile/${profile?.id}`} className="inline-flex items-center gap-1 min-h-[44px] text-[11px] font-black text-zinc-500 uppercase tracking-widest hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" /> Mi Bóveda
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black uppercase text-white leading-tight">Panel de Ventas</h1>
          <p className="text-xs font-bold text-zinc-500">Promotor autorizado</p>
        </header>

        <PromoterSummary
          totals={summary?.totals ?? null}
          onShowPending={() => {
            setSalesKind('CASH_PENDING');
            setTab('ventas');
          }}
        />

        <div role="tablist" aria-label="Secciones del panel" className="mt-5 grid grid-cols-3 gap-1 p-1 rounded-2xl bg-zinc-950 border border-zinc-900">
          {([
            { key: 'vender', label: 'Vender', Icon: Ticket },
            { key: 'ventas', label: 'Mis ventas', Icon: ClipboardList },
            { key: 'enlaces', label: 'Enlaces', Icon: Link2 },
          ] as const).map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`h-11 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors ${
                tab === key ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {tab === 'vender' && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-zinc-950 border border-zinc-900 px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tu código</p>
                  <p className="text-lg font-mono font-bold text-neon-green truncate">{myCode ? myCode.code : 'SIN CÓDIGO'}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  {activeDiscount != null && activeDiscount > 0 && (
                    <div>
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descuento</p>
                      <p className="text-base font-black text-neon-purple">{activeDiscount}% OFF</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Ventas</p>
                    <p className="text-base font-black text-white">{myCode?.uses_count ?? 0}</p>
                  </div>
                </div>
              </div>

              {hasTiers && (
                <details className="group rounded-2xl bg-zinc-950 border border-zinc-900">
                  <summary className="flex items-center justify-between gap-3 px-4 min-h-[52px] py-2 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tus descuentos</span>
                      <span className="block text-xs font-bold text-zinc-300">{tierMessage(currentTier, myCode?.next_tier)}</span>
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-4 pb-4 space-y-2">
                    {myCode.tiers.map((t: any) => {
                      const st = tierStatus(t, myCode.tiers);
                      const style =
                        st === 'current' ? 'border-neon-purple/50 bg-neon-purple/10 text-neon-purple'
                        : st === 'waiting' ? 'border-zinc-800 text-zinc-300'
                        : 'border-zinc-900 text-zinc-600 line-through';
                      return (
                        <div key={t.id} className={`flex justify-between items-center text-xs font-bold rounded-xl px-3 py-2 border ${style}`}>
                          <span>{t.discount_perc}% OFF</span>
                          <span>{t.sold}/{t.quantity}{t.valid_until ? ` · hasta ${formatTierDate(t.valid_until)}` : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}

              {sold && <SoldTickets key={sold.tickets[0].token} sold={sold} onClose={() => setSold(null)} />}

                  <form onSubmit={handleSubmit} noValidate className="bg-zinc-950 border border-zinc-900 rounded-3xl p-5 sm:p-8 shadow-2xl">
                    <h2 className="text-xl font-black uppercase text-white flex items-center gap-3 mb-6">
                      <Ticket className="w-6 h-6 text-neon-green" /> {isFree ? 'Entrega de Entradas Gratis' : 'Nueva Venta en Efectivo'}
                    </h2>
              
                    {successMsg && (
                      <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <p className="text-sm font-bold text-green-400">{successMsg}</p>
                      </div>
                    )}
              
                    {errorMsg && (
                      <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                        <p className="text-sm font-bold text-red-400">{errorMsg}</p>
                      </div>
                    )}
              
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Evento</label>
                        <select 
                          required
                          value={selectedEventId}
                          onChange={(e) => { setSelectedEventId(e.target.value); setChosenCodeId(''); }}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                        >
                          <option value="">Selecciona un evento</option>
                          {events.filter(ev => !isEventSalesClosed(ev.date)).map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.title} - {new Date(ev.date).toLocaleDateString('es-CO')}</option>
                          ))}
                        </select>
                      </div>
              
                      {selectedEvent && selectedTicket && (
                        <div className="rounded-2xl border border-neon-green/30 bg-neon-green/5 p-5">
                          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Etapa en venta ahora</p>
                          <div className="flex items-end justify-between gap-4">
                            <p className="text-lg font-black text-white uppercase leading-tight">{selectedTicket.name}</p>
                            <div className="text-right shrink-0">
                              {!isFree && activeDiscount != null && activeDiscount > 0 && (
                                <p className="text-sm font-bold text-zinc-500 line-through">{money(selectedTicket.price)}</p>
                              )}
                              <p className="text-3xl font-black text-neon-green leading-none">{isFree ? 'Gratis' : money(unitPrice)}</p>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">por entrada</p>
                            </div>
                          </div>
                          {isFree && (
                            <p className="mt-3 text-xs font-bold text-zinc-400">Esta entrada no tiene costo: no recibes dinero del cliente.</p>
                          )}
                          {!isFree && activeDiscount != null && activeDiscount > 0 && (
                            <p className="mt-3 text-xs font-black text-neon-purple uppercase tracking-widest">
                              Tu descuento del {activeDiscount}% ya está aplicado
                            </p>
                          )}
                          {quotaLeft !== null && (
                            <p className="mt-2 text-[11px] font-black text-neon-purple uppercase tracking-widest">
                              {quotaLeft === 0
                                ? 'Ya entregaste todas las entradas de tu código'
                                : `Te ${quotaLeft === 1 ? 'queda 1 entrada' : `quedan ${quotaLeft} entradas`} de las ${myCode.ticket_limit} de tu código`}
                            </p>
                          )}
                          {selectedTicket.sale_end && (
                            <p className="mt-2 text-[11px] font-bold text-zinc-500">Esta etapa cierra el {fmtDateTime(selectedTicket.sale_end)}</p>
                          )}
                        </div>
                      )}
                      {selectedEvent && !selectedTicket && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm font-bold text-yellow-300">
                          {stageNotice}
                        </div>
                      )}
                      {selectedEvent && selectedTicket && (
                        <div>
                          <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Cantidad</label>
                          <input 
                            type="number" min="1" max={Math.min(10, selectedTicket.available)} required
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                          />
                        </div>
                      )}
              
                      {selectedEvent && eventCodes.length > 1 && (
                        <div>
                          <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Código a usar</label>
                          <select
                            value={myCode?.id ?? ''}
                            onChange={(e) => setChosenCodeId(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                          >
                            {eventCodes.map((c: any) => (
                              <option key={c.id} value={c.id}>{c.code}{c.event_id ? '' : ' (todos los eventos)'}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {selectedEvent && !myCode && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-bold text-red-400">
                          Ninguno de tus códigos activos aplica a este evento. Habla con el administrador.
                        </div>
                      )}
              
                      {noTier && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm font-bold text-red-400">
                          No tienes descuentos vigentes. Habla con el administrador para que te asigne más entradas.
                        </div>
                      )}
                      {overTier && currentTier && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm font-bold text-yellow-300">
                          Con tu escalón actual solo {currentTier.remaining === 1 ? 'queda 1 entrada' : `quedan ${currentTier.remaining} entradas`} al {currentTier.discount_perc}%.
                          {' '}Reduce la cantidad a {currentTier.remaining} (o menos) y haz otra venta por el resto.
                        </div>
                      )}
              
                      <div className="pt-6 border-t border-zinc-900">
                        <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-4">Datos del Cliente</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Nombre Completo</label>
                            <input 
                              required type="text" placeholder="Ej: Juan Pérez"
                              value={buyerName} onChange={e => setBuyerName(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Correo Electrónico (Para enviar QR y crear Bóveda)</label>
                            <input 
                              required type="email" placeholder="ejemplo@correo.com"
                              value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">Cédula / Documento (obligatoria para la entrada)</label>
                            <input 
                              type="text" placeholder="Número de documento"
                              value={buyerDni} onChange={e => setBuyerDni(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:border-neon-purple outline-none"
                            />
                          </div>
                        </div>
                      </div>
              
                      {selectedTicket && (
                        <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-xl p-4 flex justify-between items-center">
                          <span className="text-[10px] font-black text-neon-purple uppercase tracking-widest">{isFree ? 'Entradas gratuitas' : 'Total a Cobrar en Efectivo'}</span>
                          <span className="text-right">
                            {!isFree && activeDiscount != null && activeDiscount > 0 && (
                              <span className="block text-sm font-bold text-zinc-500 line-through">{money(baseTotal)}</span>
                            )}
                            <span className="block text-2xl font-black text-white">{isFree ? 'Gratis' : money(finalPrice)}</span>
                          </span>
                        </div>
                      )}
              
                      <button 
                        type="submit" 
                        disabled={submitting || (!!selectedEvent && (!myCode || !selectedTicket)) || noTier || overTier}
                        className="w-full py-4 bg-neon-green hover:bg-neon-green/90 text-black text-sm font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(57,255,20,0.3)] disabled:opacity-50 flex justify-center items-center gap-2"
                      >
                        {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isFree ? 'Generar Entradas y QRs' : 'Generar Venta y QRs')}
                      </button>
                      <p className="text-center text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-4">
                        {isFree ? 'Estas entradas no tienen costo: no se cobra nada.' : 'Al hacer clic confirmas que recibiste el efectivo.'}
                      </p>
                    </div>
                  </form>
            </div>
          )}

          {tab === 'ventas' && (
            <PromoterSales
              totals={summary?.totals ?? null}
              eventOptions={(summary?.events ?? []).map((r) => ({ id: r.event.id, title: r.event.title }))}
              kind={salesKind}
              onKindChange={setSalesKind}
              refreshKey={salesKey}
            />
          )}

          {tab === 'enlaces' && <PromoLinks events={events} codes={profile?.promoter_codes ?? []} />}
        </div>
      </main>
    </div>
  );
}
