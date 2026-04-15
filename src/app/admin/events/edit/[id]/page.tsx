"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Image as ImageIcon, Upload, ArrowLeft, Loader2, Save } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';

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
  const [flyerUrl, setFlyerUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/events/${params.id}`);
        if (res.ok) {
          const event = await res.json();
          setFormData({
            title: event.title,
            description: event.description || '',
            date: new Date(event.date).toISOString().slice(0, 16), // datetime-local format
            venue: event.venue,
            status: event.status
          });
          setFlyerUrl(event.flyer_url || '');
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

  const actualizarEvento = async () => {
    if (!formData.title || !formData.date) {
       return alert("⚠️ Faltan datos esenciales (Título o Fecha).");
    }
    
    setPublishing(true);
    setSubmitError('');
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
           flyer_url: flyerUrl
        })
      });

      if (res.ok) {
         router.push('/admin/events');
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

  if (loading) return <div className="min-h-screen bg-[#070000] flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;

  return (
    <AdminGuard>
      <div className="min-h-screen bg-[#070000] text-white p-6 relative overflow-hidden flex flex-col md:flex-row">
        {/* LADO IZQUIERDO: CONTROLES */}
        <div className="w-full md:w-1/2 p-6 md:p-12 overflow-y-auto h-screen custom-scrollbar relative z-10 border-r border-zinc-900 bg-black">
          <Link href="/admin/events" className="inline-flex items-center gap-2 text-zinc-500 hover:text-blue-500 transition-colors mb-8 uppercase font-bold tracking-widest text-xs">
            <ArrowLeft className="w-4 h-4" /> Volver al Manager
          </Link>
          <h1 className="text-3xl font-black uppercase tracking-widest text-white mb-2">Editar Evento</h1>
          <p className="text-zinc-400 text-sm mb-10">Modifica la información básica. Las boletas, por seguridad contable, no pueden ser editadas por esta vía.</p>

          <div className="space-y-6">
            {/* FOTO UPLOAD */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-blue-500 mb-3">Afiche Oficial (Flyer)</label>
              <div className="w-full relative">
                 <input type="file" accept="image/*" onChange={handleSubidaImagen} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                 <div className={`glass-panel border-2 border-dashed ${uploading ? 'border-blue-500 animate-pulse' : 'border-zinc-700 hover:border-white'} rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all`}>
                   {uploading ? (
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                   ) : (
                      <Upload className="w-10 h-10 text-zinc-500 mb-3" />
                   )}
                   <span className="font-bold text-sm text-zinc-300">{uploading ? 'Transfiriendo...' : 'Haz Clic para Remplazar Imagen'}</span>
                 </div>
              </div>
            </div>

            {/* DATOS BÁSICOS */}
            <div className="space-y-4 pt-4 border-t border-zinc-900">
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Título del Evento</label>
                 <input type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-blue-500 outline-none transition-colors" 
                    value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Fecha y Hora</label>
                 <input type="datetime-local" className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-blue-500 outline-none transition-colors" 
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Locación (Venue)</label>
                 <input type="text" className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-blue-500 outline-none transition-colors" 
                    value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Descripción</label>
                 <textarea rows={3} className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-blue-500 outline-none transition-colors" 
                    value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
               </div>
               <div>
                 <label className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Estado</label>
                 <select className="w-full bg-zinc-900/50 border border-zinc-800 rounded py-3 px-4 text-white hover:border-zinc-600 focus:border-blue-500 outline-none transition-colors"
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                   <option value="PUBLISHED">Publicado (Visible)</option>
                   <option value="DRAFT">Archivado (Oculto)</option>
                 </select>
               </div>
            </div>

            {submitError && <div className="text-red-500 text-xs font-bold uppercase tracking-widest mt-4">{submitError}</div>}
            <button onClick={actualizarEvento} disabled={uploading || publishing} className="w-full mt-10 bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.6)] text-white font-black uppercase tracking-widest py-5 rounded-xl transition-all flex justify-center items-center gap-2">
              {publishing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar Cambios</>}
            </button>
          </div>
        </div>

        {/* LADO DERECHO: VISOR GIGANTE */}
        <div className="hidden md:flex md:w-1/2 h-screen sticky top-0 relative bg-zinc-950 items-center justify-center overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 z-0"></div>

           {flyerUrl ? (
              <img src={flyerUrl} alt="Flyer preview" className="w-full h-full object-cover relative z-10 shadow-2xl animate-in fade-in duration-700" />
           ) : (
              <div className="relative z-10 flex flex-col items-center opacity-30">
                 <ImageIcon className="w-32 h-32 text-zinc-700 mb-4" />
                 <p className="font-black uppercase tracking-widest text-zinc-500 text-2xl text-center px-10">Imagen no disponible</p>
              </div>
           )}
        </div>
      </div>
    </AdminGuard>
  );
}
