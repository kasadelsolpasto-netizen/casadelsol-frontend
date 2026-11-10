import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

/**
 * Layout raíz del dominio.
 *
 * kasadelsol.co aloja dos sitios que no comparten nada salvo la tipografía:
 *   · la Fundación, en la raíz        → src/app/(fundacion)
 *   · la plataforma de raves, en /raves → src/app/raves
 *
 * Por eso este layout es neutro: no pinta fondo, no monta barra ni proveedores.
 * Cada sitio trae lo suyo en su propio layout.
 */
const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://kasadelsol.co"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={`${outfit.className} antialiased overflow-x-hidden w-full relative`}>
        {children}
      </body>
    </html>
  );
}
