import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { Section, SectionHead } from "./Section";
import type { Gobernanza as DatosGobernanza, Identidad } from "../contenido";

export function Gobernanza({
  datos: gobernanza,
  identidad,
}: {
  datos: DatosGobernanza;
  identidad: Identidad;
}) {
  const documentos = gobernanza.documentos.filter((d) => d.archivo);

  return (
    <div className="relative border-y ong-hair">
      <div className="ong-horizon opacity-60" aria-hidden="true" />

      <Section id="gobernanza" className="relative">
        <SectionHead
          eyebrow={gobernanza.antetitulo}
          title={
            <>
              Cómo respondemos por los{" "}
              <span className="ong-gradient-text">recursos</span>
            </>
          }
          lead={gobernanza.lead}
        />

        {/* Garantías estatutarias */}
        <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border ong-hair bg-[var(--ong-hair)] md:grid-cols-2">
          {gobernanza.garantias.map((g) => (
            <li key={g.id} className="ong-card p-8">
              <h3 className="text-sm font-black uppercase leading-snug tracking-wide ong-strong">
                {g.titulo}
              </h3>
              <p className="mt-3 text-sm leading-relaxed ong-muted">
                {g.texto}
              </p>
              <p className="ong-mono mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ong-red-bright)]">
                {g.fundamento}
              </p>
            </li>
          ))}
        </ul>

        {/* Ficha institucional */}
        <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <dl className="divide-y divide-[var(--ong-hair)] overflow-hidden rounded-2xl border ong-hair">
            {[
              { k: "Razón social", v: identidad.nombre },
              { k: "NIT", v: identidad.nit },
              { k: "Naturaleza", v: identidad.naturaleza },
              { k: "Domicilio", v: identidad.domicilio },
              { k: "Registro", v: identidad.registro },
              { k: "Inspección, vigilancia y control", v: identidad.vigilancia },
              {
                k: identidad.representante.cargo,
                v: identidad.representante.nombre,
              },
            ].map((fila) => (
              <div
                key={fila.k}
                className="grid gap-1 px-7 py-5 sm:grid-cols-[0.8fr_1.2fr] sm:gap-6"
              >
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] ong-faint">
                  {fila.k}
                </dt>
                <dd className="ong-mono text-sm leading-relaxed ong-strong">
                  {fila.v}
                </dd>
              </div>
            ))}
          </dl>

          {/* Documentos — solo los que ya están cargados */}
          <div>
            <p className="ong-eyebrow">Documentos</p>
            {documentos.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {documentos.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={d.archivo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ong-panel group flex items-center gap-4 rounded-xl p-5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-[var(--ong-red)]" />
                      <span className="flex-1 text-sm font-bold ong-strong">
                        {d.nombre}
                      </span>
                      <Download className="h-4 w-4 shrink-0 ong-faint transition-colors group-hover:text-[var(--ong-red)]" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm leading-relaxed ong-faint">
                Los estatutos vigentes, el certificado de existencia y
                representación legal, el RUT y los informes anuales de gestión se
                entregan a solicitud de entidades, cooperantes y donantes.
              </p>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
