import { Section, SectionHead } from "./Section";
import { OngIcon } from "./icons";
import { pilares } from "../content";

export function Pilares() {
  return (
    <Section id="pilares">
      <SectionHead
        eyebrow="Líneas de acción"
        title={
          <>
            Cuatro <span className="ong-gradient-text">pilares</span>
          </>
        }
      />

      <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {pilares.map((pilar, i) => (
          <article
            key={pilar.id}
            className="ong-panel ong-panel-lift group rounded-3xl p-7 flex flex-col"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--ong-line)] bg-[var(--ong-surface)] text-[var(--ong-sun)]">
                <OngIcon name={pilar.icono} className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-black tracking-[0.2em] text-zinc-700">
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>

            <h3 className="mt-6 text-lg font-black uppercase tracking-wide text-white group-hover:text-[var(--ong-sun)] transition-colors">
              {pilar.titulo}
            </h3>
            <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
              {pilar.texto}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}
