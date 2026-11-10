import type { Metadata, Viewport } from "next";
import "./ong.css";
import { CONTENIDO_BASE } from "./contenido";

const descripcion =
  "Fundación Kasa del Sol (NIT 902.014.359-1): conservación de la alta cuenca amazónica, alternativas productivas, defensa del agua, control social a lo público, derechos humanos y cultura. Pasto, Nariño.";

export const metadata: Metadata = {
  title: `${CONTENIDO_BASE.identidad.nombre} | Entidad sin ánimo de lucro`,
  description: descripcion,
  alternates: { canonical: "/" },
  icons: { icon: "/ong/sol.svg" },
  openGraph: {
    title: CONTENIDO_BASE.identidad.nombre,
    description: descripcion,
    url: "https://kasadelsol.co",
    siteName: CONTENIDO_BASE.identidad.nombre,
    type: "website",
    locale: "es_CO",
  },
};

/* La Fundación es blanca, y la barra del navegador en móvil también. */
export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function OngLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="ong-scope">{children}</div>;
}
