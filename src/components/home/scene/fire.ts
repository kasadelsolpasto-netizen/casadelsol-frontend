/**
 * Fuego en cámara subjetiva: llamas que suben desde el borde inferior de la pantalla,
 * de lado a lado, como si brotaran de quien mira. WebGL con fondo transparente;
 * se compone sobre la escena con `mix-blend-mode: screen`.
 * Movimiento lento (las lenguas suben despacio) y respiración a medio tempo.
 */

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uHalf;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++) { v += a * vnoise(p); p = p * 2.02 + 3.7; a *= 0.5; }
  return v;
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;           // 0 abajo · 1 arriba de esta franja
  float aspect = uRes.x / uRes.y;
  float t = uTime * 0.55;

  // Las llamas se abren hacia los costados como si salieran de quien mira
  float side = (uv.x - 0.5) * 2.0;
  vec2 q = vec2(side * aspect * 1.6, uv.y * 2.4);
  q.x += side * uv.y * 0.6;

  float n = fbm(q * vec2(1.2, 1.0) - vec2(0.0, t * 1.6));
  n = n * 0.75 + fbm(q * 2.3 + vec2(n * 1.3, -t * 2.4)) * 0.45;

  // Altura de las lenguas: más altas en los costados (marco de la visión) y en el centro, más bajas entre ambos
  float frame = 0.42 + 0.28 * pow(abs(side), 2.0) + 0.06 * uHalf;
  float body = n * 1.25 - uv.y / frame;
  float heat = smoothstep(0.0, 0.9, body + 0.25);

  vec3 col = mix(vec3(0.35, 0.0, 0.45), vec3(0.95, 0.12, 0.18), smoothstep(0.05, 0.35, heat));
  col = mix(col, vec3(1.0, 0.45, 0.05), smoothstep(0.3, 0.6, heat));
  col = mix(col, vec3(1.0, 0.85, 0.35), smoothstep(0.55, 0.85, heat));
  col = mix(col, vec3(1.0, 0.97, 0.85), smoothstep(0.82, 1.0, heat));

  float alpha = smoothstep(0.02, 0.4, heat) * (0.85 + 0.15 * uHalf);
  alpha *= smoothstep(1.0, 0.55, uv.y);            // se disuelve hacia arriba
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

export type Fire = { draw: (t: number, half: number) => void; resize: () => void; dispose: () => void };

export function createFire(canvas: HTMLCanvasElement, scale: number): Fire | null {
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
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    },
  };
}
