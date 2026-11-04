import { Section, SectionHead } from "./Section";
import type { Territorio as DatosTerritorio } from "../contenido";

export function Territorio({ datos: territorio }: { datos: DatosTerritorio }) {
  const { sitio } = territorio;

  return (
    <div className="relative border-y ong-hair">
      <div className="ong-horizon opacity-80" aria-hidden="true" />
      <div className="ong-contour opacity-70" aria-hidden="true" />

      <Section id="territorio" className="relative">
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

        <div className="mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <div className="space-y-6">
            {territorio.parrafos.map((p, i) => (
              <p
                key={i}
                className="text-base leading-relaxed ong-muted md:text-lg"
              >
                {p}
              </p>
            ))}

            {sitio.publicarUbicacion && (
              <p className="ong-mono inline-flex rounded-full border border-[var(--ong-cuenca)] px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ong-red-bright)]">
                Humedal de importancia internacional · {sitio.denominacion}
              </p>
            )}
          </div>

          {/* Marcadores del territorio */}
          <div>
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
          </div>
        </div>
      </Section>
    </div>
  );
}
