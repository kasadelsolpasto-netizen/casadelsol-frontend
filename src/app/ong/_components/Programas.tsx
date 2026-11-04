import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Section, SectionHead } from "./Section";
import { programas, type Programa } from "../content";

function Tarjeta({ programa }: { programa: Programa }) {
  const contenido = (
    <>
      {/* Cabecera visual */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden bg-[#0a0603]">
        {programa.imagen ? (
          <Image
            src={programa.imagen}
            alt={programa.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover opacity-80 transition-transform duration-[1200ms] group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 120%, rgba(255,95,31,0.35) 0%, transparent 55%), repeating-linear-gradient(115deg, rgba(255,197,61,0.10) 0px, rgba(255,197,61,0.10) 1px, transparent 1px, transparent 14px)",
            }}
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-[#050301] via-transparent to-transparent"
          aria-hidden="true"
        />
        <span className="absolute left-5 top-5 rounded-full border border-[var(--ong-line)] bg-black/60 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--ong-sun)] backdrop-blur-sm">
          {programa.estado}
        </span>
      </div>

      {/* Cuerpo */}
      <div className="flex flex-1 flex-col p-7">
        <h3 className="text-xl font-black uppercase tracking-wide text-white transition-colors group-hover:text-[var(--ong-sun)]">
          {programa.nombre}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
          {programa.resumen}
        </p>
        {programa.enlace && (
          <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition-colors group-hover:text-[var(--ong-sun)]">
            Ver más
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        )}
      </div>
    </>
  );

  const clases =
    "ong-panel ong-panel-lift group flex h-full flex-col overflow-hidden rounded-3xl";

  return programa.enlace ? (
    <Link href={programa.enlace} className={clases}>
      {contenido}
    </Link>
  ) : (
    <article className={clases}>{contenido}</article>
  );
}

export function Programas() {
  if (programas.length === 0) return null;

  return (
    <Section id="programas">
      <SectionHead
        eyebrow="Programas"
        title={
          <>
            Lo que <span className="ong-gradient-text">hacemos</span>
          </>
        }
      />
      <div className="mt-14 grid gap-7 md:grid-cols-2 lg:grid-cols-3">
        {programas.map((p) => (
          <Tarjeta key={p.id} programa={p} />
        ))}
      </div>
    </Section>
  );
}
