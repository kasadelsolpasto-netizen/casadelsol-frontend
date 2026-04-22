"use client";
import { useState, useEffect } from 'react';
import { Shield, Plus, CheckCircle2, XCircle, Search, Ticket, Activity, Percent } from 'lucide-react';

interface PromoterCode {
  id: string;
  code: string;
  promoter_id: string;
  event_id: string | null;
  discount_perc: number;
  uses_count: number;
  is_active: boolean;
  created_at: string;
  promoter: { name: string; email: string };
  event?: { title: string };
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function PromotersAdminPage() {
  const [codes, setCodes] = useState<PromoterCode[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const [formData, setFormData] = useState({
    code: '',
    promoter_email: '',
    discount_perc: 0,
    event_id: '',
  });

  const fetchData = async () => {
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      if (!token) return;

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const [resCodes, resEvents] = await Promise.all([
        fetch(`${API_URL}/promoters`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/events/admin/all`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const codesData = await resCodes.json();
      const eventsData = await resEvents.json();
      
      setCodes(codesData);
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/promoters`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          code: formData.code,
          promoter_email: formData.promoter_email.trim(),
          discount_perc: Number(formData.discount_perc),
          event_id: formData.event_id || undefined,
        })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Error al crear código');
      }
      
      setFormData({ code: '', promoter_email: '', discount_perc: 0, event_id: '' });
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Error al crear código');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      await fetch(`${API_URL}/promoters/${id}/toggle`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ is_active: !currentStatus })
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling status', error);
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
        
        {/* Formulario de Creación */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 blur-[80px] pointer-events-none"></div>
            
            <h2 className="text-xl font-bold mb-6 border-b border-zinc-800 pb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-neon-purple" /> Nuevo Código
            </h2>
            
            <form onSubmit={handleCreate} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Usuario (Promotor)</label>
                <input 
                  required
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={formData.promoter_email}
                  onChange={(e) => setFormData({...formData, promoter_email: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:border-neon-purple outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Código Personalizado</label>
                <input 
                  required
                  type="text"
                  placeholder="EJ: JUANVIP24"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:border-neon-purple outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Descuento (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={formData.discount_perc}
                    onChange={(e) => setFormData({...formData, discount_perc: Number(e.target.value)})}
                    className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-sm focus:border-neon-purple outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">Evento Específico (Opcional)</label>
                <select 
                  value={formData.event_id}
                  onChange={(e) => setFormData({...formData, event_id: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:border-neon-purple outline-none"
                >
                  <option value="">-- Todos los Eventos --</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.title} - {new Date(e.date).toLocaleDateString('es-CO')}</option>
                  ))}
                </select>
                <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Si lo dejas en "Todos los Eventos", el código funcionará en cualquier compra.</p>
              </div>

              <button 
                type="submit" 
                disabled={formLoading}
                className="w-full mt-4 bg-neon-purple text-white font-bold tracking-widest uppercase py-4 rounded-lg hover:bg-neon-purple/80 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {formLoading ? 'Procesando...' : 'Crear Promotor'}
              </button>
            </form>
          </div>
        </div>

        {/* Tabla de Códigos */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-neon-green" /> Listado de Códigos
            </h2>
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-zinc-800/50 rounded-lg"></div>)}
              </div>
            ) : codes.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                No hay códigos de promotor creados aún.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase tracking-widest text-zinc-500">
                      <th className="py-3 px-4 font-bold">Código</th>
                      <th className="py-3 px-4 font-bold">Promotor</th>
                      <th className="py-3 px-4 font-bold">Descuento</th>
                      <th className="py-3 px-4 font-bold">Usos</th>
                      <th className="py-3 px-4 font-bold">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codes.map(c => (
                      <tr key={c.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-neon-green">{c.code}</td>
                        <td className="py-4 px-4">
                          <div className="font-bold">{c.promoter?.name}</div>
                          <div className="text-xs text-zinc-500">{c.promoter?.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          {c.discount_perc > 0 ? (
                            <span className="bg-neon-purple/20 text-neon-purple px-2 py-1 rounded text-xs font-bold">
                              {c.discount_perc}% OFF
                            </span>
                          ) : (
                            <span className="text-zinc-600">-</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-bold text-xl">{c.uses_count}</td>
                        <td className="py-4 px-4">
                          <button 
                            onClick={() => toggleActive(c.id, c.is_active)}
                            className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${c.is_active ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                          >
                            {c.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {c.is_active ? 'ACTIVO' : 'INACTIVO'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
