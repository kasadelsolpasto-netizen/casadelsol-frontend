"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Image as ImageIcon, Upload, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function NewEventPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '', description: '', date: '', venue: ''
  });
  const [flyerUrl, setFlyerUrl] = useState<string>('');
  const [ticketTypes, setTicketTypes] = useState([{ name: 'General', price: 60000, capacity: 100, sale_start: '', sale_end: '' }]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  const handleTicketChange = (index: number, field: string, value: string) => {
    const newTickets = [...ticketTypes];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setTicketTypes(newTickets);
  }

  const setHourlyPreset = (index: number, timeStr: string, nextDay: boolean = false) => {
    if (!formData.date) return alert("Primero selecciona la fecha del evento");
    const eventDate = new Date(formData.date);
    if (nextDay) eventDate.setDate(eventDate.getDate() + 1);
    
    const [hours, minutes] = timeStr.split(':');
    eventDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    const year = eventDate.getFullYear();
    const month = String(eventDate.getMonth() + 1).padStart(2, '0');
    const day = String(eventDate.getDate()).padStart(2, '0');
    const hh = String(eventDate.getHours()).padStart(2, '0');
    const mm = String(eventDate.getMinutes()).padStart(2, '0');
    
    handleTicketChange(index, 'sale_end', `${year}-${month}-${day}T${hh}:${mm}`);
  };

  const publicarEvento = async () => {
    if (!formData.title || !formData.date || !flyerUrl) {
       return alert("⚠️ Faltan datos esenciales o el Flyer del evento.");
    }
    
    setPublishing(true);
    setSubmitError('');
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events`, {
        method: 'POST',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
           ...formData,
           flyer_url: flyerUrl,
           status: 'PUBLISHED',
           ticket_types: ticketTypes
        })
      });

      if (res.ok) {
         router.push('/');
      } else {
         const data = await res.json();
         setSubmitError("Error del Servidor: " + (data.message || 'Falló la creación'));
      }
    } catch(e) {
      setSubmitError("Error de conexión");
    } finally {
      setPublishing(false);
    }
  }

  r    <AdminGuard>
      <div className="min-h-screen bg-[#030303] text-white p-4 md:p-8 lg:p-12 relative overflow-hidden flex flex-col lg:flex-row gap-8">
        {/* LADO IZQUIERDO: FORMULARIO ROBUSTO (60%) */}
        <div className="w-full lg:w-[60%] space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
          <header>
            <Link href="/admin" className="inline-flex items-center gap-2 text-zinc-500 hover:text-neon-purple transition-all mb-4 uppercase font-bold tracking-widest text-[10px]">
              <ArrowLeft className="w-4 h-4" /> Volver al Tablero
            </Link>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-white mb-2 leading-none">
               Crear <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-green">Evento</span>
            </h1>
            <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Lanzamiento Oficial Kasa del Sol</p>
          </header>

          <div className="space-y-8 pb-20">
            {/* SECCIÓN 1: DATOS BÁSICOS */}
            <section className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-neon-purple/20 flex items-center justify-center border border-neon-purple/30">
                  <Plus className="w-4 h-4 text-neon-purple" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Información General</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Nombre del Rave</label>
                  <input type="text" placeholder="Ej: RITUAL SENSORIAL VOL 1" className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white placeholder:text-zinc-700 hover:border-zinc-500 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all" 
                     value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Ubicación / Venue</label>
                  <input type="text" placeholder="Localización Secreta" className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white placeholder:text-zinc-700 hover:border-zinc-500 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all" 
                     value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Fecha y Hora de Apertura</label>
                  <input type="datetime-local" className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white hover:border-zinc-500 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all" 
                     value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1">Descripción de la Experiencia</label>
                  <textarea rows={3} placeholder="Música, vibras y techno hasta el amanecer..." className="w-full bg-black border border-zinc-800 rounded-xl py-4 px-5 text-white placeholder:text-zinc-700 hover:border-zinc-500 focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all resize-none" 
                     value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
            </section>

            {/* SECCIÓN 2: AFICHE (MOBILE-ONLY PREVIEW) */}
            <div className="lg:hidden">
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-black ml-1 mb-2 block">Imagen del Evento</label>
                <div className="relative group">
                  <input type="file" accept="image/*" onChange={handleSubidaImagen} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                  <div className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all ${uploading ? 'border-neon-purple bg-neon-purple/5' : 'border-zinc-800 bg-zinc-900/20 group-hover:border-zinc-600'}`}>
                    {flyerUrl ? (
                      <img src={flyerUrl} className="w-20 h-20 object-cover rounded-lg mb-2" alt="mini-preview" />
                    ) : (
                      <Upload className="w-8 h-8 text-zinc-500 mb-2" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-widest">{uploading ? 'Subiendo...' : 'Actualizar Flyer'}</span>
                  </div>
                </div>
            </div>

            {/* SECCIÓN 3: BOLETERÍA POR FASES */}
            <section className="space-y-6">
               <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-neon-green/20 flex items-center justify-center border border-neon-green/30">
                       <Plus className="w-4 h-4 text-neon-green" />
                     </div>
                     <h2 className="text-sm font-black uppercase tracking-widest text-zinc-300">Etapas de Venta</h2>
                   </div>
                   <button 
                     onClick={() => setTicketTypes([...ticketTypes, { name: 'Siguiente Fase', price: 80000, capacity: 100, sale_start: '', sale_end: '' }])}
                     className="bg-zinc-800 hover:bg-neon-green hover:text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border border-zinc-700"
                   >
                     <Plus className="w-3 h-3" /> Añadir Nueva Etapa
                   </button>
               </div>

               <div className="grid grid-cols-1 gap-4">
                 {ticketTypes.map((t: any, index: number) => (
                    <div key={index} className="glass-panel p-6 rounded-2xl border border-zinc-800 bg-black/40 hover:border-zinc-600 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => setTicketTypes(ticketTypes.filter((_, i) => i !== index))} className="text-zinc-600 hover:text-red-500 p-2 transition-colors">
                            <Trash2 className="w-5 h-5" />
                         </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                        {/* Identificador de Fase */}
                        <div className="md:col-span-4 space-y-2">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Nombre de la Fase</label>
                          <input type="text" placeholder="Ej: Early Bird" className="w-full bg-transparent text-lg font-black uppercase placeholder:text-zinc-800 outline-none border-b border-zinc-900 focus:border-neon-purple transition-all" 
                            value={t.name} onChange={e => handleTicketChange(index, 'name', e.target.value)} />
                        </div>

                        {/* Precio Relevante */}
                        <div className="md:col-span-5 space-y-2">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Precio de Venta ($)</label>
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-black text-neon-green">$</span>
                            <input type="number" placeholder="60000" className="w-full bg-zinc-900/50 rounded-xl py-3 px-4 text-xl font-black text-neon-green outline-none border border-zinc-800 focus:border-neon-green shadow-inner" 
                              value={t.price} onChange={e => handleTicketChange(index, 'price', e.target.value)} />
                          </div>
                        </div>

                        {/* Cupos */}
                        <div className="md:col-span-3 space-y-2">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Disponibilidad</label>
                          <div className="flex items-center gap-2">
                            <input type="number" placeholder="000" className="w-full bg-zinc-900/50 rounded-xl py-3 px-4 text-xl font-black text-white text-center outline-none border border-zinc-800 focus:border-white shadow-inner" 
                               value={t.capacity} onChange={e => handleTicketChange(index, 'capacity', e.target.value)} />
                            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Tickets</span>
                          </div>
                        </div>

                        {/* Rango de Fechas (Opcional) */}
                        <div className="md:col-span-6 space-y-2 pt-2 border-t border-zinc-900">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Inicia Venta (Automático)</label>
                          <input type="datetime-local" className="w-full bg-black/40 rounded-lg py-2 px-3 text-xs text-zinc-400 outline-none border border-zinc-800 focus:border-neon-purple transition-all" 
                             value={t.sale_start || ''} onChange={e => handleTicketChange(index, 'sale_start', e.target.value)} />
                        </div>
                        <div className="md:col-span-6 space-y-2 pt-2 border-t border-zinc-900">
                          <label className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Finaliza Venta (Automático)</label>
                          <input type="datetime-local" className="w-full bg-black/40 rounded-lg py-2 px-3 text-xs text-zinc-400 outline-none border border-zinc-800 focus:border-red-500 transition-all" 
                             value={t.sale_end || ''} onChange={e => handleTicketChange(index, 'sale_end', e.target.value)} />
                          
                          {/* Botonera de Tramos */}
                          <div className="flex gap-2 pt-2 overflow-x-auto pb-1 custom-scrollbar">
                             <button onClick={() => setHourlyPreset(index, '23:00')} className="bg-zinc-900 hover:bg-zinc-700 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border border-zinc-800 shrink-0">Cierra 11 PM</button>
                             <button onClick={() => setHourlyPreset(index, '01:00', true)} className="bg-zinc-900 hover:bg-zinc-700 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border border-zinc-800 shrink-0">Cierra 1 AM</button>
                             <button onClick={() => setHourlyPreset(index, '03:00', true)} className="bg-zinc-900 hover:bg-zinc-700 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-widest border border-zinc-800 shrink-0">Cierra 3 AM</button>
                          </div>
                        </div>
                      </div>
                    </div>
                 ))}
               </div>
            </section>

            {submitError && <div className="text-red-500 text-xs font-bold uppercase tracking-widest mt-4 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{submitError}</div>}
            
            <button 
              onClick={publicarEvento} 
              disabled={uploading || publishing} 
              className="w-full mt-6 bg-gradient-to-r from-neon-purple to-[#8a00ff] hover:from-white hover:to-white hover:text-black hover:shadow-[0_0_40px_rgba(191,0,255,0.4)] text-white font-black uppercase tracking-[0.2em] text-sm py-6 rounded-2xl transition-all flex justify-center items-center gap-3 disabled:opacity-50"
            >
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Publicar Lanzamiento <Upload className="w-4 h-4" /></>}
            </button>
          </div>
        </div>

        {/* LADO DERECHO: PREVISOR DEL AFICHE (40%) */}
        <div className="hidden lg:flex w-full lg:w-[40%] flex-col gap-6 sticky top-12 h-fit animate-in fade-in slide-in-from-right-4 duration-1000">
           <div className="glass-panel overflow-hidden rounded-[2.5rem] border border-zinc-800 shadow-2xl bg-zinc-900/10 relative p-4 pb-12">
              <div className="aspect-[4/5] w-full rounded-[2rem] overflow-hidden bg-black flex items-center justify-center relative group">
                <input type="file" accept="image/*" onChange={handleSubidaImagen} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" />
                
                {flyerUrl ? (
                   <>
                    <img src={flyerUrl} alt="Flyer preview" className="w-full h-full object-cover relative z-10 transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center backdrop-blur-sm">
                      <div className="bg-white text-black p-4 rounded-full">
                        <Upload className="w-6 h-6" />
                      </div>
                    </div>
                   </>
                ) : (
                  <div className="flex flex-col items-center text-center p-12 space-y-4">
                    <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 mb-2">
                       {uploading ? <Loader2 className="w-8 h-8 text-neon-purple animate-spin" /> : <ImageIcon className="w-8 h-8 text-zinc-700" />}
                    </div>
                    <h3 className="text-xl font-black uppercase tracking-widest text-zinc-500">{uploading ? 'Procesando...' : 'Cargar Flyer HD'}</h3>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-[0.2em] leading-relaxed">Selecciona el afiche oficial para desbloquear la vista previa</p>
                  </div>
                )}
              </div>

              <div className="mt-8 px-4 flex justify-between items-center">
                 <div className="space-y-1">
                    <h4 className="text-xl font-black uppercase tracking-tight text-white">{formData.title || 'Nombre del Rave'}</h4>
                    <p className="text-xs text-neon-purple font-bold uppercase tracking-widest">{formData.venue || 'Locación por confirmar'}</p>
                 </div>
                 <div className="text-right">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Estado</p>
                    <span className="text-[10px] bg-neon-green/10 text-neon-green border border-neon-green/20 px-3 py-1 rounded-full uppercase font-black">Ready</span>
                 </div>
              </div>

              {/* Decorative light effect */}
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-neon-purple/20 blur-[100px] pointer-events-none"></div>
           </div>

           <div className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-3xl flex items-start gap-4">
              <Upload className="w-6 h-6 text-zinc-500 shrink-0" />
              <div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium">Tip: Sube imágenes verticales de alta calidad (1080x1350) para que se vean increíbles en la pantalla principal de los móviles.</p>
              </div>
           </div>
        </div>

        {/* Ambient background glows */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 opacity-30">
          <div className="absolute top-[20%] right-[10%] w-96 h-96 bg-neon-purple/20 blur-[150px] rounded-full animate-pulse-slow"></div>
          <div className="absolute bottom-[10%] left-[5%] w-96 h-96 bg-neon-green/10 blur-[150px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s'}}></div>
        </div>
      </div>
    </AdminGuard>

    </AdminGuard>
  );
}
