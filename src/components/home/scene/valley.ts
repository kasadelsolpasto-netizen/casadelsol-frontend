/**
 * Capa vectorial de la portada (Canvas 2D a la resolución nativa de la pantalla):
 *   1. el volcán Galeras al fondo,
 *   2. la malla del valle: al centro una calle de ciudad "trash" (pavimento roto, construcciones
 *      bajas, tanques, antenas, cables), en contraste con el relieve natural de los lados:
 *      montañas exageradas recorridas por caminos,
 *   3. el ecualizador: un rayo / haz de luz que atraviesa toda la página con la forma de onda real.
 *
 * Quien mira no recorre una vía recta: la cámara serpentea, cruza el barrio, sale al monte y sube
 * por el terreno, y su mirada gira hacia donde avanza (ver `valleyCamera`).
 *
 * Las líneas son trazos vectoriales con antialiasing del navegador, así que no se pixelan.
 * Se dibuja de atrás hacia adelante; cada franja se rellena de negro para tapar lo que queda detrás.
 */

export type ValleyFrame = {
  /** Ancho y alto del lienzo en píxeles reales (ya multiplicados por devicePixelRatio). */
  W: number;
  H: number;
  dpr: number;
  /** Línea de horizonte en píxeles desde arriba. */
  horizonY: number;
  /** Distancia focal en píxeles. */
  focal: number;
  /** Cámara del recorrido (posición, altura, giro). */
  cam: Cam;
  /** Posición del reloj en negras. */
  beats: number;
  /** Respiración suave a medio tempo [0, 1]. */
  half: number;
  /** Forma de onda (128 = silencio) y nivel RMS. */
  wave: Uint8Array;
  level: number;
};

// ── Relieve ──────────────────────────────────────────────────────────
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const STREET = 4.5;    // media anchura de la calle entre construcciones
const CITY = 17;       // hasta aquí llega el barrio; más allá empieza el relieve natural
const COL = 4;         // separación de columnas
const X_MAX = 72;
const DZ = 4;          // separación de filas
const ROWS = 30;
const EYE = 2.2;       // altura de los ojos sobre el terreno

export type Cam = { x: number; y: number; yaw: number; travel: number };

/** Trayecto del caminante: serpentea entre el barrio (|x| < CITY) y el monte. */
const pathX = (z: number) => Math.sin(z * 0.011) * 21 + Math.sin(z * 0.029 + 1.3) * 9;

let smoothY = EYE;
/**
 * Cámara para el instante actual. Avanza una fila por compás; su x sigue el trayecto (más el
 * puntero), su altura sigue el terreno (sube al monte) y su mirada gira hacia donde va.
 */
export function valleyCamera(beats: number, mx: number): Cam {
  const travel = (beats / 4) * DZ;
  const x = pathX(travel) + mx * 3;
  const target = ground(x, travel) * 0.85 + EYE;
  smoothY += (target - smoothY) * 0.04;
  const slope = (pathX(travel + 2) - pathX(travel - 2)) / 4;
  const yaw = Math.atan(slope) * 0.7 + mx * 0.08;
  return { x, y: smoothY, yaw, travel };
}

/** Altura del terreno: barrio plano y laderas que se levantan con fuerza (cañón andino). */
function ground(x: number, z: number) {
  const d = Math.abs(x) - CITY;
  if (d <= 0) return 0;
  const rise = Math.min(1, d / 34);
  const peaks = 0.6 + 0.75 * noise(x * 0.06, z * 0.05) + 0.25 * noise(x * 0.17 + 9, z * 0.15);
  return Math.pow(rise, 1.5) * 17 * peaks + d * 0.06;
}

// ── Galeras ──────────────────────────────────────────────────────────
// Estratovolcán ancho de cumbre achatada con cráter; queda fijo al fondo, al final de la calle.
const VOLC_Z = 260;
const VOLC_R = 120;
const VOLC_H = 46;
const CRATER = 16;   // radio de la cumbre achatada
function galeras(x: number, z: number) {
  const dx = x, dz = z - VOLC_Z;
  const r = Math.sqrt(dx * dx + dz * dz);
  if (r >= VOLC_R) return 0;
  // Laderas cóncavas (base ancha que se empina hacia la cima) y cumbre truncada
  const k = Math.max(0, (r - CRATER) / (VOLC_R - CRATER));
  let h = VOLC_H * Math.pow(1 - Math.min(1, k), 2.2);
  if (r < CRATER) h = VOLC_H - 6 * (1 - (r / CRATER) ** 2) + 1.5 * (r / CRATER); // cráter con borde
  const ang = Math.atan2(dz, dx);
  h *= 1 + 0.07 * Math.sin(ang * 7 + 1.3) * Math.min(1, r / VOLC_R) * 2; // quebradas en las laderas
  return Math.max(0, h);
}

const GREEN = [57, 255, 20];
const PURPLE = [191, 0, 255];
const mixc = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

type Pt = [number, number];

/** Proyecta un punto (x, y, z relativo al avance) con la posición y el giro de la cámara. */
function project(f: ValleyFrame, x: number, y: number, z: number): Pt {
  const c = Math.cos(f.cam.yaw), sn = Math.sin(f.cam.yaw);
  const X = x - f.cam.x;
  const xr = X * c - z * sn;
  const zr = Math.max(0.35, X * sn + z * c);
  return [f.W / 2 + (xr / zr) * f.focal, f.horizonY - ((y - f.cam.y) / zr) * f.focal];
}

// ── Barrio "trash" ───────────────────────────────────────────────────
// Lotes a lado y lado de la calle; cada lote se decide con un hash estable (no cambia al avanzar).
const LOT = 7;
type Building = { x0: number; x1: number; z0: number; z1: number; h: number; tilt: number; tank: boolean; antenna: number; seed: number };
function lot(n: number, side: number): Building | null {
  const r = (k: number) => hash(n * 13.1 + k, side * 7.7 + k * 3.3);
  if (((n % 5) + 5) % 5 === 0) return null;             // calle transversal: el barrio se cruza
  if (r(1) < 0.22) return null;                         // lote vacío
  const inner = STREET + 1.2 + r(2) * 2;
  const w = 2.5 + r(3) * 4;
  const z0 = n * LOT + r(4) * 1.5;
  const depth = 3 + r(5) * (LOT - 4.5);
  const h = 1.4 + Math.pow(r(6), 1.8) * 4.2;
  const xa = side * inner, xb = side * (inner + w);
  return { x0: Math.min(xa, xb), x1: Math.max(xa, xb), z0, z1: z0 + depth, h, tilt: (r(10) - 0.5) * 0.9, tank: r(7) > 0.55, antenna: r(8) > 0.6 ? 1.2 + r(9) * 2.5 : 0, seed: n * 2 + (side > 0 ? 1 : 0) };
}

const CONCRETE = [190, 205, 215];
const WINDOW_COLORS = ["255,42,180", "57,255,20", "255,170,40", "120,220,255"];

function quad(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, c: Pt, d: Pt) {
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]);
  ctx.closePath();
}

function drawBuilding(ctx: CanvasRenderingContext2D, f: ValleyFrame, b: Building, travel: number, alpha: number) {
  const zn = Math.max(1.0, b.z0 - travel), zf = Math.max(1.05, b.z1 - travel);
  // cara lateral que mira hacia quien camina (si está a un lado del edificio)
  const sideX = f.cam.x > b.x1 ? b.x1 : f.cam.x < b.x0 ? b.x0 : null;
  const P = (x: number, y: number, z: number) => project(f, x, y, z);
  const line = `rgba(${CONCRETE[0]},${CONCRETE[1]},${CONCRETE[2]},${alpha.toFixed(3)})`;
  // se desvanece al acercarse a la cámara para no taparla
  const fade = Math.min(1, Math.max(0, (zn - 16) / 10));
  if (fade <= 0) return;
  ctx.globalAlpha = fade;
  ctx.fillStyle = "#020006";
  ctx.strokeStyle = line;
  if (sideX !== null) {
    quad(ctx, P(sideX, 0, zn), P(sideX, 0, zf), P(sideX, b.h, zf), P(sideX, b.h, zn));
    ctx.fill(); ctx.stroke();
  }
  // techo (si la cámara lo alcanza a ver, p. ej. desde el monte)
  if (b.h < f.cam.y + 0.2) {
    quad(ctx, P(b.x0, b.h, zn), P(b.x1, b.h, zn), P(b.x1, b.h, zf), P(b.x0, b.h, zf));
    ctx.fill(); ctx.stroke();
  }
  // fachada (techo algo torcido: barrio construido a pedazos)
  quad(ctx, P(b.x0, 0, zn), P(b.x1, 0, zn), P(b.x1, b.h + b.tilt, zn), P(b.x0, b.h - b.tilt, zn));
  ctx.fill(); ctx.stroke();
  // ventanas: pocas encendidas, en neón
  const floors = Math.floor(b.h / 1.6);
  const cols = Math.max(1, Math.floor((b.x1 - b.x0) / 1.8));
  for (let fl = 0; fl < floors; fl++) {
    for (let c = 0; c < cols; c++) {
      const hv = hash(b.seed * 3.1 + fl, c * 5.3);
      if (hv < 0.72) continue;
      const wx = b.x0 + ((c + 0.5) / cols) * (b.x1 - b.x0);
      const wy = 0.8 + fl * 1.6;
      ctx.fillStyle = `rgba(${WINDOW_COLORS[Math.floor(hv * 97) % 4]},${(alpha * 1.2).toFixed(3)})`;
      quad(ctx, P(wx - 0.3, wy, zn), P(wx + 0.3, wy, zn), P(wx + 0.3, wy + 0.7, zn), P(wx - 0.3, wy + 0.7, zn));
      ctx.fill();
    }
  }
  // tanque de agua y antena en la terraza
  if (b.tank) {
    const tx = b.x0 + (b.x1 - b.x0) * 0.3;
    ctx.fillStyle = "#020006";
    quad(ctx, P(tx - 0.6, b.h, zn + 0.5), P(tx + 0.6, b.h, zn + 0.5), P(tx + 0.6, b.h + 1.1, zn + 0.5), P(tx - 0.6, b.h + 1.1, zn + 0.5));
    ctx.fill(); ctx.stroke();
  }
  if (b.antenna) {
    const ax = b.x0 + (b.x1 - b.x0) * 0.7;
    const a0 = P(ax, b.h, zn + 0.8), a1 = P(ax, b.h + b.antenna, zn + 0.8);
    ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]);
    const c0 = P(ax - 0.5, b.h + b.antenna * 0.75, zn + 0.8), c1 = P(ax + 0.5, b.h + b.antenna * 0.75, zn + 0.8);
    ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** Cables colgados de un lado al otro de la calle. */
function drawCable(ctx: CanvasRenderingContext2D, f: ValleyFrame, l: Building, r: Building, travel: number, alpha: number) {
  const z = Math.max(1.2, Math.min(l.z0, r.z0) + 0.3 - travel);
  if (z < 12) return;
  const hy = Math.min(l.h, r.h) - 0.4;
  const a = project(f, l.x1, hy, z), b = project(f, r.x0, hy, z);
  const m = project(f, (l.x1 + r.x0) / 2, hy - 1.4, z);
  ctx.strokeStyle = `rgba(${CONCRETE[0]},${CONCRETE[1]},${CONCRETE[2]},${(alpha * 0.7).toFixed(3)})`;
  ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0] * 2 - (a[0] + b[0]) / 2, m[1] * 2 - (a[1] + b[1]) / 2, b[0], b[1]); ctx.stroke();
}

/** Dibuja una franja entre dos filas: relleno negro (oculta lo de atrás) + trazos. */
function band(ctx: CanvasRenderingContext2D, far: Pt[], near: Pt[], color: string, verticals: boolean, skip?: (i: number) => boolean) {
  ctx.beginPath();
  ctx.moveTo(far[0][0], far[0][1]);
  for (let i = 1; i < far.length; i++) ctx.lineTo(far[i][0], far[i][1]);
  for (let i = near.length - 1; i >= 0; i--) ctx.lineTo(near[i][0], near[i][1]);
  ctx.closePath();
  ctx.fillStyle = "#020006";
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(near[0][0], near[0][1]);
  for (let i = 1; i < near.length; i++) ctx.lineTo(near[i][0], near[i][1]);
  if (verticals) {
    for (let i = 0; i < near.length; i++) {
      if (skip && skip(i)) continue;
      ctx.moveTo(far[i][0], far[i][1]);
      ctx.lineTo(near[i][0], near[i][1]);
    }
  }
  ctx.stroke();
}

export function drawValley(ctx: CanvasRenderingContext2D, f: ValleyFrame) {
  const { W, H, dpr } = f;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, dpr);

  // ── Galeras ── (filas de atrás hacia adelante)
  const vx: number[] = [];
  for (let x = -VOLC_R * 1.1; x <= VOLC_R * 1.1 + 1e-6; x += 8) vx.push(x);
  let prevV: Pt[] | null = null;
  for (let z = VOLC_Z + CRATER * 2; z >= VOLC_Z - VOLC_R; z -= 8) {
    const row = vx.map((x) => project(f, x, galeras(x, z), z));
    if (prevV) {
      const k = (VOLC_Z + CRATER * 2 - z) / (VOLC_R + CRATER * 2);
      const c = mixc(PURPLE, [140, 60, 255], k);
      band(ctx, prevV, row, `rgba(${c[0]},${c[1]},${c[2]},${0.28 + k * 0.25})`, true);
    }
    prevV = row;
  }

  // ── Valle: barrio al centro, relieve natural a los lados ──
  const travel = f.cam.travel;                 // una fila por compás
  const off = travel % DZ;
  // columnas fijas en el mundo, alrededor de donde va quien camina
  const xs: number[] = [];
  const x0 = Math.floor((f.cam.x - X_MAX) / COL) * COL;
  for (let x = x0; x <= f.cam.x + X_MAX + 1e-6; x += COL) xs.push(x);
  const zFar = ROWS * DZ;
  // pavimento gastado: los vértices del barrio se desplazan un poco (estables al avanzar)
  const jitter = (x: number, zw: number) => (Math.abs(x) <= CITY ? (hash(x * 1.7, Math.round(zw / DZ) * 2.3) - 0.5) * 1.1 : 0);
  const cityAlpha = (zr: number) => 0.1 + 0.55 * Math.pow(1 - zr / zFar, 0.9);
  let prev: Pt[] | null = null;
  let prevTrail: (Pt | null)[] = [null, null];
  for (let r = ROWS; r >= 0; r--) {
    const zr = Math.max(0.9, r * DZ - off + 1.2);
    const zw = zr + travel;
    const row = xs.map((x) => project(f, x + jitter(x, zw), ground(x, zw), zr));
    if (prev) {
      const near = 1 - zr / zFar;                    // 0 lejos → 1 cerca
      const c = mixc(PURPLE, GREEN, Math.pow(near, 1.4));
      const a = 0.12 + 0.6 * Math.pow(near, 0.8) + f.half * 0.06;
      const rowKey = Math.round(zw / DZ);
      // grietas: algunos tramos del pavimento faltan
      band(ctx, prev, row, `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`, true,
        (k) => Math.abs(xs[k]) <= CITY && hash(xs[k] * 2.9, rowKey * 1.3) < 0.28);

      // caminos que suben por las laderas (uno a cada lado)
      [-1, 1].forEach((side, si) => {
        const xt = side * (CITY + 9 + 6 * Math.sin(zw * 0.07 + si * 2.1));
        const pt = project(f, xt, ground(xt, zw) + 0.05, zr);
        const pv = prevTrail[si];
        if (pv) {
          ctx.save();
          ctx.setLineDash([3 * dpr, 4 * dpr]);
          ctx.strokeStyle = `rgba(255,214,150,${(a * 0.9).toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(pv[0], pv[1]); ctx.lineTo(pt[0], pt[1]); ctx.stroke();
          ctx.restore();
        }
        prevTrail[si] = pt;
      });

      // construcciones cuya fachada cae en esta franja
      const zLo = zw, zHi = zw + DZ;
      const nLo = Math.floor((zLo - 2) / LOT), nHi = Math.floor(zHi / LOT);
      for (let n = nHi; n >= nLo; n--) {
        const L = lot(n, -1), Rb = lot(n, 1);
        const ca = cityAlpha(zr);
        for (const b of [L, Rb]) {
          if (b && b.z0 >= zLo && b.z0 < zHi && b.z0 - travel > 0.6) drawBuilding(ctx, f, b, travel, ca);
        }
        if (L && Rb && hash(n * 5.7, 1.9) > 0.55 && L.z0 >= zLo && L.z0 < zHi) drawCable(ctx, f, L, Rb, travel, ca);
      }
    } else {
      prevTrail = [-1, 1].map((side, si) => {
        const xt = side * (CITY + 9 + 6 * Math.sin(zw * 0.07 + si * 2.1));
        return project(f, xt, ground(xt, zw) + 0.05, zr);
      });
    }
    prev = row;
  }

  // ── Ecualizador: rayo y haz de luz a lo ancho de toda la página ──
  const y0 = f.horizonY - H * 0.03;
  const amp = H * 0.16;
  const lvl = f.level;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // haz: banda de luz suave cuyo ancho e intensidad siguen el nivel real
  const bh = H * (0.01 + lvl * 0.12);
  const g = ctx.createLinearGradient(0, y0 - bh, 0, y0 + bh);
  g.addColorStop(0, "rgba(57,255,20,0)");
  g.addColorStop(0.5, `rgba(120,255,90,${(0.05 + lvl * 0.35).toFixed(3)})`);
  g.addColorStop(1, "rgba(57,255,20,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, y0 - bh, W, bh * 2);
  // rayo: la forma de onda real, sin suavizado
  const n = f.wave.length;
  const path = () => {
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * W;
      const y = y0 + ((f.wave[i] - 128) / 128) * amp;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  };
  path();
  ctx.strokeStyle = `rgba(191,0,255,${(0.18 + lvl * 0.5).toFixed(3)})`;
  ctx.lineWidth = 7 * dpr;
  ctx.stroke();
  ctx.shadowColor = "rgba(57,255,20,0.9)";
  ctx.shadowBlur = 14 * dpr;
  ctx.strokeStyle = `rgba(57,255,20,${(0.45 + lvl * 0.5).toFixed(3)})`;
  ctx.lineWidth = 2.5 * dpr;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = `rgba(235,255,230,${(0.6 + lvl * 0.4).toFixed(3)})`;
  ctx.lineWidth = 1 * dpr;
  ctx.stroke();
  ctx.restore();
}
