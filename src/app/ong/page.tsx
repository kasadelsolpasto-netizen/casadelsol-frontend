/**
 * kasadelsol.co/ong — Fundación Kasa del Sol.
 *
 * Página institucional dirigida a inversores, cooperantes y entidades.
 * Todo el contenido se edita en ./content.ts; el concepto gráfico
 * «Sol y cuenca» está tokenizado en ./ong.css.
 */
import { Hero } from "./_components/Hero";
import { Tesis } from "./_components/Tesis";
import { Lineas } from "./_components/Lineas";
import { Territorio } from "./_components/Territorio";
import { Programas } from "./_components/Programas";
import { Gobernanza } from "./_components/Gobernanza";
import { Vinculacion } from "./_components/Vinculacion";
import { Aliados } from "./_components/Aliados";
import { Contacto } from "./_components/Contacto";

export default function OngPage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Tesis />
      <Lineas />
      <Territorio />
      <Programas />
      <Gobernanza />
      <Vinculacion />
      <Aliados />
      <Contacto />
    </div>
  );
}
