import { Section, SectionHead, Titulo } from "./Section";
import { OngIcon } from "./icons";
import { Revelar } from "./Fluido";
import type { BloqueLineas } from "../contenido";

export function Lineas({ datos: lineas }: { datos: BloqueLineas }) {
  if (lineas.items.length === 0) return null;

  return (
    <Section id="lineas">
      <Revelar>
      <SectionHead
        eyebrow={lineas.antetitulo}
        title={<Titulo texto={lineas.titulo} />}
        lead={lineas.lead}
      />
      </Revelar>

      <div className="mt-14 grid gap-6 md:grid-cols-2">
        {lineas.items.map((linea, i) => {
          // Con un número impar de líneas, la última ocupa el ancho completo
          // para que la retícula cierre sin hueco.
          const ancha =
            lineas.items.length % 2 === 1 && i === lineas.items.length - 1;

          return (
          <Revelar
            key={linea.id}
            retraso={(i % 2) * 110}
            className={ancha ? "md:col-span-2" : ""}
          >
          <article
            className="ong-panel ong-panel-lift ong-aro group flex h-full flex-col rounded-2xl p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--ong-tint-3)] text-[var(--ong-red)]">
                <OngIcon name={linea.icono} className="h-5 w-5" />
              </span>
              <span className="ong-mono text-[10px] font-black tracking-[0.2em] ong-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            <h3 className="mt-6 text-lg font-black uppercase leading-snug tracking-wide ong-strong transition-colors group-hover:text-[var(--ong-red)]">
              {linea.titulo}
            </h3>
            <p className="mt-3 text-sm leading-relaxed ong-muted">
              {linea.sumario}
            </p>

            <ul
              className={`mt-6 flex-1 space-y-2.5 ${
                ancha ? "md:grid md:grid-cols-2 md:gap-x-10 md:space-y-0" : ""
              }`}
            >
              {linea.acciones.map((accion, j) => (
                <li
                  key={j}
                  className={`flex gap-3 text-sm ong-faint ${
                    ancha ? "md:py-1.5" : ""
                  }`}
                >
                  <span
                    className="mt-[0.55rem] h-px w-3 shrink-0 bg-[var(--ong-red-bright)] opacity-60"
                    aria-hidden="true"
                  />
                  <span className="leading-relaxed">{accion}</span>
                </li>
              ))}
            </ul>

            {/* Anclaje estatutario */}
            <footer className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 border-t ong-hair pt-5">
              <span className="ong-mono text-[10px] font-black uppercase tracking-[0.18em] text-[var(--ong-red)]">
                {linea.fundamento.articulo}
              </span>
              <span className="ong-mono text-[10px] uppercase tracking-[0.14em] ong-faint">
                {linea.fundamento.norma}
              </span>
            </footer>
          </article>
          </Revelar>
          );
        })}
      </div>
    </Section>
  );
}
