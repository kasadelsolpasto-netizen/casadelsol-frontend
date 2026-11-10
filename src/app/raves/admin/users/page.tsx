"use client";
import { useEffect, useState, useCallback, useRef } from 'react';
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
  TicketPercent,
  Filter,
  Info
} from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

/**
 * DICCIONARIO VISUAL DE CLASIFICACIONES
 * Define el significado y la estética de cada segmento.
 */
const TAG_INFO: Record<string, { label: string, desc: string, color: string, bg: string }> = {
  VIBE_MAKER: { 
    label: 'Vibe Maker', 
    desc: 'Gente que baila, tiene buena energía y suma positivamente al ambiente de la fiesta.',
    color: 'text-neon-green',
    bg: 'bg-neon-green/10'
  },
  KASA_FAMILY: { 
    label: 'Kasa Family', 
    desc: 'Colaboradores, amigos cercanos y aliados históricos de la casa.',
    color: 'text-neon-purple',
    bg: 'bg-neon-purple/10'
  },
  EARLY_BIRD: { 
    label: 'Early Bird', 
    desc: 'Cazadores de preventas. Siempre aseguran su lugar en la primera etapa.',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10'
  },
  WHALE: { 
    label: 'Whale', 
    desc: 'Clientes de alto impacto comercial (Mesas, botellas y alto consumo en barra).',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10'
  },
  RAVER_VIP: { 
    label: 'Raver VIP', 
    desc: 'Asistencia perfecta. Han estado en casi todos los eventos clave.',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10'
  },
  CONFLICTIVO: { 
    label: 'Conflictivo', 
    desc: 'Historial de problemas de conducta o peleas. Mantener bajo vigilancia.',
    color: 'text-red-500',
    bg: 'bg-red-500/10'
  },
  SITUACION_MEDICA: { 
    label: 'Alerta Médica', 
    desc: 'Historial de descompensaciones o reacciones. El equipo médico debe conocer su rostro.',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10'
  },
  COLADO: { 
    label: 'Colado', 
    desc: 'Intentos detectados de evasión de pago o uso de QRs falsos.',
    color: 'text-zinc-600',
    bg: 'bg-zinc-800'
  },
  EVANGELISTA: { 
    label: 'Evangelista', 
    desc: 'Promueven la Kasa en redes de forma orgánica. Su boca a boca es ley.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10'
  },
  PHOTO_READY: { 
    label: 'Photo Ready', 
    desc: 'Gente con estilo visual único. Ideales para el contenido de redes sociales.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10'
  }
};

const PROMO_TYPES = [
  { value: 'DISCOUNT', label: 'Descuento %', icon: TicketPercent },
  { value: 'GIFT', label: 'Regalo / Cortesía', icon: Gift },
  { value: 'ACCESS', label: 'Acceso Especial', icon: Zap },
];

// Componente Tooltip Premium
const TagPill = ({ tag, showDesc = true }: { tag: string, showDesc?: boolean }) => {
  const info = TAG_INFO[tag] || { label: tag, desc: 'Sin descripción', color: 'text-zinc-500', bg: 'bg-zinc-900' };
  return (
    <div className="group relative inline-block">
      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter border border-white/5 transition-all cursor-help ${info.bg} ${info.color} hover:brightness-125`}>
        {info.label}
      </span>
      {showDesc && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all z-50">
          <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${info.color}`}>{info.label}</p>
          <p className="text-[9px] text-zinc-400 leading-relaxed font-medium uppercase tracking-tighter">{info.desc}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-800" />
        </div>
      )}
    </div>
  );
};

export default function CommunityDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'promotions'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, last_page: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
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
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
      if (activeFilterTag) url.searchParams.append('tag', activeFilterTag);

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const result = await res.json();
        setUsers(result.data);
        setMeta(result.meta);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, [page, debouncedSearch, activeFilterTag]);

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
    setDeleteConfirm(false);
    setIsDrawerOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser || !deleteConfirm) { setDeleteConfirm(true); return; }
    setIsDeleting(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/users/admin/${selectedUser.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
        setIsDrawerOpen(false);
        setDeleteConfirm(false);
      }
    } catch (err) { console.error(err); } finally { setIsDeleting(false); }
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

          <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800 self-stretch md:self-auto shadow-inner">
            <button 
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              Ravers
            </button>
            <button 
              onClick={() => setActiveTab('promotions')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'promotions' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              <TicketPercent className="w-4 h-4" />
              Promociones
            </button>
          </div>
        </header>

        {activeTab === 'users' ? (
          <div className="space-y-6 animate-in fade-in duration-700">
            {/* SEARCH & FILTERS BAR */}
            <div className="flex flex-col gap-4">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-neon-green transition-colors" />
                <input 
                  type="text" 
                  placeholder="Buscar Raver por nombre o correo..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                  className="w-full bg-black/60 border border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-neon-green/50 transition-all font-medium"
                />
              </div>

              {/* Tag Filters (Group Selector) */}
              <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
                <div className="flex items-center gap-2 bg-zinc-900/30 px-3 py-1.5 rounded-xl border border-zinc-800 text-zinc-500 min-w-max">
                   <Filter className="w-3.5 h-3.5" />
                   <span className="text-[10px] font-black uppercase tracking-widest">Filtrar por Grupo:</span>
                </div>
                <button 
                  onClick={() => { setActiveFilterTag(null); setPage(1); }}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${!activeFilterTag ? 'bg-white text-black border-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                >
                  Todos
                </button>
                {Object.keys(TAG_INFO).map(tag => (
                  <button 
                    key={tag}
                    onClick={() => { setActiveFilterTag(tag === activeFilterTag ? null : tag); setPage(1); }}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all min-w-max ${activeFilterTag === tag ? 'bg-neon-green text-black border-neon-green shadow-[0_0_15px_rgba(57,255,20,0.2)]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-700'}`}
                  >
                    {TAG_INFO[tag].label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-neon-green" />
                <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Consultando Bóveda...</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="hidden lg:grid grid-cols-[1.5fr_1.5fr_1fr_2fr_auto] gap-4 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-600/50 border-b border-zinc-900/50">
                  <div>Raver / Identidad</div>
                  <div>Contacto</div>
                  <div>Último Evento</div>
                  <div>Clasificación (CRM)</div>
                  <div className="text-right">Acción</div>
                </div>

                {users.length === 0 ? (
                  <div className="py-20 text-center bg-zinc-950/20 border border-zinc-900 border-dashed rounded-3xl">
                     <ShieldAlert className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                     <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Ningún Raver coincide con tu búsqueda o filtros.</p>
                  </div>
                ) : users.map(user => (
                  <div key={user.id} className="group bg-black/40 border border-zinc-900/50 rounded-2xl p-4 lg:px-6 hover:border-zinc-700 hover:bg-zinc-900/10 transition-all flex flex-col lg:grid lg:grid-cols-[1.5fr_1.5fr_1fr_2fr_auto] lg:items-center gap-4">
                    <div className="flex items-center gap-4 w-full min-w-0">
                      <div className="shrink-0 w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-black text-xs uppercase group-hover:border-neon-purple/50 transition-colors">{user.name.charAt(0)}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white truncate">{user.name}</h3>
                          {user.tags?.length > 0 && <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_5px_#39FF14]" />}
                        </div>
                        <p className="text-[10px] font-black uppercase text-zinc-600 tracking-tighter truncate">{user.role}</p>
                      </div>
                    </div>
                    <div className="text-zinc-500 text-xs w-full min-w-0 truncate font-medium">{user.email}</div>
                    <div className="text-[10px] font-bold text-zinc-400 w-full min-w-0 truncate uppercase tracking-tighter">
                      {user.last_event?.title || 'Nuevo Recluta'}
                    </div>
                    <div className="w-full min-w-0 flex flex-wrap gap-1 items-center">
                       <div className="shrink-0 flex gap-0.5 mr-2 bg-zinc-900 p-1 rounded-lg">
                          {[1,2,3,4,5].map(s => <Star key={s} className={`w-3 h-3 ${user.rating >= s ? 'text-orange-400 fill-orange-400' : 'text-zinc-800'}`} />)}
                       </div>
                       {user.tags?.slice(0, 2).map((tag: string) => <TagPill key={tag} tag={tag} />)}
                       {user.tags?.length > 2 && <span className="shrink-0 text-[8px] font-black text-zinc-600">+{user.tags.length - 2}</span>}
                    </div>
                    <div className="text-right w-full lg:w-auto shrink-0">
                      <button onClick={() => handleOpenDrawer(user)} className="w-full lg:w-auto px-4 py-2 bg-zinc-900 hover:bg-white hover:text-black rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap">Ver Ficha</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && meta.last_page > 1 && (
              <div className="mt-10 flex items-center justify-center gap-4">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl disabled:opacity-30 hover:bg-zinc-800 transition-all"><ChevronLeft className="w-5 h-5 text-white" /></button>
                <div className="flex items-center bg-zinc-900 px-6 py-2 rounded-xl border border-zinc-800">
                   <span className="text-sm font-black text-white">{page}</span>
                   <span className="mx-2 text-zinc-600 font-bold">/</span>
                   <span className="text-sm font-black text-zinc-500">{meta.last_page}</span>
                </div>
                <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)} className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl disabled:opacity-30 hover:bg-zinc-800 transition-all"><ChevronRight className="w-5 h-5 text-white" /></button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center bg-zinc-950 p-6 rounded-3xl border border-zinc-900">
               <div>
                  <h2 className="text-xl font-black uppercase tracking-[0.1em] text-white">Central de Beneficios</h2>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Configuración del Motor de Promoción</p>
               </div>
               <button 
                 onClick={() => setShowPromoForm(!showPromoForm)}
                 className="flex items-center gap-2 bg-neon-green text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] transition-all"
               >
                 <Plus className="w-4 h-4" /> Nueva Regla
               </button>
            </div>

            {showPromoForm && (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl space-y-6 shadow-2xl">
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
                    <div className="grid grid-cols-3 gap-2">
                      {PROMO_TYPES.map(t => (
                        <button 
                          key={t.value} 
                          onClick={() => setNewPromo({...newPromo, type: t.value})}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${newPromo.type === t.value ? 'bg-neon-purple/20 border-neon-purple text-white' : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-600'}`}
                        >
                          <t.icon className="w-5 h-5" />
                          <span className="text-[8px] font-black uppercase tracking-widest">{t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Descripción Pública (El Raver verá esto)</label>
                  <textarea 
                    placeholder="Lo que verá el Raver en su perfil (ej: Canjea el 15% OFF en merch)..."
                    value={newPromo.description}
                    onChange={e => setNewPromo({...newPromo, description: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white outline-none focus:border-neon-green h-24 resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                    Segmentos Requeridos <Info className="w-3 h-3 text-zinc-700" title="Solo los usuarios con estos tags verán esta promo" />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(TAG_INFO).map(tag => (
                      <button 
                        key={tag}
                        onClick={() => {
                          const current = newPromo.required_tags;
                          setNewPromo({...newPromo, required_tags: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]});
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter border transition-all ${newPromo.required_tags.includes(tag) ? 'bg-neon-green text-black border-neon-green shadow-sm' : 'bg-black border-zinc-800 text-zinc-600 hover:border-zinc-700'}`}
                        title={TAG_INFO[tag].desc}
                      >
                        {TAG_INFO[tag].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-6 border-t border-zinc-800/50">
                  <button onClick={handleCreatePromo} className="flex-1 bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-neon-green transition-all shadow-xl">Activar Beneficio</button>
                  <button onClick={() => setShowPromoForm(false)} className="px-8 border border-zinc-800 text-zinc-500 rounded-2xl text-xs font-black uppercase hover:bg-zinc-900 transition-all">Cancelar</button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-neon-green" /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {promotions.map(promo => {
                  const info = PROMO_TYPES.find(t => t.value === promo.type);
                  const Icon = info?.icon || Gift;
                  return (
                    <div key={promo.id} className={`p-8 border rounded-[2rem] transition-all relative overflow-hidden group ${promo.is_active ? 'bg-zinc-900/40 border-zinc-800' : 'bg-black border-zinc-900 opacity-40 shadow-none'}`}>
                      <div className="flex justify-between items-start relative z-10 w-full mb-6">
                        <div className="flex items-center gap-4">
                           <div className={`p-4 rounded-2xl ${promo.is_active ? 'bg-neon-purple/20 text-neon-purple shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'bg-zinc-800 text-zinc-600'}`}>
                              <Icon className="w-6 h-6" />
                           </div>
                           <div>
                              <h3 className="font-black text-white uppercase tracking-wider text-xl">{promo.title}</h3>
                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{info?.label}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <button onClick={() => togglePromoStatus(promo.id, promo.is_active)} className="hover:scale-110 transition-transform">
                              {promo.is_active ? <ToggleRight className="w-10 h-10 text-neon-green" /> : <ToggleLeft className="w-10 h-10 text-zinc-800" />}
                           </button>
                           <button onClick={() => deletePromo(promo.id)} className="p-3 hover:bg-red-500/10 hover:text-red-500 text-zinc-800 transition-all rounded-xl">
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      </div>

                      <p className="text-zinc-400 text-sm leading-relaxed mb-8 relative z-10">{promo.description}</p>

                      <div className="flex flex-wrap gap-2 pt-6 border-t border-white/5 relative z-10">
                        {promo.required_tags.map((tag: string) => <TagPill key={tag} tag={tag} />)}
                        {promo.required_tags.length === 0 && <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest border border-dashed border-zinc-800 px-3 py-1 rounded-lg">Público de la Kasa</span>}
                      </div>

                      {/* Decora de fondo */}
                      <div className={`absolute -bottom-10 -right-10 w-40 h-40 blur-3xl rounded-full transition-all duration-700 ${promo.is_active ? 'bg-neon-purple/5 group-hover:bg-neon-green/10' : 'bg-transparent'}`} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROFILE DRAWER (Ficha Maestra) con UX mejorada */}
        {selectedUser && (
          <>
            <div className={`fixed inset-0 bg-black/95 backdrop-blur-md z-[100] transition-opacity duration-300 ${isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsDrawerOpen(false)} />
            <div className={`fixed right-0 top-0 h-screen w-full md:w-[550px] bg-black border-l border-zinc-900 z-[101] shadow-2xl transition-transform duration-500 ease-out transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto overflow-x-hidden no-scrollbar`}>
              <div className="p-10 pb-40">
                <div className="flex justify-between items-start mb-12">
                  <div className="flex gap-6 items-center">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center text-4xl font-black text-white shadow-2xl">{selectedUser.name.charAt(0)}</div>
                    <div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none mb-3">{selectedUser.name}</h2>
                      <div className="flex gap-2">
                        <span className="px-3 py-1 bg-neon-purple/10 text-neon-purple text-[10px] font-black rounded-lg uppercase tracking-widest border border-neon-purple/20">{selectedUser.role}</span>
                        <span className="px-3 py-1 bg-zinc-900 text-zinc-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-zinc-800">UID: {selectedUser.id.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors"><X className="w-8 h-8 text-zinc-700 hover:text-white" /></button>
                </div>

                <div className="space-y-12">
                  {/* Info Tactica */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900">
                        <label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Email Registrado</label>
                        <span className="text-xs font-bold text-zinc-300">{selectedUser.email}</span>
                     </div>
                     <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-900">
                        <label className="text-[10px] font-black uppercase text-zinc-600 block mb-1">Fecha de Ingreso</label>
                        <span className="text-xs font-bold text-zinc-300">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                     </div>
                  </div>

                  {/* CRM TAGS MANAGEMENT */}
                  <div className="space-y-6">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-neon-green flex items-center gap-3">
                       <Tag className="w-4 h-4" /> Clasificación Hiper-Segmentada
                     </h4>
                     <div className="grid grid-cols-2 gap-3">
                        {Object.keys(TAG_INFO).map(tag => (
                          <button 
                            key={tag} 
                            onClick={() => setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                            className={`p-4 rounded-2xl text-[9px] font-black uppercase tracking-widest border transition-all flex flex-col items-start gap-1 group/btn ${editTags.includes(tag) ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.1)]' : 'bg-black border-zinc-900 text-zinc-500 hover:border-zinc-700'}`}
                          >
                            <span className={editTags.includes(tag) ? 'text-black' : TAG_INFO[tag].color}>{TAG_INFO[tag].label}</span>
                            <span className="text-[8px] opacity-70 leading-normal normal-case font-medium text-left">{TAG_INFO[tag].desc.slice(0, 45)}...</span>
                          </button>
                        ))}
                     </div>
                  </div>

                  <div className="bg-zinc-900/20 border border-zinc-900 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />
                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-400 relative z-10">Bitácora de Comportamiento</h4>
                    <div className="flex gap-3 relative z-10">
                       {[1,2,3,4,5].map(s => <button key={s} onClick={() => setEditRating(s)} className={`transition-all ${editRating >= s ? 'text-orange-400 scale-125' : 'text-zinc-800 hover:text-orange-950 hover:scale-110'}`}><Star className="w-10 h-10" fill={editRating >= s ? 'currentColor' : 'none'} /></button>)}
                    </div>
                    <textarea value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="Agrega notas internas sobre conducta, incidentes o sumas de energía..." className="w-full bg-black border border-zinc-800 rounded-2xl p-6 text-white text-sm outline-none focus:border-orange-400/50 transition-all h-40 resize-none font-medium text-zinc-400 leading-relaxed" />
                  </div>

                  <div className="space-y-6">
                     <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-600 flex items-center gap-3"><History className="w-4 h-4" /> Historial Operativo</h4>
                     <div className="space-y-4">
                        {selectedUser.attendance_history?.length > 0 ? selectedUser.attendance_history.map((h: any, i: number) => (
                          <div key={`${h.id}-${i}`} className="flex items-start gap-6 p-6 bg-zinc-950 border border-zinc-900 rounded-[2rem] hover:border-zinc-700 transition-all">
                             <div className="mt-2 w-2.5 h-2.5 rounded-full bg-neon-green shadow-[0_0_10px_#39FF14]" />
                             <div className="flex-1">
                                <h5 className="text-sm font-black text-white uppercase tracking-tight mb-2">{h.title}</h5>
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">{new Date(h.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                                  <span className={`text-[9px] font-black px-3 py-1 rounded-lg ${h.type === 'ONLINE' ? 'bg-blue-900/20 text-blue-400 border border-blue-900/30' : 'bg-green-900/20 text-green-400 border border-green-900/30'}`}>{h.type}</span>
                                </div>
                             </div>
                          </div>
                        )) : <div className="text-center py-16 border border-zinc-900 border-dashed rounded-[2.5rem] text-zinc-700 text-[10px] font-black uppercase tracking-[0.4em]">Sin registros previos</div>}
                     </div>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-black/90 backdrop-blur border-t border-zinc-900 z-[110] space-y-3">
                <button onClick={handleUpdateUserData} disabled={isSaving || isDeleting} className="w-full bg-white text-black font-black uppercase tracking-[0.2em] py-4 rounded-2xl hover:bg-neon-green hover:shadow-[0_20px_40px_rgba(57,255,20,0.3)] transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : <Save className="w-5 h-5" />}
                  {isSaving ? 'Guardando...' : 'Confirmar Cambios'}
                </button>
                {!deleteConfirm ? (
                  <button onClick={() => setDeleteConfirm(true)} disabled={isDeleting} className="w-full bg-transparent border border-zinc-800 text-zinc-600 hover:border-red-500/50 hover:text-red-400 font-black uppercase tracking-widest py-3 rounded-2xl transition-all flex items-center justify-center gap-2 text-xs">
                    <Trash2 className="w-4 h-4" /> Eliminar Usuario
                  </button>
                ) : (
                  <div className="bg-red-950/60 border border-red-500/40 rounded-2xl p-4 space-y-3">
                    <p className="text-red-300 text-xs font-black uppercase tracking-widest text-center">⚠️ Esto borrará al usuario y TODOS sus datos. ¿Confirmar?</p>
                    <div className="flex gap-3">
                      <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 text-xs font-black uppercase hover:bg-zinc-900 transition-all">Cancelar</button>
                      <button onClick={handleDeleteUser} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </AdminGuard>
  );
}
