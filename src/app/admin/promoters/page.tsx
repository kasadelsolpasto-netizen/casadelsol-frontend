"use client";
import { useState, useEffect } from 'react';
import { Plus, CheckCircle2, XCircle, Ticket, Activity, Percent, Pencil, Trash2, X, Save, AlertTriangle, ChevronDown, ChevronUp, Trophy, MousePointerClick, ShoppingCart, TrendingUp } from 'lucide-react';

interface PromoterCode {
  id: string;
  code: string;
  promoter_id: string;
  event_id: string | null;
  discount_perc: number;
  uses_count: number;
  clicks_count: number;
  is_active: boolean;
  created_at: string;
  promoter: { name: string; email: string };
  event?: { title: string };
}

export default function PromotersAdminPage() {
  const [codes, setCodes] = useState<PromoterCode[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  // Formulario crear
  const [formData, setFormData] = useState({
    code: '', promoter_email: '', discount_perc: 0, event_id: '',
  });

  // Edición inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ code: '', discount_perc: 0, event_id: '' });
  const [editLoading, setEditLoading] = useState(false);

  // Confirmación borrado
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);


  // Stats por evento
  const [statsByEvent, setStatsByEvent] = useState<any[]>([]);
  const [openEventId, setOpenEventId] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  const getToken = () => document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='))?.split('=')[1] || null;
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) return;
      const [resCodes, resEvents, resStats] = await Promise.all([
        fetch(`${API}/promoters`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/events/admin/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/promoters/stats-by-event`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setCodes(await resCodes.json());
      setEvents((await resEvents.json()) || []);
      setStatsByEvent(await resStats.json());
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const res = await fetch(`${API}/promoters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          code: formData.code,
          promoter_email: formData.promoter_email.trim(),
          discount_perc: Number(formData.discount_perc),
          event_id: formData.event_id || undefined,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Error al crear código');
      }
      setFormData({ code: '', promoter_email: '', discount_perc: 0, event_id: '' });
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    const token = getToken();
    await fetch(`${API}/promoters/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_active: !currentStatus })
    });
    fetchData();
  };

  const startEdit = (c: PromoterCode) => {
    setEditingId(c.id);
    setEditData({ code: c.code, discount_perc: c.discount_perc, event_id: c.event_id || '' });
    setDeleteConfirmId(null);
  };

  const handleUpdate = async (id: string) => {
    setEditLoading(true);
    try {
      const res = await fetch(`${API}/promoters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          code: editData.code,
          discount_perc: Number(editData.discount_perc),
          event_id: editData.event_id || null,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Error al actualizar');
      }
      setEditingId(null);
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`${API}/promoters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Error al eliminar');
      setDeleteConfirmId(null);
      fetchData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="p-8 pb-24 text-white max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-4xl font-black tracking-tighter uppercase mb-2 flex items-center gap-3">
          <Activity className="w-10 h-10 text-neon-purple" />
          Sistema de <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">Promotores</span>
        </h1>
        <p className="text-zinc-400">Gestiona códigos de afiliados y rastrea ventas.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Formulario Crear */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 blur-[80px] pointer-events-none" />
            <h2 className="text-xl font-bold mb-6 border-b border-zinc-800 pb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-purple" /> Nuevo Código
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Usuario (Promotor)</label>
                <input required type="email" placeholder="ejemplo@correo.com"
                  value={formData.promoter_email}
                  onChange={e => setFormData({ ...formData, promoter_email: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:border-neon-purple outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Código Personalizado</label>
                <input required type="text" placeholder="EJ: JUANVIP24"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:border-neon-purple outline-none font-mono uppercase" />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descuento (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input type="number" min="0" max="100"
                    value={formData.discount_perc}
                    onChange={e => setFormData({ ...formData, discount_perc: Number(e.target.value) })}
                    className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:border-neon-purple outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Evento Específico (Opcional)</label>
                <select value={formData.event_id}
                  onChange={e => setFormData({ ...formData, event_id: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:border-neon-purple outline-none">
                  <option value="">-- Todos los Eventos --</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.title} - {new Date(e.date).toLocaleDateString('es-CO')}</option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Sin evento = aplica en cualquier compra.</p>
              </div>
              <button type="submit" disabled={formLoading}
                className="w-full mt-4 bg-neon-purple text-white font-bold tracking-widest uppercase py-4 rounded-lg hover:bg-neon-purple/80 transition-all flex justify-center items-center gap-2 disabled:opacity-50">
                {formLoading ? 'Procesando...' : 'Crear Promotor'}
              </button>
            </form>
          </div>
        </div>

        {/* Tabla */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-800 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-neon-green" />
              <h2 className="text-xl font-bold">Listado de Códigos</h2>
              <span className="ml-auto text-xs text-zinc-500 font-bold">{codes.length} código{codes.length !== 1 ? 's' : ''}</span>
            </div>

            {loading ? (
              <div className="p-6 space-y-3 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-zinc-800/50 rounded-lg" />)}
              </div>
            ) : codes.length === 0 ? (
              <div className="text-center py-16 text-zinc-500 text-sm font-bold uppercase tracking-widest">
                No hay códigos creados aún.
              </div>
            ) : (
              <div className="divide-y divide-zinc-800/60">
                {codes.map(c => {
                  const isEditing = editingId === c.id;
                  const isPendingDelete = deleteConfirmId === c.id;

                  return (
                    <div key={c.id} className={`transition-colors ${isPendingDelete ? 'bg-red-500/5' : isEditing ? 'bg-neon-purple/5' : 'hover:bg-zinc-800/20'}`}>

                      {/* Fila principal */}
                      <div className="flex items-center gap-3 px-5 py-4 flex-wrap">
                        {/* Código */}
                        <div className="flex-1 min-w-[120px]">
                          {isEditing ? (
                            <input
                              value={editData.code}
                              onChange={e => setEditData({ ...editData, code: e.target.value.toUpperCase() })}
                              className="bg-black border border-neon-purple/50 rounded-lg px-3 py-1.5 text-sm font-mono uppercase text-neon-green w-full outline-none"
                            />
                          ) : (
                            <span className="font-mono font-bold text-neon-green text-sm">{c.code}</span>
                          )}
                        </div>

                        {/* Promotor */}
                        <div className="flex-1 min-w-[120px]">
                          <div className="font-bold text-sm truncate">{c.promoter?.name}</div>
                          <div className="text-xs text-zinc-500 truncate">{c.promoter?.email}</div>
                        </div>

                        {/* Descuento */}
                        <div className="w-20">
                          {isEditing ? (
                            <div className="relative">
                              <input type="number" min="0" max="100"
                                value={editData.discount_perc}
                                onChange={e => setEditData({ ...editData, discount_perc: Number(e.target.value) })}
                                className="bg-black border border-neon-purple/50 rounded-lg px-2 py-1.5 text-sm w-full outline-none pr-5"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
                            </div>
                          ) : (
                            c.discount_perc > 0
                              ? <span className="bg-neon-purple/20 text-neon-purple px-2 py-1 rounded text-xs font-bold">{c.discount_perc}% OFF</span>
                              : <span className="text-zinc-600 text-xs">Sin descuento</span>
                          )}
                        </div>

                        {/* Stats */}
                        <div className="text-center w-12">
                          <div className="text-zinc-400 font-bold text-lg">{c.clicks_count || 0}</div>
                          <div className="text-[9px] text-zinc-600 uppercase tracking-widest">visitas</div>
                        </div>
                        <div className="text-center w-12">
                          <div className="text-neon-green font-bold text-lg">{c.uses_count}</div>
                          <div className="text-[9px] text-zinc-600 uppercase tracking-widest">ventas</div>
                        </div>

                        {/* Toggle activo */}
                        <button onClick={() => toggleActive(c.id, c.is_active)}
                          className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full transition-colors shrink-0 ${c.is_active ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}>
                          {c.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {c.is_active ? 'ACTIVO' : 'INACTIVO'}
                        </button>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 shrink-0">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleUpdate(c.id)} disabled={editLoading}
                                className="p-2 bg-neon-green/20 text-neon-green hover:bg-neon-green/30 rounded-lg transition-colors disabled:opacity-50" title="Guardar">
                                <Save className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)}
                                className="p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors" title="Cancelar">
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              {/* Copiar link */}
                              <button onClick={() => {
                                const link = c.event_id
                                  ? `https://kasadelsol.co/events/${c.event_id}?promo=${c.code}`
                                  : `https://kasadelsol.co/?promo=${c.code}`;
                                navigator.clipboard.writeText(link);
                                alert('¡Enlace copiado!');
                              }} className="text-[10px] font-bold uppercase tracking-widest bg-zinc-800 hover:bg-neon-purple hover:text-white px-2.5 py-1.5 rounded-lg transition-colors text-zinc-300 whitespace-nowrap">
                                Link
                              </button>
                              {/* Editar */}
                              <button onClick={() => startEdit(c)}
                                className="p-2 text-zinc-500 hover:text-neon-purple hover:bg-neon-purple/10 rounded-lg transition-colors" title="Editar">
                                <Pencil className="w-4 h-4" />
                              </button>
                              {/* Borrar */}
                              <button onClick={() => { setDeleteConfirmId(c.id); setEditingId(null); }}
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Eliminar">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Panel edición de evento */}
                      {isEditing && (
                        <div className="px-5 pb-4 bg-neon-purple/5 border-t border-neon-purple/20">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 mt-3">Evento vinculado</label>
                          <select value={editData.event_id}
                            onChange={e => setEditData({ ...editData, event_id: e.target.value })}
                            className="w-full bg-black border border-neon-purple/30 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="">-- Todos los Eventos --</option>
                            {events.map(ev => (
                              <option key={ev.id} value={ev.id}>{ev.title} - {new Date(ev.date).toLocaleDateString('es-CO')}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Panel confirmación borrado */}
                      {isPendingDelete && (
                        <div className="px-5 py-3 bg-red-500/10 border-t border-red-500/20 flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                          <p className="text-red-300 text-xs font-bold flex-1">¿Eliminar el código <span className="font-mono text-red-200">{c.code}</span>? Esta acción no se puede deshacer.</p>
                          <button onClick={() => setDeleteConfirmId(null)}
                            className="text-xs font-bold text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest">
                            Cancelar
                          </button>
                          <button onClick={() => handleDelete(c.id)} disabled={deleteLoading}
                            className="text-xs font-bold text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-widest disabled:opacity-50">
                            {deleteLoading ? '...' : 'Eliminar'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ══════════ RANKING POR EVENTO ══════════════════════════════════ */}
      <section className="mt-14">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-7 h-7 text-yellow-400" />
          <h2 className="text-2xl font-black uppercase tracking-widest">Ranking por Evento</h2>
          <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest ml-2">
            {statsByEvent.length} grupo{statsByEvent.length !== 1 ? 's' : ''}
          </span>
        </div>

        {statsByEvent.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-xl font-bold uppercase tracking-widest text-sm">
            No hay datos de promotores aún.
          </div>
        ) : (
          <div className="space-y-3">
            {statsByEvent.map((group: any) => {
              const isOpen = openEventId === group.event.id;
              const topPromoter = group.promoters[0];
              const totalClicks = group.promoters.reduce((s: number, p: any) => s + p.clicks_count, 0);
              const totalSales = group.promoters.reduce((s: number, p: any) => s + p.uses_count, 0);

              return (
                <div key={group.event.id} className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  isOpen ? 'border-neon-purple/40 bg-neon-purple/5' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
                }`}>

                  {/* Header del evento — clickeable */}
                  <button
                    className="w-full flex items-center gap-4 p-4 text-left"
                    onClick={() => setOpenEventId(isOpen ? null : group.event.id)}
                  >
                    {/* Flyer thumbnail */}
                    {group.event.flyer_url ? (
                      <img src={group.event.flyer_url} alt={group.event.title}
                        className="w-12 h-12 rounded-lg object-cover shrink-0 opacity-80" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <Ticket className="w-5 h-5 text-zinc-600" />
                      </div>
                    )}

                    {/* Info evento */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate">{group.event.title}</p>
                      <p className="text-xs text-zinc-500">
                        {group.event.date ? new Date(group.event.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Global'}
                        {' · '}{group.promoters.length} promotor{group.promoters.length !== 1 ? 'es' : ''}
                      </p>
                    </div>

                    {/* Resumen rápido */}
                    <div className="hidden sm:flex items-center gap-4 shrink-0">
                      <div className="text-center">
                        <p className="font-black text-zinc-300 text-lg">{totalClicks}</p>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">visitas</p>
                      </div>
                      <div className="text-center">
                        <p className="font-black text-neon-green text-lg">{totalSales}</p>
                        <p className="text-[9px] text-zinc-500 uppercase tracking-widest">ventas</p>
                      </div>
                      {topPromoter && (
                        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-3 py-1.5">
                          <p className="text-[10px] text-yellow-400 font-black uppercase tracking-widest">🥇 {topPromoter.promoter_name || topPromoter.code}</p>
                          <p className="text-[10px] text-zinc-400">{topPromoter.uses_count} venta{topPromoter.uses_count !== 1 ? 's' : ''}</p>
                        </div>
                      )}
                    </div>

                    {isOpen
                      ? <ChevronUp className="w-5 h-5 text-neon-purple shrink-0" />
                      : <ChevronDown className="w-5 h-5 text-zinc-500 shrink-0" />}
                  </button>

                  {/* Tabla de ranking (expandible) */}
                  {isOpen && (
                    <div className="border-t border-zinc-800/60">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-widest text-zinc-500">
                            <th className="py-2.5 px-5 font-bold">#</th>
                            <th className="py-2.5 px-4 font-bold">Promotor / Código</th>
                            <th className="py-2.5 px-4 font-bold text-center">
                              <div className="flex items-center justify-center gap-1">
                                <MousePointerClick className="w-3 h-3" /> Visitas
                              </div>
                            </th>
                            <th className="py-2.5 px-4 font-bold text-center">
                              <div className="flex items-center justify-center gap-1">
                                <ShoppingCart className="w-3 h-3" /> Ventas
                              </div>
                            </th>
                            <th className="py-2.5 px-4 font-bold text-center">
                              <div className="flex items-center justify-center gap-1">
                                <TrendingUp className="w-3 h-3" /> Conversión
                              </div>
                            </th>
                            <th className="py-2.5 px-4 font-bold">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.promoters.map((p: any, idx: number) => (
                            <tr key={p.id} className={`border-b border-zinc-800/40 transition-colors ${
                              idx === 0 ? 'bg-yellow-400/5' : 'hover:bg-zinc-800/20'
                            }`}>
                              {/* Posición */}
                              <td className="py-3 px-5">
                                <span className={`font-black text-lg ${
                                  idx === 0 ? 'text-yellow-400' :
                                  idx === 1 ? 'text-zinc-300' :
                                  idx === 2 ? 'text-amber-700' : 'text-zinc-600'
                                }`}>
                                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                                </span>
                              </td>
                              {/* Promotor */}
                              <td className="py-3 px-4">
                                <p className="font-bold text-sm text-white">{p.promoter_name || '—'}</p>
                                <p className="text-[11px] text-zinc-500">{p.promoter_email}</p>
                                <p className="font-mono text-[10px] text-neon-green mt-0.5">{p.code}</p>
                              </td>
                              {/* Visitas */}
                              <td className="py-3 px-4 text-center">
                                <span className="font-black text-zinc-300 text-base">{p.clicks_count}</span>
                              </td>
                              {/* Ventas */}
                              <td className="py-3 px-4 text-center">
                                <span className={`font-black text-base ${
                                  p.uses_count > 0 ? 'text-neon-green' : 'text-zinc-600'
                                }`}>{p.uses_count}</span>
                              </td>
                              {/* Conversión */}
                              <td className="py-3 px-4 text-center">
                                <span className={`text-xs font-black px-2 py-1 rounded-full ${
                                  p.conversion >= 20 ? 'bg-neon-green/20 text-neon-green' :
                                  p.conversion >= 5 ? 'bg-yellow-400/20 text-yellow-400' :
                                  'bg-zinc-800 text-zinc-500'
                                }`}>{p.conversion}%</span>
                              </td>
                              {/* Estado */}
                              <td className="py-3 px-4">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                  p.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                }`}>
                                  {p.is_active ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

    </div>
  );
}
