"use client";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";

export function WhatsAppButton({ className = "" }: { className?: string }) {
  const [whatsappNumber, setWhatsappNumber] = useState("573234760800");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/settings/brand`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.whatsappNumber) {
          setWhatsappNumber(data.whatsappNumber);
        }
      })
      .catch(() => {});
  }, []);

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=Hola,%20necesito%20ayuda%20con%20Kasa%20del%20Sol`; 

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
