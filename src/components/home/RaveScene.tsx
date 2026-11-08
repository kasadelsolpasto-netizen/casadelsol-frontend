"use client";
import { useEffect, useRef } from "react";
import { rave, sample } from "@/lib/rave-engine";
import { drawValley, valleyCamera } from "./scene/valley";
import { createFire, type Fire } from "./scene/fire";
import { createPsyFire } from "./scene/fire-psy";

/**
 * Escena de la portada, en la línea de chauss.cz, en tres capas:
 *   1. Cielo (WebGL): cosmos, constelación de Orión y el sol por delante de ella.
 *   2. Valle (Canvas 2D vectorial, sin pixelado): barrio "trash" al centro, montañas exageradas con
 *      caminos a los lados, el volcán Galeras al fondo y el ecualizador como rayo / haz de luz que cruza toda la página.
 *   3. Fuego (WebGL): dos tipos de llama salen juntos en el borde inferior, de lado a lado, en cámara
 *      subjetiva: llamas naturales y llamas psicodélicas pixeladas (`scene/fire-psy.ts`).
 *
 * Ritmo visual delicado: nada se mueve a más de la mitad del tempo. La excepción es el ecualizador,
 * que dibuja fielmente la forma de onda del sonido. La cámara sigue el cursor o el giroscopio.
 */

// ── Orión tal como se ve desde Pasto (1,21° N · 77,28° O) al amanecer del 30 de junio de 1988,
// 6:08 a. m. hora de Colombia, mirando al oriente. En junio Orión sale junto con el Sol:
// aparece "acostada", a la derecha (sur) del Sol, con la cabeza (Meissa) hacia el norte.
// Coordenadas locales en grados, centradas en Alnilam: x = azimut (derecha = sur), y = altura.
// Calculadas con precesión a 1988; el cinturón está a 14,5° de altura y 24,7° al sur del Sol.
// tipo: 0 blanca · 1 roja (Betelgeuse) · 2 azul (Rigel) · 3 nebulosa
const ORION: [string, number, number, number, number][] = [
  // nombre,      x,     y,   magnitud, tipo
  ["Betelgeuse", -8.74, -4.62, 0.5, 1],
  ["Bellatrix", -7.47, 2.84, 1.6, 0],
  ["Meissa", -11.13, 0.3, 3.4, 0],
  ["Mintaka", -0.87, 1.08, 2.2, 0],
  ["Alnilam", 0, 0, 1.7, 0],
  ["Alnitak", 0.71, -1.16, 1.8, 0],
  ["Saiph", 8.39, -3.24, 2.1, 0],
  ["Rigel", 7.16, 5.04, 0.1, 2],
  ["M42", 4.19, 0.07, 3.0, 3],
];
const STAR_N = ORION.length;
/** Extensión de la figura a la izquierda del cinturón (Meissa), en grados. */
const ORION_LEFT = 11.13;

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime, uBeats, uHalf, uYaw;   // uYaw: corrimiento del cielo por el giro de la cámara
uniform vec2 uMouse;
uniform vec3 uOrion;               // centro x, centro y (pantalla), escala por grado
uniform vec4 uLayout;              // horizonte base, radio del sol, altura del sol sobre el horizonte, x del sol
uniform vec4 uStar[${STAR_N}];     // x, y (grados locales), magnitud, tipo

const vec3 G = vec3(0.224, 1.0, 0.078);
const vec3 P = vec3(0.749, 0.0, 1.0);
const vec3 C = vec3(0.0, 1.0, 1.0);
const float TAU = 6.28318;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float barT = uBeats * 0.25;                        // un ciclo por compás
  float horizon = uLayout.x - uMouse.y * 0.08;
  float camX = uMouse.x * 0.9;
  float y = uv.y - horizon;

  // ── COSMOS ──
  vec3 col = mix(vec3(0.02, 0.0, 0.045), vec3(0.0), clamp(y * 2.5, 0.0, 1.0));
  col += P * 0.12 * exp(-abs(y) * 6.0);

  vec2 sc = uv * 90.0 + vec2(camX * 4.0 + uYaw * 90.0, 0.0);
  float h0 = hash(floor(sc));
  if (h0 > 0.975) {
    float tw = 0.5 + 0.5 * sin(h0 * 50.0 + barT * TAU * 0.5);   // titileo: un ciclo cada 2 compases
    col += vec3(0.8, 0.9, 1.0) * smoothstep(0.18, 0.0, length(fract(sc) - 0.5)) * (0.2 + 0.35 * tw) * smoothstep(0.0, 0.2, y);
  }

  // ── ORIÓN ── (detrás del sol)
  vec2 op = uv - vec2(uOrion.x - camX * 0.07 - uYaw, uOrion.y - uMouse.y * 0.03);
  float s = uOrion.z;
  for (int i = 0; i < ${STAR_N}; i++) {
    vec4 st = uStar[i];
    vec2 q = op - st.xy * s;
    float dd = length(q);
    float bright = clamp(1.25 - st.z * 0.25, 0.25, 1.3);
    float tw = 0.85 + 0.25 * sin(float(i) * 2.39 + barT * TAU * 0.5);
    vec3 sc2 = st.w < 0.5 ? vec3(0.9, 0.95, 1.0) : st.w < 1.5 ? vec3(1.0, 0.5, 0.25) : st.w < 2.5 ? vec3(0.6, 0.8, 1.0) : vec3(0.9, 0.3, 1.0);
    if (st.w > 2.5) {
      col += sc2 * exp(-dd / 0.04) * 0.4 * tw;
    } else {
      float size = 0.0035 + bright * 0.0055;
      float core = smoothstep(size, 0.0, dd);
      float glow = exp(-dd / (size * 3.2)) * 0.7;
      float spikes = (exp(-abs(q.x) * 700.0) * exp(-abs(q.y) * 30.0) + exp(-abs(q.y) * 700.0) * exp(-abs(q.x) * 30.0)) * bright * 0.5;
      col += sc2 * (core * 1.5 + glow + spikes * 0.7) * bright * tw;
    }
  }

  // ── SOL ── por delante de la constelación; respira a medio tempo
  float sunX = uLayout.w - camX * 0.18 - uYaw;
  vec2 sp = uv - vec2(sunX, horizon + uLayout.z);
  float r = uLayout.y + uHalf * 0.012;
  float d = length(sp);
  vec3 sunCol = mix(P, G, smoothstep(-r, r * 0.9, sp.y));
  col += sunCol * 0.4 * exp(-max(d - r, 0.0) * 7.0) * (0.5 + uHalf * 0.3);
  float aa = 1.5 / uRes.y;
  float disc = smoothstep(r + aa, r - aa, d);
  float band = (sp.y + r) / (2.0 * r);
  float cut = step(fract(sp.y * 34.0 - barT * 0.5), 0.25 + 0.75 * clamp(band * 1.7, 0.0, 1.0));
  disc *= mix(cut, 1.0, step(0.55, band));
  col = mix(col, sunCol * (1.05 + uHalf * 0.2), disc);

  // un anillo por compás, lento y tenue
  float ringR = r + fract(barT) * 0.6;
  float ring = exp(-abs(d - ringR) * 120.0) * (1.0 - fract(barT)) * 0.5;
  col += mix(G, C, 0.4) * ring * step(r, d);

  // bajo el horizonte: oscuridad (lo cubre el valle vectorial)
  col = mix(col, vec3(0.01, 0.0, 0.02), smoothstep(0.0, -0.02, y));

  col += (hash(gl_FragCoord.xy + floor(uTime * 6.0) * 13.0) - 0.5) * 0.035;
  vec2 q = gl_FragCoord.xy / uRes;
  col *= 0.35 + 0.65 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.25);

  gl_FragColor = vec4(col * 0.85, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("RaveScene shader:", gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

const UNIFORMS = ["uRes", "uTime", "uBeats", "uHalf", "uYaw", "uMouse", "uOrion", "uLayout", "uStar"];
const CSS_VARS = ["--viz-beat", "--viz-half", "--viz-bass", "--viz-high", "--viz-p3", "--viz-p5", "--mx", "--my"];

/** Composición común a las tres capas (unidades: alto de pantalla = 1, origen al centro). */
function layout(wide: boolean, halfW: number) {
  return wide
    ? { horizon: 0.02, sunR: 0.2, sunH: 0.25, sunX: -Math.min(0.42, halfW - 0.3), orionGap: 0.09, orionScale: 0.0171, orionLift: 0.27, focal: 1.15 }
    : { horizon: 0.04, sunR: 0.15, sunH: 0.2, sunX: -halfW * 0.7, orionGap: 0.05, orionScale: 0.009, orionLift: 0.26, focal: 0.8 };
}

export function RaveScene() {
  const skyRef = useRef<HTMLCanvasElement>(null);
  const valleyRef = useRef<HTMLCanvasElement>(null);
  const fireRef = useRef<HTMLCanvasElement>(null);
  const psyRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = skyRef.current;
    const vCanvas = valleyRef.current;
    const fCanvas = fireRef.current;
    const pCanvas = psyRef.current;
    if (!canvas || !vCanvas || !fCanvas || !pCanvas) return;
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    const onPointer = (e: PointerEvent) => {
      rave.tx = (e.clientX / window.innerWidth) * 2 - 1;
      rave.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      rave.tx = Math.max(-1, Math.min(1, e.gamma / 30));
      rave.ty = Math.max(-1, Math.min(1, (45 - e.beta) / 30));
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });

    // ── Capa 1: cielo ──
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    let prog: WebGLProgram | null = null;
    if (gl) {
      const vs = compile(gl, gl.VERTEX_SHADER, VERT);
      const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
      if (vs && fs) {
        prog = gl.createProgram()!;
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
      }
    }
    if (!gl || !prog) canvas.style.display = "none"; // queda el fondo CSS de respaldo

    const U: Record<string, WebGLUniformLocation | null> = {};
    if (gl && prog) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const k of UNIFORMS) U[k] = gl.getUniformLocation(prog, k);
      const stars = new Float32Array(STAR_N * 4);
      ORION.forEach(([, x, y, mag, kind], i) => stars.set([x, y, mag, kind], i * 4));
      gl.uniform4fv(U.uStar, stars);
    }

    // ── Capa 2: valle vectorial ──
    const vctx = vCanvas.getContext("2d");

    // ── Capa 3: fuego ──
    const fire: Fire | null = createFire(fCanvas, coarse ? 0.35 : 0.5);
    if (!fire) fCanvas.style.display = "none";
    // Llamas psicodélicas: pocos píxeles grandes, pixelado intencional
    const psy: Fire | null = createPsyFire(pCanvas, coarse ? 0.2 : 0.14);
    if (!psy) pCanvas.style.display = "none";

    // El cielo es suave: resolución interna reducida y adaptativa. El valle va a resolución nativa.
    let scale = coarse ? 0.6 : 0.85;
    const MIN_SCALE = 0.35;
    let L = layout(true, 0.8);
    let dpr = 1;
    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const halfW = w / h / 2;
      L = layout(halfW > 0.6, halfW);
      canvas.width = Math.max(1, Math.floor(w * scale));
      canvas.height = Math.max(1, Math.floor(h * scale));
      if (gl && prog) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform4f(U.uLayout, L.horizon, L.sunR, L.sunH, L.sunX);
        // Orión a la derecha del sol, un poco separada; el sol va por delante
        const ox = L.sunX + L.sunR + L.orionGap + ORION_LEFT * L.orionScale;
        gl.uniform3f(U.uOrion, ox, L.horizon + L.orionLift, L.orionScale);
      }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      vCanvas.width = Math.floor(w * dpr);
      vCanvas.height = Math.floor(h * dpr);
      fire?.resize();
      psy?.resize();
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0, slow = 0, frames = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = 0; return; }
      if (last) {
        frames++;
        if (t - last > 25) slow++;
        if (frames >= 45) {
          if (slow > 25 && scale > MIN_SCALE) { scale = Math.max(MIN_SCALE, scale * 0.8); resize(); }
          frames = 0; slow = 0;
        }
      }
      last = t;
      sample(t);

      root.style.setProperty("--viz-half", rave.half.toFixed(3));
      root.style.setProperty("--viz-bass", rave.bass.toFixed(3));
      root.style.setProperty("--mx", rave.mx.toFixed(3));
      root.style.setProperty("--my", rave.my.toFixed(3));

      const cam = valleyCamera(rave.beats, rave.mx);
      if (gl && prog) {
        gl.uniform1f(U.uYaw, Math.tan(cam.yaw) * L.focal);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, t / 1000);
        gl.uniform1f(U.uBeats, rave.beats);
        gl.uniform1f(U.uHalf, rave.half);
        gl.uniform2f(U.uMouse, rave.mx, rave.my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (vctx) {
        const H = vCanvas.height;
        const horizon = L.horizon - rave.my * 0.08;
        drawValley(vctx, {
          W: vCanvas.width, H, dpr,
          horizonY: H * (0.5 - horizon),
          focal: H * L.focal,
          cam, beats: rave.beats, half: rave.half,
          wave: rave.wave, level: rave.level,
        });
      }
      psy?.draw(t, rave.half);
      fire?.draw(t, rave.half);
    };

    if (reduced) {
      frame(0);
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("deviceorientation", onTilt);
      for (const k of CSS_VARS) root.style.removeProperty(k);
      fire?.dispose();
      psy?.dispose();
    };
  }, []);

  return (
    <>
      <canvas ref={skyRef} aria-hidden="true" className="fixed inset-0 w-screen h-screen pointer-events-none -z-10" />
      <canvas ref={valleyRef} aria-hidden="true" className="fixed inset-0 w-screen h-screen pointer-events-none" style={{ zIndex: -9 }} />
      <canvas ref={psyRef} aria-hidden="true" className="fixed inset-x-0 bottom-0 w-screen h-[38vh] pointer-events-none mix-blend-screen [image-rendering:pixelated]" style={{ zIndex: -8 }} />
      <canvas ref={fireRef} aria-hidden="true" className="fixed inset-x-0 bottom-0 w-screen h-[38vh] pointer-events-none mix-blend-screen" style={{ zIndex: -7 }} />
    </>
  );
}
