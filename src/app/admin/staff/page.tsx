"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, ShieldAlert, Plus, ShieldCheck, Camera } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

export default function StaffManagementPage() {
  const router = useRouter();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classification, setClassification] = useState('EMPLEADO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchStaff = async () => {
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      
      const res = await fetch('http://localhost:3001/users/admin/staff', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      
      const res = await fetch('http://localhost:3001/users/admin/staff', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, classification })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Error al autorizar empleado.');
      }

      setName(''); setEmail(''); setPassword('');
      await fetchStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (staffId: string) => {
    if (!confirm('¿Estás seguro de revocar el acceso a este miembro? Perderá sus funciones especiales inmediatamente.')) return;
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      
      const res = await fetch(`http://localhost:3001/users/admin/staff/${staffId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchStaff();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-6 relative">
          <Link href="/admin" className="absolute -top-6 left-0 text-zinc-500 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest transition-colors font-bold">
            <ArrowLeft className="w-4 h-4" /> Volver
          </Link>
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">
              Equipo & Staff
            </h1>
            <p className="text-zinc-500 mt-2 uppercase tracking-widest text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              Otorgar Poderes de Escáner
            </p>
          </div>
        </header>

        {error && <div className="mb-8 p-4 bg-red-900/30 border border-red-500 text-red-400 rounded-lg text-sm font-bold tracking-widest uppercase">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Formulario de Creación */}
          <div className="lg:col-span-1">
            <div className="glass-panel p-8 rounded-2xl relative overflow-hidden group border-t-2 border-t-neon-purple">
              <h2 className="text-xl font-bold uppercase tracking-widest text-white mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-neon-purple" />
                Nuevo Miembro
              </h2>

              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Nombre Clave</label>
                  <input 
                    type="text" required value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded py-3 px-4 text-white uppercase text-sm focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all outline-none"
                    placeholder="Ej. Portero VIP / DJ Nox"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Email Operativo</label>
                  <input 
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded py-3 px-4 text-white text-sm focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all outline-none"
                    placeholder="acceso@ejemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Contraseña Temporal</label>
                  <input 
                    type="text" required value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded py-3 px-4 text-white text-sm focus:border-neon-purple tracking-widest font-mono focus:ring-1 focus:ring-neon-purple transition-all outline-none"
                    placeholder="KASA-1234"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Clasificación de Escáner</label>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button 
                      type="button"
                      onClick={() => setClassification('EMPLEADO')}
                      className={`py-3 text-xs font-bold uppercase tracking-widest border rounded transition-all flex justify-center items-center gap-2 ${classification === 'EMPLEADO' ? 'bg-neon-purple/20 border-neon-purple text-neon-purple' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                    >
                      <ShieldCheck className="w-4 h-4" /> Empleado
                    </button>
                    <button 
                      type="button"
                      onClick={() => setClassification('ARTISTA')}
                      className={`py-3 text-xs font-bold uppercase tracking-widest border rounded transition-all flex justify-center items-center gap-2 ${classification === 'ARTISTA' ? 'bg-[#00ffff]/20 border-[#00ffff] text-[#00ffff]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                    >
                      <Users className="w-4 h-4" /> Artista
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" disabled={isSubmitting}
                  className="w-full mt-4 bg-white text-black font-black uppercase tracking-widest py-4 rounded hover:bg-neon-purple hover:text-white hover:shadow-[0_0_20px_rgba(191,0,255,0.4)] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Encriptando...' : 'Conceder Permisos'}
                </button>
              </form>
            </div>
          </div>

          {/* Tabla de Usuarios */}
          <div className="lg:col-span-2">
            <div className="glass-panel rounded-2xl overflow-hidden border border-zinc-800/50">
              <div className="bg-zinc-900/50 p-6 border-b border-zinc-800/50 flex justify-between items-center">
                <h2 className="text-lg font-bold uppercase tracking-widest text-white flex items-center gap-3">
                  <Users className="w-5 h-5 text-neon-green" />
                  Base de Datos Activa
                </h2>
              </div>
              
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/40 border-b border-zinc-800/80">
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">ID Operativo</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Tipo</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500">Módulo</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Extorsión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                          Descifrando registros...
                        </td>
                      </tr>
                    ) : staffList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                          Ningún empleado registrado en la bóveda
                        </td>
                      </tr>
                    ) : (
                      staffList.map((st) => (
                        <tr key={st.id} className="hover:bg-zinc-900/30 transition-colors group">
                          <td className="py-4 px-6">
                            <p className="text-white font-bold text-sm">{st.name}</p>
                            <p className="text-zinc-500 text-xs mt-1">{st.email}</p>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider ${st.staff_access?.permissions?.classification === 'ARTISTA' ? 'bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/30' : 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30'}`}>
                              {st.staff_access?.permissions?.classification || 'EMPLEADO'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon-green opacity-50 group-hover:opacity-100 transition-opacity">
                              <Camera className="w-4 h-4" /> Escáner QR
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                             <button 
                               onClick={() => handleRevoke(st.id)}
                               className="text-xs font-bold uppercase tracking-widest text-red-700 hover:text-red-400 border border-red-900/50 hover:bg-red-900/20 px-3 py-1.5 rounded transition-all"
                             >
                               Revocar
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </AdminGuard>
  );
}
