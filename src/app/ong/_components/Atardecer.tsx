import { SolDeAgua } from "./Sol";
import { Ondas } from "./Ondas";

/**
 * Atardecer sobre el agua — telón de fondo de la portada.
 *
 * El sol ya no es una imagen: es el emblema vectorial de la marca, y trae
 * consigo su propia disolución. Un tercio se deshace en agua, con la línea de
 * horizonte incorporada al dibujo. Alrededor solo hace falta la atmósfera:
 * el rubor del cielo y el oleaje al pie.
 *
 * Decorativo: queda fuera del árbol de accesibilidad.
 */
export function Atardecer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="ong-cielo" />
      <div className="ong-bruma" />

      <div className="absolute left-[74%] top-[2%] w-[clamp(260px,62vw,620px)] -translate-x-1/2 opacity-40 sm:left-[70%] sm:w-[clamp(340px,50vw,620px)] sm:opacity-100">
        <div className="relative">
          <div className="ong-bloom" />
          <SolDeAgua id="portada" className="relative h-auto w-full" />
        </div>
      </div>

      <Ondas className="absolute inset-x-0 bottom-0" />
    </div>
  );
}
