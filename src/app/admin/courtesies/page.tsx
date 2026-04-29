"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, Calendar, ChevronRight, Loader2, ArrowLeft, 
  Send, Link as LinkIcon, CheckCircle, Eye, Trash2,
  Copy, Upload, FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';

export default function CourtesiesAdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [courtesies, setCourtesies] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [eventLoading, setEventLoading] = useState(false);
  
  // Form State
  const [mode, setMode] = useState<'SINGLE' | 'BULK'>('SINGLE');
  const [singleForm, setSingleForm] = useState({ name: '', dni: '', email: '', ticket_type_id: '' });
  const [bulkText, setBulkText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    if (!token) return router.push('/login');

    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiEndpoint}/courtesies/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setEvents(await res.json());
      }
    } catch (error) {}
    setLoading(false);
  };

  const fetchEventDetails = async (eventId: string) => {
    setEventLoading(true);
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiEndpoint}/courtesies/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourtesies(data.courtesies);
        setTicketTypes(data.ticketTypes);
        if (data.ticketTypes.length > 0) {
          setSingleForm(prev => ({ ...prev, ticket_type_id: data.ticketTypes[0].id }));
        }
      }
    } catch (error) {}
    setEventLoading(false);
  };

  const handleEventSelect = (ev: any) => {
    setSelectedEvent(ev);
    fetchEventDetails(ev.id);
  };

  // ── User community search ──────────────────────────────────
  const searchUsers = async (query: string) => {
    setSearchLoading(true);
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;
    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = query
        ? `${apiEndpoint}/users/admin/all?search=${encodeURIComponent(query)}&limit=10`
        : `${apiEndpoint}/users/admin/all?limit=10`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setUserSearchResults(data.data || []);
      }
    } catch {}
    setSearchLoading(false);
  };

  const handleUserSearchChange = (val: string) => {
    setUserSearchQuery(val);
    setShowDropdown(true);
    if (searchDebounce) clearTimeout(searchDebounce);
    setSearchDebounce(setTimeout(() => searchUsers(val), 300));
  };

  const handleUserSearchFocus = () => {
    setShowDropdown(true);
    if (userSearchResults.length === 0) searchUsers('');
  };

  const selectUser = (user: any) => {
    setSingleForm(f => ({ ...f, name: user.name || '', email: user.email || '', dni: f.dni }));
    setUserSearchQuery(user.name || user.email);
    setShowDropdown(false);
  };

  const clearUserSelection = () => {
    setUserSearchQuery('');
    setSingleForm(f => ({ ...f, name: '', email: '' }));
    setUserSearchResults([]);
    setShowDropdown(false);
  };

  const parseBulkText = () => {
    // Expected format per line: Nombre, Cedula, Correo
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
    const parsed = [];
    for (const line of lines) {
      // Intentar dividir por comas, tabulaciones o punto y coma (para Excel/CSV)
      const parts = line.split(/[\t,;]+/).map(p => p.trim());
      if (parts.length >= 3) {
        parsed.push({ name: parts[0], dni: parts[1], email: parts[2], ticket_type_id: singleForm.ticket_type_id });
      } else if (parts.length === 2 && parts[1].includes('@')) {
         // Fallback if no DNI: Nombre, Correo
         parsed.push({ name: parts[0], dni: '00000000', email: parts[1], ticket_type_id: singleForm.ticket_type_id });
      }
    }
    return parsed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    
    let payload = [];
    if (mode === 'SINGLE') {
      if (!singleForm.name || !singleForm.email || !singleForm.ticket_type_id) return alert('Completa los datos.');
      payload = [singleForm];
    } else {
      payload = parseBulkText();
      if (payload.length === 0) return alert('No se encontraron registros válidos en el texto.');
    }

    setSubmitting(true);
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiEndpoint}/courtesies/bulk/${selectedEvent.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ courtesies: payload })
      });

      if (res.ok) {
        setSingleForm({ name: '', dni: '', email: '', ticket_type_id: ticketTypes[0]?.id || '' });
        setBulkText('');
        fetchEventDetails(selectedEvent.id);
        fetchEvents(); // Update metrics on main screen
      }
    } catch (error) {}
    setSubmitting(false);
  };

  const handleRevoke = async (id: string, isClaimed: boolean) => {
    const msg = isClaimed 
      ? 'Esta cortesía ya fue reclamada. Si la revocas, se eliminará el código QR de la bóveda del usuario y la entrada quedará invalidada. ¿Estás seguro?' 
      : '¿Seguro que deseas revocar este enlace de cortesía?';
    if (!confirm(msg)) return;
    const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
    const token = tokenRow ? tokenRow.split('=')[1] : null;

    try {
      const apiEndpoint = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiEndpoint}/courtesies/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEventDetails(selectedEvent.id);
        fetchEvents();
      }
    } catch (e) {}
  };

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/claim-courtesy?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-neon-purple animate-spin" />
      </div>
    );
  }

  // EVENT SELECTION VIEW
  if (!selectedEvent) {
    return (
      <div className="min-h-screen bg-[#050505] p-6 lg:p-12 font-sans pb-24">
        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-white mb-4">Relaciones Públicas</h1>
            <p className="text-zinc-400 font-bold max-w-2xl">Gestiona las invitaciones y cortesías. Los enlaces enviados permiten a tus invitados registrarse y acceder a su código QR automáticamente.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => handleEventSelect(event)}
                className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden hover:border-neon-purple/50 group text-left transition-all hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col"
              >
                <div className="p-6 flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-neon-purple" />
                    <span className="text-xs font-black uppercase text-neon-purple">
                      {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <h3 className="text-xl font-black uppercase text-white mb-2">{event.title}</h3>
                  
                  {/* Miniature Metrics */}
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    <div className="bg-zinc-900 rounded-lg p-3">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Enviadas</p>
                      <p className="text-xl font-black text-white">{event.metrics.sent}</p>
                    </div>
                    <div className="bg-zinc-900 rounded-lg p-3">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1" title="Cortesías que los usuarios ya tienen en su cuenta">En Bóveda</p>
                      <p className="text-xl font-black text-neon-green">{event.metrics.claimed}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-zinc-900/50 p-4 border-t border-zinc-900 flex justify-between items-center group-hover:bg-neon-purple group-hover:border-neon-purple transition-all">
                  <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-black">Gestionar Cortesías</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-black" />
                </div>
              </button>
            ))}
            {events.length === 0 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-zinc-800 rounded-2xl">
                <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 font-bold">No hay eventos activos.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // EVENT COURTESY DASHBOARD
  const metrics = events.find(e => e.id === selectedEvent.id)?.metrics || { sent: 0, opened: 0, claimed: 0, attendance: 0 };
  
  // Real Attendance Calculation from enriched courtesies
  const realAttendance = courtesies.filter(c => c.attended).length;

  return (
    <div className="min-h-screen bg-[#050505] p-6 lg:p-12 font-sans pb-24">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => setSelectedEvent(null)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors font-bold text-sm uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Eventos
        </button>

        <header className="mb-10">
          <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter text-white mb-2">{selectedEvent.title}</h1>
          <p className="text-neon-purple font-black tracking-widest uppercase text-sm">Centro de Relaciones Públicas</p>
        </header>

        {/* METRICS DASHBOARD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2 text-zinc-400">
              <Send className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Enviadas</h3>
            </div>
            <p className="text-4xl font-black text-white">{metrics.sent}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2 text-blue-400">
              <Eye className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Vistas (Pendientes)</h3>
            </div>
            <p className="text-4xl font-black text-white">{metrics.opened}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2 text-neon-green">
              <CheckCircle className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest" title="Cortesías que ya están en la cuenta del usuario">En Bóveda</h3>
            </div>
            <p className="text-4xl font-black text-white">{metrics.claimed}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-2 text-orange-500">
              <Users className="w-4 h-4" />
              <h3 className="text-[10px] font-black uppercase tracking-widest">Asistencia</h3>
            </div>
            <p className="text-4xl font-black text-white">{realAttendance}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* EMISSION FORM */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 sticky top-6">
              <h2 className="text-xl font-black uppercase text-white mb-6">Nueva Cortesía</h2>
              
              <div className="flex bg-black rounded-lg p-1 mb-6 border border-zinc-900">
                <button 
                  onClick={() => setMode('SINGLE')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all ${mode === 'SINGLE' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  Individual
                </button>
                <button 
                  onClick={() => setMode('BULK')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-md transition-all flex items-center justify-center gap-2 ${mode === 'BULK' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                  <FileSpreadsheet className="w-3 h-3" /> Masivo
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'SINGLE' ? (
                  <>
                    {/* Community User Search */}
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Buscar en la Comunidad</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={e => handleUserSearchChange(e.target.value)}
                          onFocus={handleUserSearchFocus}
                          onBlur={() => setTimeout(() => setShowDropdown(false), 180)}
                          className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors"
                          placeholder="Buscar por nombre o correo..."
                          autoComplete="off"
                        />
                        {/* Indicators */}
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {searchLoading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
                          {userSearchQuery && !searchLoading && (
                            <button type="button" onClick={clearUserSelection} className="text-zinc-600 hover:text-white transition-colors">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>

                        {/* Dropdown */}
                        {showDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.7)]">
                            {userSearchResults.length === 0 && !searchLoading ? (
                              <div className="px-4 py-3 text-zinc-500 text-xs font-bold uppercase tracking-widest">Sin resultados — ingresa datos manualmente</div>
                            ) : (
                              userSearchResults.map(user => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onMouseDown={() => selectUser(user)}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-900 last:border-0"
                                >
                                  <div className="w-8 h-8 rounded-full bg-neon-purple/20 border border-neon-purple/30 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-black text-neon-purple uppercase">{(user.name || user.email)?.[0]}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white font-bold text-sm truncate">{user.name || '—'}</p>
                                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest truncate">{user.email}</p>
                                  </div>
                                  {user.rating && (
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 shrink-0">
                                      ★ {user.rating}
                                    </span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-1.5 font-bold uppercase tracking-widest">Selecciona para autocompletar · O ingresa manualmente abajo</p>
                    </div>

                    {/* Manual fields */}
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Nombre Completo</label>
                      <input type="text" required value={singleForm.name} onChange={e => setSingleForm({...singleForm, name: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors" placeholder="Ej. John Doe" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Cédula <span className="text-zinc-700 normal-case font-bold">(opcional)</span></label>
                      <input type="text" value={singleForm.dni} onChange={e => setSingleForm({...singleForm, dni: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors" placeholder="Ej. 1000000000" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Correo Electrónico</label>
                      <input type="email" required value={singleForm.email} onChange={e => setSingleForm({...singleForm, email: e.target.value})} className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors" placeholder="john@example.com" />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Pega desde Excel (Nombre, Cédula, Correo)</label>
                    <textarea 
                      value={bulkText} 
                      onChange={e => setBulkText(e.target.value)} 
                      className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors h-48 font-mono text-sm" 
                      placeholder={"John Doe\t123456\tjohn@test.com\nJane Doe\t654321\tjane@test.com"} 
                      required
                    />
                    <p className="text-xs text-zinc-600 mt-2">Separa los datos con comas o tabs. 1 persona por línea.</p>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 mt-2">Tipo de Entrada a Regalar</label>
                  <select 
                    value={singleForm.ticket_type_id} 
                    onChange={e => setSingleForm({...singleForm, ticket_type_id: e.target.value})} 
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon-purple transition-colors appearance-none"
                  >
                    {ticketTypes.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full mt-4 bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-neon-purple hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-4 h-4" /> Emitir Cortesía{mode === 'BULK' ? 's' : ''}</>}
                </button>
              </form>
            </div>
          </div>

          {/* LIST OF COURTESIES */}
          <div className="lg:col-span-2">
            <div className="bg-zinc-950 border border-zinc-900 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-900 flex justify-between items-center">
                <h2 className="text-xl font-black uppercase text-white">Registro de Envíos</h2>
                {eventLoading && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/50 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                      <th className="p-4 border-b border-zinc-900">Invitado</th>
                      <th className="p-4 border-b border-zinc-900">Entrada</th>
                      <th className="p-4 border-b border-zinc-900">Estado</th>
                      <th className="p-4 border-b border-zinc-900 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {courtesies.map((c) => (
                      <tr key={c.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/30 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white">{c.name}</p>
                          <p className="text-xs text-zinc-500">{c.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-zinc-900 text-zinc-400 text-[10px] px-2 py-1 rounded font-black uppercase tracking-widest">{c.ticket_type?.name}</span>
                        </td>
                        <td className="p-4">
                          {c.attended ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-orange-500">
                              <CheckCircle className="w-3 h-3" /> Usada / Asistió
                            </span>
                          ) : c.claimed_at ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-neon-green" title="El usuario ya tiene la entrada en su cuenta (no ha sido escaneada aún)">
                              <CheckCircle className="w-3 h-3" /> En Bóveda
                            </span>
                          ) : c.opened_at ? (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-blue-400">
                              <Eye className="w-3 h-3" /> Vista
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                              <Send className="w-3 h-3" /> Enviada
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!c.claimed_at && (
                              <button 
                                onClick={() => copyLink(c.token)}
                                className={`p-2 rounded-lg transition-colors ${copiedToken === c.token ? 'bg-neon-green/20 text-neon-green' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
                                title="Copiar Link Mágico"
                              >
                                {copiedToken === c.token ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              </button>
                            )}
                            <button 
                              onClick={() => handleRevoke(c.id, !!c.claimed_at)}
                              className="p-2 bg-zinc-900 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              title={c.claimed_at ? "Revocar e Invalidar Entrada" : "Revocar Enlace"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {courtesies.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-zinc-500 font-bold">
                          Aún no has emitido cortesías para este evento.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
