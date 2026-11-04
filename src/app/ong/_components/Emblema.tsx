import Image from "next/image";

/**
 * Emblema «Sol y cuenca».
 *
 * El sol es el logo real de Kasa del Sol —el disco andino de volutas— girando
 * muy lentamente sobre su eje. De su base descienden las curvas de nivel de la
 * cuenca y sus cauces, en línea fina del mismo rojo: el agua que nace bajo el
 * sol. Decorativo.
 *
 * El contenedor NO fija su propia posición: quien lo usa debe pasar una clase
 * de posicionamiento (`absolute`, `relative`…) en `className`, porque los
 * elementos internos se ubican respecto de él.
 */
export function Emblema({
  className = "relative",
  prioridad = false,
}: {
  className?: string;
  prioridad?: boolean;
}) {
  const curvas = [92, 124, 156, 188, 220, 252, 284];

  return (
    <div className={className} aria-hidden="true">
      {/* Sol: el logo de la marca */}
      <div className="relative z-10 w-[62%] mx-auto">
        <Image
          src="/ong/sol.webp"
          alt=""
          width={720}
          height={720}
          priority={prioridad}
          sizes="(max-width: 640px) 60vw, 420px"
          className="ong-rotate-slow h-auto w-full"
        />
      </div>

      {/* Cuenca: curvas de nivel y cauces que nacen bajo el sol */}
      <svg
        viewBox="0 0 600 300"
        className="absolute inset-x-0 top-[56%] w-full"
        focusable="false"
      >
        <defs>
          <linearGradient id="ong-curva" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#dc9a94" stopOpacity="0" />
            <stop offset="26%" stopColor="#c8716a" stopOpacity="0.9" />
            <stop offset="74%" stopColor="#c8716a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#dc9a94" stopOpacity="0" />
          </linearGradient>
          <clipPath id="ong-bajo">
            <rect x="0" y="0" width="600" height="300" />
          </clipPath>
        </defs>

        <g clipPath="url(#ong-bajo)">
          {curvas.map((r, i) => (
            <circle
              key={r}
              cx="300"
              cy="0"
              r={r}
              fill="none"
              stroke="url(#ong-curva)"
              strokeWidth={i === 0 ? 1.6 : 1.1}
              opacity={1 - i * 0.1}
            />
          ))}

          {/* Cauce principal */}
          <path
            d="M300 0 C 293 46, 312 78, 303 116 C 294 152, 316 182, 308 226 C 302 262, 318 282, 312 300"
            fill="none"
            stroke="#b2201a"
            strokeOpacity="0.55"
            strokeWidth="1.8"
          />
          {/* Afluentes */}
          <path
            d="M299 40 C 268 58, 246 82, 236 118"
            fill="none"
            stroke="#c8716a"
            strokeOpacity="0.75"
            strokeWidth="1.2"
          />
          <path
            d="M306 98 C 340 118, 362 146, 370 186"
            fill="none"
            stroke="#c8716a"
            strokeOpacity="0.75"
            strokeWidth="1.2"
          />
          <path
            d="M304 164 C 276 188, 258 214, 252 252"
            fill="none"
            stroke="#dc9a94"
            strokeOpacity="0.8"
            strokeWidth="1.1"
          />
        </g>
      </svg>
    </div>
  );
}
