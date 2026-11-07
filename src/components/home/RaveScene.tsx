"use client";
import { useEffect, useRef } from "react";
import { rave, sample, SPEC_BINS } from "@/lib/rave-engine";

/**
 * Escena 3D de la portada (WebGL, un solo shader de pantalla completa), en la línea del
 * cañón de líneas de chauss.cz: la cuadrícula es un VALLE andino tipo Pasto, con laderas y
 * cerros a ambos lados, dibujado como malla sobre el relieve (raymarching de un campo de alturas).
 *
 * Ritmo visual delicado: nada se mueve a más de la mitad del tempo. La cámara avanza una celda
 * por compás, el sol respira cada 2 negras, los anillos salen uno por compás y las estrellas
 * titilan cada 2 compases. La única excepción es la cordillera-ecualizador del fondo, que sigue
 * fielmente el espectro de la música.
 * En el cosmos, las estrellas de Orión (sin trazos): Betelgeuse, Rigel, el cinturón y M42.
 * La cámara sigue el cursor o la inclinación del teléfono.
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
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform float uTime, uBeats, uHalf, uFocal;
uniform vec2 uMouse;
uniform vec3 uOrion;               // centro x, centro y (pantalla), escala por grado
uniform vec4 uLayout;              // horizonte base, radio del sol, altura del sol sobre el horizonte, x del sol
uniform vec4 uStar[${STAR_N}];     // x, y (grados locales), magnitud, tipo
uniform sampler2D uSpec;

const vec3 G = vec3(0.224, 1.0, 0.078);
const vec3 P = vec3(0.749, 0.0, 1.0);
const vec3 C = vec3(0.0, 1.0, 1.0);
const float TAU = 6.28318;
const float CAM_H = 1.5;
const float FAR = 150.0;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 3; k++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}

// Eje del valle: serpentea suavemente, como la hoya del río Pasto
float valleyAxis(float z){ return sin(z * 0.035) * 3.0 + sin(z * 0.09 + 1.7) * 1.2; }

// Relieve: fondo de valle casi plano, laderas que suben y cerros redondeados (tipo andino)
float terrain(vec2 p){
  float d = abs(p.x - valleyAxis(p.y));
  float slope = smoothstep(2.0, 16.0, d);
  float hills = fbm(p * 0.07) * 1.6 + vnoise(p * 0.35) * 0.3;
  float h = slope * slope * (3.0 + hills * 2.8);
  h += (1.0 - slope) * 0.12 * sin(p.x * 0.6) * sin(p.y * 0.45);   // ondulación suave del fondo
  return min(h, 7.0);
}

float lineGrid(vec2 p){
  vec2 w = fwidth(p) * 1.1;
  vec2 g = abs(fract(p - 0.5) - 0.5) / max(w, 1e-4);
  return 1.0 - min(min(g.x, g.y), 1.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float halfT = uBeats * 0.5;                        // reloj a medio tempo
  float barT = uBeats * 0.25;                        // un ciclo por compás
  float sway = sin(uBeats * TAU / 16.0) * 0.01;      // vaivén muy lento: uno cada 4 compases
  uv = rot(-uMouse.x * 0.06 + sway) * uv;
  float horizon = uLayout.x - uMouse.y * 0.08;
  float camX = uMouse.x * 0.9;
  float y = uv.y - horizon;

  // ── COSMOS ──
  vec3 col = mix(vec3(0.02, 0.0, 0.045), vec3(0.0), clamp(y * 2.5, 0.0, 1.0));
  col += P * 0.10 * exp(-abs(y) * 6.0);

  vec2 sc = uv * 90.0 + vec2(camX * 4.0, 0.0);
  float h0 = hash(floor(sc));
  if (h0 > 0.975) {
    float tw = 0.5 + 0.5 * sin(h0 * 50.0 + barT * TAU * 0.5);   // titileo: un ciclo cada 2 compases
    col += vec3(0.8, 0.9, 1.0) * smoothstep(0.18, 0.0, length(fract(sc) - 0.5)) * (0.2 + 0.35 * tw) * smoothstep(0.0, 0.2, y);
  }

  // ── SOL ── respira a medio tempo
  float sunX = uLayout.w - camX * 0.18;
  vec2 sp = uv - vec2(sunX, horizon + uLayout.z);
  float r = uLayout.y + uHalf * 0.012;
  float d = length(sp);
  float disc = smoothstep(r, r - 0.004, d);
  float band = (sp.y + r) / (2.0 * r);
  float cut = step(fract(sp.y * 34.0 - barT * 0.5), 0.25 + 0.75 * clamp(band * 1.7, 0.0, 1.0));
  disc *= mix(cut, 1.0, step(0.55, band));
  vec3 sunCol = mix(P, G, smoothstep(-r, r * 0.9, sp.y));
  col = mix(col, sunCol * (1.05 + uHalf * 0.2), disc);
  col += sunCol * 0.4 * exp(-max(d - r, 0.0) * 7.0) * (0.5 + uHalf * 0.3);

  // un anillo por compás, lento y tenue
  float ringR = r + fract(barT) * 0.6;
  float ring = exp(-abs(d - ringR) * 120.0) * (1.0 - fract(barT)) * 0.5;
  col += mix(G, C, 0.4) * ring * step(r, d);

  // ── ORIÓN ──
  vec2 op = uv - vec2(uOrion.x - camX * 0.07, uOrion.y - uMouse.y * 0.03);
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

  // ── CORDILLERA-ECUALIZADOR ── fiel al espectro (la única que sigue la música en tiempo real)
  float sx = abs(uv.x + camX * 0.06);
  float bin = clamp(sx * 0.9, 0.0, 0.999);
  float m = texture2D(uSpec, vec2(bin, 0.5)).r;
  float ridge = 0.01 + m * 0.24 * (0.6 + sx * 0.5);
  if (y > 0.0 && y < ridge) {
    col = mix(vec3(0.0), P * 0.08, clamp(y / max(ridge, 1e-3), 0.0, 1.0));
    float edge = smoothstep(0.005, 0.0, ridge - y);
    col += mix(G, P, bin) * edge * (0.35 + m * 1.3);
  }

  // ── VALLE ── raymarching del relieve, malla que sigue el terreno
  float travel = barT;                                // una celda por compás
  vec3 ro = vec3(valleyAxis(travel) + camX * 1.2, CAM_H, travel);
  vec3 rd = normalize(vec3(uv.x, y, uFocal));
  float t = 0.3;
  bool hit = false;
  for (int k = 0; k < 80; k++) {
    vec3 p = ro + rd * t;
    float dh = p.y - terrain(p.xz);
    if (dh < 0.002 * t) { hit = true; break; }
    if (t > FAR || (rd.y > 0.0 && p.y > 7.5)) break;
    t += clamp(dh * 0.45, 0.01 + t * 0.006, 2.2);
  }
  // Lo que el raymarching no alcanza bajo el horizonte es el fondo lejano del valle (plano)
  if (!hit && rd.y < 0.0) { t = CAM_H / -rd.y; hit = true; }
  if (hit) {
    vec3 p = ro + rd * t;
    float fog = exp(-t * 0.02);
    float g = lineGrid(p.xz * vec2(1.0, 0.8));
    float elev = clamp(p.y / 4.0, 0.0, 1.0);
    vec3 lc = mix(P, G, clamp(fog * 1.3 - elev * 0.3, 0.0, 1.0));
    vec3 fill = mix(vec3(0.015, 0.0, 0.03), vec3(0.0), elev);
    col = fill + lc * g * (0.6 + uHalf * 0.15) * (0.25 + 0.75 * fog);
    col += P * 0.1 * (1.0 - fog);                       // bruma tenue de la distancia
  }

  // grano de película, cambia despacio
  col += (hash(gl_FragCoord.xy + floor(uTime * 6.0) * 13.0) - 0.5) * 0.04;
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

const UNIFORMS = ["uRes", "uTime", "uBeats", "uHalf", "uFocal", "uMouse", "uOrion", "uLayout", "uStar", "uSpec"];
const CSS_VARS = ["--viz-beat", "--viz-half", "--viz-bass", "--viz-high", "--viz-p3", "--viz-p5", "--mx", "--my"];

export function RaveScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
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

    const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
    const deriv = gl?.getExtension("OES_standard_derivatives");
    let prog: WebGLProgram | null = null;
    if (gl && deriv) {
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
    let tex: WebGLTexture | null = null;
    const spec = new Uint8Array(SPEC_BINS);
    if (gl && prog) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const k of UNIFORMS) U[k] = gl.getUniformLocation(prog, k);

      // Orión: datos fijos
      const stars = new Float32Array(STAR_N * 4);
      ORION.forEach(([, x, y, mag, kind], i) => stars.set([x, y, mag, kind], i * 4));
      gl.uniform4fv(U.uStar, stars);

      tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      gl.uniform1i(U.uSpec, 0);
    }

    // Resolución interna: parte de 0,75 (0,5 en móvil) y baja sola si el equipo no alcanza ~40 fps
    let scale = coarse ? 0.5 : 0.75;
    const MIN_SCALE = 0.3;
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
      if (gl && prog) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        const halfW = (canvas.width / canvas.height) / 2;
        const wide = halfW > 0.6;
        // Encuadre cercano (el de la primera versión): horizonte alto y sol grande.
        // Sol a la izquierda y Orión a su derecha, como al amanecer de junio en Pasto.
        // La forma y la orientación de Orión son las reales; su tamaño y su altura se ajustan
        // para que se lea junto al sol estilizado (que es mucho más grande que el real).
        const place = (horizon: number, sunR: number, sunH: number, sunX: number, scale: number, lift: number) => {
          gl.uniform4f(U.uLayout, horizon, sunR, sunH, sunX);
          const x = sunX + sunR + 0.03 + ORION_LEFT * scale;              // pegada al borde derecho del sol
          const y = horizon + lift;                                       // sobre la cordillera, bajo el menú
          gl.uniform3f(U.uOrion, x, y, scale);
        };
        // Campo de visión: más abierto en pantallas angostas para que se vean ambas laderas
        gl.uniform1f(U.uFocal, wide ? 1.5 : 0.75);
        if (wide) place(0.04, 0.24, 0.2, -Math.min(0.42, halfW - 0.3), 0.0171, 0.22);
        else place(0.0, 0.17, 0.15, -halfW * 0.75, 0.009, 0.2);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0, slow = 0, frames = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = 0; return; }
      if (last) {
        const dt = t - last;
        frames++;
        if (dt > 25) slow++;
        if (frames >= 45) {
          if (slow > 25 && scale > MIN_SCALE) { scale = Math.max(MIN_SCALE, scale * 0.8); resize(); }
          frames = 0; slow = 0;
        }
      }
      last = t;
      sample(t);

      root.style.setProperty("--viz-beat", rave.beat.toFixed(3));
      root.style.setProperty("--viz-half", rave.half.toFixed(3));
      root.style.setProperty("--viz-bass", rave.bass.toFixed(3));
      root.style.setProperty("--viz-high", rave.high.toFixed(3));
      root.style.setProperty("--viz-p3", rave.p3.toFixed(3));
      root.style.setProperty("--viz-p5", rave.p5.toFixed(3));
      root.style.setProperty("--mx", rave.mx.toFixed(3));
      root.style.setProperty("--my", rave.my.toFixed(3));

      if (gl && prog) {
        spec.set(rave.spec);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, SPEC_BINS, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, spec);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, t / 1000);
        gl.uniform1f(U.uBeats, rave.beats);
        gl.uniform1f(U.uHalf, rave.half);
        gl.uniform2f(U.uMouse, rave.mx, rave.my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
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
      if (tex && gl) gl.deleteTexture(tex);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="fixed inset-0 w-screen h-screen pointer-events-none -z-10"
    />
  );
}
