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

  const publicarEvento = async () => {
    if (!formData.title || !formData.date || !flyerUrl) {
       return alert("⚠️ Faltan datos esenciales o el Flyer del evento.");
    }
    
    setPublishing(true);
    setSubmitError('');
    try {
      const tokenRow = document.cookie.split('; ').find(row => row.startsWith('kasa_auth_token='));
      const authToken = tokenRow ? tokenRow.split('=')[1] : null;

      const res = await fetch('http://localhost:3001/events', {
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

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#070000] text-white p-6 relative overflow-hidden flex flex-col md:flex-row">
        {/* LADO IZQUIERDO: CONTROLES */}
        <div className="w-full md:w-1/2 p-6 md:p-12 overflow-y-auto h-screen custom-scrollbar relative z-10 border-r border-zinc-900 bg-black">
          <Link href="/admin" className="inline-flex items-center gap-2 text-zinc-500 hover:text-neon-purple transition-colors mb-8 uppercase font-bold tracking-widest text-xs">
            <ArrowLeft className="w-4 h-4" /> Volver al Admin
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-2">Nuevo Lanzamiento</h1>
          <p className="text-zinc-400 text-sm mb-10">Configura la información del rave, sube el flyer oficial y define las etapas de venta en un solo paso.</p>

          <div className="space-y-6">
            {/* FOTO UPLOAD */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neon-green mb-3">Afiche Oficial (Flyer)</label>
              <div className="w-full relative">
                 <input type="file" accept="image/*" onChange={handleSubidaImagen} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                 <div className={`glass-panel border-2 border-dashed ${uploading ? 'border-neon-purple animate-pulse' : 'border-zinc-700 hover:border-white'} rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all`}>
                   {uploading ? (
                      <Loader2 className="w-10 h-10 text-neon-purple animate-spin mb-3" />
                   ) : (
                      <Upload className="w-10 h-10 text-zinc-500 mb-3" />
                   )}
                   <span className="font-bold text-sm text-zinc-300">{uploading ? 'Transfiriendo Nube...' : 'Haz Clic para Subir Imagen HD'}</span>
                   <span className="text-xs text-zinc-600 mt-1">Recomendado vertical (1080x1350)</span>
                 </div>
              </div>
            </div>

            {/* DATOS BÁSICOS */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Título del Evento</label>
                 <input type="text" placeholder="Ej: TECHNO DOME VOL 4" className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-neon-purple outline-none transition-colors" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Fecha y Hora</label>
                 <input type="datetime-local" className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-neon-purple outline-none transition-colors" 
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Locación (Venue)</label>
                 <input type="text" placeholder="Secret Location" className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-neon-purple outline-none transition-colors" 
                    value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Descripción (Atraer al público)</label>
                 <textarea rows={3} placeholder="Música toda la noche, 2 ambientes..." className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-neon-purple outline-none transition-colors" 
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
               </div>
            </div>

            {/* TICKET TIERS */}
            <div className="pt-8 border-t border-zinc-900">
               <div className="flex items-center justify-between mb-4">
                   <label className="text-sm font-bold uppercase tracking-widest text-white">Etapas de Boletas</label>
                   <button onClick={() => setTicketTypes([...ticketTypes, { name: 'Fase Extra', price: 80000, capacity: 100, sale_start: '', sale_end: '' }])} className="text-xs text-neon-green flex items-center gap-1 hover:text-white transition-colors">
                      <Plus className="w-3 h-3" /> Añadir Boleto
                   </button>
               </div>
               
               <div className="flex bg-zinc-800/30 p-2 rounded-t-lg border-b border-zinc-800 text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-center mt-4 hidden lg:flex">
                   <div className="w-1/4 text-left pl-2">Categoría / Fase</div>
                   <div className="w-[20%]">Precio Venta</div>
                   <div className="w-[10%]">Cupos</div>
                   <div className="w-[20%]">Inicio de Venta</div>
                   <div className="w-[20%]">Fin de Venta</div>
                   <div className="w-8"></div>
               </div>
               
               <div className="space-y-3 mt-2">
                 {ticketTypes.map((t: any, index: number) => (
                    <div key={index} className="flex flex-col lg:flex-row gap-2 lg:gap-4 lg:items-center bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 group">
                      <div className="w-full lg:w-1/4">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold lg:hidden block mb-1">Nombre</label>
                        <input type="text" placeholder="Ej: Early Bird" className="w-full bg-transparent text-sm text-white outline-none border-b border-zinc-800 focus:border-neon-purple pb-1" 
                          value={t.name} onChange={e => handleTicketChange(index, 'name', e.target.value)} />
                      </div>
                      <div className="w-full lg:w-[20%] flex items-center gap-2">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold lg:hidden block">Precio (COP):</label>
                        <span className="text-neon-green font-bold text-sm hidden lg:inline">$</span>
                        <input type="number" placeholder="60000" className="w-full bg-black/50 px-2 py-1.5 rounded text-sm text-neon-green font-bold outline-none border border-zinc-800 focus:border-neon-green" 
                          value={t.price} onChange={e => handleTicketChange(index, 'price', e.target.value)} />
                      </div>
                      <div className="w-full lg:w-[10%] flex items-center gap-2">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold lg:hidden block">Cantidad:</label>
                        <input type="number" placeholder="Max" className="w-full bg-black/50 px-2 py-1.5 rounded text-sm text-zinc-300 outline-none border border-zinc-800 focus:border-white lg:text-center" 
                           value={t.capacity} onChange={e => handleTicketChange(index, 'capacity', e.target.value)} />
                      </div>
                      <div className="w-full lg:w-[20%] flex flex-col gap-1 mt-2 lg:mt-0">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold lg:hidden block">Inicio Venta (Opcional):</label>
                        <input type="datetime-local" className="w-full bg-black/50 px-2 py-1.5 rounded text-[11px] text-zinc-300 outline-none border border-zinc-800 focus:border-neon-purple" 
                           value={t.sale_start || ''} onChange={e => handleTicketChange(index, 'sale_start', e.target.value)} />
                      </div>
                      <div className="w-full lg:w-[20%] flex flex-col gap-1">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold lg:hidden block">Fin de Venta (Opcional):</label>
                        <input type="datetime-local" className="w-full bg-black/50 px-2 py-1.5 rounded text-[11px] text-zinc-300 outline-none border border-zinc-800 focus:border-red-500" 
                           value={t.sale_end || ''} onChange={e => handleTicketChange(index, 'sale_end', e.target.value)} />
                      </div>
                      <button onClick={() => setTicketTypes(ticketTypes.filter((_, i) => i !== index))} className="p-2 text-zinc-600 hover:text-red-500 bg-black/50 rounded transition-colors w-full lg:w-auto mt-2 lg:mt-0 flex justify-center">
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                 ))}
               </div>
            </div>

            {submitError && <div className="text-red-500 text-xs font-bold uppercase tracking-widest mt-4">{submitError}</div>}
            <button onClick={publicarEvento} disabled={uploading || publishing} className="w-full mt-10 bg-neon-purple hover:bg-white hover:text-black hover:shadow-[0_0_30px_rgba(191,0,255,0.6)] text-white font-black uppercase tracking-widest py-5 rounded-xl transition-all flex justify-center items-center gap-2">
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publicar Evento Oficial'}
            </button>
          </div>
        </div>

        {/* LADO DERECHO: VISOR GIGANTE DEL AFICHE */}
        <div className="hidden md:flex md:w-1/2 h-screen sticky top-0 relative bg-zinc-950 items-center justify-center overflow-hidden">
           {/* Grid background effect */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-0"></div>

           {flyerUrl ? (
              <img src={flyerUrl} alt="Flyer preview" className="w-full h-full object-cover relative z-10 shadow-2xl animate-in fade-in duration-700" />
           ) : (
              <div className="relative z-10 flex flex-col items-center opacity-30">
                 <ImageIcon className="w-32 h-32 text-zinc-700 mb-4" />
                 <p className="font-black uppercase tracking-widest text-zinc-500 text-2xl text-center px-10">El Flyer Gigante<br/>aparecerá aquí</p>
              </div>
           )}

           {/* Floating decorative elements */}
           {flyerUrl && (
              <div className="absolute top-10 right-10 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 z-20 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse"></span>
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Vista Previa Real</span>
              </div>
           )}
        </div>
      </div>
    </AdminGuard>
  );
}
