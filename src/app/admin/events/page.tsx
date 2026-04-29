"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit2, Trash2, Calendar, MapPin, Eye, Settings, Loader2, AlertTriangle, X } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import { useRouter } from 'next/navigation';

export default function AdminEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  const fetchEvents = async () => {
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/admin/all`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) setEvents(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (res.ok) {
        setEvents(events.filter(e => e.id !== id));
      } else {
        const error = await res.json();
        alert(error.message || 'No se pudo eliminar el evento.');
      }
    } catch (e) {
      alert('Error de conexión');
    } finally {
      setDeleting(false);
      setDeleteModal(null);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">
              Gestión de Eventos
            </h1>
            <p className="text-zinc-500 mt-2 uppercase tracking-widest text-xs font-bold">
              Edita, borra y visualiza el rendimiento general de los Raves.
            </p>
          </div>
          <Link href="/admin/events/new" className="w-full md:w-auto justify-center bg-neon-green text-black px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(57,255,20,0.5)] hover:bg-white flex items-center gap-2 transition-all shrink-0">
            <Plus className="w-4 h-4" /> Lanzar Nuevo Evento
          </Link>
        </header>

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
            {events.map(event => (
              <div key={event.id} className="glass-panel rounded-2xl overflow-hidden border border-zinc-800 group hover:border-zinc-600 transition-colors bg-black flex flex-col">
                <div className="h-48 relative overflow-hidden bg-zinc-900 border-b border-zinc-800">
                  {event.flyer_url && (
                    <img src={event.flyer_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-widest shadow-lg ${event.status === 'PUBLISHED' ? 'bg-neon-green text-black' : 'bg-red-500 text-white'}`}>
                      {event.status === 'PUBLISHED' ? 'Visible' : 'Oculto'}
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
                  
                  <div className="mt-auto pt-4 border-t border-zinc-800/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate w-full sm:w-auto text-center sm:text-left">
                      <span className="text-neon-purple">{event._count?.orders || 0}</span> Órdenes
                    </div>
                    <div className="flex items-center justify-center sm:justify-end gap-2 shrink-0 w-full sm:w-auto">
                      <button onClick={() => window.open(`/events/${event.seo_slug || event.id}`, '_blank')} className="p-2 bg-zinc-900 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Ver en Pista">
                        <Eye className="w-4 h-4" />
                      </button>
                      <Link href={`/admin/events/edit/${event.id}`} className="p-2 bg-blue-900/20 text-blue-400 rounded-lg hover:bg-blue-900/40 hover:text-blue-300 transition-colors" title="Editar Información">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button onClick={() => setDeleteModal(event.id)} className="p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-900/40 hover:text-red-400 transition-colors" title="Borrar Evento">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de Borrado */}
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-red-900 p-8 rounded-2xl max-w-sm w-full animate-in fade-in zoom-in-95 shadow-[0_0_50px_rgba(220,38,38,0.1)]">
              <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center text-red-500 mb-6 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-center font-black uppercase tracking-widest text-white mb-2 text-lg">¿Borrar Evento?</h3>
              <p className="text-center text-xs text-zinc-400 mb-6 leading-relaxed">
                Si el evento ya tiene órdenes registradas, la base de datos abortará la acción para proteger la contabilidad.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteModal(null)}
                  disabled={deleting}
                  className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-zinc-400 bg-zinc-900 rounded-lg hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(deleteModal)}
                  disabled={deleting}
                  className="flex-1 py-3 text-xs font-black uppercase tracking-widest text-white bg-red-600 rounded-lg hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sí, Borrar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
