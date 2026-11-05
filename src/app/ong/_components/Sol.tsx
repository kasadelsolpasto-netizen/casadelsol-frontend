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
   debajo, el mismo dibujo visto a través del agua.

   La ondulación no se finge con franjas: se calcula. Una turbulencia fractal
   genera un campo de ruido y `feDisplacementMap` empuja cada punto del dibujo
   según ese campo. La frecuencia es muy baja en horizontal y alta en
   vertical, que es lo que estira el ruido en crestas tendidas y lo hace leer
   como agua y no como mármol.

   La distorsión crece al hundirse. Como el desplazamiento de un filtro es
   constante en toda su superficie, se superponen dos capas —una suave y otra
   fuerte— con máscaras complementarias: la suave manda junto a la orilla y la
   fuerte en el fondo, y el relevo entre ambas es continuo, sin costura.

   La tercera capa repite la fuerte con otra semilla de ruido. Alternando su
   opacidad por CSS, el agua se mueve de verdad: el filtro se calcula una sola
   vez y lo que varía es una opacidad, así que el movimiento no cuesta nada.
   ═══════════════════════════════════════════════════════════════════════════ */

const Y_AGUA = ALTO_SOL.abajo - ALTO / 3;
const Y_FONDO = ALTO_SOL.abajo;
const HONDO = Y_FONDO - Y_AGUA;

/** Margen bajo el disco: el desplazamiento arrastra dibujo más abajo del borde. */
const RESACA = ALTO * 0.07;
const ALTURA_SVG = Math.round(Y_FONDO + RESACA);

const DESPLAZA_SUAVE = ALTO * 0.022;
const DESPLAZA_FUERTE = ALTO * 0.085;

/** Pseudoaleatorio estable: el dibujo debe ser idéntico en servidor y cliente. */
function azar(i: number) {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Cresta de luz: una línea tendida que ondula al recorrer la superficie. */
function cresta(
  centro: number,
  y: number,
  semi: number,
  amp: number,
  lobulos: number,
  fase: number,
) {
  const N = 14;
  const pts: string[] = [];
  for (let k = 0; k <= N; k++) {
    const t = k / N;
    const x = centro - semi + 2 * semi * t;
    // Se apaga en los extremos, como una cresta que nace y muere
    const sobre = Math.sin(Math.PI * t);
    const yy = y + Math.sin(t * Math.PI * 2 * lobulos + fase) * amp * sobre;
    pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
  }
  return "M" + pts.join("L");
}

/**
 * Superficie del agua.
 *
 * Crestas largas de luz, valles en tono hondo y, entre ellos, destellos
 * cortos. Ninguna recorre el mismo tramo: cada una tiene su centro, su largo
 * y su altura, y la separación vertical también varía. Si todas midieran lo
 * mismo y arrancaran del mismo punto, el agua leería como un rayado.
 */
const CRESTAS = (() => {
  const salida: { d: string; color: string; op: number; gr: number }[] = [];

  // Crestas y valles
  let t = 0.02;
  for (let i = 0; i < 17 && t < 1.06; i++) {
    const a = azar(i), b = azar(i + 50), c = azar(i + 120);
    const y = Y_AGUA + HONDO * t;
    const centro = CX + (a - 0.5) * ALTO * 0.17;
    const semi = ALTO * (0.1 + 0.26 * Math.pow(t, 0.5)) * (0.55 + 0.85 * b);
    const valle = i % 3 === 2;
    // La luz se concentra bajo el sol y se apaga hacia los lados y al fondo
    const centrado = 1 - Math.min(1, Math.abs(centro - CX) / (ALTO * 0.12)) * 0.35;
    salida.push({
      d: cresta(
        centro,
        y,
        semi,
        ALTO * (0.003 + 0.012 * t) * (0.5 + 0.9 * c),
        1.5 + Math.round(a * 3),
        b * 6.28,
      ),
      color: valle ? ROJO : "#fff",
      op: (valle ? 0.14 : 0.52) * (1 - 0.74 * Math.pow(t, 0.85)) * centrado * (0.6 + 0.7 * c),
      gr: ALTO * (0.0042 - 0.0024 * t) * (0.65 + 0.75 * b),
    });
    t += 0.035 + 0.055 * azar(i + 7);
  }

  // Destellos cortos: las chispas que deja la luz sobre el rizo
  for (let i = 0; i < 22; i++) {
    const a = azar(i + 300), b = azar(i + 420), c = azar(i + 510);
    const t2 = Math.pow(a, 0.9);
    const y = Y_AGUA + HONDO * (0.06 + 1.0 * t2);
    const centro = CX + (b - 0.5) * ALTO * 0.56 * (0.4 + 0.9 * t2);
    const semi = ALTO * (0.012 + 0.042 * c);
    salida.push({
      d: cresta(centro, y, semi, ALTO * 0.0035 * c, 1, b * 6.28),
      color: "#fff",
      op: 0.62 * (1 - 0.7 * t2) * (0.45 + 0.8 * c),
      gr: ALTO * (0.0036 - 0.0016 * t2),
    });
  }

  return salida;
})();

const SEMI = ALTO * 0.48;

export function SolDeAgua({
  className = "",
  id = "sol",
}: {
  className?: string;
  /** Prefijo de los identificadores internos, por si hay más de uno en la página. */
  id?: string;
}) {
  const ondas = (sufijo: string, escala: number, semilla: number) => (
    <filter
      id={`${id}-f-${sufijo}`}
      x="-18%"
      y="-6%"
      width="136%"
      height="120%"
      colorInterpolationFilters="sRGB"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.0038 0.030"
        numOctaves={3}
        seed={semilla}
        result="ruido"
      />
      {/* El desplazamiento vale `escala * (canal - 0.5)`. Comprimiendo el
          canal verde hacia 0.5 el empuje vertical baja a un quinto: el agua
          ondula de lado, que es lo que hace, en vez de desgarrar hacia abajo. */}
      <feColorMatrix
        in="ruido"
        type="matrix"
        values="1 0 0 0 0  0 0.2 0 0 0.4  0 0 1 0 0  0 0 0 1 0"
        result="tendido"
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2="tendido"
        scale={escala}
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  );

  /** Máscara vertical: dónde manda cada capa. */
  const velo = (sufijo: string, paradas: [number, number][]) => (
    <>
      <linearGradient
        id={`${id}-g-${sufijo}`}
        gradientUnits="userSpaceOnUse"
        x1={0}
        y1={Y_AGUA}
        x2={0}
        y2={Y_FONDO}
      >
        {paradas.map(([o, a]) => (
          <stop key={o} offset={o} stopColor="#fff" stopOpacity={a} />
        ))}
      </linearGradient>
      <mask id={`${id}-m-${sufijo}`} maskUnits="userSpaceOnUse" x={-300} y={Y_AGUA} width={1600} height={HONDO + RESACA}>
        <rect
          x={-300}
          y={Y_AGUA}
          width={1600}
          height={HONDO + RESACA}
          fill={`url(#${id}-g-${sufijo})`}
        />
      </mask>
    </>
  );

  return (
    <svg
      viewBox={`0 0 ${LIENZO} ${ALTURA_SVG}`}
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
          <stop offset="26%" stopColor={ROJO} stopOpacity="0.5" />
          <stop offset="50%" stopColor={ROJO} stopOpacity="0.85" />
          <stop offset="74%" stopColor={ROJO} stopOpacity="0.5" />
          <stop offset="100%" stopColor={CLARO} stopOpacity="0" />
        </linearGradient>

        <path id={`${id}-disco`} d={SOL_FINO} fillRule="evenodd" />

        {ondas("suave", DESPLAZA_SUAVE, 5)}
        {ondas("fuerte", DESPLAZA_FUERTE, 5)}
        {ondas("otra", DESPLAZA_FUERTE, 23)}

        {velo("suave", [[0, 1], [0.42, 0.42], [1, 0]])}
        {velo("fuerte", [[0, 0], [0.5, 0.78], [0.86, 0.5], [1, 0.16]])}

        <clipPath id={`${id}-enjuto`}>
          <rect x={-300} y={-300} width={1600} height={Y_AGUA + 300} />
        </clipPath>
        <clipPath id={`${id}-hondo`}>
          <rect x={-300} y={Y_AGUA} width={1600} height={HONDO + RESACA} />
        </clipPath>
      </defs>

      {/* Lo que sigue siendo sol */}
      <g clipPath={`url(#${id}-enjuto)`}>
        <use href={`#${id}-disco`} fill={ROJO} />
      </g>

      {/* Lo que ya es agua */}
      <g clipPath={`url(#${id}-hondo)`}>
        <g mask={`url(#${id}-m-suave)`}>
          <g filter={`url(#${id}-f-suave)`}>
            <use href={`#${id}-disco`} fill={ROJO} />
          </g>
        </g>
        <g mask={`url(#${id}-m-fuerte)`} className="ong-agua-a">
          <g filter={`url(#${id}-f-fuerte)`}>
            <use href={`#${id}-disco`} fill={ROJO} />
          </g>
        </g>
        <g mask={`url(#${id}-m-fuerte)`} className="ong-agua-b">
          <g filter={`url(#${id}-f-otra)`}>
            <use href={`#${id}-disco`} fill={ROJO} />
          </g>
        </g>
      </g>

      {/* Línea de agua */}
      <path
        d={`M${(CX - SEMI).toFixed(1)} ${Y_AGUA.toFixed(1)}L${(CX + SEMI).toFixed(1)} ${Y_AGUA.toFixed(1)}`}
        stroke={`url(#${id}-orilla)`}
        strokeWidth={ALTO * 0.0045}
        fill="none"
      />

      {/* Superficie del agua */}
      {CRESTAS.map((o, i) => (
        <path
          key={i}
          d={o.d}
          fill="none"
          stroke={o.color}
          strokeWidth={o.gr}
          strokeLinecap="round"
          opacity={o.op}
        />
      ))}
    </svg>
  );
}
