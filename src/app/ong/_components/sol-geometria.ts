/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL SOL DE KASA DEL SOL — geometría paramétrica
 * ═══════════════════════════════════════════════════════════════════════════
 *  Reconstrucción vectorial del emblema de la marca, tomando el logo original
 *  como referente. Se midieron sobre él las proporciones y los conteos: 22
 *  lenguas de fuego alternando larga y corta, 22 chevrones en los valles y 16
 *  volutas de una vuelta y media con el ojo abierto.
 *
 *  Las llamas no se dibujan a mano con curvas sueltas: se traza una espina y
 *  se desplaza a lado y lado con un perfil de grosor que se adelgaza hacia la
 *  punta. De ahí sale el filo y el latigazo del original.
 *
 *  Todo se calcula una sola vez, al cargar el módulo. Lienzo 1000×1000.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const LIENZO = 1000;
const C = 500;
const R = 470;
const TAU = Math.PI * 2;

/** Polar con el ángulo 0 arriba y creciente en sentido horario. */
const pol = (r: number, a: number): [number, number] => [
  C + r * Math.sin(a),
  C - r * Math.cos(a),
];
const red = (v: number) => Math.round(v * 10) / 10;
const P = (p: [number, number]) => `${red(p[0])},${red(p[1])}`;

export const SOL = {
  lienzo: LIENZO,
  centro: C,
  radio: R,
  nucleo: 0.243,
  anilloFino: { r: 0.3, w: 0.022 },
  volutas: { cantidad: 16, rMedio: 0.425, trazo: 0.032, vueltas: 1.45, curlExt: 0.118, curlInt: 0.045 },
  anilloGrueso: { r: 0.566, w: 0.042 },
  banda: { r0: 0.624, r1: 0.7 },
  chevron: { cantidad: 22, trazo: 0.03 },
  rayos: { cantidad: 22, rLarga: 1.0, rCorta: 0.806 },
};

/* ── Trazo con grosor variable ──────────────────────────────────────────── */

function bezier(
  p0: [number, number], p1: [number, number],
  p2: [number, number], p3: [number, number], t: number,
): [number, number] {
  const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

/** Contorno de una espina: ida por un flanco y vuelta por el otro. */
function contorno(
  espina: [[number, number], [number, number], [number, number], [number, number]],
  ancho: (t: number) => number,
  N: number,
): string {
  const [p0, p1, p2, p3] = espina;
  const pts: [number, number][] = [];
  for (let k = 0; k <= N; k++) pts.push(bezier(p0, p1, p2, p3, k / N));

  const normal = (k: number): [number, number] => {
    const a = pts[Math.max(0, k - 1)], b = pts[Math.min(N, k + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    return [-dy / m, dx / m];
  };

  const izq: [number, number][] = [], der: [number, number][] = [];
  for (let k = 0; k <= N; k++) {
    const w = ancho(k / N) / 2, nv = normal(k);
    izq.push([pts[k][0] + nv[0] * w, pts[k][1] + nv[1] * w]);
    der.push([pts[k][0] - nv[0] * w, pts[k][1] - nv[1] * w]);
  }
  return "M" + izq.map(P).join("L") + "L" + der.reverse().map(P).join("L") + "Z";
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

/** 22 lenguas: larga en S con la punta en gancho, corta más recogida. */
function construirRayos(densidad: number): string {
  const { cantidad, rLarga, rCorta } = SOL.rayos;
  const paso = TAU / cantidad;
  const rB = SOL.banda.r0 * R;
  const d: string[] = [];

  for (let i = 0; i < cantidad; i++) {
    const a0 = i * paso;
    const larga = i % 2 === 0;
    const rT = (larga ? rLarga : rCorta) * R;
    const dr = rT - rB;

    if (larga) {
      d.push(contorno(
        [
          pol(rB, a0),
          pol(rB + dr * 0.34, a0 - paso * 0.13),
          pol(rB + dr * 0.74, a0 + paso * 0.16),
          pol(rT, a0 + paso * 0.21),
        ],
        (t) => paso * 0.66 * rB * Math.pow(1 - t, 1.5) * (1 + 0.55 * Math.sin(Math.PI * t)),
        Math.max(10, Math.round(34 * densidad)),
      ));
    } else {
      d.push(contorno(
        [
          pol(rB, a0),
          pol(rB + dr * 0.32, a0 - paso * 0.12),
          pol(rB + dr * 0.7, a0 + paso * 0.14),
          pol(rT, a0 + paso * 0.19),
        ],
        (t) => paso * 0.52 * rB * Math.pow(1 - t, 1.45) * (1 + 0.5 * Math.sin(Math.PI * t)),
        Math.max(8, Math.round(26 * densidad)),
      ));
    }
  }
  return d.join("");
}

/** Anillo que une los pies de las lenguas. */
function construirBanda(): string {
  const r0 = SOL.banda.r0 * R, r1 = SOL.banda.r1 * R;
  const aro = (r: number, barrido: number) =>
    `M${P(pol(r, 0))}A${red(r)} ${red(r)} 0 1 ${barrido} ${P(pol(r, Math.PI))}` +
    `A${red(r)} ${red(r)} 0 1 ${barrido} ${P(pol(r, 0))}`;
  return aro(r1, 1) + aro(r0, 0);
}

/** 22 muescas blancas en los valles entre lenguas. */
function construirChevrones(): string {
  const paso = TAU / SOL.chevron.cantidad;
  const rPie = (SOL.banda.r0 + 0.004) * R;
  const rPunta = (SOL.banda.r1 + 0.02) * R;
  const abre = paso * 0.34;
  const d: string[] = [];
  for (let i = 0; i < SOL.chevron.cantidad; i++) {
    const a0 = i * paso + paso / 2;
    d.push(`M${P(pol(rPie, a0 - abre))}L${P(pol(rPunta, a0))}L${P(pol(rPie, a0 + abre))}`);
  }
  return d.join("");
}

/**
 * 16 volutas. Cada una entra por una cola tangencial que empalma con tangente
 * continua —así la cinta no acusa el codo— y remata en espiral con el ojo
 * abierto. Las colas se cruzan entre vecinas: ese tejido es lo que hace leer
 * la banda como una sola cinta corrida, igual que en el logo.
 */
function construirVolutas(densidad: number): string {
  const { cantidad, rMedio, vueltas, curlExt, curlInt } = SOL.volutas;
  const paso = TAU / cantidad;
  const d: string[] = [];

  for (let i = 0; i < cantidad; i++) {
    const a0 = i * paso;
    const cen = pol(rMedio * R, a0);
    const rE = curlExt * R, rI = curlInt * R;
    const k = Math.log(rI / rE) / (vueltas * TAU);
    const aIni = Math.PI * 0.58;

    const esp: [number, number][] = [];
    const N = Math.max(18, Math.round(52 * densidad));
    for (let j = 0; j <= N; j++) {
      const t = (j / N) * vueltas * TAU;
      const r = rE * Math.exp(k * t);
      const a = aIni + t;
      esp.push([cen[0] + r * Math.cos(a), cen[1] + r * Math.sin(a)]);
    }

    const tg: [number, number] = [
      k * Math.cos(aIni) - Math.sin(aIni),
      k * Math.sin(aIni) + Math.cos(aIni),
    ];
    const m = Math.hypot(tg[0], tg[1]);
    const dir: [number, number] = [tg[0] / m, tg[1] / m];

    const ini = esp[0];
    const colaIni = pol((rMedio - 0.09) * R, a0 - paso * 0.58);
    const largo = Math.hypot(ini[0] - colaIni[0], ini[1] - colaIni[1]);
    const c1 = pol((rMedio - 0.104) * R, a0 - paso * 0.3);
    const c2: [number, number] = [
      ini[0] - dir[0] * largo * 0.45,
      ini[1] - dir[1] * largo * 0.45,
    ];

    const cola: [number, number][] = [];
    const M = Math.max(6, Math.round(20 * densidad));
    for (let j = 0; j < M; j++) cola.push(bezier(colaIni, c1, c2, ini, j / M));

    d.push("M" + cola.concat(esp).map(P).join("L"));
  }
  return d.join("");
}

/**
 * Trazados ya resueltos, en dos densidades de muestreo.
 *
 * El dibujo se compone de polilíneas, así que su peso en el HTML depende de
 * cuántos puntos se emitan. La portada lo muestra a más de 600 px y necesita
 * la densidad fina; la firma del pie lo muestra a 56 px, donde la mitad de los
 * puntos es indistinguible y ahorra dos tercios del texto.
 */
function construir(densidad: number) {
  return {
    rayos: construirRayos(densidad),
    banda: construirBanda(),
    chevrones: construirChevrones(),
    volutas: construirVolutas(densidad),
  };
}

export type Trazos = ReturnType<typeof construir>;

export const TRAZOS_FINO = construir(1);
export const TRAZOS_COMPACTO = construir(0.42);
