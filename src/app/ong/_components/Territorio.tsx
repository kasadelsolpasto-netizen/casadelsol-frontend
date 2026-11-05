import { Section, SectionHead } from "./Section";
import { Ondas } from "./Ondas";
import { Revelar } from "./Fluido";
import type { Territorio as DatosTerritorio } from "../contenido";

/**
 * El tramo en que la página se sumerge.
 *
 * `ong-profundo` redefine los mismos tokens de color, así que las clases
 * semánticas se invierten solas: el papel se vuelve agua honda y la tinta,
 * luz. Es el único lugar donde la página deja de ser blanca, y por eso marca
 * el centro del relato: bajo la superficie está el territorio.
 */
export function Territorio({ datos: territorio }: { datos: DatosTerritorio }) {

  return (
    <div className="ong-profundo relative">
      {/* Entrada al agua */}
      <Ondas
        className="absolute inset-x-0 top-0 z-10 -translate-y-px"
        color="#ffffff"
        invertido
      />

      <div className="ong-caustica" aria-hidden="true" />

      <Section id="territorio" className="relative pt-32 md:pt-40">
        <Revelar>
          <SectionHead
            eyebrow={territorio.antetitulo}
            title={
              <>
                Donde nace el{" "}
                <span className="ong-gradient-water">Amazonas</span>
              </>
            }
            tone="water"
          />
        </Revelar>

        <div className="mt-14 grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <Revelar retraso={120}>
            <div className="space-y-6">
              {territorio.parrafos.map((p, i) => (
                <p
                  key={i}
                  className="text-base leading-relaxed ong-muted md:text-lg md:leading-relaxed"
                >
                  {p}
                </p>
              ))}

            </div>
          </Revelar>

          <Revelar retraso={240}>
            <dl className="divide-y divide-[var(--ong-hair)] overflow-hidden rounded-2xl border ong-hair">
              {territorio.marcadores.map((m) => (
                <div
                  key={m.id}
                  className="flex items-baseline justify-between gap-6 px-7 py-6"
                >
                  <dt className="text-[10px] font-black uppercase leading-relaxed tracking-[0.18em] ong-faint">
                    {m.etiqueta}
                  </dt>
                  <dd className="ong-mono ong-gradient-water shrink-0 text-3xl font-black">
                    {m.valor}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs leading-relaxed ong-faint">
              {territorio.nota}
            </p>
          </Revelar>
        </div>

        {/* Zonas de trabajo */}
        <div className="mt-16 grid gap-6 md:grid-cols-2">
          {territorio.zonas.map((z, i) => (
            <Revelar key={z.id} retraso={i * 120}>
              <article className="ong-panel ong-aro flex h-full flex-col rounded-2xl p-8">
                <h3 className="text-lg font-black uppercase leading-snug tracking-wide ong-strong">
                  {z.nombre}
                </h3>
                <p className="ong-mono mt-3 text-[10px] font-black uppercase leading-relaxed tracking-[0.14em] text-[var(--ong-red-bright)]">
                  {z.ambito}
                </p>
                <p className="mt-5 text-sm leading-relaxed ong-muted">
                  {z.descripcion}
                </p>

                <ul className="mt-7 flex-1 space-y-3 border-t ong-hair pt-6">
                  {z.apuestas.map((a, j) => (
                    <li key={j} className="flex gap-3 text-sm ong-muted">
                      <span
                        className="mt-[0.5rem] h-px w-3.5 shrink-0 bg-[var(--ong-cuenca)]"
                        aria-hidden="true"
                      />
                      <span className="leading-relaxed">{a}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Revelar>
          ))}
        </div>
      </Section>

      {/* Salida a la superficie */}
      <Ondas
        className="absolute inset-x-0 bottom-0 z-10 translate-y-px"
        color="#fdf8f7"
      />
      <div className="h-20 sm:h-24" aria-hidden="true" />
    </div>
  );
}
