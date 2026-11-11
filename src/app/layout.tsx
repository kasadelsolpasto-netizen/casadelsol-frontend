import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { NavbarWrapper } from "@/components/NavbarWrapper";
import { ProveedorSitio, AparatoSitio } from "@/components/ChromeSitio";

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
      <body className={`${outfit.className} antialiased bg-black text-zinc-200 selection:bg-neon-purple selection:text-white overflow-x-hidden w-full relative`}>
        <ProveedorSitio>

          {/* Global navbar — se auto-oculta en /admin, /login, /register, /scanner */}
          <NavbarWrapper />

          <AparatoSitio />

          <main className="min-h-screen z-10 relative">
            {children}
          </main>
        </ProveedorSitio>
      </body>
    </html>
  );
}
