"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Calendar, MapPin, Eye, EyeOff, Loader2, AlertTriangle, X } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiFetch, ApiError, withQuery } from '@/lib/kasa-api';
import { titleMatches, impactLines, impactWarnings, type DeleteImpact } from '@/lib/delete-impact';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Borrado: primero se pide confirmar; si el evento tiene órdenes el servidor responde con lo que se perdería
  // (impact) y entonces hay que escribir el nombre del evento para borrarlo con todo.
  const [target, setTarget] = useState<{ id: string; title: string; orders: number } | null>(null);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchEvents = async () => {
    try {
      setEvents(await apiFetch('/events/admin/all'));
    } catch (e) {
      console.error(e);
      setNotice({ tone: 'error', text: 'No se pudieron cargar los eventos. Recarga la página.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const toggleVisibility = async (event: any) => {
    const hide = event.status === 'PUBLISHED';
    setTogglingId(event.id);
    setNotice(null);
    try {
      const res = await apiFetch<{ id: string; status: string }>(`/events/${event.id}/visibility`, { method: 'PATCH', body: { hidden: hide } });
      setEvents((list) => list.map((e) => (e.id === event.id ? { ...e, status: res.status } : e)));
      setNotice({
        tone: 'ok',
        text: hide ? `«${event.title}» quedó oculto: ya no se ve ni se puede comprar.` : `«${event.title}» vuelve a estar visible y a la venta.`,
      });
    } catch (e) {
      setNotice({ tone: 'error', text: e instanceof ApiError ? e.message : 'No se pudo cambiar la visibilidad.' });
    } finally {
      setTogglingId(null);
    }
  };

  const openDelete = (event: any) => {
    setTarget({ id: event.id, title: event.title, orders: event._count?.orders || 0 });
    setImpact(null);
    setTyped('');
    setDeleteError('');
  };

  const closeDelete = () => {
    if (deleting) return;
    setTarget(null);
    setImpact(null);
    setTyped('');
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const path = impact ? withQuery(`/events/${target.id}`, { force: 'true', confirm: target.title }) : `/events/${target.id}`;
      await apiFetch(path, { method: 'DELETE' });
      setEvents((list) => list.filter((e) => e.id !== target.id));
      setNotice({ tone: 'ok', text: `«${target.title}» se borró${impact ? ' junto con sus órdenes' : ''}.` });
      setTarget(null);
      setImpact(null);
      setTyped('');
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.data?.code === 'EVENT_HAS_ORDERS' && e.data?.impact) {
        // No se borró nada: ahora se muestra qué se perdería y se pide escribir el nombre.
        setImpact(e.data.impact as DeleteImpact);
      } else {
        setDeleteError(e instanceof ApiError ? e.message : 'Error de conexión. Intenta de nuevo.');
      }
    } finally {
      setDeleting(false);
    }
  };

  const lines = impact ? impactLines(impact) : [];
  const warnings = impact ? impactWarnings(impact) : [];

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">
              Gestión de Eventos
            </h1>
            <p className="text-zinc-500 mt-2 uppercase tracking-widest text-xs font-bold">
              Edita, oculta, borra y visualiza el rendimiento general de los Raves.
            </p>
          </div>
          <Link href="/admin/events/new" className="w-full md:w-auto justify-center bg-neon-green text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(57,255,20,0.5)] hover:bg-white flex items-center gap-2 transition-all shrink-0">
            <Plus className="w-4 h-4" /> Lanzar Nuevo Evento
          </Link>
        </header>

        {notice && (
          <div
            role="status"
            className={`mb-6 p-3 rounded-xl border flex items-start gap-2 text-xs font-bold ${
              notice.tone === 'ok' ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <span className="flex-1">{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Cerrar aviso" className="shrink-0 opacity-70 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-20">
            <Loader2 className="w-10 h-10 text-neon-purple animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="glass-panel p-16 text-center border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center">
            <Calendar className="w-16 h-16 text-zinc-700 mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest">No hay eventos registrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const visible = event.status === 'PUBLISHED';
              return (
                <div key={event.id} className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 group hover:border-zinc-600 transition-colors bg-black flex flex-col">
                  <div className="h-48 relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                    {event.flyer_url && (
                      <img src={event.flyer_url} alt="" className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${visible ? 'opacity-80' : 'opacity-40 grayscale'}`} />
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-lg ${visible ? 'bg-neon-green text-black' : 'bg-red-500 text-white'}`}>
                        {visible ? 'Visible' : 'Oculto'}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="font-black uppercase tracking-widest text-white text-lg leading-tight mb-2 truncate" title={event.title}>{event.title}</h3>
                    <div className="space-y-1.5 mb-4 w-full min-w-0">
                      <div className="flex items-center gap-2 text-xs text-zinc-400 w-full min-w-0">
                        <Calendar className="shrink-0 w-3.5 h-3.5 text-zinc-500" />
                        <span className="truncate">{new Date(event.date).toLocaleDateString()} {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-400 w-full min-w-0">
                        <MapPin className="shrink-0 w-3.5 h-3.5 text-zinc-500" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-zinc-800/50 space-y-3">
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate w-full sm:w-auto text-center sm:text-left">
                          <span className="text-neon-purple">{event._count?.orders || 0}</span> Órdenes
                        </div>
                        <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
                          <button onClick={() => window.open(`/events/${event.seo_slug || event.id}`, '_blank')} className="p-2 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Ver en Pista" aria-label="Ver en Pista">
                            <Eye className="w-4 h-4" />
                          </button>
                          <Link href={`/admin/events/edit/${event.id}`} className="p-2 bg-blue-900/20 text-blue-400 rounded-lg hover:bg-blue-900/40 hover:text-blue-300 transition-colors" title="Editar Información" aria-label="Editar Información">
                            <Edit2 className="w-4 h-4" />
                          </Link>
                          <button onClick={() => openDelete(event)} className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 hover:text-red-400 transition-colors" title="Borrar Evento" aria-label="Borrar Evento">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleVisibility(event)}
                        disabled={togglingId === event.id}
                        className={`w-full h-10 rounded-lg border text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:opacity-50 ${
                          visible
                            ? 'border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-500'
                            : 'border-neon-green/40 bg-neon-green/10 text-neon-green hover:bg-neon-green/20'
                        }`}
                      >
                        {togglingId === event.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : visible ? (
                          <>
                            <EyeOff className="w-4 h-4" /> Ocultar evento
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4" /> Mostrar evento
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          open={!!target}
          title={impact ? 'Borrar evento y sus órdenes' : '¿Borrar evento?'}
          tone="danger"
          confirmLabel={impact ? 'Borrar todo' : target && target.orders > 0 ? 'Ver qué se pierde' : 'Sí, borrar'}
          busy={deleting}
          confirmDisabled={!!impact && !!target && !titleMatches(typed, target.title)}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={closeDelete}
        >
          {target && !impact && (
            <>
              <p>
                Vas a borrar <span className="text-white">«{target.title}»</span> y sus tipos de entrada.
              </p>
              {target.orders > 0 ? (
                <p className="text-zinc-400 text-xs">
                  Tiene {target.orders === 1 ? '1 orden' : `${target.orders} órdenes`}. Antes de borrar nada te muestro exactamente qué se perdería.
                </p>
              ) : (
                <p className="text-zinc-400 text-xs">No tiene órdenes. Esta acción no se puede deshacer.</p>
              )}
              <p className="text-zinc-400 text-xs flex items-start gap-1.5">
                <EyeOff className="w-3.5 h-3.5 shrink-0 mt-0.5" /> Si solo quieres que no se vea ni se pueda comprar, cancela y usa «Ocultar evento».
              </p>
            </>
          )}
          {target && impact && (
            <>
              <p>
                Se borrará <span className="text-white">«{target.title}»</span> y todo lo suyo, para siempre:
              </p>
              <ul className="list-disc pl-5 text-xs text-zinc-300 space-y-1">
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {warnings.map((w) => (
                <p key={w} className="text-xs text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                </p>
              ))}
              <label className="block pt-2 text-xs text-zinc-400">
                Para confirmar, escribe el nombre del evento: <span className="text-white">{target.title}</span>
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  className="mt-2 w-full h-11 rounded-xl bg-black border border-zinc-700 px-3 text-sm text-white outline-none focus:border-red-500"
                  placeholder="Escribe el nombre exacto"
                />
              </label>
            </>
          )}
        </ConfirmDialog>
      </div>
    </AdminGuard>
  );
}
