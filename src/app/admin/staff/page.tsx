"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, ShieldAlert, Plus, ShieldCheck, Camera, Pencil, UserMinus, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { apiFetch, ApiError } from '@/lib/kasa-api';

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
  const [notice, setNotice] = useState('');

  // Editar / quitar del equipo / eliminar cuenta
  const [editing, setEditing] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editClass, setEditClass] = useState('EMPLEADO');
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [removal, setRemoval] = useState<{ member: any; mode: 'access' | 'delete' } | null>(null);
  const [removalBusy, setRemovalBusy] = useState(false);
  const [removalError, setRemovalError] = useState('');
  const [hasHistory, setHasHistory] = useState(false);

  const fetchStaff = async () => {
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/admin/staff`, {
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    return submitStaff(false);
  };

  const submitStaff = async (convertExisting: boolean) => {
    setIsSubmitting(true);
    setError('');

    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/admin/staff`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, password, classification, ...(convertExisting ? { convert_existing: true } : {}) })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({} as any));
        // El correo ya es de un cliente: ofrecer convertirlo en trabajador (conserva su contraseña actual).
        if (d?.code === 'EMAIL_EXISTS' && d?.can_convert && !convertExisting) {
          const ok = confirm(`${d.message}\n\n¿Convertir esa cuenta en trabajador?\nConservará su contraseña actual (la que escribiste aquí no se usará).`);
          if (ok) return await submitStaff(true);
          return;
        }
        throw new Error(Array.isArray(d?.message) ? d.message.join(', ') : (d?.message || 'Error al autorizar empleado.'));
      }

      setName(''); setEmail(''); setPassword('');
      await fetchStaff();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (staffId: string, currentRole: string) => {
    const action = currentRole === 'STAFF' ? 'APAGAR' : 'ACTIVAR';
    if (!confirm(`¿Seguro que quieres ${action} el modo de trabajo para este miembro?`)) return;
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const token = tokenRow ? tokenRow.split('=')[1] : null;
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/users/admin/staff/${staffId}/toggle`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await fetchStaff();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (st: any) => {
    setEditing(st);
    setEditName(st.name || '');
    setEditEmail(st.email || '');
    setEditPassword('');
    setEditClass(st.staff_access?.permissions?.classification === 'ARTISTA' ? 'ARTISTA' : 'EMPLEADO');
    setEditError('');
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const body: Record<string, string> = {};
    if (editName.trim() !== (editing.name || '')) body.name = editName;
    if (editEmail.trim() !== (editing.email || '')) body.email = editEmail;
    if (editPassword) body.password = editPassword;
    const current = editing.staff_access?.permissions?.classification === 'ARTISTA' ? 'ARTISTA' : 'EMPLEADO';
    if (editClass !== current) body.classification = editClass;
    if (Object.keys(body).length === 0) {
      setEditError('No cambiaste nada.');
      return;
    }
    setSaving(true);
    setEditError('');
    try {
      await apiFetch(`/users/admin/staff/${editing.id}`, { method: 'PUT', body });
      setNotice(`Se guardaron los cambios de ${editName.trim() || editing.name}.`);
      setEditing(null);
      await fetchStaff();
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const openRemoval = (member: any, mode: 'access' | 'delete') => {
    setRemoval({ member, mode });
    setRemovalError('');
    setHasHistory(false);
  };

  const confirmRemoval = async () => {
    if (!removal) return;
    setRemovalBusy(true);
    setRemovalError('');
    try {
      if (removal.mode === 'access') {
        await apiFetch(`/users/admin/staff/${removal.member.id}/access`, { method: 'DELETE' });
        setNotice(`${removal.member.name} ya no es parte del equipo. Su cuenta y su historial se conservaron.`);
      } else {
        await apiFetch(`/users/admin/staff/${removal.member.id}`, { method: 'DELETE' });
        setNotice(`La cuenta de ${removal.member.name} se eliminó.`);
      }
      setRemoval(null);
      await fetchStaff();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && err.data?.code === 'STAFF_HAS_HISTORY') setHasHistory(true);
      setRemovalError(err instanceof ApiError ? err.message : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setRemovalBusy(false);
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen p-6 md:p-12 max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-800 pb-6 relative mt-8 md:mt-0">
          <Link href="/admin" className="absolute -top-8 md:-top-6 left-0 text-zinc-500 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest transition-colors font-bold">
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

        {notice && (
          <div role="status" className="mb-8 p-4 bg-neon-green/10 border border-neon-green/30 text-neon-green rounded-lg text-xs font-bold tracking-widest uppercase flex items-start gap-3">
            <span className="flex-1">{notice}</span>
            <button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso" className="shrink-0 opacity-70 hover:opacity-100"><X className="w-4 h-4" /></button>
          </div>
        )}

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
              
              <div>
                {loading ? (
                  <p className="py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest animate-pulse">
                    Descifrando registros...
                  </p>
                ) : staffList.length === 0 ? (
                  <p className="py-12 text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">
                    Ningún empleado registrado en la bóveda
                  </p>
                ) : (
                  <ul className="divide-y divide-zinc-800/50">
                    {staffList.map((st) => (
                      <li key={st.id} className="p-5 hover:bg-zinc-900/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">{st.name}</p>
                            <p className="text-zinc-500 text-xs mt-1 break-all">{st.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggle(st.id, st.role)}
                            className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-4 py-2 border rounded-full transition-all flex items-center justify-center min-w-[105px] ${
                              st.role === 'STAFF'
                                ? 'text-neon-green border-neon-green/40 hover:border-neon-green hover:bg-neon-green/10'
                                : 'text-zinc-500 border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800'
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full mr-2 ${st.role === 'STAFF' ? 'bg-neon-green shadow-[0_0_8px_#39ff14]' : 'bg-zinc-600'}`}></div>
                            {st.role === 'STAFF' ? 'Trabajando' : 'Descansando'}
                          </button>
                        </div>
              
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className={`px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider ${st.staff_access?.permissions?.classification === 'ARTISTA' ? 'bg-[#00ffff]/10 text-[#00ffff] border border-[#00ffff]/30' : 'bg-neon-purple/10 text-neon-purple border border-neon-purple/30'}`}>
                            {st.staff_access?.permissions?.classification || 'EMPLEADO'}
                          </span>
                          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neon-green opacity-60">
                            <Camera className="w-4 h-4" /> Escáner QR
                          </span>
                        </div>
              
                        <div className="mt-4 grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(st)}
                            className="h-11 px-2 rounded-lg bg-blue-900/20 text-blue-400 hover:bg-blue-900/40 hover:text-blue-300 transition-colors flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                            aria-label={`Editar a ${st.name}`}
                          >
                            <Pencil className="w-4 h-4 shrink-0" /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => openRemoval(st, 'access')}
                            className="h-11 px-2 rounded-lg bg-amber-900/20 text-amber-400 hover:bg-amber-900/40 hover:text-amber-300 transition-colors flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                            aria-label={`Quitar a ${st.name} del equipo`}
                          >
                            <UserMinus className="w-4 h-4 shrink-0" /> Quitar
                          </button>
                          <button
                            type="button"
                            onClick={() => openRemoval(st, 'delete')}
                            className="h-11 px-2 rounded-lg bg-red-900/20 text-red-500 hover:bg-red-900/40 hover:text-red-400 transition-colors flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest"
                            aria-label={`Eliminar la cuenta de ${st.name}`}
                          >
                            <Trash2 className="w-4 h-4 shrink-0" /> Eliminar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Editar perfil */}
        {editing && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true" aria-label="Editar perfil">
            <form onSubmit={saveEdit} className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 pb-8 sm:pb-6 shadow-2xl">
              <h3 className="text-lg font-black uppercase text-white mb-4">Editar perfil</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Nombre</label>
                  <input
                    type="text" required value={editName} onChange={(ev) => setEditName(ev.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm focus:border-neon-purple outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Correo</label>
                  <input
                    type="email" required value={editEmail} onChange={(ev) => setEditEmail(ev.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm focus:border-neon-purple outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Contraseña nueva (opcional)</label>
                  <input
                    type="text" value={editPassword} onChange={(ev) => setEditPassword(ev.target.value)} autoComplete="off"
                    className="w-full bg-black/60 border border-zinc-800 rounded-xl h-12 px-4 text-white text-sm font-mono tracking-widest focus:border-neon-purple outline-none"
                    placeholder="Déjala vacía para no cambiarla"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Clasificación</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button" onClick={() => setEditClass('EMPLEADO')}
                      className={`h-12 text-xs font-bold uppercase tracking-widest border rounded-xl transition-all flex justify-center items-center gap-2 ${editClass === 'EMPLEADO' ? 'bg-neon-purple/20 border-neon-purple text-neon-purple' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                    >
                      <ShieldCheck className="w-4 h-4" /> Empleado
                    </button>
                    <button
                      type="button" onClick={() => setEditClass('ARTISTA')}
                      className={`h-12 text-xs font-bold uppercase tracking-widest border rounded-xl transition-all flex justify-center items-center gap-2 ${editClass === 'ARTISTA' ? 'bg-[#00ffff]/20 border-[#00ffff] text-[#00ffff]' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-500'}`}
                    >
                      <Users className="w-4 h-4" /> Artista
                    </button>
                  </div>
                </div>
              </div>
              {editError && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-400">{editError}</p>
                </div>
              )}
              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button" onClick={() => !saving && setEditing(null)} disabled={saving}
                  className="h-12 rounded-xl border border-zinc-800 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest hover:border-zinc-600 disabled:opacity-40"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={saving}
                  className="h-12 rounded-xl bg-neon-green text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Quitar del equipo / eliminar cuenta */}
        <ConfirmDialog
          open={removal !== null}
          title={removal?.mode === 'delete' ? 'Eliminar cuenta' : 'Quitar del equipo'}
          tone="danger"
          confirmLabel={removal?.mode === 'delete' ? 'Sí, eliminar' : 'Sí, quitar'}
          busy={removalBusy}
          confirmDisabled={removal?.mode === 'delete' && hasHistory}
          error={removalError}
          onConfirm={confirmRemoval}
          onCancel={() => !removalBusy && setRemoval(null)}
        >
          {removal?.mode === 'delete' ? (
            <>
              <p>
                Se borrará para siempre la cuenta de <span className="text-white">{removal.member.name}</span> ({removal.member.email}).
              </p>
              <p className="text-xs text-zinc-400">
                Solo se puede si no tiene historial (escaneos, ventas en puerta, eventos...). Si lo tiene, te lo aviso y puedes quitarlo del equipo en su lugar.
              </p>
              {hasHistory && (
                <button
                  type="button"
                  onClick={() => removal && openRemoval(removal.member, 'access')}
                  className="mt-1 h-10 px-4 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[11px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-colors"
                >
                  Quitarlo del equipo en su lugar
                </button>
              )}
            </>
          ) : (
            removal && (
              <>
                <p>
                  <span className="text-white">{removal.member.name}</span> dejará de ser parte del equipo y de poder escanear entradas, desde ya.
                </p>
                <p className="text-xs text-zinc-400">
                  Su cuenta y su historial se conservan (queda como un usuario normal). Si lo necesitas de nuevo, puedes volver a agregarlo con su correo.
                </p>
              </>
            )
          )}
        </ConfirmDialog>
      </div>
    </AdminGuard>
  );
}
