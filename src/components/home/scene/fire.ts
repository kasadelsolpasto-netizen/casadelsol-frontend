/**
 * Fuego en cámara subjetiva: llamas que suben desde el borde inferior, de lado a lado, como si
 * brotaran de quien mira. Dos calidades en contraste deliberado:
 *   - el cuerpo de las llamas, a alta resolución y con textura "perfecta": plástico líquido con
 *     volumen (normal calculada del campo), luz difusa, brillo especular e iridiscencia psicodélica;
 *   - el pixelado como recurso expresivo: un halo de píxeles nítidos que rodea las llamas y brasas
 *     en píxeles que suben. Píxeles grandes y limpios frente a superficies lisas.
 * Todo con ondas (sin ruido costoso): liviano.
 */

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uHalf, uPix;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

vec3 iris(float t){ return 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + t)); }

// Campo de la llama: > 0 dentro. Lenguas en punta, turbulentas, más altas a los costados.
float field(vec2 uv, float t){
  float aspect = uRes.x / uRes.y;
  float side = (uv.x - 0.5) * 2.0;
  float x = uv.x * aspect * 2.2;
  float warp = sin(uv.y * 6.0 - t * 2.6 + x * 0.8) * 0.35 + sin(uv.y * 11.0 + t * 3.1 - x * 1.7) * 0.12;
  float w = pow(1.0 - abs(sin(x * 1.3 + t * 1.4 + warp)), 3.0) * 0.6
          + pow(1.0 - abs(sin(x * 2.9 - t * 1.1 + warp * 1.4)), 4.0) * 0.3
          + pow(1.0 - abs(sin(x * 6.1 + t * 2.2 + warp)), 5.0) * 0.15;
  float height = 0.12 + 0.4 * pow(abs(side), 2.4) + 0.34 * w + 0.03 * uHalf;
  return height - uv.y + 0.025 * sin(uv.y * 18.0 - t * 4.0 + x * 2.0) * uv.y;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  float t = uTime * 0.55;
  float f = field(uv, t);
  vec4 outc = vec4(0.0);

  // ── Halo de píxeles: rodea las llamas con bloques nítidos ──
  vec2 cell = floor(gl_FragCoord.xy / uPix);
  vec2 qc = (cell + 0.5) * uPix / uRes;
  float fq = field(qc, t);
  if (fq > -0.13 && f <= 0.0) {
    float lv = floor((1.0 + fq / 0.13) * 4.0) / 4.0;                  // 4 niveles
    float flick = hash(cell + floor(t * 3.0));
    vec3 pc = flick > 0.7 ? vec3(0.22, 1.0, 0.08) : flick > 0.35 ? vec3(0.75, 0.0, 1.0) : vec3(1.0, 0.1, 0.65);
    float a = lv * 0.75;
    outc = vec4(pc * a, a);
  }

  // ── Cuerpo de las llamas: plástico líquido, liso y brillante ──
  if (f > 0.0) {
    float e = 1.5 / uRes.y;
    float fx = field(uv + vec2(e, 0.0), t) - f;
    float fy = field(uv + vec2(0.0, e), t) - f;
    vec3 n = normalize(vec3(-fx, -fy, e * 2.5));
    float depth = clamp(f * 2.4, 0.0, 1.0);
    vec3 base = mix(vec3(0.95, 0.05, 0.6), vec3(1.0, 0.42, 0.05), smoothstep(0.0, 0.35, depth));
    base = mix(base, vec3(1.0, 0.85, 0.25), smoothstep(0.35, 0.7, depth));
    base = mix(base, vec3(1.0, 0.98, 0.9), smoothstep(0.75, 1.0, depth));
    vec3 L = normalize(vec3(-0.45, 0.65, 0.6));
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 28.0);
    float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);
    vec3 col = base * (0.55 + 0.6 * diff) + vec3(1.0, 0.96, 0.92) * spec * 0.9;
    col += iris(uv.x * 0.6 + uv.y * 0.8 + t * 0.12) * rim * 0.55;   // iridiscencia psicodélica
    float a = smoothstep(0.0, e * 2.5, f) * smoothstep(0.85, 0.35, uv.y);
    outc = vec4(col * a, a) + outc * (1.0 - a);
  }

  // ── Brasas: píxeles que suben ──
  for (int k = 0; k < 2; k++) {
    float h = hash(vec2(cell.x, float(k) * 7.1));
    if (h > 0.76) {
      float ph = fract(h * 13.7 + t * (0.18 + h * 0.3));
      float ey = floor(ph * uRes.y / uPix);
      if (cell.y == ey) {
        vec3 ec = h > 0.97 ? vec3(0.22, 1.0, 0.08) : vec3(1.0, 0.8, 0.3);
        float a = (1.0 - ph) * 0.95;
        outc = vec4(ec * a, a) + outc * (1.0 - a);
      }
    }
  }
  gl_FragColor = outc;
}
`;

export type Fire = { draw: (t: number, half: number) => void; resize: () => void; dispose: () => void };

/** `scale`: resolución interna respecto al CSS; `pixelCss`: tamaño de cada píxel expresivo en px CSS. */
export function createFire(canvas: HTMLCanvasElement, scale: number, pixelCss: number): Fire | null {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = sh(gl.VERTEX_SHADER, VERT);
  const fs = sh(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uHalf = gl.getUniformLocation(prog, "uHalf");
  const uPix = gl.getUniformLocation(prog, "uPix");
  gl.clearColor(0, 0, 0, 0);

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(r.width * scale));
    canvas.height = Math.max(1, Math.floor(r.height * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();

  return {
    resize,
    draw(t, half) {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t / 1000);
      gl.uniform1f(uHalf, half);
      gl.uniform1f(uPix, Math.max(3, Math.round(pixelCss * scale)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
