import { Section, SectionHead } from "./Section";
import { tesis } from "../content";

export function Tesis() {
  return (
    <Section id="tesis">
      <SectionHead eyebrow={tesis.antetitulo} title={tesis.titulo} />

      <div className="mt-12 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div className="space-y-6">
          {tesis.parrafos.map((p, i) => (
            <p
              key={i}
              className="text-base leading-relaxed ong-muted md:text-lg"
            >
              {p}
            </p>
          ))}
        </div>

        {/* Destacado */}
        <aside className="relative lg:pt-4">
          <div
            className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-[var(--ong-red)] via-[var(--ong-cuenca)] to-transparent"
            aria-hidden="true"
          />
          <blockquote className="pl-8">
            <p className="ong-title text-xl leading-snug md:text-2xl">
              {tesis.destacado}
            </p>
          </blockquote>
        </aside>
      </div>
    </Section>
  );
}
