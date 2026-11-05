import { SOL_FINO, SOL_COMPACTO, LIENZO, ALTO_SOL } from "./sol-trazado";

const ROJO = "var(--ong-red, #b2201a)";
const CLARO = "var(--ong-cuenca, #d4837c)";

const CX = LIENZO / 2;
const ALTO = ALTO_SOL.abajo - ALTO_SOL.arriba;

/** El disco completo. Para firmas y usos pequeños. */
export function SolEntero({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${LIENZO} ${LIENZO}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d={SOL_COMPACTO} fill={ROJO} fillRule="evenodd" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EL SOL QUE SE DESHACE EN AGUA
   ───────────────────────────────────────────────────────────────────────────
   El corte va al tercio inferior del disco. Por encima, el sol entero. Por
   debajo no se desvanece —eso leería como desgaste— sino que se parte en
   tablillas nítidas que se corren a lado y lado y se separan cada vez más,
   que es como el agua devuelve una imagen. Lo que empieza siendo sol termina
   siendo onda.
   ═══════════════════════════════════════════════════════════════════════════ */

const TABLILLAS = 9;
const Y_AGUA = ALTO_SOL.abajo - ALTO / 3;
const Y_FONDO = ALTO_SOL.abajo;

const FRANJAS = (() => {
  const alturas: number[] = [], huecos: number[] = [];
  for (let i = 0; i < TABLILLAS; i++) {
    const f = i / (TABLILLAS - 1);
    alturas.push(ALTO * (0.065 - 0.049 * Math.pow(f, 0.8)));
    huecos.push(ALTO * (0.0025 + 0.031 * Math.pow(f, 1.35)));
  }
  const bruto =
    alturas.reduce((a, b) => a + b, 0) +
    huecos.slice(0, -1).reduce((a, b) => a + b, 0);
  const escala = (Y_FONDO - Y_AGUA) / bruto;

  const salida: { y: number; h: number; dx: number; op: number; k: number }[] = [];
  let y = Y_AGUA;
  for (let i = 0; i < TABLILLAS; i++) {
    const f = i / (TABLILLAS - 1);
    const h = alturas[i] * escala;
    salida.push({
      y,
      h,
      // Una sola onda larga: el conjunto ondula en vez de vibrar
      dx: Math.sin(f * Math.PI * 1.9 + 0.3) * ALTO * 0.043 * Math.pow(f, 0.75),
      op: 1 - 0.42 * Math.pow(f, 1.4),
      k: 1 - 0.055 * Math.pow(f, 1.2),
    });
    y += h + huecos[i] * escala;
  }
  return salida;
})();

/** Anillos de onda que nacen en la línea de agua y se van abriendo. */
const ONDAS = Array.from({ length: 6 }, (_, i) => {
  const t = i / 5;
  return {
    y: Y_AGUA + (Y_FONDO - Y_AGUA) * (0.16 + 0.96 * Math.pow(t, 1.15)),
    rx: ALTO * (0.2 + 0.17 * Math.pow(t, 0.65)),
    ry: ALTO * (0.012 + 0.007 * t),
    op: 0.85 - 0.7 * Math.pow(t, 0.9),
    gr: ALTO * (0.0075 - 0.004 * t),
  };
});

const SEMI = ALTO * 0.48;

export function SolDeAgua({
  className = "",
  id = "sol",
}: {
  className?: string;
  /** Prefijo de los identificadores internos, por si hay más de uno en la página. */
  id?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${LIENZO} ${Math.round(Y_FONDO + 12)}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-orilla`}
          gradientUnits="userSpaceOnUse"
          x1={CX - SEMI}
          y1={0}
          x2={CX + SEMI}
          y2={0}
        >
          <stop offset="0%" stopColor={CLARO} stopOpacity="0" />
          <stop offset="26%" stopColor={ROJO} stopOpacity="0.55" />
          <stop offset="50%" stopColor={ROJO} stopOpacity="0.9" />
          <stop offset="74%" stopColor={ROJO} stopOpacity="0.55" />
          <stop offset="100%" stopColor={CLARO} stopOpacity="0" />
        </linearGradient>

        <path id={`${id}-disco`} d={SOL_FINO} fillRule="evenodd" />

        <clipPath id={`${id}-enjuto`}>
          <rect x={-300} y={-300} width={1600} height={Y_AGUA + 300} />
        </clipPath>
        {FRANJAS.map((fr, i) => (
          <clipPath key={i} id={`${id}-t${i}`}>
            <rect x={-300} y={fr.y} width={1600} height={fr.h} />
          </clipPath>
        ))}
      </defs>

      {/* Lo que sigue siendo sol */}
      <g clipPath={`url(#${id}-enjuto)`}>
        <use href={`#${id}-disco`} fill={ROJO} />
      </g>

      {/* Lo que ya es agua */}
      {FRANJAS.map((fr, i) => (
        <g
          key={i}
          clipPath={`url(#${id}-t${i})`}
          opacity={fr.op}
          transform={`translate(${(CX + fr.dx).toFixed(2)} 0) scale(${fr.k.toFixed(4)} 1) translate(${-CX} 0)`}
        >
          <use href={`#${id}-disco`} fill={ROJO} />
        </g>
      ))}

      {/* Línea de agua */}
      <path
        d={`M${(CX - SEMI).toFixed(1)} ${Y_AGUA.toFixed(1)}L${(CX + SEMI).toFixed(1)} ${Y_AGUA.toFixed(1)}`}
        stroke={`url(#${id}-orilla)`}
        strokeWidth={ALTO * 0.0055}
        fill="none"
      />

      {/* Ondas */}
      {ONDAS.map((o, i) => (
        <path
          key={i}
          d={`M${(CX - o.rx).toFixed(1)} ${o.y.toFixed(1)}A${o.rx.toFixed(1)} ${o.ry.toFixed(1)} 0 0 0 ${(CX + o.rx).toFixed(1)} ${o.y.toFixed(1)}`}
          fill="none"
          stroke={CLARO}
          strokeWidth={o.gr}
          strokeLinecap="round"
          opacity={o.op}
        />
      ))}
    </svg>
  );
}
