"use client";
import { useEffect, useRef } from "react";
import { rave, sample, SPEC_BINS } from "@/lib/rave-engine";

/**
 * Escena 3D de la portada (WebGL, un solo shader de pantalla completa):
 * piso de rave infinito, sol pulsante en el horizonte, cordillera-ecualizador
 * dibujada con el espectro de la música, anillos ácidos y lluvia de partículas.
 * La cámara sigue el cursor (o la inclinación del teléfono).
 */

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform float uTime, uTravel, uBass, uMid, uHigh, uBeat;
uniform vec2 uMouse;
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

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  // Cámara: alabeo e inclinación según el puntero
  uv = rot(-uMouse.x * 0.10) * uv;
  float horizon = 0.04 - uMouse.y * 0.10;
  float camX = uMouse.x * 0.9;

  vec3 col = vec3(0.0);
  float y = uv.y - horizon;

  if (y > 0.0) {
    // ── CIELO ──
    col = mix(vec3(0.02, 0.0, 0.04), vec3(0.0), clamp(y * 2.5, 0.0, 1.0));
    col += P * 0.10 * exp(-y * 6.0);

    // Partículas (lluvia tekno) que titilan con los agudos
    vec2 cell = floor(vec2(uv.x * 60.0 + camX * 8.0, uv.y * 60.0 + uTime * 2.0));
    float h = hash(cell);
    if (h > 0.985) {
      vec2 f = fract(vec2(uv.x * 60.0 + camX * 8.0, uv.y * 60.0 + uTime * 2.0)) - 0.5;
      float star = smoothstep(0.12, 0.0, length(f));
      col += mix(G, C, h) * star * (0.25 + uHigh * 1.6) * smoothstep(0.0, 0.15, y);
    }

    // ── SOL ── (se mueve en sentido opuesto a la cámara = paralaje)
    vec2 sp = uv - vec2(-camX * 0.18, horizon + 0.20);
    float r = 0.24 + uBass * 0.04 + uBeat * 0.035;
    float d = length(sp);
    float disc = smoothstep(r, r - 0.004, d);
    // franjas horizontales que suben en la mitad inferior
    float band = (sp.y + r) / (2.0 * r);
    float cut = step(fract(sp.y * 34.0 - uTime * 0.8), 0.25 + 0.75 * clamp(band * 1.7, 0.0, 1.0));
    disc *= mix(cut, 1.0, step(0.55, band));
    vec3 sunCol = mix(P, G, smoothstep(-r, r * 0.9, sp.y));
    col = mix(col, sunCol * (1.1 + uBeat * 0.6), disc);
    col += sunCol * 0.45 * exp(-max(d - r, 0.0) * 7.0) * (0.5 + uBass * 0.9);

    // Anillos ácidos que salen del sol
    float rings = sin((d - uTime * 0.22) * 34.0);
    rings = smoothstep(0.92, 1.0, rings) * exp(-d * 2.2) * step(r, d);
    col += mix(G, P, 0.5 + 0.5 * sin(d * 9.0 - uTime)) * rings * (0.15 + uMid * 1.2);

    // ── CORDILLERA-ECUALIZADOR ── simétrica, alturas = espectro
    float sx = abs(uv.x + camX * 0.06);
    float bin = clamp(sx * 0.9, 0.0, 0.999);
    float jag = 0.012 * sin(uv.x * 90.0) + 0.008 * sin(uv.x * 37.0 + 1.3);
    float m = texture2D(uSpec, vec2(bin, 0.5)).r;
    float ridge = 0.015 + m * 0.20 * (0.55 + sx * 0.6) + jag;
    if (y < ridge) {
      col = mix(vec3(0.0), P * 0.08, y / max(ridge, 1e-3));
      float edge = smoothstep(0.006, 0.0, ridge - y);
      col += mix(G, P, bin) * edge * (0.6 + m * 1.4);
    }
  } else {
    // ── PISO ── proyección en perspectiva
    float z = 0.35 / (-y + 1e-3);
    vec2 w = vec2((uv.x) * z + camX * z * 0.25 + camX * 2.0, z + uTravel);
    // curva de la pista hacia donde apunta el cursor
    w.x += uMouse.x * z * z * 0.015;
    float g = lineGrid(w * vec2(1.0, 0.5));
    float fog = exp(-z * 0.11);
    // onda de choque del bombo que se aleja
    float wave = exp(-abs(z - (1.0 - uBeat) * 22.0) * 0.6) * uBeat;
    vec3 lc = mix(P, G, fog);
    col = lc * g * (0.35 + uBass * 0.9 + wave * 2.5) * fog;
    col += lc * wave * 0.25 * fog;
    // reflejo del sol en el piso
    float refl = exp(-abs(uv.x + camX * 0.18) * 7.0) * exp(y * 6.0);
    col += mix(G, P, 0.5) * refl * 0.25 * (0.6 + uBass);
    // resplandor del horizonte
    col += P * 0.35 * exp(y * 22.0);
  }

  // línea de horizonte
  col += G * smoothstep(0.004, 0.0, abs(y)) * (0.4 + uBeat * 0.8);

  // grano + viñeta
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

export function RaveScene() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const root = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;

    // ── Puntero / giroscopio ──
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

    // ── WebGL ──
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
    if (!gl || !prog) {
      canvas.style.display = "none"; // el fondo CSS de respaldo queda visible
    }

    const U: Record<string, WebGLUniformLocation | null> = {};
    let tex: WebGLTexture | null = null;
    const specRGBA = new Uint8Array(SPEC_BINS);
    if (gl && prog) {
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      for (const k of ["uRes", "uTime", "uTravel", "uBass", "uMid", "uHigh", "uBeat", "uMouse", "uSpec"]) {
        U[k] = gl.getUniformLocation(prog, k);
      }
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

    // Resolución interna reducida: rendimiento estable en móviles
    const scale = coarse ? 0.5 : 0.75;
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    let last = 0;
    let travel = 0;
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t;
      sample(t);
      // velocidad de avance: más rápido con graves y con la música encendida
      travel += dt * (rave.playing ? 2.2 + rave.bass * 3.5 : 0.9);

      root.style.setProperty("--viz-beat", rave.beat.toFixed(3));
      root.style.setProperty("--viz-bass", rave.bass.toFixed(3));
      root.style.setProperty("--viz-high", rave.high.toFixed(3));
      root.style.setProperty("--mx", rave.mx.toFixed(3));
      root.style.setProperty("--my", rave.my.toFixed(3));

      if (gl && prog) {
        specRGBA.set(rave.spec);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, SPEC_BINS, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, specRGBA);
        gl.uniform2f(U.uRes, canvas.width, canvas.height);
        gl.uniform1f(U.uTime, t / 1000);
        gl.uniform1f(U.uTravel, travel);
        gl.uniform1f(U.uBass, rave.bass);
        gl.uniform1f(U.uMid, rave.mid);
        gl.uniform1f(U.uHigh, rave.high);
        gl.uniform1f(U.uBeat, rave.beat);
        gl.uniform2f(U.uMouse, rave.mx, rave.my);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };

    if (reduced) {
      sample(0);
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
      for (const k of ["--viz-beat", "--viz-bass", "--viz-high", "--mx", "--my"]) root.style.removeProperty(k);
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
