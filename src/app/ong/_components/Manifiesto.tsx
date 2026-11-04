import { Section, SectionHead } from "./Section";
import { manifiesto } from "../content";

export function Manifiesto() {
  return (
    <Section id="manifiesto">
      <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
        <div>
          <SectionHead eyebrow="Manifiesto" title={manifiesto.titulo} />
          <div className="mt-8 space-y-6">
            {manifiesto.parrafos.map((p, i) => (
              <p
                key={i}
                className="text-zinc-400 text-base md:text-lg leading-relaxed"
              >
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Misión y visión */}
        <div className="space-y-6 lg:pt-16">
          {[manifiesto.mision, manifiesto.vision].map((bloque) => (
            <article
              key={bloque.titulo}
              className="ong-panel rounded-3xl p-8 relative overflow-hidden"
            >
              <div
                className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-[var(--ong-sun)] via-[var(--ong-ember)] to-transparent"
                aria-hidden="true"
              />
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-[var(--ong-sun)]">
                {bloque.titulo}
              </h3>
              <p className="mt-4 text-zinc-300 text-base md:text-lg leading-relaxed">
                {bloque.texto}
              </p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
