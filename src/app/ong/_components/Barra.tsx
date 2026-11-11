import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SolEntero } from "./Sol";
import type { Identidad, Seccion } from "../contenido";

/**
 * Cabecera de la Fundación.
 *
 * La página no comparte la barra del sitio de eventos —ni cuentas, ni
 * boletas, ni perfiles—, así que lleva la suya: la marca, el índice de la
 * página y una salida discreta hacia Kasa del Sol.
 *
 * Va fuera de la portada y no dentro, porque la portada recorta su contenido
 * y eso anularía la fijación: así la barra acompaña toda la lectura.
 */
export function Barra({
  secciones,
  identidad,
}: {
  secciones: Seccion[];
  identidad: Identidad;
}) {
  return (
    <nav
      aria-label="Secciones de la Fundación"
      className="sticky top-0 z-30 border-y ong-hair bg-white/85 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        {/* Marca */}
        <Link
          href="#"
          className="group flex shrink-0 items-center gap-2.5"
          aria-label={identidad.nombre}
        >
          <SolEntero className="h-7 w-7 shrink-0 transition-transform duration-700 group-hover:rotate-45" />
          <span className="hidden text-[10px] font-black uppercase leading-[1.1] tracking-[0.16em] ong-brand sm:block">
            Fundación
            <br />
            Kasa del Sol
          </span>
        </Link>

        <span className="h-7 w-px shrink-0 bg-[var(--ong-hair)]" aria-hidden="true" />

        {/* Índice */}
        <ul className="flex flex-1 items-center gap-7 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {secciones.map((s) => (
            <li key={s.id} className="shrink-0">
              <Link
                href={`#${s.id}`}
                className="text-[10px] font-black uppercase tracking-[0.22em] ong-faint transition-colors duration-500 hover:text-[var(--ong-red)]"
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Salida al sitio de eventos */}
        <Link
          href="/"
          className="hidden shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] ong-faint transition-colors duration-500 hover:text-[var(--ong-red)] lg:inline-flex"
        >
          Kasa del Sol
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </nav>
  );
}
