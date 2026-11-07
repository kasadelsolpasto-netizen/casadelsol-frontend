"use client";
import { useEffect, useRef } from "react";
import { rave, sample, SPEC_BINS } from "@/lib/rave-engine";

/**
 * Escena 3D de la portada (WebGL, un solo shader de pantalla completa).
 *
 * Todo el movimiento va a MEDIO TEMPO (un ciclo cada 2 negras): avance del piso,
 * franjas del sol, deriva de la cámara. Sobre ese pulso, cada capa polirrítmica
 * de la música dispara su propio elemento:
 *   half → onda de choque del piso y latido del sol
 *   p3   → anillos que emanan del sol (tresillo 3-3-2)
 *   p5   → destellos de las estrellas de Orión (pulso euclidiano 5:16)
 *   p7   → crestas de la cordillera-ecualizador (toms en ciclo de 7)
 * En el cosmos, al fondo, las estrellas de Orión (sin trazos): Betelgeuse, Rigel, el cinturón
 * y la nebulosa M42. La cámara sigue el cursor o la inclinación del teléfono.
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
uniform float uTime, uBeats, uBass, uMid, uHigh, uBeat, uHalf, uP3, uP5, uP7;
uniform vec2 uMouse;
uniform vec3 uOrion;               // centro x, centro y (pantalla), escala por grado
uniform vec4 uLayout;              // horizonte base, radio del sol, altura del sol sobre el horizonte, x del sol
uniform vec4 uStar[${STAR_N}];     // x, y (grados locales), magnitud, tipo
uniform sampler2D uSpec;

const vec3 G = vec3(0.224, 1.0, 0.078);
const vec3 P = vec3(0.749, 0.0, 1.0);
const vec3 C = vec3(0.0, 1.0, 1.0);

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float lineGrid(vec2 p){
  vec2 w = fwidth(p) * 1.2;
  vec2 g = abs(fract(p - 0.5) - 0.5) / max(w, 1e-4);
  return 1.0 - min(min(g.x, g.y), 1.0);
}
float segDist(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float halfT = uBeats * 0.5;                       // reloj a medio tempo
  float sway = sin(halfT * 3.14159) * 0.02;         // deriva de cámara: un vaivén cada 2 negras
  uv = rot(-uMouse.x * 0.10 + sway) * uv;
  float horizon = uLayout.x - uMouse.y * 0.10;
  float camX = uMouse.x * 0.9;

  vec3 col = vec3(0.0);
  float y = uv.y - horizon;

  if (y > 0.0) {
    // ── COSMOS ──
    col = mix(vec3(0.02, 0.0, 0.045), vec3(0.0), clamp(y * 2.5, 0.0, 1.0));
    col += P * 0.10 * exp(-y * 6.0);

    // polvo estelar de fondo
    vec2 sc = uv * 90.0 + vec2(camX * 4.0, 0.0);
    vec2 cell = floor(sc);
    float h = hash(cell);
    if (h > 0.975) {
      float tw = 0.5 + 0.5 * sin(h * 50.0 + halfT * 6.2832);
      col += vec3(0.8, 0.9, 1.0) * smoothstep(0.18, 0.0, length(fract(sc) - 0.5)) * (0.15 + 0.35 * tw + uHigh * 0.6) * smoothstep(0.0, 0.2, y);
    }

    // ── SOL ── late a medio tempo
    float sunX = uLayout.w - camX * 0.18;
    vec2 sp = uv - vec2(sunX, horizon + uLayout.z);
    float r = uLayout.y + uHalf * 0.025 + uBass * 0.015;
    float d = length(sp);
    float disc = smoothstep(r, r - 0.004, d);
    float band = (sp.y + r) / (2.0 * r);
    float cut = step(fract(sp.y * 34.0 - halfT), 0.25 + 0.75 * clamp(band * 1.7, 0.0, 1.0));
    disc *= mix(cut, 1.0, step(0.55, band));
    vec3 sunCol = mix(P, G, smoothstep(-r, r * 0.9, sp.y));
    col = mix(col, sunCol * (1.05 + uHalf * 0.5), disc);
    col += sunCol * 0.45 * exp(-max(d - r, 0.0) * 7.0) * (0.45 + uHalf * 0.8);

    // anillos del tresillo: cada golpe 3-3-2 lanza un anillo
    float ringR = r + (1.0 - uP3) * 0.55;
    float ring = exp(-abs(d - ringR) * 140.0) * uP3;
    col += mix(G, C, 0.4) * ring * 0.9 * step(r, d);

    // ── ORIÓN ── al fondo, paralaje menor que el sol (más lejos)
    vec2 op = uv - vec2(uOrion.x - camX * 0.07, uOrion.y - uMouse.y * 0.03);
    float s = uOrion.z;
    for (int i = 0; i < ${STAR_N}; i++) {
      vec4 st = uStar[i];
      vec2 q = op - st.xy * s;
      float dd = length(q);
      float bright = clamp(1.25 - st.z * 0.25, 0.25, 1.3);
      float tw = 0.8 + 0.7 * uP5 * (0.5 + 0.5 * sin(float(i) * 2.39 + halfT * 3.14159));
      vec3 sc2 = st.w < 0.5 ? vec3(0.9, 0.95, 1.0) : st.w < 1.5 ? vec3(1.0, 0.5, 0.25) : st.w < 2.5 ? vec3(0.6, 0.8, 1.0) : vec3(0.9, 0.3, 1.0);
      if (st.w > 2.5) {
        // nebulosa de Orión
        col += sc2 * exp(-dd / 0.04) * 0.4 * (0.7 + uP5 * 0.5);
      } else {
        float size = 0.0035 + bright * 0.0055;
        float core = smoothstep(size, 0.0, dd);
        float glow = exp(-dd / (size * 3.2)) * 0.7;
        float spk = 0.35 + uP5 * 0.9;
        float spikes = (exp(-abs(q.x) * 700.0) * exp(-abs(q.y) * 30.0) + exp(-abs(q.y) * 700.0) * exp(-abs(q.x) * 30.0)) * bright * spk;
        col += sc2 * (core * 1.5 + glow + spikes * 0.7) * bright * tw;
      }
    }

    // ── CORDILLERA-ECUALIZADOR ── crestas con los toms (p7)
    float sx = abs(uv.x + camX * 0.06);
    float bin = clamp(sx * 0.9, 0.0, 0.999);
    float jag = 0.012 * sin(uv.x * 90.0) + 0.008 * sin(uv.x * 37.0 + 1.3);
    float m = texture2D(uSpec, vec2(bin, 0.5)).r;
    float ridge = 0.015 + m * 0.20 * (0.55 + sx * 0.6) + jag;
    if (y < ridge) {
      col = mix(vec3(0.0), P * 0.08, y / max(ridge, 1e-3));
      float edge = smoothstep(0.006, 0.0, ridge - y);
      col += mix(G, P, bin) * edge * (0.5 + m * 1.2 + uP7 * 0.8);
    }
  } else {
    // ── PISO ── avanza una línea cada 2 negras
    float z = 0.35 / (-y + 1e-3);
    vec2 w = vec2(uv.x * z + camX * z * 0.25 + camX * 2.0, z + uBeats);
    w.x += uMouse.x * z * z * 0.015;
    float g = lineGrid(w * vec2(1.0, 0.5));
    float fog = exp(-z * 0.11);
    // onda de choque a medio tempo
    float wave = exp(-abs(z - (1.0 - uHalf) * 24.0) * 0.5) * uHalf;
    vec3 lc = mix(P, G, fog);
    col = lc * g * (0.35 + uBass * 0.6 + wave * 2.5) * fog;
    col += lc * wave * 0.22 * fog;
    float refl = exp(-abs(uv.x - (uLayout.w - camX * 0.18)) * 7.0) * exp(y * 6.0);
    col += mix(G, P, 0.5) * refl * 0.25 * (0.5 + uHalf);
    col += P * 0.35 * exp(y * 22.0);
  }

  // línea de horizonte: marca el bombo (cada negra)
  col += G * smoothstep(0.004, 0.0, abs(y)) * (0.35 + uBeat * 0.7);

  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.06;
  vec2 q = gl_FragCoord.xy / uRes;
  col *= 0.35 + 0.65 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.25);

  gl_FragColor = vec4(col * 0.82, 1.0);
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

const UNIFORMS = ["uRes", "uTime", "uBeats", "uBass", "uMid", "uHigh", "uBeat", "uHalf", "uP3", "uP5", "uP7", "uMouse", "uOrion", "uLayout", "uStar", "uSpec"];
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

    const scale = coarse ? 0.5 : 0.75;
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
        if (wide) place(0.04, 0.24, 0.2, -Math.min(0.42, halfW - 0.3), 0.0171, 0.22);
        else place(0.0, 0.17, 0.15, -halfW * 0.75, 0.009, 0.2);
      }
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
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
        gl.uniform1f(U.uBass, rave.bass);
        gl.uniform1f(U.uMid, rave.mid);
        gl.uniform1f(U.uHigh, rave.high);
        gl.uniform1f(U.uBeat, rave.beat);
        gl.uniform1f(U.uHalf, rave.half);
        gl.uniform1f(U.uP3, rave.p3);
        gl.uniform1f(U.uP5, rave.p5);
        gl.uniform1f(U.uP7, rave.p7);
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
