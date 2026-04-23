"use client";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton({ className = "" }: { className?: string }) {
  // El número debe incluir el código de país sin el '+'
  const whatsappUrl = "https://wa.me/573000000000?text=Hola,%20necesito%20ayuda%20con%20Kasa%20del%20Sol"; 

  return (
    <a 
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed z-[90] flex items-center justify-center w-12 h-12 bg-[#25D366] text-white rounded-full shadow-[0_0_20px_rgba(37,211,102,0.4)] hover:scale-110 hover:shadow-[0_0_30px_rgba(37,211,102,0.7)] hover:bg-[#20bd5a] active:scale-95 transition-all duration-300 ${className}`}
      title="Soporte WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </a>
  );
}
