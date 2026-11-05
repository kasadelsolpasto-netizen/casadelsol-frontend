/**
 * kasadelsol.co/ong — Fundación Kasa del Sol.
 *
 * Página de presentación institucional. La lectura sigue el atardecer: la luz
 * de la portada, el papel claro del planteamiento y las líneas, la inmersión
 * en el territorio, y el regreso a la superficie para la gobernanza y la
 * vinculación.
 *
 * El contenido se edita en /admin/ong; el concepto gráfico vive en ./ong.css.
 */
import { obtener } from "@/lib/ong-almacen";
import { componer } from "@/lib/ong-contenido";
import { Hero } from "./_components/Hero";
import { Barra } from "./_components/Barra";
import { Tesis } from "./_components/Tesis";
import { Lineas } from "./_components/Lineas";
import { Territorio } from "./_components/Territorio";
import { Programas } from "./_components/Programas";
import { Gobernanza } from "./_components/Gobernanza";
import { Vinculacion } from "./_components/Vinculacion";
import { Aliados } from "./_components/Aliados";
import { Contacto } from "./_components/Contacto";
import { Revelar } from "./_components/Fluido";

export const dynamic = "force-dynamic";

export default async function OngPage() {
  const guardado = await obtener();
  const c = componer(guardado?.documento);

  return (
    <div className="min-h-screen">
      <Hero identidad={c.identidad} hero={c.hero} />
      <Barra secciones={c.secciones} identidad={c.identidad} />

      <Revelar>
        <Tesis datos={c.tesis} />
      </Revelar>

      <div className="ong-warm">
        <Lineas datos={c.lineas} />
      </div>

      <Territorio datos={c.territorio} />

      <Revelar>
        <Programas datos={c.programas} lineas={c.lineas} />
      </Revelar>

      <Gobernanza datos={c.gobernanza} identidad={c.identidad} />

      <div className="ong-warm">
        <Revelar>
          <Vinculacion datos={c.vinculacion} rteCalificado={c.rteCalificado} />
        </Revelar>
        <Revelar>
          <Aliados datos={c.aliados} />
        </Revelar>
      </div>

      <Contacto datos={c.contacto} identidad={c.identidad} />
    </div>
  );
}
