import { Section, SectionHead } from "./Section";
import { territorio } from "../content";

export function Territorio() {
  const { sitio } = territorio;

  return (
    <div className="relative border-y border-white/5">
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
                className="text-base leading-relaxed text-zinc-400 md:text-lg"
              >
                {p}
              </p>
            ))}

            {sitio.publicarUbicacion && (
              <p className="ong-mono inline-flex rounded-full border border-[var(--ong-line-water)] px-5 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--ong-water)]">
                Humedal de importancia internacional · {sitio.denominacion}
              </p>
            )}
          </div>

          {/* Marcadores del territorio */}
          <div>
            <dl className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/5">
              {territorio.marcadores.map((m) => (
                <div
                  key={m.id}
                  className="flex items-baseline justify-between gap-6 px-7 py-6"
                >
                  <dt className="text-[10px] font-black uppercase leading-relaxed tracking-[0.18em] text-zinc-500">
                    {m.etiqueta}
                  </dt>
                  <dd className="ong-mono ong-gradient-water shrink-0 text-3xl font-black">
                    {m.valor}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-zinc-600">
              {territorio.nota}
            </p>
          </div>
        </div>
      </Section>
    </div>
  );
}
