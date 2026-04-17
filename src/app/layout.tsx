import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import RecaptchaProvider from "@/components/RecaptchaProvider";
import { GlobalOrderReadyAlert } from "@/components/GlobalOrderReadyAlert";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kasa del Sol | Private Raves",
  description: "Ticketing platform for exclusive techno and electronic raves.",
  icons: {
    icon: "/api/brand/icon?v=1",
    apple: "/api/brand/icon?v=1",
  },
};

export const viewport: Viewport = {
  themeColor: "#030303",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${outfit.className} antialiased bg-black text-zinc-200 selection:bg-neon-purple selection:text-white`}>
        <RecaptchaProvider>
          {/* Ambient glow background */}
          <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-neon-purple/10 blur-[120px] pointer-events-none -z-10 animate-pulse-slow" />
          <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-neon-green/10 blur-[120px] pointer-events-none -z-10 animate-pulse-slow" style={{ animationDelay: '1s'}} />

          {/* Global navbar — se auto-oculta en /admin, /login, /register, /scanner */}
          <NavbarWrapper />

          <GlobalOrderReadyAlert />

          <main className="min-h-screen z-10 relative">
            {children}
          </main>
        </RecaptchaProvider>
      </body>
    </html>
  );
}
