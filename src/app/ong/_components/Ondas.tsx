/**
 * Oleaje. Tres crestas superpuestas que derivan a distinta velocidad; la
 * diferencia de ritmo es lo que lee el ojo como agua y no como adorno.
 *
 * Cada trazado cubre el doble del ancho y se desplaza media vuelta, de modo
 * que el ciclo no tiene costura.
 */
const CRESTA =
  "M0,36 C120,8 240,64 360,36 C480,8 600,64 720,36 C840,8 960,64 1080,36 C1200,8 1320,64 1440,36 L1440,90 L0,90 Z";

export function Ondas({
  className = "",
  color = "var(--ong-paper)",
  invertido = false,
}: {
  className?: string;
  /** Color del agua: normalmente el fondo de la sección que sigue. */
  color?: string;
  /** Para una ola que cuelga del borde superior de una sección. */
  invertido?: boolean;
}) {
  const capas = [
    { opacidad: 0.3, duracion: "26s", desplazamiento: "translateY(10px)" },
    { opacidad: 0.5, duracion: "19s", desplazamiento: "translateY(5px)" },
    { opacidad: 1, duracion: "32s", desplazamiento: "translateY(0)" },
  ];

  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      style={invertido ? { transform: "rotate(180deg)" } : undefined}
      aria-hidden="true"
    >
      <div className="relative h-[70px] w-full sm:h-[90px]">
        {capas.map((capa, i) => (
          <svg
            key={i}
            viewBox="0 0 2880 90"
            preserveAspectRatio="none"
            className="ong-ola absolute inset-x-0 bottom-0 h-full"
            style={{
              animationDuration: capa.duracion,
              opacity: capa.opacidad,
              transform: capa.desplazamiento,
            }}
            focusable="false"
          >
            <path d={CRESTA} fill={color} />
            <path d={CRESTA} fill={color} transform="translate(1440,0)" />
          </svg>
        ))}
      </div>
    </div>
  );
}
