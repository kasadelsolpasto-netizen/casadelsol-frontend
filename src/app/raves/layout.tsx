import type { Metadata, Viewport } from "next";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import RecaptchaProvider from "@/components/RecaptchaProvider";
import { GlobalOrderReadyAlert } from "@/components/GlobalOrderReadyAlert";
import { PromoTracker } from "@/components/PromoTracker";

/**
 * kasadelsol.co/raves — la plataforma de eventos y boletería.
 *
 * Todo el aparato del sitio de raves vive de aquí hacia abajo: el fondo negro,
 * la barra de cuentas y eventos, reCAPTCHA, el rastreador de códigos de
 * promotor y los avisos de pedidos (que abren un socket, registran el service
 * worker y piden permiso de notificaciones). Nada de eso alcanza a la página
 * de la Fundación, que está en la raíz del dominio.
 */
export const metadata: Metadata = {
  title: "Kasa del Sol | Private Raves",
  description: "Ticketing platform for exclusive techno and electronic raves.",
  manifest: "/raves/manifest.webmanifest",
  icons: {
    icon: "/api/brand/icon?v=1",
    apple: "/api/brand/icon?v=1",
  },
};

export const viewport: Viewport = {
  themeColor: "#030303",
};

export default function RavesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="raves-scope dark min-h-screen bg-black text-zinc-200 selection:bg-neon-purple selection:text-white">
      <RecaptchaProvider>
        {/* Barra global — se auto-oculta en admin, login, registro y scanner */}
        <NavbarWrapper />

        {/* Resplandor de ambiente */}
        <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-neon-purple/10 blur-[120px] pointer-events-none -z-10 animate-pulse-slow" />
        <div
          className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-neon-green/10 blur-[120px] pointer-events-none -z-10 animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        />
        <GlobalOrderReadyAlert />
        <PromoTracker />

        <main className="min-h-screen z-10 relative">{children}</main>
      </RecaptchaProvider>
    </div>
  );
}
