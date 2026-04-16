"use client";
import { useEffect, useState } from 'react';
import { 
  ShoppingBag, Plus, Save, Trash2, Edit2, 
  Package, Tag, DollarSign, Image as ImageIcon,
  CheckCircle, XCircle, Loader2, Search,
  Filter, Layers, ArrowLeft, MoreVertical,
  AlertTriangle,
  ImageOff,
  QrCode,
  Download
} from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import { QRCodeSVG } from 'qrcode.react';

export default function ShopInventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  // ... (rest of states)
  const [showVenueQr, setShowVenueQr] = useState(false);

  // ... (rest of component logic)

  const downloadVenueQr = () => {
    const svg = document.getElementById('venue-qr-svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
       canvas.width = img.width + 40;
       canvas.height = img.height + 100;
       if (ctx) {
           ctx.fillStyle = 'white';
           ctx.fillRect(0, 0, canvas.width, canvas.height);
           ctx.drawImage(img, 20, 20);
           ctx.fillStyle = 'black';
           ctx.font = 'bold 20px Arial';
           ctx.textAlign = 'center';
           ctx.fillText('MENÚ DIGITAL - KASA DEL SOL', canvas.width/2, canvas.height - 40);
       }
       const pngFile = canvas.toDataURL('image/png');
       const downloadLink = document.createElement('a');
       downloadLink.download = 'QR_KASA_SHOP.png';
       downloadLink.href = pngFile;
       downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  
  // Product Form (Ficha)
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    image_url: '',
    category_id: '',
    is_active: true
  });

  const [newCategoryName, setNewCategoryName] = useState('');

  const getToken = () => {
    const row = document.cookie.split('; ').find(r => r.startsWith('kasa_auth_token='));
    return row ? row.split('=')[1] : null;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = getToken();
      
      const [pRes, cRes] = await Promise.all([
        fetch(`${API}/shop/products/admin/all`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API}/shop/products/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openEditFicha = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      image_url: product.image_url || '',
      category_id: product.category_id,
      is_active: product.is_active
    });
    setShowProductModal(true);
  };

  const openNewFicha = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      image_url: '',
      category_id: categories[0]?.id || '',
      is_active: true
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const token = getToken();
      const method = editingProduct ? 'PUT' : 'POST';
      const url = editingProduct ? `${API}/shop/products/${editingProduct.id}` : `${API}/shop/products`;
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowProductModal(false);
        fetchData();
      }
    } catch (err) { console.error(err); } finally { setIsSaving(false); }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto definitvamente?')) return;
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API}/shop/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (res.ok) fetchData();
    } catch (err) { console.error(err); }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminGuard>
      <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-orange-500" />
             </div>
             <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-1">Inventario Tienda</h1>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Gestión de Productos y Stock</p>
             </div>
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
             <button 
               onClick={() => setShowVenueQr(true)}
               className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-orange-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-500/10 transition-all border-dashed"
             >
               <QrCode className="w-4 h-4" /> Sincronizar Mesas
             </button>
             <button onClick={() => setShowCategoryModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
               <Layers className="w-4 h-4" /> Categorías
             </button>
             <button onClick={openNewFicha} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all">
               <Plus className="w-4 h-4" /> Nuevo Producto
             </button>
          </div>
        </header>

        {/* VENUE QR MODAL */}
        {showVenueQr && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in zoom-in-95 duration-200">
             <div className="bg-zinc-950 border border-zinc-800 w-full max-w-sm rounded-[3rem] p-10 flex flex-col items-center shadow-2xl">
                <div className="w-full flex justify-between items-center mb-10">
                   <div className="flex items-center gap-2 text-orange-500">
                      <QrCode className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-widest">QR del Local</span>
                   </div>
                   <button onClick={() => setShowVenueQr(false)} className="text-zinc-600 hover:text-white"><XCircle className="w-6 h-6" /></button>
                </div>

                <div className="bg-white p-6 rounded-3xl mb-8 shadow-inner relative group">
                   <QRCodeSVG 
                      id="venue-qr-svg"
                      value={`${window.location.origin}/shop`}
                      size={200}
                      level="H"
                   />
                </div>

                <p className="text-center text-xs font-bold text-zinc-500 mb-8 leading-relaxed">Este QR llevará a los clientes directamente a la shop. Imprímelo y ponlo en las mesas.</p>

                <button 
                  onClick={downloadVenueQr}
                  className="w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-500 hover:text-white transition-all shadow-xl"
                >
                  <Download className="w-5 h-5" /> Descargar PNG
                </button>
             </div>
          </div>
        )}


        <div className="mb-8 relative max-w-xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-orange-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o categoría..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-black/60 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-orange-500/50 transition-all"
          />
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Consultando Bóveda...</span>
          </div>
        ) : (
          <div className="bg-zinc-950/40 border border-zinc-900 rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in duration-700">
            {/* TABLE HEADER */}
            <div className="hidden md:grid grid-cols-[100px_1fr_120px_150px_120px_100px] gap-4 px-8 py-5 border-b border-zinc-900 font-black text-[10px] uppercase tracking-[0.2em] text-zinc-600">
               <div>Imagen</div>
               <div>Nombre / Categoría</div>
               <div className="text-center">Stock</div>
               <div className="text-center">Precio</div>
               <div className="text-center">Estado</div>
               <div className="text-right">Acción</div>
            </div>

            {/* PRODUCT LIST */}
            <div className="divide-y divide-zinc-900">
               {filteredProducts.length === 0 ? (
                 <div className="py-24 text-center">
                    <Package className="w-14 h-14 text-zinc-800 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">No hay productos registrados</p>
                 </div>
               ) : filteredProducts.map(product => (
                 <div key={product.id} className="grid grid-cols-1 md:grid-cols-[100px_1fr_120px_150px_120px_100px] items-center gap-4 px-8 py-6 hover:bg-zinc-900/10 transition-colors group">
                    {/* Imagen */}
                    <div className="flex justify-center md:justify-start">
                       {product.image_url ? (
                         <img src={product.image_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shadow-lg" />
                       ) : (
                         <div className="w-16 h-16 rounded-xl bg-zinc-900 flex items-center justify-center border border-zinc-800">
                            <Package className="w-6 h-6 text-zinc-700" />
                         </div>
                       )}
                    </div>

                    {/* Info */}
                    <div>
                       <h3 className="text-sm font-bold text-white group-hover:text-orange-500 transition-colors">{product.name}</h3>
                       <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mt-1">{product.category?.name}</p>
                    </div>

                    {/* Stock */}
                    <div className="text-center">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${product.stock <= 5 ? 'bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse' : 'bg-zinc-900 text-zinc-400'}`}>
                          {product.stock} <span className="text-[8px] opacity-70">u.</span>
                       </span>
                    </div>

                    {/* Precio */}
                    <div className="text-center">
                       <span className="text-sm font-black text-white">{Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(product.price)}</span>
                    </div>

                    {/* Estado */}
                    <div className="text-center">
                       <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg ${product.is_active ? 'bg-neon-green/10 text-neon-green' : 'bg-zinc-800 text-zinc-500'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${product.is_active ? 'bg-neon-green animate-pulse' : 'bg-zinc-600'}`} />
                          {product.is_active ? 'Activo' : 'Inactivo'}
                       </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end gap-2">
                       <button onClick={() => openEditFicha(product)} className="p-3 bg-zinc-900 hover:bg-orange-500 text-zinc-500 hover:text-white rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                       <button onClick={() => deleteProduct(product.id)} className="p-3 hover:bg-red-500/10 text-zinc-800 hover:text-red-500 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* FICHA DE PRODUCTO (MODAL MEJORADA) */}
        {showProductModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-end md:p-6 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
             <div className="bg-black border-l border-zinc-800 w-full md:w-[600px] h-full rounded-l-[3rem] p-10 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 overflow-y-auto no-scrollbar relative">
                
                <button onClick={() => setShowProductModal(false)} className="absolute top-8 right-8 p-3 bg-zinc-900 hover:bg-white hover:text-black rounded-full transition-all">
                  <XCircle className="w-8 h-8" />
                </button>

                <div className="mb-12">
                   <div className="flex items-center gap-3 text-orange-500 mb-2">
                      <Package className="w-5 h-5" />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em]">Editor de Inventario</span>
                   </div>
                   <h2 className="text-4xl font-black uppercase tracking-tighter text-white">{editingProduct ? 'Ficha de Producto' : 'Cargar Producto'}</h2>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-10 flex-1">
                   {/* Fotografía del Producto */}
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block">Fotografía del Producto</label>
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                         <div className="w-32 h-32 rounded-[2rem] bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0 group relative shadow-2xl">
                            {formData.image_url ? (
                               <>
                                 <img src={formData.image_url} alt="" className="w-full h-full object-cover" />
                                 <button type="button" onClick={() => setFormData({...formData, image_url: ''})} className="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                    <Trash2 className="w-5 h-5 text-white" />
                                    <span className="text-[8px] font-black uppercase text-white">Quitar</span>
                                 </button>
                               </>
                            ) : (
                               <ImageOff className="w-10 h-10 text-zinc-800" />
                            )}
                         </div>
                         <div className="flex-1 w-full space-y-2">
                            <input 
                              type="text" 
                              placeholder="Pega la URL de la imagen aquí..."
                              value={formData.image_url}
                              onChange={e => setFormData({...formData, image_url: e.target.value})}
                              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-orange-500 transition-all"
                            />
                            <p className="text-[9px] text-zinc-600 font-bold leading-relaxed">Tip: Sube tus fotos a un servidor de imágenes o usa enlaces públicos. Se recomienda 1:1 (cuadrado).</p>
                         </div>
                      </div>
                   </div>

                   {/* Datos Básicos */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nombre Público</label>
                        <input 
                          required
                          type="text" 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-orange-500 transition-all h-14"
                          placeholder="Ej: Mezcal Unión Joven"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Precio (COP)</label>
                        <div className="relative">
                           <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                           <input 
                              required
                              type="number" 
                              value={formData.price}
                              onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-5 py-4 text-white font-black outline-none focus:border-orange-500 transition-all h-14"
                           />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Stock Actual</label>
                        <div className="relative">
                          <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input 
                            required
                            type="number" 
                            value={formData.stock}
                            onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                            className={`w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-5 py-4 text-white font-black outline-none focus:border-orange-500 transition-all h-14 ${formData.stock <= 5 ? 'text-red-500' : ''}`}
                          />
                        </div>
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Categoría del Menú</label>
                        <select 
                          required
                          value={formData.category_id}
                          onChange={e => setFormData({...formData, category_id: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-orange-500 transition-all h-14 appearance-none"
                        >
                          <option value="">Seleccionar...</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Detalles / Notas de Venta</label>
                        <textarea 
                          value={formData.description}
                          onChange={e => setFormData({...formData, description: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-orange-500 transition-all h-32 resize-none"
                          placeholder="Agrega una breve descripción o notas para el bartender..."
                        />
                      </div>
                   </div>

                   <div className="flex items-center gap-4 bg-zinc-900/30 p-6 rounded-3xl border border-zinc-800">
                      <div onClick={() => setFormData({...formData, is_active: !formData.is_active})} className={`w-14 h-8 rounded-full transition-colors cursor-pointer relative ${formData.is_active ? 'bg-neon-green' : 'bg-zinc-700'}`}>
                         <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${formData.is_active ? 'left-7' : 'left-1'}`} />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-white">¿Producto Visible en la Tienda?</p>
                         <p className="text-[9px] font-bold text-zinc-600">Apágalo si te quedaste sin stock o quieres pausar la venta.</p>
                      </div>
                   </div>

                   <div className="pt-10 mb-20">
                      <button disabled={isSaving} className="w-full bg-orange-500 text-white font-black uppercase tracking-[0.2em] py-6 rounded-[2rem] hover:shadow-[0_20px_40px_rgba(249,115,22,0.3)] hover:-translate-y-1 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />}
                        {isSaving ? 'Guardando en Bóveda...' : 'Confirmar Ficha'}
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* CATEGORY MODAL */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md animate-in zoom-in duration-200">
             <div className="bg-black border border-zinc-800 w-full max-w-sm rounded-[3rem] p-10 shadow-2xl relative">
                <button onClick={() => setShowCategoryModal(false)} className="absolute top-6 right-6 p-2 text-zinc-700 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
                <div className="flex items-center gap-3 text-orange-500 mb-6">
                   <Layers className="w-4 h-4" />
                   <h2 className="text-xl font-black uppercase tracking-tight text-white">Categorías</h2>
                </div>

                <div className="space-y-3 mb-10 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                   {categories.map(c => (
                     <div key={c.id} className="flex justify-between items-center bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800">
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{c.name}</span>
                        <Package className="w-4 h-4 text-zinc-700" />
                     </div>
                   ))}
                </div>

                <form onSubmit={handleAddCategory} className="space-y-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Nombre del Grupo</label>
                      <input 
                        type="text" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs outline-none focus:border-orange-500 transition-all"
                        placeholder="Ej: Destilados Premium"
                      />
                   </div>
                   <button className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-orange-500 hover:text-white transition-all">Añadir Categoría</button>
                </form>
             </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </AdminGuard>
  );
}
