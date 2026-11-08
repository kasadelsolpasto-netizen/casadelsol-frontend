/**
 * Capa vectorial de la portada (Canvas 2D a la resolución nativa de la pantalla):
 *   1. el volcán Galeras al fondo,
 *   2. la malla del valle: una calle recta al centro y montañas exageradas a los lados,
 *   3. el ecualizador: un rayo / haz de luz que atraviesa toda la página con la forma de onda real.
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
  /** Puntero suavizado [-1, 1]. */
  mx: number;
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

const STREET = 4;      // media anchura de la calle
const COL = 4;         // separación de columnas (la calle cae justo en ±4 y 0)
const X_MAX = 72;
const DZ = 4;          // separación de filas
const ROWS = 30;
const CAM_Y = 2.2;

/** Altura del terreno: calle plana y laderas que se levantan con fuerza (cañón andino). */
function ground(x: number, z: number) {
  const d = Math.abs(x) - STREET;
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

function project(f: ValleyFrame, camX: number, x: number, y: number, z: number): Pt {
  return [f.W / 2 + ((x - camX) / z) * f.focal, f.horizonY - ((y - CAM_Y) / z) * f.focal];
}

/** Dibuja una franja entre dos filas: relleno negro (oculta lo de atrás) + trazos. */
function band(ctx: CanvasRenderingContext2D, far: Pt[], near: Pt[], color: string, verticals: boolean, accent?: (i: number) => string | null) {
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
      ctx.moveTo(far[i][0], far[i][1]);
      ctx.lineTo(near[i][0], near[i][1]);
    }
  }
  ctx.stroke();

  if (accent) {
    for (let i = 0; i < near.length; i++) {
      const c = accent(i);
      if (!c) continue;
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.moveTo(far[i][0], far[i][1]);
      ctx.lineTo(near[i][0], near[i][1]);
      ctx.stroke();
    }
  }
}

export function drawValley(ctx: CanvasRenderingContext2D, f: ValleyFrame) {
  const { W, H, dpr } = f;
  ctx.clearRect(0, 0, W, H);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1, dpr);
  const camX = f.mx * 3;

  // ── Galeras ── (filas de atrás hacia adelante)
  const vx: number[] = [];
  for (let x = -VOLC_R * 1.1; x <= VOLC_R * 1.1 + 1e-6; x += 8) vx.push(x);
  let prevV: Pt[] | null = null;
  for (let z = VOLC_Z + CRATER * 2; z >= VOLC_Z - VOLC_R; z -= 8) {
    const row = vx.map((x) => project(f, camX * 0.2, x, galeras(x, z), z));
    if (prevV) {
      const k = (VOLC_Z + CRATER * 2 - z) / (VOLC_R + CRATER * 2);
      const c = mixc(PURPLE, [140, 60, 255], k);
      band(ctx, prevV, row, `rgba(${c[0]},${c[1]},${c[2]},${0.28 + k * 0.25})`, true);
    }
    prevV = row;
  }

  // ── Valle: calle y montañas ──
  const travel = (f.beats / 4) * DZ;           // una fila por compás
  const off = travel % DZ;
  const xs: number[] = [];
  for (let x = -X_MAX; x <= X_MAX + 1e-6; x += COL) xs.push(x);
  const zFar = ROWS * DZ;
  let prev: Pt[] | null = null;
  for (let r = ROWS; r >= 0; r--) {
    const zr = Math.max(0.9, r * DZ - off + 1.2);
    const zw = zr + travel;
    const row = xs.map((x) => project(f, camX, x, ground(x, zw), zr));
    if (prev) {
      const near = 1 - zr / zFar;                    // 0 lejos → 1 cerca
      const c = mixc(PURPLE, GREEN, Math.pow(near, 1.4));
      const a = 0.12 + 0.6 * Math.pow(near, 0.8) + f.half * 0.06;
      const dash = Math.floor(zw / DZ) % 2 === 0;    // línea central discontinua de la calle
      band(ctx, prev, row, `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`, true, (i) => {
        const x = xs[i];
        if (Math.abs(x) === STREET) return `rgba(${GREEN[0]},${GREEN[1]},${GREEN[2]},${Math.min(1, a * 1.6).toFixed(3)})`;
        if (x === 0 && dash) return `rgba(255,255,255,${(a * 0.9).toFixed(3)})`;
        return null;
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
