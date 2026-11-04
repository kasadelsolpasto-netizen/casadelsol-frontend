/**
 * kasadelsol.co/ong — Página principal de la fundación.
 *
 * La maquetación se compone de secciones independientes. Todo el texto, las
 * cifras y los enlaces se editan en ./content.ts; el concepto gráfico
 * (paleta, trama, disco solar) está tokenizado en ./ong.css.
 */
import { Hero } from "./_components/Hero";
import { Manifiesto } from "./_components/Manifiesto";
import { Pilares } from "./_components/Pilares";
import { Programas } from "./_components/Programas";
import { Impacto } from "./_components/Impacto";
import { Participa } from "./_components/Participa";
import { Aliados } from "./_components/Aliados";
import { Contacto } from "./_components/Contacto";

export default function OngPage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Manifiesto />
      <Pilares />
      <Programas />
      <Impacto />
      <Participa />
      <Aliados />
      <Contacto />
    </div>
  );
}
