"use client";
/**
 * Separa el aparato del sitio de eventos de las páginas institucionales.
 *
 * El layout raíz es uno solo para todo el dominio, de modo que sin este
 * filtro la página de la Fundación heredaría cosas que no le corresponden:
 * la barra de cuentas y eventos, el rastreador de códigos de promotor, y un
 * componente que abre un socket, registra el service worker y pide permiso
 * de notificaciones. Nada de eso tiene sentido frente a un cooperante, y lo
 * último además dispara un diálogo del navegador en la primera visita.
 *
 * Las rutas listadas aquí quedan fuera de ese aparato.
 */
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import RecaptchaProvider from "@/components/RecaptchaProvider";
import { GlobalOrderReadyAlert } from "@/components/GlobalOrderReadyAlert";
import { PromoTracker } from "@/components/PromoTracker";

/** Rutas institucionales: viven en el mismo dominio, no en el mismo esquema. */
const INSTITUCIONALES = ["/ong"];

function esInstitucional(ruta: string | null): boolean {
  if (!ruta) return false;
  return INSTITUCIONALES.some((p) => ruta === p || ruta.startsWith(p + "/"));
}

/** reCAPTCHA solo donde hay formularios que lo usen. */
export function ProveedorSitio({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  if (esInstitucional(ruta)) return <>{children}</>;
  return <RecaptchaProvider>{children}</RecaptchaProvider>;
}

/** Avisos de pedidos, rastreo de promotores y ambiente del sitio de eventos. */
export function AparatoSitio() {
  const ruta = usePathname();
  if (esInstitucional(ruta)) return null;
  return (
    <>
      {/* Resplandor de ambiente */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-neon-purple/10 blur-[120px] pointer-events-none -z-10 animate-pulse-slow" />
      <div
        className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-neon-green/10 blur-[120px] pointer-events-none -z-10 animate-pulse-slow"
        style={{ animationDelay: "1s" }}
      />
      <GlobalOrderReadyAlert />
      <PromoTracker />
    </>
  );
}
