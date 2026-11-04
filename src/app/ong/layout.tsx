import type { Metadata } from "next";
import "./ong.css";
import { identidad } from "./content";

export const metadata: Metadata = {
  title: `${identidad.nombre} | Kasa del Sol`,
  description:
    "Fundación de Kasa del Sol: cultura, formación y trabajo comunitario en el territorio.",
  alternates: { canonical: "/ong" },
  openGraph: {
    title: identidad.nombre,
    description:
      "Fundación de Kasa del Sol: cultura, formación y trabajo comunitario en el territorio.",
    url: "https://kasadelsol.co/ong",
    type: "website",
    locale: "es_CO",
  },
};

export default function OngLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="ong-scope">{children}</div>;
}
