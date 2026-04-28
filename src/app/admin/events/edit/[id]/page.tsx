"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Image as ImageIcon, Upload, Plus, Trash2, ArrowLeft, Loader2, Save } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import SeoPanel from '@/components/SeoPanel';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EditEventPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '', description: '', date: '', venue: '', status: 'PUBLISHED'
  });
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [flyerUrl, setFlyerUrl] = useState<string>('');
  const [seo, setSeo]           = useState({ seo_title: '', seo_description: '', seo_slug: '' });
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const formatForInput = (dateStr: any) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${params.id}`);
        if (res.ok) {
          const event = await res.json();
          setFormData({
            title: event.title,
            description: event.description || '',
            date: formatForInput(event.date),
            venue: event.venue,
            status: event.status
          });
          setFlyerUrl(event.flyer_url || '');
          setSeo({
            seo_title:       event.seo_title       || '',
            seo_description: event.seo_description || '',
            seo_slug:        event.seo_slug        || '',
          });
          setTicketTypes(event.ticket_types.map((t: any) => ({
             ...t,
             sale_start: formatForInput(t.sale_start),
             sale_end: formatForInput(t.sale_end)
          })));
        } else {
          setSubmitError('Evento no encontrado');
        }
      } catch (e) {
        setSubmitError('Error de conexión');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [params.id]);

  const handleSubidaImagen = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('flyers')
      .upload(fileName, file);

    if (error) {
       alert("Ocurrió un error subiendo la imagen: " + error.message + ".");
    } else {
       const url = supabase.storage.from('flyers').getPublicUrl(fileName).data.publicUrl;
       setFlyerUrl(url);
    }
    setUploading(false);
  };

  const handleTicketChange = (index: number, field: string, value: any) => {
    const newTickets = [...ticketTypes];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setTicketTypes(newTickets);
  };

  const setHourlyPreset = (index: number, timeStr: string, nextDay: boolean = false) => {
    if (!formData.date) return;
    const eventDate = new Date(formData.date);
    if (nextDay) eventDate.setDate(eventDate.getDate() + 1);
    
    const [hours, minutes] = timeStr.split(':');
    eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    // Format to YYYY-MM-DDTHH:mm
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');
    const hh = String(eventDate.getHours()).padStart(2, '0');
    const mm = String(eventDate.getMinutes()).padStart(2, '0');
    
    handleTicketChange(index, 'sale_end', `${year}-${month}-${day}T${hh}:${mm}`);
  };

  const actualizarEvento = async () => {
    if (!formData.title || !formData.date) {
       return alert("⚠️ Faltan datos esenciales.");
    }
    
    setPublishing(true);
    setSubmitError('');
    setSaveSuccess(false);
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${params.id}`, {
        method: 'PUT',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
           ...formData,
           ...seo,
           date: new Date(formData.date).toISOString(),
           flyer_url: flyerUrl,
           ticket_types: ticketTypes.map((t: any) => ({
             ...t,
             sale_start: t.sale_start ? new Date(t.sale_start).toISOString() : null,
             sale_end: t.sale_end ? new Date(t.sale_end).toISOString() : null
           }))
        })
      });

      if (res.ok) {
         setSaveSuccess(true);
         setTimeout(() => setSaveSuccess(false), 3000);
      } else {
         const data = await res.json();
         setSubmitError("Error del Servidor: " + (data.message || 'Falló la actualización'));
      }
    } catch(e) {
      setSubmitError("Error de conexión");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#030303] flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-neon-purple" /></div>;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#030303] text-white p-4 md:p-8 lg:p-12 relative overflow-hidden flex flex-col lg:flex-row gap-8">
        {/* LADO IZQUIERDO: FORMULARIO (60%) */}
        <div className="w-full lg:w-[60%] space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
          <header>
            <Link href="/admin/events" className="inline-flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-all mb-4 uppercase font-bold tracking-widest text-[10px]">
              <ArrowLeft className="w-4 h-4" /> Volver al Manager
            </Link>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2 leading-none">
               Editar <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 text-blue-500">Evento</span>
            </h1>
            <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Ajustes Técnicos y de Boletería</p>
          </header>

          <div className="space-y-8 pb-20">
            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <section className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Save className="w-4 h-4 text-blue-500" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Configuración Base</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Nombre del Evento</label>
                  <input type="text" className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white hover:border-zinc-500 focus:border-blue-500 outline-none transition-all" 
                     value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Venue</label>
                  <input type="text" className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white hover:border-zinc-500 focus:border-blue-500 outline-none transition-all" 
                     value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Fecha</label>
                  <input type="datetime-local" className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white hover:border-zinc-500 focus:border-blue-500 outline-none transition-all" 
                     value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Descripción</label>
                  <textarea rows={3} className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white hover:border-zinc-500 focus:border-blue-500 outline-none transition-all resize-none" 
                     value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Estado de Visibilidad</label>
                  <select 
                    className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white hover:border-zinc-500 focus:border-blue-500 outline-none transition-all cursor-pointer"
                    value={formData.status} 
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                     <option value="PUBLISHED">🟢 PUBLICADO</option>
                     <option value="DRAFT">🔴 BORRADOR (OCULTO)</option>
                  </select>
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: BOLETERÍA EDITABLE */}
            <section className="space-y-6">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-neon-green/20 flex items-center justify-center border border-neon-green/30">
                       <Plus className="w-4 h-4 text-neon-green" />
                     </div>
                     <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Gestión de Boletas</h2>
                   </div>
                   <button 
                     onClick={() => setTicketTypes([...ticketTypes, { name: 'Nueva Fase', price: 80000, capacity: 100, sale_start: '', sale_end: '', hide_stock: false }])}
                     className="bg-zinc-800 hover:bg-neon-green hover:text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                   >
                     + Añadir Fase
                   </button>
               </div>

               <div className="grid grid-cols-1 gap-4">
                 {ticketTypes.map((t: any, index: number) => (
                    <div key={index} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-black/40 hover:border-zinc-600 transition-all relative group">
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => setTicketTypes(ticketTypes.filter((_, i) => i !== index))} className="text-zinc-600 hover:text-red-500 p-2 transition-colors">
                            <Trash2 className="w-5 h-5" />
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        <div className="md:col-span-4 space-y-2">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Nombre</label>
                          <input type="text" className="w-full bg-transparent text-lg font-black uppercase placeholder:text-zinc-800 outline-none border-b border-zinc-900 focus:border-blue-500" 
                            value={t.name} onChange={e => handleTicketChange(index, 'name', e.target.value)} />
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Precio ($)</label>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black text-neon-green">$</span>
                            <input type="number" className="w-full bg-zinc-900/50 rounded-xl py-3 px-4 text-xl font-black text-neon-green outline-none border border-zinc-800 focus:border-neon-green shadow-inner" 
                              value={t.price} onChange={e => handleTicketChange(index, 'price', e.target.value)} />
                          </div>
                        </div>

                        <div className="md:col-span-4 space-y-2">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Capacidad</label>
                          <input type="number" className="w-full bg-zinc-900/50 rounded-xl py-3 px-4 text-xl font-black text-white text-center outline-none border border-zinc-800 focus:border-white shadow-inner" 
                               value={t.capacity} onChange={e => handleTicketChange(index, 'capacity', e.target.value)} />
                          <div className="flex items-center gap-2 mt-2 pl-1">
                            <input type="checkbox" id={`hideStock-${index}`} checked={t.hide_stock || false} onChange={e => handleTicketChange(index, 'hide_stock', e.target.checked)} className="accent-neon-purple w-3 h-3" />
                            <label htmlFor={`hideStock-${index}`} className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest cursor-pointer">Ocultar Stock Exacto</label>
                          </div>
                        </div>

                        {/* Configuración de Venta por Fechas */}
                        <div className="md:col-span-12 pt-4 mt-2 border-t border-zinc-900/50">
                          <div className="flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-2">
                               <label className="text-[10px] text-zinc-300 uppercase tracking-widest font-black">📅 Fecha y Hora de APERTURA</label>
                               <input type="datetime-local" className="w-full bg-black/40 rounded-xl py-4 px-5 text-sm text-white outline-none border border-zinc-700 hover:border-blue-500 focus:border-blue-500 transition-all font-mono" 
                                  value={t.sale_start || ''} onChange={e => handleTicketChange(index, 'sale_start', e.target.value)} />
                               <p className="text-[9px] text-zinc-600 font-bold uppercase px-1">La fase empieza a venderse en este momento.</p>
                            </div>
                            <div className="flex-1 space-y-2">
                               <label className="text-[10px] text-zinc-300 uppercase tracking-widest font-black">🔴 Fecha y Hora de CIERRE</label>
                               <input type="datetime-local" className="w-full bg-black/40 rounded-xl py-4 px-5 text-sm text-white outline-none border border-zinc-700 hover:border-red-500 focus:border-red-500 transition-all font-mono" 
                                  value={t.sale_end || ''} onChange={e => handleTicketChange(index, 'sale_end', e.target.value)} />

                               <div className="flex gap-2 pt-2">
                                  <button onClick={() => setHourlyPreset(index, '23:00')} className="bg-zinc-800 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-zinc-700">Set 11 PM</button>
                                  <button onClick={() => setHourlyPreset(index, '01:00', true)} className="bg-zinc-800 hover:bg-zinc-600 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-zinc-700">Set 1 AM</button>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                 ))}
               </div>
            </section>

            {/* SEO Panel — como Shopify */}
            <SeoPanel
              title={formData.title}
              content={formData.description}
              value={seo}
              onChange={setSeo}
              baseUrl="kasadelsol.co"
            />

            {submitError && <div className="text-red-500 text-xs font-bold uppercase tracking-widest mt-4 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{submitError}</div>}
            {saveSuccess && <div className="text-neon-green text-xs font-bold uppercase tracking-widest mt-4 bg-neon-green/10 p-4 rounded-xl border border-neon-green/20">✅ Cambios guardados correctamente</div>}
            
            <button 
              onClick={actualizarEvento} 
              disabled={uploading || publishing || saveSuccess} 
              className={`w-full mt-6 text-white font-black uppercase tracking-[0.2em] text-sm py-6 rounded-2xl transition-all flex justify-center items-center gap-3 ${saveSuccess ? 'bg-neon-green text-black scale-95 opacity-50' : 'bg-blue-600 hover:bg-white hover:text-black hover:shadow-[0_0_40px_rgba(37,99,235,0.4)]'}`}
            >
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : saveSuccess ? '¡Guardado!' : <>Confirmar Cambios <Save className="w-4 h-4" /></>}
            </button>
          </div>
        </div>

        {/* LADO DERECHO: VISOR (40%) */}
        <div className="hidden lg:flex w-full lg:w-[40%] flex-col gap-6 sticky top-12 h-fit">
           <div className="glass-panel overflow-hidden rounded-[2.5rem] border border-zinc-800 shadow-2xl bg-zinc-900/10 relative p-4 pb-12">
              <div className="aspect-[4/5] w-full rounded-[2rem] overflow-hidden bg-black flex items-center justify-center relative group">
                <input type="file" accept="image/*" onChange={handleSubidaImagen} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                
                {flyerUrl ? (
                    <img src={flyerUrl} alt="Flyer" className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="flex flex-col items-center opacity-30">
                    <ImageIcon className="w-20 h-20 text-zinc-700 mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-widest text-zinc-500">Sin Imagen</h3>
                  </div>
                )}
                {uploading && <div className="absolute inset-0 bg-black/60 z-40 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}
              </div>

              <div className="mt-8 px-4">
                  <h4 className="text-2xl font-black uppercase tracking-tight text-white">{formData.title}</h4>
                  <p className="text-xs text-blue-500 font-bold uppercase tracking-widest">{formData.venue}</p>
              </div>
           </div>
           
           <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-3xl flex items-start gap-4">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mt-1.5 shrink-0" />
              <p className="text-xs text-zinc-400 leading-relaxed font-medium capitalize">Estás en modo edición. cualquier cambio afectará la visibilidad real del evento y los precios de venta activos.</p>
           </div>
        </div>
      </div>
    </AdminGuard>
  );
}
