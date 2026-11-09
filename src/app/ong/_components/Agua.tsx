"use client";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL AGUA
 * ═══════════════════════════════════════════════════════════════════════════
 *  La superficie en la que se pone el sol, calculada punto por punto.
 *
 *  No hay imagen ni video: un sombreador dibuja un plano de agua visto en
 *  perspectiva rasante. Cada píxel bajo el horizonte corresponde a un punto
 *  del plano —más lejano cuanto más cerca de la línea—; allí se suma un tren
 *  de olas, se obtiene la pendiente de la superficie y con ella se desvía la
 *  mirada hacia el cielo. Lo que esa mirada encuentra es el emblema: por eso
 *  el reflejo es el sol mismo, invertido, y se rompe en lenguas de luz que se
 *  alargan hacia quien mira, como al atardecer.
 *
 *  Tres decisiones lo hacen leer como agua y no como un efecto:
 *    · la perspectiva: las olas se aprietan hacia el horizonte y allí el
 *      espejo queda casi quieto; cerca, el reflejo se desgarra;
 *    · el empuje vertical es varias veces mayor que el lateral, que es lo que
 *      estira el reflejo en una calzada de luz;
 *    · cada tren de olas se apaga cuando su cresta mide menos que un píxel,
 *      de modo que el horizonte no hierve.
 *
 *  Si el navegador no ofrece WebGL, o el contexto se pierde, no pasa nada:
 *  debajo sigue el agua vectorial de <SolDeAgua>, que es la que se ve también
 *  antes de que cargue el JavaScript. Con «movimiento reducido» se pinta un
 *  solo cuadro, quieto. Fuera de pantalla, o con la pestaña oculta, no corre.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { useEffect, useRef } from "react";
import { SOL_FINO, LIENZO, ALTO_SOL } from "./sol-trazado";

const ALTO = ALTO_SOL.abajo - ALTO_SOL.arriba;
/** Radio y centro del disco dentro de su lienzo. */
const RADIO = ALTO / 2;
const CY = ALTO_SOL.arriba + RADIO;
/** El corte va al tercio inferior: la misma línea que usa <SolDeAgua>. */
const Y_AGUA = ALTO_SOL.abajo - ALTO / 3;

const VERTICES = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAGMENTOS = `
precision highp float;

uniform vec2 uRes;      // tamaño del lienzo, en píxeles
uniform float uT;       // tiempo, en segundos
uniform float uCx;      // centro del sol, en píxeles
uniform float uR;       // radio del sol, en píxeles
uniform float uFin;     // hondura (en radios) donde el agua ya es papel
uniform float uLleno;   // 1 en pantallas anchas, menos donde hay texto encima
uniform sampler2D uSol; // el emblema

const vec3 ROJO   = vec3(0.698, 0.125, 0.102);
const vec3 BRASA  = vec3(0.816, 0.208, 0.173);
const vec3 CORAL  = vec3(0.925, 0.478, 0.427);
const vec3 ROSA   = vec3(0.957, 0.792, 0.769);
const vec3 PALIDO = vec3(0.992, 0.933, 0.922);
const vec3 BLANCO = vec3(1.0);

float azar(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(azar(i), azar(i + vec2(1.0, 0.0)), f.x),
    mix(azar(i + vec2(0.0, 1.0)), azar(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

/* Un tren de olas. Acumula en s la pendiente de la superficie.
   \`px\` es cuánto mide en pantalla una unidad del plano a esa distancia:
   cuando la longitud de onda baja de un par de píxeles, el tren se apaga. */
void tren(vec2 w, vec2 dir, float k, float vel, float fase, float emp,
          float px, inout vec2 s) {
  float largo = 6.2832 / k * px;
  float visible = smoothstep(1.6, 7.0, largo);
  // Y una ola más ancha que el propio sol no ondula el reflejo: lo desplaza
  // entero. También se apaga.
  visible *= 1.0 - smoothstep(0.45 * uR, 1.3 * uR, largo);
  float f = dot(w, dir) * k + uT * vel + fase;
  // Cresta afilada y valle tendido, como la ola real
  float c = cos(f) + 0.35 * cos(2.0 * f + 0.6);
  s += dir * c * emp * visible;
}

/* El emblema, en coordenadas del sol: origen en su centro, radio 1, y hacia
   arriba. Fuera del lienzo no hay nada. */
float sol(vec2 q, float sesgo) {
  vec2 uv = vec2(
    (${(LIENZO / 2).toFixed(1)} + q.x * ${RADIO.toFixed(2)}) / ${LIENZO.toFixed(1)},
    (${CY.toFixed(2)} - q.y * ${RADIO.toFixed(2)}) / ${LIENZO.toFixed(1)}
  );
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(uSol, uv, sesgo).r;
}

void main() {
  float x = (gl_FragCoord.x - uCx) / uR;
  float d = (uRes.y - gl_FragCoord.y) / uR;   // 0 en el horizonte

  // ── Perspectiva rasante ────────────────────────────────────────────────
  float de = d * 0.34 + 0.012;
  float z = 1.0 / de;
  vec2 w = vec2(x * z, z);
  // Tamaño en pantalla de una unidad del plano, en profundidad
  float px = de * de / 0.34 * uR;

  // El agua nunca es regular: una deriva lenta tuerce el plano
  vec2 torcer = vec2(
    ruido(w * 0.21 + vec2(uT * 0.031, 0.0)),
    ruido(w * 0.21 + vec2(7.3, uT * 0.027))
  ) - 0.5;
  w += torcer * 1.1;

  // ── Oleaje ─────────────────────────────────────────────────────────────
  vec2 s = vec2(0.0);
  // Mar de fondo: largo, lento, casi de frente
  tren(w, vec2( 0.10, 0.995),  3.1, 0.62, 0.0, 0.30, px, s);
  tren(w, vec2(-0.22, 0.975),  5.3, 0.80, 1.7, 0.30, px, s);
  // Oleaje medio, cruzado
  tren(w, vec2( 0.38, 0.925),  8.9, 1.05, 4.1, 0.27, px, s);
  tren(w, vec2(-0.47, 0.883), 13.6, 1.30, 2.3, 0.24, px, s);
  tren(w, vec2( 0.16, 0.987), 21.0, 1.62, 5.2, 0.21, px, s);
  // Rizo: corto y vivo, lo que hace titilar la luz
  tren(w, vec2(-0.61, 0.792), 33.0, 2.05, 0.9, 0.17, px, s);
  tren(w, vec2( 0.55, 0.835), 52.0, 2.60, 3.6, 0.09, px, s);

  // Grano fino que rompe la simetría de los trenes
  float fino = smoothstep(2.0, 9.0, px * 0.5);
  vec2 g = w * vec2(1.7, 3.1);
  s.y += (ruido(g + vec2(uT * 0.42, uT * 0.9)) - 0.5) * 0.30 * fino;
  s.x += (ruido(g * 1.3 + vec2(-uT * 0.5, uT * 0.6) + 3.7) - 0.5) * 0.22 * fino;

  // ── Reflejo ────────────────────────────────────────────────────────────
  // La pendiente desvía la mirada: poco de lado, mucho en altura.
  // Y más cuanto más cerca: la ola próxima se ve más grande.
  float cerca = 0.35 + 0.85 * d;
  vec2 q = vec2(x + s.x * 0.12 * cerca, abs(d + s.y * 0.40 * cerca));

  // El espejo: el sol invertido sobre la línea de agua. Cerca del horizonte
  // se lee algo más blando, como a través de la calima.
  float lejania = 1.0 - smoothstep(0.0, 0.35, d);
  float espejo = sol(vec2(q.x, q.y - 0.3333), lejania * 1.6);

  // La calzada de luz: el reflejo estirado hacia quien mira. Solo brillan las
  // caras de ola que apuntan al sol, así que abajo se deshace en lenguas.
  vec2 c = vec2(x + s.x * 0.34, d * 0.30 + s.y * 1.25 - 0.36);
  float calzada = 1.0 - smoothstep(0.55, 1.0, length(c * vec2(1.25, 1.0)));
  calzada *= exp(-d * 0.55);

  // ── Color ──────────────────────────────────────────────────────────────
  // El agua devuelve el cielo: pálida en las caras que miran arriba, rosa en
  // las que se inclinan.
  float cara = clamp(0.5 + s.y * 0.62 + s.x * 0.18, 0.0, 1.0);
  vec3 col = mix(ROSA, BLANCO, smoothstep(0.18, 0.86, cara));
  col = mix(col, PALIDO, 0.35);

  // Resplandor del sol en el agua, ancho y difuso
  float halo = exp(-x * x / 1.9) * exp(-d * 1.15);
  col = mix(col, CORAL, halo * 0.34 * (0.55 + 0.45 * (1.0 - cara)));

  col = mix(col, BRASA, calzada * 0.62);
  col = mix(col, ROJO, espejo * 0.96);

  // Chispas: crestas que devuelven cielo limpio en mitad del reflejo
  float chispa = smoothstep(0.80, 0.98, cara) * max(calzada, espejo * 0.6);
  col = mix(col, BLANCO, chispa * 0.75);

  // ── Presencia ──────────────────────────────────────────────────────────
  // El agua está entera bajo el sol y se va en bruma hacia los lados, donde
  // vive el texto. Abajo vuelve a ser papel.
  float lado = exp(-x * x / 2.4);
  float cuerpo = mix(0.03, 0.9, lado) * (0.72 + 0.28 * (1.0 - cara));
  float alfa = max(cuerpo, max(espejo * 0.97, calzada * 0.7));

  float fondo = 1.0 - smoothstep(uFin * 0.46, uFin, d);
  alfa *= fondo * fondo;
  alfa *= mix(uLleno, 1.0, exp(-x * x / 1.4) * (1.0 - smoothstep(0.0, uFin * 0.7, d)));

  // Línea de horizonte: un hilo de luz donde el sol toca el agua
  float hilo = exp(-pow((uRes.y - gl_FragCoord.y) / 1.3, 2.0));
  float tramo = exp(-x * x / 1.5);
  col = mix(col, ROJO, hilo * tramo * 0.7);
  alfa = max(alfa, hilo * tramo * 0.75);

  gl_FragColor = vec4(col * alfa, alfa);
}
`;

function compilar(gl: WebGLRenderingContext, tipo: number, fuente: string) {
  const s = gl.createShader(tipo);
  if (!s) return null;
  gl.shaderSource(s, fuente);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/** El emblema rasterizado a una textura: blanco sobre negro, 1024 px. */
function cargarEmblema(): Promise<HTMLCanvasElement> {
  return new Promise((resolver, rechazar) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LIENZO} ${LIENZO}" width="1024" height="1024">` +
      `<path d="${SOL_FINO}" fill="#fff" fill-rule="evenodd"/></svg>`;
    const img = new Image();
    img.onload = () => {
      const lienzo = document.createElement("canvas");
      lienzo.width = 1024;
      lienzo.height = 1024;
      const ctx = lienzo.getContext("2d");
      if (!ctx) return rechazar(new Error("sin lienzo 2d"));
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, 1024, 1024);
      ctx.drawImage(img, 0, 0, 1024, 1024);
      resolver(lienzo);
    };
    img.onerror = () => rechazar(new Error("emblema ilegible"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
}

export function Agua() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const lienzo = ref.current;
    const escena = lienzo?.closest<HTMLElement>("[data-atardecer]");
    const solEl = escena?.querySelector<SVGSVGElement>("[data-sol]");
    if (!lienzo || !escena || !solEl) return;

    const gl = lienzo.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compilar(gl, gl.VERTEX_SHADER, VERTICES);
    const fs = compilar(gl, gl.FRAGMENT_SHADER, FRAGMENTOS);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const a = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u("uRes"), uT = u("uT"), uCx = u("uCx"), uR = u("uR");
    const uFin = u("uFin"), uLleno = u("uLleno");

    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)");
    let vivo = true;
    let lista = false;
    let enPantalla = true;
    let cuadro = 0;
    let escala = 1;
    const geo = { cx: 0, r: 1, fin: 2, lleno: 1 };

    /** Sitúa el lienzo bajo la línea de agua del sol y toma sus medidas. */
    const medir = () => {
      const caja = escena.getBoundingClientRect();
      const s = solEl.getBoundingClientRect();
      if (!caja.width || !s.width) return;
      const vb = solEl.viewBox.baseVal;
      const unidad = s.width / vb.width;
      const horizonte = s.top - caja.top + Y_AGUA * unidad;
      const alto = Math.max(0, caja.height - horizonte);

      escena.style.setProperty("--ong-horizonte", `${horizonte.toFixed(1)}px`);
      lienzo.style.top = `${horizonte.toFixed(1)}px`;
      lienzo.style.height = `${alto.toFixed(1)}px`;

      escala = Math.min(window.devicePixelRatio || 1, 1.5);
      const an = Math.max(1, Math.round(caja.width * escala));
      const al = Math.max(1, Math.round(alto * escala));
      if (lienzo.width !== an || lienzo.height !== al) {
        lienzo.width = an;
        lienzo.height = al;
      }
      gl.viewport(0, 0, an, al);

      const r = RADIO * unidad;
      const ancha = caja.width >= 640;
      geo.cx = (s.left - caja.left + s.width / 2) * escala;
      geo.r = r * escala;
      // En pantallas angostas el texto cae sobre el agua: se recoge antes.
      geo.fin = Math.min(alto / r, ancha ? 2.6 : 1.35);
      geo.lleno = ancha ? 1 : 0.7;
    };

    const pintar = (ms: number) => {
      gl.uniform2f(uRes, lienzo.width, lienzo.height);
      gl.uniform1f(uT, ms / 1000);
      gl.uniform1f(uCx, geo.cx);
      gl.uniform1f(uR, geo.r);
      gl.uniform1f(uFin, geo.fin);
      gl.uniform1f(uLleno, geo.lleno);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    const ciclo = (ms: number) => {
      cuadro = 0;
      if (!vivo || !lista) return;
      pintar(ms);
      if (enPantalla && !document.hidden && !quieto.matches) {
        cuadro = requestAnimationFrame(ciclo);
      }
    };
    const arrancar = () => {
      if (!cuadro && vivo && lista) cuadro = requestAnimationFrame(ciclo);
    };

    const alRedimensionar = () => {
      medir();
      // Con el movimiento detenido, redimensionar exige volver a pintar
      if (!lista) return;
      if (quieto.matches) pintar(9000);
      else arrancar();
    };
    const tamano = new ResizeObserver(alRedimensionar);
    tamano.observe(escena);
    tamano.observe(solEl);

    const vista = new IntersectionObserver(([e]) => {
      enPantalla = e.isIntersecting;
      if (enPantalla) arrancar();
    });
    vista.observe(lienzo);

    const alCambiarPestana = () => arrancar();
    document.addEventListener("visibilitychange", alCambiarPestana);
    quieto.addEventListener?.("change", alCambiarPestana);

    // Si el sistema retira el contexto, vuelve el agua vectorial
    const alPerder = (e: Event) => {
      e.preventDefault();
      vivo = false;
      escena.removeAttribute("data-agua");
    };
    lienzo.addEventListener("webglcontextlost", alPerder);

    cargarEmblema()
      .then((emblema) => {
        if (!vivo) return;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, emblema);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(u("uSol"), 0);

        medir();
        lista = true;
        pintar(quieto.matches ? 9000 : performance.now());
        // Solo ahora cede el agua vectorial: nunca hay un instante sin agua
        escena.setAttribute("data-agua", "viva");
        arrancar();
      })
      .catch(() => {
        /* se queda el agua vectorial */
      });

    return () => {
      vivo = false;
      if (cuadro) cancelAnimationFrame(cuadro);
      tamano.disconnect();
      vista.disconnect();
      document.removeEventListener("visibilitychange", alCambiarPestana);
      quieto.removeEventListener?.("change", alCambiarPestana);
      lienzo.removeEventListener("webglcontextlost", alPerder);
      escena.removeAttribute("data-agua");
    };
  }, []);

  return <canvas ref={ref} className="ong-agua-viva" />;
}
