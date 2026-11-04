import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Section, SectionHead } from "./Section";
import { programas, lineas, type Programa } from "../content";

/** Devuelve el título de la línea misional a la que pertenece un proyecto. */
function tituloLinea(id: string) {
  return lineas.items.find((l) => l.id === id)?.titulo ?? "";
}

function Tarjeta({ programa }: { programa: Programa }) {
  const cuerpo = (
    <>
      <div className="relative h-40 w-full shrink-0 overflow-hidden bg-[#070a09]">
        {programa.imagen ? (
          <Image
            src={programa.imagen}
            alt={programa.nombre}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover opacity-75 transition-transform duration-[1200ms] group-hover:scale-105"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "repeating-radial-gradient(circle at 50% 130%, transparent 0px, transparent 22px, rgba(59,189,168,0.14) 22px, rgba(59,189,168,0.14) 23px), radial-gradient(60% 80% at 50% -10%, rgba(232,176,75,0.14) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
        )}
        <span className="absolute left-5 top-5 rounded-full border border-white/10 bg-black/70 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[var(--ong-sun)] backdrop-blur-sm">
          {programa.estado}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-7">
        <p className="ong-mono text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">
          {tituloLinea(programa.linea)}
        </p>
        <h3 className="mt-3 text-lg font-black uppercase leading-snug tracking-wide text-white transition-colors group-hover:text-[var(--ong-sun)]">
          {programa.nombre}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">
          {programa.resumen}
        </p>

        {programa.requerimiento && (
          <div className="mt-6 border-t border-white/5 pt-5">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">
              Requiere
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {programa.requerimiento}
            </p>
          </div>
        )}

        {programa.enlace && (
          <span className="mt-6 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition-colors group-hover:text-[var(--ong-sun)]">
            Ver ficha
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </span>
        )}
      </div>
    </>
  );

  const clases =
    "ong-panel ong-panel-lift group flex h-full flex-col overflow-hidden rounded-2xl";

  return programa.enlace ? (
    <Link href={programa.enlace} className={clases}>
      {cuerpo}
    </Link>
  ) : (
    <article className={clases}>{cuerpo}</article>
  );
}

export function Programas() {
  if (programas.items.length === 0) return null;

  return (
    <Section id="programas">
      <SectionHead
        eyebrow={programas.antetitulo}
        title={
          <>
            Proyectos abiertos a{" "}
            <span className="ong-gradient-text">inversión</span>
          </>
        }
        lead={programas.lead}
      />
      <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {programas.items.map((p) => (
          <Tarjeta key={p.id} programa={p} />
        ))}
      </div>
    </Section>
  );
}
