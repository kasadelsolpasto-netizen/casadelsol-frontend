"use client";
import { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallAppButton() {
  const { deferredPrompt, isIOS, isStandalone, handleInstallClick } = useInstallPrompt();
  const [showIosInstruction, setShowIosInstruction] = useState(false);

  // If already installed, hide everything
  if (isStandalone) {
    return null;
  }

  const handleClick = () => {
    if (isIOS) {
      setShowIosInstruction(true);
    } else if (deferredPrompt) {
      handleInstallClick();
    } else {
      // Fallback if browser doesn't support it or event didn't fire yet
      setShowIosInstruction(true);
    }
  };

  return (
    <>
      <button 
        onClick={handleClick}
        className="mt-8 bg-black border border-neon-green/50 text-neon-green hover:bg-neon-green hover:text-black font-black uppercase tracking-widest text-[10px] sm:text-xs py-3 px-6 rounded-full transition-all flex items-center justify-center gap-2 mx-auto w-fit shadow-[0_0_15px_rgba(57,255,20,0.15)] hover:shadow-[0_0_20px_rgba(57,255,20,0.4)]"
      >
        <Download className="w-4 h-4" /> Instalar Aplicación
      </button>

      {/* iOS Instructions Overlay */}
      {showIosInstruction && (
        <div 
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowIosInstruction(false)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm mb-4 relative shadow-2xl animate-in slide-in-from-bottom-8"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowIosInstruction(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-lg font-black uppercase tracking-widest text-white mb-2 text-center">
              Añadir a Inicio
            </h3>
            <p className="text-sm text-zinc-400 text-center mb-6">
              Instala Kasa del Sol en tu celular para una experiencia rápida y sin navegador.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <div className="w-8 h-8 rounded-full bg-neon-purple/20 flex items-center justify-center text-neon-purple font-black">1</div>
                <p className="text-xs text-zinc-300">
                  Toca el botón <b>Compartir</b> en el menú de tu navegador inferior.
                </p>
                <Share className="w-5 h-5 text-neon-purple shrink-0" />
              </div>
              <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center text-neon-green font-black">2</div>
                <p className="text-xs text-zinc-300">
                  Desliza hacia abajo y selecciona <b>Agregar a Inicio</b>.
                </p>
                <div className="w-5 h-5 border-2 border-neon-green rounded flex items-center justify-center shrink-0">
                  <span className="text-neon-green text-sm leading-none pb-0.5">+</span>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowIosInstruction(false)}
              className="mt-6 w-full text-center text-[10px] text-zinc-500 hover:text-white uppercase tracking-widest font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
