"use client";
import { useEffect, useState, useCallback } from 'react';
import { 
  Users, Star, Search, Loader2, Save, X, 
  ShieldAlert, ChevronLeft, ChevronRight, 
  Calendar, Mail, History, ExternalLink,
  ChevronDown,
  ArrowRight,
  Tag,
  Plus,
  Ticket,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Gift,
  Zap,
  TicketPercent
} from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

const PREDEFINED_TAGS = [
  'VIBE_MAKER', 'KASA_FAMILY', 'EARLY_BIRD', 
  'WHALE', 'RAVER_VIP', 'CONFLICTIVO', 
  'SITUACION_MEDICA', 'COLADO', 'EVANGELISTA', 'PHOTO_READY'
];

const PROMO_TYPES = [
  { value: 'DISCOUNT', label: 'Descuento %', icon: TicketPercent },
  { value: 'GIFT', label: 'Regalo / Cortesía', icon: Gift },
  { value: 'ACCESS', label: 'Acceso Especial', icon: Zap },
];

export default function CommunityDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'promotions'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Promotions Form State
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [newPromo, setNewPromo] = useState({
    title: '',
    description: '',
    type: 'DISCOUNT',
    value: 0,
    required_tags: [] as string[]
  });

  // User Edit State
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  // --- API CALLS ---

  const fetchUsers = useCallback(async () => {
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
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, debouncedSearch]);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/promotions/admin/all`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setPromotions(await res.json());
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else fetchPromotions();
  }, [activeTab, fetchUsers]);

  // Handle search debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // --- PROMOTION ACTIONS ---

  const handleCreatePromo = async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/promotions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify(newPromo)
      });
      if (res.ok) {
        setShowPromoForm(false);
        fetchPromotions();
        setNewPromo({ title: '', description: '', type: 'DISCOUNT', value: 0, required_tags: [] });
      }
    } catch (err) { console.error(err); }
  };

  const togglePromoStatus = async (id: string, current: boolean) => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${API}/promotions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({ is_active: !current })
      });
      fetchPromotions();
    } catch (err) { console.error(err); }
  };

  const deletePromo = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta promoción?')) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${API}/promotions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      fetchPromotions();
    } catch (err) { console.error(err); }
  };

  // --- USER ACTIONS ---

  const handleOpenDrawer = (user: any) => {
    setSelectedUser(user);
    setEditRating(user.rating || 0);
    setEditComment(user.rating_comment || '');
    setEditTags(user.tags || []);
    setIsDrawerOpen(true);
  };

  const handleUpdateUserData = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/users/${selectedUser.id}/internal-data`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}` 
        },
        body: JSON.stringify({
          rating: editRating,
          comment: editComment,
          tags: editTags
        })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, rating: editRating, rating_comment: editComment, tags: editTags } : u));
        setIsDrawerOpen(false);
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
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
              <h1 className="text-2xl font-black uppercase tracking-widest text-white">Comunidad</h1>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Gestión de Ravers y Beneficios</p>
            </div>
          </div>

          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 self-stretch md:self-auto">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              Ravers
            </button>
            <button 
              onClick={() => setActiveTab('promotions')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'promotions' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
            >
              <TicketPercent className="w-4 h-4" />
              Promociones
            </button>
          </div>
        </header>

        {activeTab === 'users' ? (
          <>
            <div className="relative w-full mb-8 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-neon-green transition-colors" />
              <input 
                type="text" 
                placeholder="Buscar Raver por nombre o correo..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-neon-green/50 transition-all"
              />
            </div>

            {loading ? (
              <div className="py-20 flex justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-neon-green" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden md:grid grid-cols-[1fr_1fr_1fr_120px_120px] gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-900">
                  <div>Raver / Identidad</div>
                  <div>Contacto</div>
                  <div>Último Evento</div>
                  <div className="text-center">Nivel</div>
                  <div className="text-right">Perfil</div>
                </div>

                {users.map(user => (
                  <div key={user.id} className="group bg-black/40 border border-zinc-900 rounded-xl p-4 md:px-6 hover:border-zinc-700 hover:bg-zinc-900/20 transition-all flex flex-col md:grid md:grid-cols-[1fr_1fr_1fr_120px_120px] items-center gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 font-black text-xs uppercase">{user.name.charAt(0)}</div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                          {user.tags?.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-neon-green" title={user.tags.join(', ')} />}
                        </div>
                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-zinc-500 text-xs w-full md:w-auto">{user.email}</div>
                    <div className="text-xs font-bold text-zinc-400 w-full md:w-auto truncate">
                      {user.last_event?.title || 'Nuevo Recluta'}
                    </div>
                    <div className="flex justify-center gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${user.rating >= s ? 'text-orange-400 fill-orange-400' : 'text-zinc-800'}`} />)}
                    </div>
                    <div className="text-right w-full md:w-auto">
                      <button onClick={() => handleOpenDrawer(user)} className="w-full md:w-auto px-4 py-2 bg-zinc-900 hover:bg-white hover:text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Ver Ficha</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && meta.last_page > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2 border border-zinc-800 rounded-lg disabled:opacity-30"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-xs font-black text-white uppercase tracking-widest">{page} / {meta.last_page}</span>
                <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)} className="p-2 border border-zinc-800 rounded-lg disabled:opacity-30"><ChevronRight className="w-5 h-5" /></button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
               <h2 className="text-xl font-black uppercase tracking-[0.2em] text-white">Gestión de Beneficios</h2>
               <button 
                 onClick={() => setShowPromoForm(!showPromoForm)}
                 className="flex items-center gap-2 bg-neon-green text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all"
               >
                 <Plus className="w-4 h-4" /> Nueva Promoción
               </button>
            </div>

            {showPromoForm && (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Título de la Promo</label>
                    <input 
                      type="text" 
                      placeholder="Ej: 20% OFF para Ravers Fieles"
                      value={newPromo.title}
                      onChange={e => setNewPromo({...newPromo, title: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neon-green transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo de Beneficio</label>
                    <select 
                      value={newPromo.type}
                      onChange={e => setNewPromo({...newPromo, type: e.target.value})}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neon-green"
                    >
                      {PROMO_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Descripción Pública</label>
                  <textarea 
                    placeholder="Lo que verá el Raver en su perfil..."
                    value={newPromo.description}
                    onChange={e => setNewPromo({...newPromo, description: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neon-green h-24 resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Segmentos Requeridos (Tags)</label>
                  <div className="flex flex-wrap gap-2">
                    {PREDEFINED_TAGS.map(tag => (
                      <button 
                        key={tag}
                        onClick={() => {
                          const current = newPromo.required_tags;
                          setNewPromo({...newPromo, required_tags: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border transition-all ${newPromo.required_tags.includes(tag) ? 'bg-neon-green text-black border-neon-green' : 'bg-black border-zinc-800 text-zinc-600'}`}
                      >
                        {tag.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">* Solo los Ravers que tengan TODOS estos tags podrán ver este beneficio.</p>
                </div>

                <div className="flex gap-4 pt-4 border-t border-zinc-800">
                  <button onClick={handleCreatePromo} className="flex-1 bg-white text-black py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-neon-green transition-all">Crear Beneficio</button>
                  <button onClick={() => setShowPromoForm(false)} className="px-6 border border-zinc-800 text-zinc-500 rounded-xl text-xs font-black uppercase">Cancelar</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-neon-green" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {promotions.map(promo => {
                  const Icon = PROMO_TYPES.find(t => t.value === promo.type)?.icon || Gift;
                  return (
                    <div key={promo.id} className={`p-6 border rounded-3xl transition-all relative overflow-hidden group ${promo.is_active ? 'bg-zinc-900 border-zinc-800' : 'bg-black border-zinc-900 opacity-50'}`}>
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-3">
                           <div className={`p-3 rounded-2xl ${promo.is_active ? 'bg-neon-green/10 text-neon-green' : 'bg-zinc-800 text-zinc-600'}`}>
                              <Icon className="w-5 h-5" />
                           </div>
                           <div>
                              <h3 className="font-black text-white uppercase tracking-wider">{promo.title}</h3>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{promo.type}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => togglePromoStatus(promo.id, promo.is_active)} title={promo.is_active ? 'Desactivar' : 'Activar'}>
                              {promo.is_active ? <ToggleRight className="w-8 h-8 text-neon-green" /> : <ToggleLeft className="w-8 h-8 text-zinc-700" />}
                           </button>
                           <button onClick={() => deletePromo(promo.id)} className="p-2 hover:bg-red-500/20 hover:text-red-500 text-zinc-700 transition-colors">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </div>

                      <p className="text-zinc-400 text-sm mt-4 line-clamp-2">{promo.description}</p>

                      <div className="mt-6 flex flex-wrap gap-1.5">
                        {promo.required_tags.map((tag: string) => (
                          <span key={tag} className="px-2 py-0.5 bg-zinc-800 text-[8px] font-black text-white uppercase rounded border border-white/5">
                            {tag}
                          </span>
                        ))}
                        {promo.required_tags.length === 0 && <span className="text-[8px] font-black text-zinc-600 uppercase">Público General</span>}
                      </div>

                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-neon-purple/5 blur-3xl rounded-full group-hover:bg-neon-green/5 transition-colors"></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROFILE DRAWER (Ficha) */}
        {selectedUser && (
          <>
            <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsDrawerOpen(false)} />
            <div className={`fixed right-0 top-0 h-screen w-full md:w-[500px] bg-zinc-950 border-l border-zinc-800 z-[101] shadow-2xl transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto overflow-x-hidden`}>
              <div className="p-8 pb-32">
                <div className="flex justify-between items-start mb-10">
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center text-3xl font-black text-white">{selectedUser.name.charAt(0)}</div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight leading-none mb-2">{selectedUser.name}</h2>
                      <span className="px-3 py-1 bg-neon-purple/20 text-neon-purple text-[10px] font-black rounded-full uppercase border border-neon-purple/10">{selectedUser.role} / Nivel {selectedUser.rating || 0}</span>
                    </div>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors"><X className="w-6 h-6 text-zinc-500" /></button>
                </div>

                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-zinc-400 group cursor-default">
                      <Mail className="w-4 h-4 text-zinc-600 group-hover:text-neon-purple transition-colors" />
                      <span className="text-sm font-bold">{selectedUser.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-400">
                      <Calendar className="w-4 h-4 text-zinc-600" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Registrado: {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-neon-green flex items-center gap-2"><Tag className="w-4 h-4" /> Clasificación Hiper-Segmentada</h4>
                     <div className="flex flex-wrap gap-2">
                        {PREDEFINED_TAGS.map(tag => {
                          const isSelected = editTags.includes(tag);
                          return (
                            <button key={tag} onClick={() => setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${isSelected ? 'bg-neon-green text-black border-neon-green shadow-[0_0_10px_rgba(57,255,20,0.3)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}>
                              {tag.replace('_', ' ')}
                            </button>
                          );
                        })}
                     </div>
                  </div>

                  <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Comportamiento</h4>
                    <div className="flex gap-2">
                       {[1,2,3,4,5].map(s => <button key={s} onClick={() => setEditRating(s)} className={`transition-all ${editRating >= s ? 'text-orange-400 scale-125' : 'text-zinc-800 hover:text-orange-950'}`}><Star className="w-8 h-8" fill={editRating >= s ? 'currentColor' : 'none'} /></button>)}
                    </div>
                    <textarea value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="Notas internas..." className="w-full bg-black/60 border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-orange-400/50 transition-all h-32 resize-none" />
                  </div>

                  <div className="space-y-4">
                     <h4 className="text-[10px] font-black uppercase text-zinc-500 flex items-center gap-2"><History className="w-4 h-4" /> Línea de Tiempo</h4>
                     <div className="space-y-3">
                        {selectedUser.attendance_history?.length > 0 ? selectedUser.attendance_history.map((h: any, i: number) => (
                          <div key={`${h.id}-${i}`} className="flex items-start gap-4 p-4 bg-zinc-900/10 border border-zinc-900 rounded-xl">
                             <div className="mt-1 w-2 h-2 rounded-full bg-neon-green" />
                             <div className="flex-1">
                                <h5 className="text-sm font-bold text-white uppercase">{h.title}</h5>
                                <div className="flex justify-between items-center mt-1">
                                  <span className="text-[10px] text-zinc-600 font-bold uppercase">{new Date(h.date).toLocaleDateString()}</span>
                                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-500">{h.type}</span>
                                </div>
                             </div>
                          </div>
                        )) : <div className="text-center py-10 border border-zinc-800 border-dashed rounded-2xl text-zinc-600 text-[10px] font-black uppercase">Sin avistamientos</div>}
                     </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 w-full p-6 bg-zinc-950 border-t border-zinc-900">
                <button onClick={handleUpdateUserData} disabled={isSaving} className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-neon-green transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isSaving ? 'Sincronizando...' : 'Guardar Ficha'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
