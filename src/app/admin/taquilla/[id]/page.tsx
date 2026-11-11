"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Loader2, Check, DollarSign, Users, Trash2, Star } from 'lucide-react';

export default function TaquillaEventPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', cedula: '', email: '', amount: '', rating: 0, rating_comment: '', promoter_code: '' });
  const [error, setError] = useState('');

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const fetchData = async () => {
    const token = getToken();
    const headers = { 'Authorization': `Bearer ${token}` };
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const [evRes, salesRes] = await Promise.all([
      fetch(`${API}/events/${params.id}`, { headers }),
      fetch(`${API}/walk-in/${params.id}`, { headers })
    ]);
    if (evRes.ok) setEvent(await evRes.json());
    if (salesRes.ok) setSales(await salesRes.json());
  };

  useEffect(() => { fetchData(); }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || isNaN(Number(form.amount))) {
      setError('El costo es requerido y debe ser un número.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/walk-in/${params.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          name: form.name || undefined,
          cedula: form.cedula || undefined,
          email: form.email || undefined,
          amount: Number(form.amount),
          rating: form.rating > 0 ? form.rating : undefined,
          rating_comment: form.rating_comment || undefined,
          promoter_code: form.promoter_code || undefined
        })
      });

      if (res.ok) {
        const newSale = await res.json();
        setSales(prev => [newSale, ...prev]);
        setForm({ name: '', cedula: '', email: '', amount: '', rating: 0, rating_comment: '', promoter_code: '' });
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      } else {
        const d = await res.json();
        setError(d.message || 'Error al registrar');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const totalRecaudado = sales.reduce((s, x) => s + x.amount, 0);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#050505] text-white">
      {/* IZQUIERDA: FORMULARIO */}
      <div className="w-full lg:w-5/12 xl:w-4/12 p-6 md:p-10 border-b lg:border-b-0 lg:border-r border-zinc-800 lg:h-screen lg:sticky lg:top-0 overflow-y-auto flex flex-col">
        <Link href="/admin/taquilla" className="inline-flex items-center gap-2 text-zinc-500 hover:text-orange-400 transition-colors mb-8 uppercase font-bold tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4" /> Todos los Eventos
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 px-3 py-1 rounded-full text-orange-400 text-[10px] font-black uppercase tracking-widest mb-3">
            🚪 Taquilla Activa
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-widest text-white leading-tight">
            {event?.title || 'Cargando...'}
          </h1>
          <p className="text-zinc-500 text-xs mt-2 tracking-widest uppercase font-bold">
            {event && new Date(event.date).toLocaleDateString()} · {event?.venue}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <Users className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">En Puerta</span>
            </div>
            <p className="text-3xl font-black">{sales.length}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-neon-green mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest">Recaudado</span>
            </div>
            <p className="text-3xl font-black">${totalRecaudado.toLocaleString()}</p>
          </div>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Registrar Nuevo Asistente</h2>
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Nombre <span className="text-zinc-600">(optional)</span></label>
            <input type="text" placeholder="Ej: Juan Pérez" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-3 px-4 text-white hover:border-zinc-600 focus:border-orange-500 outline-none transition-colors text-sm" />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Cédula <span className="text-zinc-600">(opcional)</span></label>
            <input type="text" placeholder="Ej: 1234567890" value={form.cedula} onChange={e => setForm({...form, cedula: e.target.value})}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-3 px-4 text-white hover:border-zinc-600 focus:border-orange-500 outline-none transition-colors text-sm" />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Correo <span className="text-zinc-600">(opcional)</span></label>
            <input type="email" placeholder="Ej: juan@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-3 px-4 text-white hover:border-zinc-600 focus:border-orange-500 outline-none transition-colors text-sm" />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Costo de Entrada (COP) <span className="text-red-500">*</span></label>
            <input type="number" placeholder="Ej: 50000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-3 px-4 text-white hover:border-zinc-600 focus:border-orange-500 outline-none transition-colors text-sm" />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1.5">Código Promotor <span className="text-zinc-600">(opcional)</span></label>
            <input type="text" placeholder="Ej: JUANVIP5" value={form.promoter_code} onChange={e => setForm({...form, promoter_code: e.target.value.toUpperCase()})}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg py-3 px-4 text-white hover:border-zinc-600 focus:border-neon-purple outline-none transition-colors text-sm uppercase font-mono" />
          </div>

          <div className="pt-2 border-t border-zinc-800 mt-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black block mb-2">Calificación del Asistente (Interno)</label>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  className={`p-1 transition-all ${form.rating >= star ? 'text-orange-400 scale-110' : 'text-zinc-700 hover:text-orange-900'}`}
                >
                  <Star className="w-6 h-6" fill={form.rating >= star ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
            
            <textarea
              placeholder="Comentarios internos sobre el comportamiento/calidad (opcional)"
              value={form.rating_comment}
              onChange={e => setForm({ ...form, rating_comment: e.target.value })}
              className="w-full bg-zinc-900/40 border border-zinc-800 rounded-lg py-2 px-3 text-white text-xs hover:border-zinc-700 focus:border-orange-500/50 outline-none transition-colors h-20 resize-none"
            />
          </div>

          {error && <p className="text-red-400 text-xs font-bold uppercase tracking-widest">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full mt-2 bg-orange-500 hover:bg-orange-400 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] text-white font-black uppercase tracking-widest py-4 rounded-xl transition-all flex justify-center items-center gap-2 text-sm">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <><Check className="w-5 h-5" /> ¡Registrado!</> : <><UserPlus className="w-5 h-5" /> Registrar Asistente</>}
          </button>
        </form>
      </div>

      {/* DERECHA: LISTADO */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6">
          Asistentes Registrados en Puerta
        </h2>

        {sales.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-zinc-800 rounded-2xl">
            <Users className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Aún no hay registros.<br />Usa el formulario para añadir asistentes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale: any, idx: number) => (
              <div key={sale.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-black text-sm shrink-0">
                    {sales.length - idx}
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">{sale.name || <span className="text-zinc-500 italic text-xs">Anónimo</span>}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {sale.cedula && <span className="text-[10px] text-zinc-500 font-bold">CC: {sale.cedula}</span>}
                      {sale.email && <span className="text-[10px] text-zinc-500 font-bold">{sale.email}</span>}
                      {!sale.cedula && !sale.email && <span className="text-[10px] text-zinc-600 italic">Sin datos adicionales</span>}
                    </div>
                    {sale.promoter_code && (
                      <div className="inline-block bg-neon-purple/10 border border-neon-purple/30 rounded px-2 py-0.5 mt-1.5">
                        <span className="text-[9px] text-neon-purple font-black uppercase tracking-widest font-mono">Promotor: {sale.promoter_code.code || sale.promoter_code}</span>
                      </div>
                    )}
                    {sale.rating && (
                      <div className="flex items-center gap-0.5 mt-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-2.5 h-2.5 ${s <= sale.rating ? 'text-orange-400' : 'text-zinc-800'}`} fill={s <= sale.rating ? "currentColor" : "none"} />
                        ))}
                        {sale.rating_comment && <span className="ml-2 text-[9px] text-zinc-500 italic max-w-[200px] truncate">"{sale.rating_comment}"</span>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-neon-green text-lg">${sale.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-zinc-600">{new Date(sale.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
