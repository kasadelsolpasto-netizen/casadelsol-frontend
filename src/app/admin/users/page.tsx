"use client";
import { useEffect, useState, useCallback } from 'react';
import { 
  Users, Star, Search, Loader2, Save, X, 
  ShieldAlert, ChevronLeft, ChevronRight, 
  Calendar, Mail, History, ExternalLink,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // States for editing in drawer
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = new URL(`${API}/users/admin/all`);
      url.searchParams.append('page', page.toString());
      url.searchParams.append('limit', '15');
      if (debouncedSearch) url.searchParams.append('search', debouncedSearch);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const result = await res.json();
        setUsers(result.data);
        setMeta(result.meta);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  const handleOpenDrawer = (user: any) => {
    setSelectedUser(user);
    setEditRating(user.rating || 0);
    setEditComment(user.rating_comment || '');
    setIsDrawerOpen(true);
  };

  const handleUpdateRating = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/users/${selectedUser.id}/rating`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          rating: editRating,
          comment: editComment
        })
      });

      if (res.ok) {
        // Update local list
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, rating: editRating, rating_comment: editComment } : u));
        setIsDrawerOpen(false);
      } else {
        alert('Error al actualizar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-neon-green/10 border border-zinc-800 flex items-center justify-center">
              <Users className="w-6 h-6 text-neon-green" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white">
                Comunidad
              </h1>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">
                {meta.total} Ravers Identificados
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-neon-green transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1); // Reset to first page on search
              }}
              className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white text-sm placeholder:text-zinc-700 focus:border-neon-green/50 outline-none transition-all"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-6">
             <div className="relative">
                <div className="w-16 h-16 border-4 border-zinc-900 border-t-neon-green rounded-full animate-spin" />
                <Users className="w-6 h-6 text-neon-green absolute inset-0 m-auto animate-pulse" />
             </div>
             <p className="text-zinc-500 font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizando Base de Datos...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Table Header (Desktop Only) */}
            <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_120px_120px] gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-900">
              <div>Nombre / Identidad</div>
              <div>Contacto</div>
              <div>Última Fiesta Clave</div>
              <div className="text-center">Calidad</div>
              <div className="text-right">Acción</div>
            </div>

            {users.length === 0 ? (
               <div className="text-center py-20 bg-zinc-950/20 border border-zinc-900 border-dashed rounded-3xl">
                 <ShieldAlert className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                 <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs">Sin coincidencias en el radar</p>
               </div>
            ) : (
              users.map((user) => (
                <div 
                  key={user.id} 
                  className="group bg-black/40 border border-zinc-900 rounded-xl p-3 md:px-6 md:py-4 hover:border-zinc-700 hover:bg-zinc-900/20 transition-all flex flex-col md:grid md:grid-cols-[1fr_1fr_1fr_120px_120px] items-center gap-4"
                >
                  {/* Name */}
                  <div className="w-full md:w-auto flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-black text-xs uppercase group-hover:border-neon-purple transition-colors">
                      {user.name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                      <p className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">{user.role}</p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="w-full md:w-auto text-zinc-500 text-xs font-medium truncate">
                    {user.email}
                  </div>

                  {/* Last Event */}
                  <div className="w-full md:w-auto text-xs font-bold text-zinc-400">
                    {user.last_event ? (
                      <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-neon-purple" />
                        {user.last_event.title}
                        <span className="text-[9px] text-zinc-600 font-black">({new Date(user.last_event.date).toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })})</span>
                      </span>
                    ) : (
                      <span className="text-zinc-700 tracking-widest uppercase text-[9px]">Nuevo Recluta</span>
                    )}
                  </div>

                  {/* Stars */}
                  <div className="flex justify-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`w-3.5 h-3.5 ${user.rating >= s ? 'text-orange-400 fill-orange-400' : 'text-zinc-800'}`} 
                      />
                    ))}
                  </div>

                  {/* Action */}
                  <div className="w-full md:w-auto text-right">
                    <button 
                      onClick={() => handleOpenDrawer(user)}
                      className="w-full md:w-auto px-4 py-2 bg-zinc-900 hover:bg-white hover:text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                    >
                      Calificar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination */}
        {!loading && meta.last_page > 1 && (
          <div className="mt-10 flex items-center justify-center gap-4">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl disabled:opacity-30 hover:bg-zinc-800 transition-all"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <div className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-500">
               Nivel <span className="text-white text-base mx-1">{page}</span> / {meta.last_page}
            </div>
            <button 
              disabled={page === meta.last_page}
              onClick={() => setPage(p => p + 1)}
              className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl disabled:opacity-30 hover:bg-zinc-800 transition-all"
            >
              <ChevronRight className="w-5 h-5 text-white" />
            </button>
          </div>
        )}

        {/* PROFILE DRAWER (Ficha) */}
        {selectedUser && (
          <>
            {/* Backdrop */}
            <div 
              className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={() => setIsDrawerOpen(false)}
            />
            
            {/* Drawer Body */}
            <div className={`fixed right-0 top-0 h-screen w-full md:w-[450px] bg-zinc-950 border-l border-zinc-800 z-[101] shadow-2xl transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}>
              <div className="p-8">
                {/* Header */}
                <div className="flex justify-between items-start mb-10">
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center text-3xl font-black text-white">
                      {selectedUser.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">{selectedUser.name}</h2>
                      <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-[10px] font-black rounded-full uppercase tracking-tighter border border-neon-purple/10">
                        {selectedUser.role} / Nivel {selectedUser.rating || 0}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                    <X className="w-6 h-6 text-zinc-500" />
                  </button>
                </div>

                {/* Info Grid */}
                <div className="space-y-8">
                  {/* Basic Data */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm font-bold">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Calendar className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Registrado: {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Rating Section */}
                  <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Calificación de Comportamiento</h4>
                    <div className="flex gap-2">
                       {[1,2,3,4,5].map(s => (
                         <button 
                           key={s} 
                           onClick={() => setEditRating(s)}
                           className={`transition-all ${editRating >= s ? 'text-orange-400 scale-125' : 'text-zinc-800 hover:text-orange-950'}`}
                         >
                           <Star className="w-8 h-8" fill={editRating >= s ? 'currentColor' : 'none'} />
                         </button>
                       ))}
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-zinc-500 block">Comentarios Internos (Solo Administradores)</label>
                      <textarea 
                        value={editComment}
                        onChange={e => setEditComment(e.target.value)}
                        placeholder="Escribe notas sobre su conducta en los eventos..."
                        className="w-full bg-black/60 border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-orange-400/50 transition-all h-32 resize-none"
                      />
                    </div>
                    <button 
                      onClick={handleUpdateRating}
                      disabled={isSaving}
                      className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-orange-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      {isSaving ? 'Actualizando...' : 'Guardar Calificación'}
                    </button>
                  </div>

                  {/* Attendance History */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
                         <History className="w-4 h-4" /> Historial de Asistencia
                       </h4>
                       <span className="text-[9px] font-bold px-2 py-0.5 bg-zinc-900 rounded-full text-zinc-500">
                         {selectedUser.attendance_history?.length || 0} Fiestas
                       </span>
                    </div>

                    <div className="space-y-3">
                      {selectedUser.attendance_history?.length > 0 ? (
                        selectedUser.attendance_history.map((h: any, i: number) => (
                          <div key={`${h.id}-${i}`} className="flex items-start gap-4 p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl group hover:border-zinc-800 transition-all">
                             <div className="mt-1 w-2 h-2 rounded-full bg-neon-green group-hover:animate-ping" />
                             <div className="flex-1">
                                <h5 className="text-sm font-bold text-white uppercase">{h.title}</h5>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                                    {new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                  </span>
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${h.type === 'ONLINE' ? 'bg-blue-900/20 text-blue-400' : 'bg-green-900/20 text-green-400'}`}>
                                    {h.type}
                                  </span>
                                </div>
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-10 border border-zinc-800 border-dashed rounded-2xl text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                           Sin avistamientos previos
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
