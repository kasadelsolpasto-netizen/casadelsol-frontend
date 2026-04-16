"use client";
import { useEffect, useState } from 'react';
import { Users, Star, Search, Loader2, Save, Trash2, ShieldAlert } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<{ [key: string]: { rating: number; comment: string } }>({});

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/users/admin/all`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
        // Initialize editing data
        const initialEditing: any = {};
        data.forEach((u: any) => {
          initialEditing[u.id] = { rating: u.rating || 0, comment: u.rating_comment || '' };
        });
        setEditingData(initialEditing);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateRating = async (userId: string) => {
    setSavingId(userId);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/users/${userId}/rating`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          rating: editingData[userId].rating,
          comment: editingData[userId].comment
        })
      });

      if (res.ok) {
        // Update local state
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, rating: editingData[userId].rating, rating_comment: editingData[userId].comment } : u));
        alert('Calificación actualizada correctamente');
      } else {
        alert('Error al actualizar');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
    } finally {
      setSavingId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">
              Gestión de Comunidad
            </h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> {users.length} Ravers Registrados
            </p>
          </div>

          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-neon-green transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o correo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-black/40 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-zinc-600 focus:border-neon-green/50 outline-none transition-all"
            />
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-neon-green" />
            <p className="text-zinc-500 font-black uppercase tracking-widest text-sm">Escaneando base de datos...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-20 border border-zinc-800 border-dashed rounded-3xl">
                <ShieldAlert className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-600 font-bold uppercase tracking-widest">No se encontraron usuarios</p>
              </div>
            ) : (
              filteredUsers.map((user) => (
                <div key={user.id} className="glass-panel bg-black/60 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-all group relative overflow-hidden">
                  <div className="flex flex-col lg:flex-row justify-between gap-8 relative z-10">
                    {/* User Info */}
                    <div className="flex-1 flex gap-5 items-start">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-zinc-800 to-black flex items-center justify-center border border-zinc-700 text-zinc-400 font-black text-xl">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-black text-white uppercase tracking-wider">{user.name}</h3>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${user.role === 'OWNER' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : user.role === 'STAFF' ? 'bg-neon-purple/10 text-neon-purple border border-neon-purple/20' : 'bg-zinc-800 text-zinc-500'}`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-sm font-bold">{user.email}</p>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-2">Miembro desde: {new Date(user.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Rating Controls (Admin Only - User Details Read Only) */}
                    <div className="w-full lg:w-[450px] flex flex-col md:flex-row gap-4">
                      <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2 block">Calificación Interna</label>
                        <div className="flex gap-1.5 mb-3">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setEditingData({
                                ...editingData,
                                [user.id]: { ...editingData[user.id], rating: star }
                              })}
                              className={`transition-all ${editingData[user.id]?.rating >= star ? 'text-orange-400 scale-110' : 'text-zinc-800 hover:text-orange-950'}`}
                            >
                              <Star className="w-5 h-5" fill={editingData[user.id]?.rating >= star ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                        <textarea 
                          placeholder="Notas internas sobra la calidad del cliente..."
                          value={editingData[user.id]?.comment}
                          onChange={(e) => setEditingData({
                            ...editingData,
                            [user.id]: { ...editingData[user.id], comment: e.target.value }
                          })}
                          className="w-full bg-black/40 border border-zinc-800 rounded-lg py-2 px-3 text-white text-xs hover:border-zinc-700 focus:border-neon-purple/50 outline-none transition-all h-20 resize-none"
                        />
                      </div>
                      
                      <button 
                        onClick={() => handleUpdateRating(user.id)}
                        disabled={savingId === user.id}
                        className="h-full md:w-20 bg-zinc-800 hover:bg-neon-green hover:text-black text-white rounded-xl transition-all flex flex-col items-center justify-center gap-2 group/btn border border-zinc-700"
                      >
                        {savingId === user.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <>
                            <Save className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden md:block">Guardar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Subtle highlight if rated high */}
                  {user.rating >= 4 && (
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-400/5 blur-3xl rounded-full pointer-events-none"></div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminGuard>
  );
}
