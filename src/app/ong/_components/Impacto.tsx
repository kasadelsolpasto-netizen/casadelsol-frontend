import { Section, SectionHead } from "./Section";
import { impacto } from "../content";

export function Impacto() {
  if (impacto.indicadores.length === 0) return null;

  return (
    <div className="relative border-y border-zinc-900/80">
      <div className="ong-dawn opacity-60" aria-hidden="true" />
      <Section id="impacto" className="relative">
        <SectionHead
          eyebrow="Resultados"
          title={impacto.titulo}
          lead={impacto.descripcion}
          align="center"
        />

        <dl className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-900/60 lg:grid-cols-4">
          {impacto.indicadores.map((ind) => (
            <div
              key={ind.id}
              className="bg-[#050301] px-6 py-10 text-center transition-colors hover:bg-[#0a0603]"
            >
              <dd className="ong-gradient-text text-4xl font-black tracking-tight md:text-5xl">
                {ind.valor}
              </dd>
              <dt className="mt-4 text-[10px] font-black uppercase leading-relaxed tracking-[0.2em] text-zinc-400">
                {ind.etiqueta}
              </dt>
              {ind.nota && (
                <p className="mt-2 text-[10px] text-zinc-600">{ind.nota}</p>
              )}
            </div>
          ))}
        </dl>
      </Section>
    </div>
  );
}
