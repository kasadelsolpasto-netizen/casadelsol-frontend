/**
 * Fuego en cámara subjetiva, psicodélico y "plástico", en el borde inferior de lado a lado. Lenguas en punta hechas con ondas, bandas de
 * color que suben (plástico fundido) y color por profundidad (puntas magenta → naranja → núcleo
 * amarillo). Se dibuja a muy baja resolución y se amplía con `image-rendering: pixelated`: píxeles
 * grandes y nítidos a propósito.
 */

const VERT = `
attribute vec2 p;
void main(){ gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uTime, uHalf;

// Paleta psicodélica en bandas: verde neón → cian → morado → magenta → naranja → amarillo
vec3 palette(float t){
  t = fract(t) * 6.0;
  vec3 c0 = vec3(0.22, 1.0, 0.08), c1 = vec3(0.0, 0.95, 1.0), c2 = vec3(0.75, 0.0, 1.0);
  vec3 c3 = vec3(1.0, 0.1, 0.65), c4 = vec3(1.0, 0.45, 0.05), c5 = vec3(1.0, 0.92, 0.2);
  if (t < 1.0) return mix(c0, c1, t);
  if (t < 2.0) return mix(c1, c2, t - 1.0);
  if (t < 3.0) return mix(c2, c3, t - 2.0);
  if (t < 4.0) return mix(c3, c4, t - 3.0);
  if (t < 5.0) return mix(c4, c5, t - 4.0);
  return mix(c5, c0, t - 5.0);
}

void main(){
  vec2 uv = gl_FragCoord.xy / uRes;           // 0 abajo · 1 arriba de esta franja
  float aspect = uRes.x / uRes.y;
  float t = uTime * 0.3;                       // lento: muy por debajo de la mitad del tempo
  float side = (uv.x - 0.5) * 2.0;
  float x = uv.x * aspect * 2.2;

  // Lenguas líquidas: ondas superpuestas con deformación (domain warp barato)
  float warp = sin(uv.y * 6.0 - t * 2.0 + x * 0.8) * 0.35;
  // Lenguas en punta: crestas agudas de |sen| invertido, en tres tamaños
  float w = pow(1.0 - abs(sin(x * 1.3 + t * 1.1 + warp)), 3.0) * 0.6
          + pow(1.0 - abs(sin(x * 2.9 - t * 0.8 + warp * 1.4)), 4.0) * 0.3
          + pow(1.0 - abs(sin(x * 6.1 + t * 1.6)), 5.0) * 0.15;
  // Más altas en los costados (enmarcan la visión), bajas al centro
  float height = 0.1 + 0.4 * pow(abs(side), 2.4) + 0.32 * w + 0.03 * uHalf;
  float f = height - uv.y;
  if (f <= 0.0) { gl_FragColor = vec4(0.0); return; }

  // Bandas de contorno que suben (plástico fundido)
  float bands = f * 7.0 - t * 1.2 + w * 0.6;
  float k = fract(bands);
  // bandas vecinas con tonos cercanos; la gama completa rota muy despacio
  // Color por profundidad dentro de la llama (como un fuego real), en escalones:
  // puntas moradas/magenta → cuerpo naranja → núcleo amarillo; deriva psicodélica muy lenta
  float depth = floor(clamp(f * 2.8, 0.0, 0.999) * 6.0) / 6.0;
  vec3 col = palette(0.36 + depth * 0.5 + 0.05 * sin(t * 0.3));
  // relieve plástico: brillo en el borde de cada banda y sombra en su base
  col *= 0.7 + 0.45 * smoothstep(0.0, 0.18, k) * smoothstep(1.0, 0.55, k);
  col += 0.25 * smoothstep(0.82, 1.0, k);

  float alpha = smoothstep(0.0, 0.04, f) * (0.85 + 0.1 * uHalf) * smoothstep(0.75, 0.25, uv.y);
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

export type Fire = { draw: (t: number, half: number) => void; resize: () => void; dispose: () => void };

export function createPsyFire(canvas: HTMLCanvasElement, scale: number): Fire | null {
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
