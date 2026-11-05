import { SOL, TRAZOS_FINO, TRAZOS_COMPACTO, LIENZO, type Trazos } from "./sol-geometria";

const ROJO = "var(--ong-red, #b2201a)";
const CLARO = "var(--ong-cuenca, #d4837c)";

const { centro: C, radio: R } = SOL;

/**
 * Máscara de los chevrones.
 *
 * En el logo las muescas son huecos, no marcas blancas: dejan ver lo que haya
 * detrás. Por eso se calan con máscara en vez de pintarse de color papel, que
 * delataría el truco en cuanto el fondo deje de ser blanco.
 */
function Muescas({ id, trazos }: { id: string; trazos: Trazos }) {
  return (
    <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={LIENZO} height={LIENZO}>
      <rect x={0} y={0} width={LIENZO} height={LIENZO} fill="#fff" />
      <path
        d={trazos.chevrones}
        fill="none"
        stroke="#000"
        strokeWidth={SOL.chevron.trazo * R}
        strokeLinejoin="miter"
      />
    </mask>
  );
}

/** Las piezas del disco, para referenciarlas desde cada recorte. */
function Piezas({ id, trazos }: { id: string; trazos: Trazos }) {
  return (
    <>
      <Muescas id={`${id}-muescas`} trazos={trazos} />
      <g mask={`url(#${id}-muescas)`}>
        <path d={trazos.banda} fill={ROJO} fillRule="evenodd" />
        <path d={trazos.rayos} fill={ROJO} />
      </g>
      <circle cx={C} cy={C} r={SOL.anilloGrueso.r * R} fill="none" stroke={ROJO} strokeWidth={SOL.anilloGrueso.w * R} />
      <path
        d={trazos.volutas}
        fill="none"
        stroke={ROJO}
        strokeWidth={SOL.volutas.trazo * R}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={C} cy={C} r={SOL.anilloFino.r * R} fill="none" stroke={ROJO} strokeWidth={SOL.anilloFino.w * R} />
      <circle cx={C} cy={C} r={SOL.nucleo * R} fill={ROJO} />
    </>
  );
}

/** El disco completo, sin agua. Para firmas y usos pequeños. */
export function SolEntero({
  className = "",
  id = "sol-entero",
}: {
  className?: string;
  id?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${LIENZO} ${LIENZO}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <Piezas id={id} trazos={TRAZOS_COMPACTO} />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EL SOL QUE SE DESHACE EN AGUA
   ───────────────────────────────────────────────────────────────────────────
   El disco mide 2R de alto y el corte va al tercio inferior: y = C + R/3.
   Por encima, el sol entero. Por debajo no se desvanece —eso leería como
   desgaste— sino que se parte en tablillas nítidas que se corren a lado y
   lado y se separan cada vez más, que es como el agua devuelve una imagen.
   Lo que empieza siendo sol termina siendo onda.
   ═══════════════════════════════════════════════════════════════════════════ */

const TABLILLAS = 9;

function repartir() {
  const yAgua = C + R / 3;
  const yFondo = C + R;

  const alturas: number[] = [], huecos: number[] = [];
  for (let i = 0; i < TABLILLAS; i++) {
    const f = i / (TABLILLAS - 1);
    alturas.push(R * (0.13 - 0.098 * Math.pow(f, 0.8)));
    huecos.push(R * (0.005 + 0.062 * Math.pow(f, 1.35)));
  }
  const bruto =
    alturas.reduce((a, b) => a + b, 0) +
    huecos.slice(0, -1).reduce((a, b) => a + b, 0);
  const escala = (yFondo - yAgua) / bruto;

  const franjas: { y: number; h: number; dx: number; op: number; k: number; f: number }[] = [];
  let y = yAgua;
  for (let i = 0; i < TABLILLAS; i++) {
    const f = i / (TABLILLAS - 1);
    const h = alturas[i] * escala;
    franjas.push({
      y,
      h,
      // Una sola onda larga: el conjunto ondula en vez de vibrar
      dx: Math.sin(f * Math.PI * 1.9 + 0.3) * R * 0.085 * Math.pow(f, 0.75),
      op: 1 - 0.42 * Math.pow(f, 1.4),
      k: 1 - 0.055 * Math.pow(f, 1.2),
      f,
    });
    y += h + huecos[i] * escala;
  }
  return { yAgua, yFondo, franjas };
}

const { yAgua, yFondo, franjas } = repartir();

/** Anillos de onda que nacen en la línea de agua y se van abriendo. */
const ONDAS = Array.from({ length: 6 }, (_, i) => {
  const t = i / 5;
  return {
    y: yAgua + (yFondo - yAgua) * (0.16 + 0.96 * Math.pow(t, 1.15)),
    rx: R * (0.4 + 0.34 * Math.pow(t, 0.65)),
    ry: R * (0.024 + 0.014 * t),
    op: 0.85 - 0.7 * Math.pow(t, 0.9),
    gr: R * (0.015 - 0.008 * t),
  };
});

const SEMI = R * 0.96;
const ALTO = Math.round(yFondo + R * 0.04);

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
      viewBox={`0 0 ${LIENZO} ${ALTO}`}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id={`${id}-orilla`}
          gradientUnits="userSpaceOnUse"
          x1={C - SEMI}
          y1={0}
          x2={C + SEMI}
          y2={0}
        >
          <stop offset="0%" stopColor={CLARO} stopOpacity="0" />
          <stop offset="26%" stopColor={ROJO} stopOpacity="0.55" />
          <stop offset="50%" stopColor={ROJO} stopOpacity="0.9" />
          <stop offset="74%" stopColor={ROJO} stopOpacity="0.55" />
          <stop offset="100%" stopColor={CLARO} stopOpacity="0" />
        </linearGradient>

        <g id={`${id}-disco`}>
          <Piezas id={id} trazos={TRAZOS_FINO} />
        </g>

        <clipPath id={`${id}-enjuto`}>
          <rect x={-300} y={-300} width={1600} height={yAgua + 300} />
        </clipPath>
        {franjas.map((fr, i) => (
          <clipPath key={i} id={`${id}-t${i}`}>
            <rect x={-300} y={fr.y} width={1600} height={fr.h} />
          </clipPath>
        ))}
      </defs>

      {/* Lo que sigue siendo sol */}
      <g clipPath={`url(#${id}-enjuto)`}>
        <use href={`#${id}-disco`} />
      </g>

      {/* Lo que ya es agua */}
      {franjas.map((fr, i) => (
        <g
          key={i}
          clipPath={`url(#${id}-t${i})`}
          opacity={fr.op}
          transform={`translate(${(C + fr.dx).toFixed(2)} 0) scale(${fr.k.toFixed(4)} 1) translate(${-C} 0)`}
        >
          <use href={`#${id}-disco`} />
        </g>
      ))}

      {/* Línea de agua */}
      <path
        d={`M${C - SEMI} ${yAgua.toFixed(1)}L${C + SEMI} ${yAgua.toFixed(1)}`}
        stroke={`url(#${id}-orilla)`}
        strokeWidth={R * 0.011}
        fill="none"
      />

      {/* Ondas */}
      {ONDAS.map((o, i) => (
        <path
          key={i}
          d={`M${(C - o.rx).toFixed(1)} ${o.y.toFixed(1)}A${o.rx.toFixed(1)} ${o.ry.toFixed(1)} 0 0 0 ${(C + o.rx).toFixed(1)} ${o.y.toFixed(1)}`}
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
