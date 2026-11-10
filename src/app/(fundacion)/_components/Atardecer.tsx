import { SolDeAgua } from "./Sol";
import { Agua } from "./Agua";

/**
 * Atardecer sobre el agua — telón de fondo de la portada.
 *
 * El sol es el emblema vectorial de la marca, cortado en su tercio inferior
 * por la línea de horizonte. Bajo esa línea está el agua: <Agua> la calcula
 * en vivo y en ella el sol se refleja y se rompe con el oleaje. Alrededor
 * solo hace falta la atmósfera: el rubor del cielo y el halo.
 *
 * Decorativo: queda fuera del árbol de accesibilidad.
 */
export function Atardecer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
      data-atardecer=""
    >
      <div className="ong-cielo" />
      <div className="ong-bruma" />

      <div className="absolute left-[78%] top-0 w-[clamp(250px,58vw,600px)] -translate-x-1/2 sm:left-[80%] sm:w-[clamp(320px,46vw,580px)]">
        <div className="relative">
          <div className="ong-bloom" />
          <SolDeAgua id="portada" className="relative h-auto w-full" />
        </div>
      </div>

      <Agua />
    </div>
  );
}
