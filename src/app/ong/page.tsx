/**
 * kasadelsol.co/ong — Fundación Kasa del Sol.
 *
 * Página institucional dirigida a inversores, cooperantes y entidades.
 * El contenido se edita en el panel (/admin/ong) y se guarda en el almacén;
 * mientras no haya nada guardado se publica el documento de fábrica de
 * ./contenido.ts. El concepto gráfico «Sol y cuenca» vive en ./ong.css.
 */
import { obtener } from "@/lib/ong-almacen";
import { componer } from "@/lib/ong-contenido";
import { Hero } from "./_components/Hero";
import { Tesis } from "./_components/Tesis";
import { Lineas } from "./_components/Lineas";
import { Territorio } from "./_components/Territorio";
import { Programas } from "./_components/Programas";
import { Gobernanza } from "./_components/Gobernanza";
import { Vinculacion } from "./_components/Vinculacion";
import { Aliados } from "./_components/Aliados";
import { Contacto } from "./_components/Contacto";

export const dynamic = "force-dynamic";

export default async function OngPage() {
  const guardado = await obtener();
  const c = componer(guardado?.documento);

  return (
    <div className="min-h-screen">
      <Hero identidad={c.identidad} hero={c.hero} secciones={c.secciones} />
      <Tesis datos={c.tesis} />
      <Lineas datos={c.lineas} />
      <Territorio datos={c.territorio} />
      <Programas datos={c.programas} lineas={c.lineas} />
      <Gobernanza datos={c.gobernanza} identidad={c.identidad} />
      <Vinculacion datos={c.vinculacion} rteCalificado={c.rteCalificado} />
      <Aliados datos={c.aliados} />
      <Contacto datos={c.contacto} identidad={c.identidad} />
    </div>
  );
}
