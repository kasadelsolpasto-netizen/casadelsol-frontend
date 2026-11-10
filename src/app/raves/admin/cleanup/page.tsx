"use client";
import { useState, useEffect, useCallback } from 'react';
import {
  Trash2, AlertTriangle, Loader2, RefreshCw,
  Users, ShoppingBag, Ticket, QrCode,
  CheckCircle, ShieldAlert, X
} from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getToken() {
  const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
  return row ? row.split('=')[1] : null;
}

interface Stats {
  users: number;
  orders: number;
  shopOrders: number;
  pendingOrders: number;
  pendingShopOrders: number;
  qrCodes: number;
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export default function CleanupPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, last_page: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Per-row delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Bulk action feedback
  const [bulkLoading, setBulkLoading] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{ action: string; count: number } | null>(null);

  // Confirmation modal for bulk
  const [bulkConfirm, setBulkConfirm] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch(`${API}/users/admin/cleanup/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setStats(await res.json());
    } finally { setStatsLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const url = new URL(`${API}/users/admin/all`);
      url.searchParams.set('page', page.toString());
      url.searchParams.set('limit', '20');
      if (debouncedSearch) url.searchParams.set('search', debouncedSearch);
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.data);
        setMeta(data.meta);
      }
    } finally { setUsersLoading(false); }
  }, [page, debouncedSearch]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ── DELETE USER ──────────────────────────────────────────────────────────────
  const handleDeleteUser = async (userId: string) => {
    if (confirmId !== userId) { setConfirmId(userId); return; }
    setDeletingId(userId);
    try {
      const res = await fetch(`${API}/users/admin/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        setConfirmId(null);
        fetchStats();
      }
    } finally { setDeletingId(null); }
  };

  // ── BULK ACTIONS ─────────────────────────────────────────────────────────────
  const bulkAction = async (endpoint: string, label: string) => {
    setBulkLoading(label);
    setBulkResult(null);
    setBulkConfirm(null);
    try {
      const res = await fetch(`${API}/${endpoint}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBulkResult({ action: label, count: data.deleted });
        fetchStats();
        fetchUsers();
      }
    } finally { setBulkLoading(null); }
  };

  const statCards = stats ? [
    { label: 'Usuarios (USER)', value: stats.users, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Órdenes de Tickets', value: stats.orders, icon: Ticket, color: 'text-neon-green', bg: 'bg-neon-green/10' },
    { label: 'Órdenes de Tienda', value: stats.shopOrders, icon: ShoppingBag, color: 'text-neon-purple', bg: 'bg-neon-purple/10' },
    { label: 'Tickets PENDIENTES', value: stats.pendingOrders, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: 'Tienda PENDIENTES', value: stats.pendingShopOrders, icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'QR Codes generados', value: stats.qrCodes, icon: QrCode, color: 'text-zinc-400', bg: 'bg-zinc-800' },
  ] : [];

  return (
    <AdminGuard>
      <div className="p-4 md:p-8 max-w-6xl mx-auto pb-24 min-h-screen">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-widest text-white">Limpieza de BD</h1>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-0.5">Elimina datos de prueba — Solo OWNER</p>
            </div>
          </div>
          <button onClick={() => { fetchStats(); fetchUsers(); }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-xs font-black uppercase tracking-widest">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </header>

        {/* Bulk result toast */}
        {bulkResult && (
          <div className="mb-6 flex items-center gap-3 bg-neon-green/10 border border-neon-green/30 rounded-2xl px-5 py-4 animate-in fade-in duration-300">
            <CheckCircle className="w-5 h-5 text-neon-green shrink-0" />
            <p className="text-neon-green text-sm font-black uppercase tracking-widest">
              ✅ {bulkResult.action}: {bulkResult.count} eliminados
            </p>
            <button onClick={() => setBulkResult(null)} className="ml-auto text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Stats grid */}
        <section className="mb-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4">Estado Actual de la Base de Datos</h2>
          {statsLoading ? (
            <div className="flex items-center gap-3 text-zinc-600"><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs font-black uppercase tracking-widest">Cargando estadísticas...</span></div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {statCards.map(c => (
                <div key={c.label} className={`${c.bg} rounded-2xl border border-white/5 p-4 flex flex-col gap-2`}>
                  <c.icon className={`w-5 h-5 ${c.color}`} />
                  <span className={`text-3xl font-black ${c.color}`}>{c.value}</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 leading-tight">{c.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Bulk Actions */}
        <section className="mb-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 mb-4">Acciones Masivas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Purge pending tickets */}
            <div className="bg-orange-950/20 border border-orange-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <Ticket className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">PENDING de Tickets</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{stats?.pendingOrders ?? '—'} órdenes por eliminar</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Borra todas las órdenes de ticket en estado PENDING que quedaron de pruebas sin completar.</p>
              {bulkConfirm === 'tickets' ? (
                <div className="flex gap-2">
                  <button onClick={() => setBulkConfirm(null)} className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-xs font-black uppercase hover:bg-zinc-900 transition-all">Cancelar</button>
                  <button onClick={() => bulkAction('users/admin/cleanup/pending-tickets', 'Tickets PENDING')} disabled={!!bulkLoading}
                    className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {bulkLoading === 'Tickets PENDING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirmar
                  </button>
                </div>
              ) : (
                <button onClick={() => setBulkConfirm('tickets')} disabled={!stats?.pendingOrders || !!bulkLoading}
                  className="w-full py-2.5 rounded-xl border border-orange-500/40 text-orange-400 text-xs font-black uppercase hover:bg-orange-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" /> Eliminar {stats?.pendingOrders ?? 0} órdenes PENDING
                </button>
              )}
            </div>

            {/* Purge pending shop orders */}
            <div className="bg-yellow-950/20 border border-yellow-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <ShoppingBag className="w-5 h-5 text-yellow-400" />
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">PENDING de Tienda</h3>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{stats?.pendingShopOrders ?? '—'} órdenes por eliminar</p>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Borra todas las órdenes de tienda en estado PENDING (pagos iniciados pero no completados).</p>
              {bulkConfirm === 'shop' ? (
                <div className="flex gap-2">
                  <button onClick={() => setBulkConfirm(null)} className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-xs font-black uppercase hover:bg-zinc-900 transition-all">Cancelar</button>
                  <button onClick={() => bulkAction('users/admin/cleanup/pending-shop-orders', 'Shop PENDING')} disabled={!!bulkLoading}
                    className="flex-1 py-2 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-black text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50">
                    {bulkLoading === 'Shop PENDING' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirmar
                  </button>
                </div>
              ) : (
                <button onClick={() => setBulkConfirm('shop')} disabled={!stats?.pendingShopOrders || !!bulkLoading}
                  className="w-full py-2.5 rounded-xl border border-yellow-500/40 text-yellow-400 text-xs font-black uppercase hover:bg-yellow-500/10 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" /> Eliminar {stats?.pendingShopOrders ?? 0} órdenes PENDING
                </button>
              )}
            </div>

          </div>
        </section>

        {/* User list with individual delete */}
        <section>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Usuarios Registrados — Eliminar Uno a Uno</h2>
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full md:w-64 bg-black/60 border border-zinc-800 rounded-xl py-2.5 px-4 text-white text-sm outline-none focus:border-red-500/50 transition-all"
            />
          </div>

          {usersLoading ? (
            <div className="py-16 flex items-center justify-center gap-3 text-zinc-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-black uppercase tracking-widest">Cargando usuarios...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center border border-zinc-900 border-dashed rounded-2xl">
              <ShieldAlert className="w-10 h-10 text-zinc-800 mx-auto mb-3" />
              <p className="text-xs text-zinc-600 font-black uppercase tracking-widest">No hay usuarios que coincidan.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header */}
              <div className="hidden md:grid grid-cols-[2fr_2fr_100px_100px_80px] gap-4 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-700">
                <div>Nombre</div><div>Email</div><div>Rol</div><div>Creado</div><div className="text-right">Acción</div>
              </div>

              {users.map(user => (
                <div key={user.id}
                  className={`bg-black/40 border rounded-xl p-4 flex flex-col md:grid md:grid-cols-[2fr_2fr_100px_100px_80px] items-center gap-4 transition-all ${confirmId === user.id ? 'border-red-500/50 bg-red-950/20' : 'border-zinc-900/60 hover:border-zinc-700'}`}>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-black text-xs uppercase shrink-0">
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-white truncate">{user.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500 w-full md:w-auto truncate">{user.email}</span>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg w-fit ${
                    user.role === 'OWNER' ? 'bg-neon-green/10 text-neon-green' :
                    user.role === 'STAFF' ? 'bg-neon-purple/10 text-neon-purple' :
                    'bg-zinc-800 text-zinc-500'
                  }`}>{user.role}</span>
                  <span className="text-[10px] text-zinc-600 w-full md:w-auto">{new Date(user.created_at).toLocaleDateString('es-CO')}</span>

                  <div className="flex items-center justify-end gap-2 w-full md:w-auto">
                    {confirmId === user.id ? (
                      <>
                        <button onClick={() => setConfirmId(null)}
                          className="px-2 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 text-[9px] font-black uppercase hover:bg-zinc-800 transition-all">
                          No
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} disabled={deletingId === user.id}
                          className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[9px] font-black uppercase transition-all flex items-center gap-1 disabled:opacity-50">
                          {deletingId === user.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Sí
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { if (user.role !== 'OWNER') handleDeleteUser(user.id); }}
                        disabled={user.role === 'OWNER' || !!deletingId}
                        title={user.role === 'OWNER' ? 'No puedes eliminar al propietario' : 'Eliminar usuario y todos sus datos'}
                        className="p-2 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-25 disabled:cursor-not-allowed">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!usersLoading && meta.last_page > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase text-zinc-400 disabled:opacity-30 hover:bg-zinc-800 transition-all">← Anterior</button>
              <span className="text-sm font-black text-white">{page} / {meta.last_page}</span>
              <button disabled={page === meta.last_page} onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-black uppercase text-zinc-400 disabled:opacity-30 hover:bg-zinc-800 transition-all">Siguiente →</button>
            </div>
          )}
        </section>
      </div>
    </AdminGuard>
  );
}
