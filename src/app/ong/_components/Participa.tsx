import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionHead } from "./Section";
import { OngIcon } from "./icons";
import { participa } from "../content";

export function Participa() {
  return (
    <Section id="participa">
      <SectionHead
        eyebrow="Súmate"
        title={participa.titulo}
        lead={participa.descripcion}
      />

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {participa.vias.map((via) => (
          <article
            key={via.id}
            className="ong-panel ong-panel-lift group relative flex flex-col overflow-hidden rounded-3xl p-8"
          >
            <div
              className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--ong-sun)] to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--ong-line)] bg-[var(--ong-surface)] text-[var(--ong-sun)]">
              <OngIcon name={via.icono} className="h-6 w-6" />
            </span>

            <h3 className="mt-6 text-xl font-black uppercase tracking-wide text-white">
              {via.titulo}
            </h3>
            <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
              {via.texto}
            </p>

            {via.accion && (
              <Link
                href={via.accion.href}
                className="mt-7 inline-flex items-center gap-2 self-start rounded-full border border-zinc-700 px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 transition-colors hover:border-[var(--ong-sun)] hover:text-[var(--ong-sun)]"
              >
                {via.accion.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </article>
        ))}
      </div>
    </Section>
  );
}
