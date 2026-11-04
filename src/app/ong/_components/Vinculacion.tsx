import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHead } from "./Section";
import { OngIcon } from "./icons";
import { vinculacion, rteCalificado } from "../content";

export function Vinculacion() {
  return (
    <Section id="vinculacion">
      <SectionHead
        eyebrow={vinculacion.antetitulo}
        title={
          <>
            Formas de{" "}
            <span className="ong-gradient-water">trabajar juntos</span>
          </>
        }
        lead={vinculacion.lead}
        tone="water"
      />

      <div className="mt-14 grid gap-6 sm:grid-cols-2">
        {vinculacion.vias.map((via) => (
          <article
            key={via.id}
            className="ong-panel ong-panel-water ong-panel-lift group flex flex-col rounded-2xl p-8"
          >
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--ong-line-water)] text-[var(--ong-water)]">
              <OngIcon name={via.icono} className="h-5 w-5" />
            </span>

            <h3 className="mt-6 text-lg font-black uppercase tracking-wide text-white">
              {via.titulo}
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
              {via.texto}
            </p>

            {via.contrapartida && (
              <p className="mt-5 border-l border-[var(--ong-line-water)] pl-4 text-xs leading-relaxed text-zinc-500">
                {via.contrapartida}
              </p>
            )}

            {via.accion && (
              <Link
                href={via.accion.href}
                className="mt-7 inline-flex items-center gap-2 self-start rounded-full border border-zinc-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-[var(--ong-water)] hover:text-[var(--ong-water)]"
              >
                {via.accion.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </article>
        ))}
      </div>

      {/* Solo se publica con la calificación del RTE en firme */}
      {rteCalificado && (
        <p className="mt-10 max-w-3xl text-sm leading-relaxed text-zinc-500">
          {vinculacion.beneficioTributario}
        </p>
      )}
    </Section>
  );
}
