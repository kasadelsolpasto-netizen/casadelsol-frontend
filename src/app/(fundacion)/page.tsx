/**
 * kasadelsol.co — Fundación Kasa del Sol.
 *
 * Es la portada del dominio. La plataforma de raves vive aparte, en /raves, y
 * desde aquí no se enlaza: son dos sitios distintos bajo un mismo nombre.
 *
 * Página de presentación institucional. La lectura sigue el atardecer: la luz
 * de la portada, el papel claro del planteamiento y las líneas, la inmersión
 * en el territorio, y el regreso a la superficie para la gobernanza y la
 * vinculación.
 *
 * El contenido se edita en /raves/admin/ong y se guarda en el backend; el concepto
 * gráfico vive en ./ong.css.
 */
import { leerContenido } from "@/lib/ong-backend";
import { publicar } from "@/lib/ong-contenido";
import type { ContenidoOng } from "./contenido";
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

/**
 * Ficha de la entidad para buscadores: quién es, dónde está y cómo se le
 * contacta, en el vocabulario que ellos leen (schema.org). Sale de los mismos
 * datos de identidad que muestra la página.
 */
function fichaEstructurada(c: ContenidoOng) {
  const [ciudad, resto] = c.identidad.domicilio.split(",").map((s) => s.trim());
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    name: c.identidad.nombre,
    legalName: c.identidad.nombre,
    alternateName: c.identidad.nombreCorto,
    url: "https://kasadelsol.co",
    logo: "https://kasadelsol.co/ong/marca.webp",
    description: c.hero.entrada,
    taxID: c.identidad.nit,
    nonprofitStatus: "NonprofitType",
    email: c.contacto.correo || c.identidad.correo,
    ...(c.contacto.telefono ? { telephone: c.contacto.telefono } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: ciudad,
      addressRegion: resto?.split("—")[0]?.trim() || undefined,
      addressCountry: "CO",
      ...(c.contacto.direccion ? { streetAddress: c.contacto.direccion } : {}),
    },
    knowsAbout: c.lineas.items.map((l) => l.titulo),
    ...(c.contacto.redes.length
      ? { sameAs: c.contacto.redes.map((r) => r.href) }
      : {}),
  };
}

export default async function OngPage() {
  const guardado = await leerContenido();
  const c = publicar(guardado?.documento);

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        // «<» escapado: el contenido es editable y no debe poder cerrar la etiqueta
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(fichaEstructurada(c)).replace(/</g, "\\u003c"),
        }}
      />
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
