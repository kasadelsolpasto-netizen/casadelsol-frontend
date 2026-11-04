import Image from "next/image";
import { Ondas } from "./Ondas";

/**
 * Atardecer sobre el agua — telón de fondo de la portada.
 *
 * El sol de la marca baja hacia la línea de horizonte, se disuelve en ella y
 * reaparece debajo convertido en reflejo, partido en bandas por el oleaje.
 * Es la imagen que organiza toda la página: arriba la luz, abajo el agua.
 *
 * Decorativo: no aporta contenido y queda fuera del árbol de accesibilidad.
 */
export function Atardecer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="ong-cielo" />
      <div className="ong-bruma" />

      {/* Columna sol → horizonte → reflejo.
          El horizonte queda al 58 % de la altura del bloque. */}
      <div className="absolute inset-x-0 top-0 h-full">
        <div className="absolute left-[74%] top-[1%] w-[clamp(230px,56vw,560px)] -translate-x-1/2 opacity-30 sm:left-[70%] sm:w-[clamp(300px,46vw,560px)] sm:opacity-100 lg:top-[2%]">
          {/* Sol */}
          <div className="relative">
            <div className="ong-bloom" />
            <Image
              src="/ong/sol.webp"
              alt=""
              width={720}
              height={720}
              priority
              sizes="(max-width: 640px) 70vw, 560px"
              className="ong-sol-disuelto ong-rotate-slow relative h-auto w-full"
            />
          </div>

          {/* Horizonte, justo bajo el disco */}
          <div className="ong-horizonte relative -mt-[9%] w-[160%] -translate-x-[19%]" />

          {/* Reflejo */}
          <div className="relative -mt-[2%] overflow-hidden">
            <Image
              src="/ong/sol.webp"
              alt=""
              width={720}
              height={720}
              sizes="(max-width: 640px) 70vw, 560px"
              className="ong-reflejo h-auto w-full"
            />
            <div className="ong-destellos" />
          </div>
        </div>
      </div>

      {/* Oleaje al pie de la portada */}
      <Ondas className="absolute inset-x-0 bottom-0" />
    </div>
  );
}
