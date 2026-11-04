import Link from "next/link";
import Image from "next/image";
import { Section, SectionHead } from "./Section";
import { aliados } from "../content";

export function Aliados() {
  if (aliados.length === 0) return null;

  return (
    <Section id="aliados">
      <SectionHead eyebrow="Red" title="Aliados" align="center" />

      <ul className="mt-12 flex flex-wrap items-center justify-center gap-4">
        {aliados.map((aliado) => {
          const cuerpo = aliado.logo ? (
            <Image
              src={aliado.logo}
              alt={aliado.nombre}
              width={160}
              height={64}
              className="h-10 w-auto object-contain opacity-60 transition-opacity hover:opacity-100"
            />
          ) : (
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-zinc-300">
              {aliado.nombre}
            </span>
          );

          return (
            <li
              key={aliado.id}
              className="ong-panel flex h-20 min-w-[180px] items-center justify-center rounded-2xl px-8"
            >
              {aliado.enlace ? (
                <Link
                  href={aliado.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {cuerpo}
                </Link>
              ) : (
                cuerpo
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
