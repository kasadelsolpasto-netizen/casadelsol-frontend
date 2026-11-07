/**
 * Motor de la portada: techno tribal en vivo (Web Audio) + estado compartido
 * para las visuales.
 *
 * Ritmo: 128 BPM en 4/4, con capas de polirritmia/polimetría sobre la rejilla de semicorcheas:
 *   - tresillo 3-3-2 (rim/clave)               → pulso `p3`
 *   - campana euclidiana E(5,16)               → pulso `p5`
 *   - toms en ciclo de 7 semicorcheas (7 vs 16) → pulso `p7`
 *   - congas en ciclo de 12 (3/4 sobre 4/4)
 * La animación principal va a la mitad del tempo (un pulso cada 2 negras) → `half`.
 *
 * Sin audio, `sample()` recorre el mismo reloj con `performance.now()` para que la escena
 * siga en polirritmia en silencio.
 */

export const BPM = 128;
const BEAT = 60 / BPM;
const STEP = BEAT / 4; // semicorchea
export const SPEC_BINS = 32;

// ── Patrones (1 = golpe) ─────────────────────────────────────────────
const TRESILLO = [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,1,0];          // 3-3-2 ×2
const BELL     = [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0];          // E(5,16)
const TOMS7    = [2,0,1,0,3,1,0];                               // 1 grave · 2 medio · 3 agudo
const CONGA12  = [2,0,1,1, 0,1,2,0, 1,0,1,0];                   // 1 abierta · 2 slap
const SHAKER   = [0.5,0.2,0.9,0.3, 0.5,0.2,0.9,0.4, 0.5,0.2,0.9,0.3, 0.5,0.3,1,0.4];
const BASS     = [0,0,1,0, 0,0,1,1, 0,0,1,0, 0,1,1,0];
const BASS_NOTE= [0,0,0,0, 0,0,0,7, 0,0,0,0, 0,3,0,0];          // semitonos sobre Fa#1

type State = {
  playing: boolean;
  bass: number; mid: number; high: number;
  /** Bombo (cada negra). */
  beat: number;
  /** Pulso a medio tempo (cada 2 negras) y su fase continua [0,1). */
  half: number; halfPhase: number;
  /** Pulsos de las capas polirrítmicas. */
  p3: number; p5: number; p7: number;
  /** Posición del reloj en negras (continua). */
  beats: number;
  spec: Uint8Array;
  mx: number; my: number; tx: number; ty: number;
};

export const rave: State = {
  playing: false,
  bass: 0, mid: 0, high: 0, beat: 0,
  half: 0, halfPhase: 0, p3: 0, p5: 0, p7: 0, beats: 0,
  spec: new Uint8Array(SPEC_BINS),
  mx: 0, my: 0, tx: 0, ty: 0,
};

const listeners = new Set<() => void>();
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
const emit = () => listeners.forEach((fn) => fn());

let ctx: AudioContext | null = null;
let master: GainNode;
let analyser: AnalyserNode;
let freq: Uint8Array<ArrayBuffer>;
let noise: AudioBuffer;
let bus: AudioNode;
let percBus: GainNode;
let bassFilter: BiquadFilterNode;
let delayFb: GainNode;
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;
let startTime = 0;

function build() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  const c = ctx;

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  master = c.createGain();
  master.gain.value = 0;
  analyser = c.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.55;
  freq = new Uint8Array(analyser.frequencyBinCount);
  comp.connect(master);
  master.connect(analyser);
  analyser.connect(c.destination);
  bus = comp;

  // Percusión con eco en puntillo (3 semicorcheas): refuerza la sensación tribal
  percBus = c.createGain();
  percBus.gain.value = 1;
  const delay = c.createDelay(1);
  delay.delayTime.value = STEP * 3;
  delayFb = c.createGain();
  delayFb.gain.value = 0.3;
  const dlp = c.createBiquadFilter();
  dlp.type = 'bandpass';
  dlp.frequency.value = 900;
  dlp.Q.value = 0.7;
  const send = c.createGain();
  send.gain.value = 0.22;
  percBus.connect(comp);
  percBus.connect(send);
  send.connect(delay);
  delay.connect(dlp);
  dlp.connect(delayFb);
  delayFb.connect(delay);
  dlp.connect(comp);

  // Bajo: filtro controlado por el puntero
  bassFilter = c.createBiquadFilter();
  bassFilter.type = 'lowpass';
  bassFilter.frequency.value = 400;
  bassFilter.Q.value = 8;
  bassFilter.connect(comp);

  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function kick(t: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.13);
  g.gain.setValueAtTime(1.15, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + 0.52);
}

function noiseHit(t: number, type: BiquadFilterType, f: number, dur: number, vol: number, q = 1, dest: AudioNode = percBus) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noise;
  const fl = c.createBiquadFilter();
  fl.type = type;
  fl.frequency.value = f;
  fl.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl).connect(g).connect(dest);
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

/** Membrana: seno con caída de afinación + golpe de ruido. */
function drum(t: number, f: number, dur: number, vol: number, bend = 1.5) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(f * bend, t);
  o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(percBus);
  o.start(t);
  o.stop(t + dur + 0.02);
  noiseHit(t, 'bandpass', f * 6, 0.02, vol * 0.35, 2);
}

function rim(t: number) {
  const c = ctx!;
  const o = c.createOscillator();
  o.type = 'square';
  o.frequency.value = 1700;
  const fl = c.createBiquadFilter();
  fl.type = 'bandpass';
  fl.frequency.value = 2200;
  fl.Q.value = 6;
  const g = c.createGain();
  g.gain.setValueAtTime(0.22, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
  o.connect(fl).connect(g).connect(percBus);
  o.start(t);
  o.stop(t + 0.05);
}

function bell(t: number, accent: boolean) {
  const c = ctx!;
  [587, 845].forEach((f) => {
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = accent ? f * 1.19 : f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.045, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 500;
    o.connect(hp).connect(g).connect(percBus);
    o.start(t);
    o.stop(t + 0.18);
  });
}

function bassNote(t: number, semi: number) {
  const c = ctx!;
  // El puntero toca el bajo: X = apertura del filtro, Y = resonancia y eco de la percusión.
  const cutoff = 140 + Math.pow((rave.tx + 1) / 2, 1.5) * 1800;
  bassFilter.frequency.setTargetAtTime(cutoff, t, 0.02);
  bassFilter.Q.setTargetAtTime(4 + ((rave.ty + 1) / 2) * 14, t, 0.05);
  delayFb.gain.setTargetAtTime(0.2 + ((rave.ty + 1) / 2) * 0.35, t, 0.1);
  const f = 46.25 * Math.pow(2, semi / 12); // Fa#1
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = f;
  const sub = c.createOscillator();
  sub.frequency.value = f;
  const g = c.createGain();
  const len = STEP * 0.9;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.4, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(g);
  sub.connect(g);
  g.connect(bassFilter);
  o.start(t); sub.start(t);
  o.stop(t + len + 0.02); sub.stop(t + len + 0.02);
}

const TOM_F = [0, 82, 123, 185];
const CONGA_F = [0, 220, 330];

function schedule() {
  const c = ctx!;
  while (nextTime < c.currentTime + 0.12) {
    const s = step % 16;
    const bar = Math.floor(step / 16);
    const phrase = bar % 8;
    const t = nextTime;

    if (s % 4 === 0) kick(t);
    noiseHit(t, 'highpass', 6500, 0.04, 0.09 * SHAKER[s]);                 // shaker
    if (s % 4 === 2 && bar >= 1) noiseHit(t, 'highpass', 8000, 0.08, 0.12); // hat abierto

    if (bar >= 1 && TRESILLO[s]) rim(t);
    if (bar >= 2 && BELL[s]) bell(t, s === 0);
    if (bar >= 2) {
      const tm = TOMS7[step % 7];
      if (tm) drum(t, TOM_F[tm], 0.32, 0.5);
      const cg = CONGA12[step % 12];
      if (cg) drum(t, CONGA_F[cg], cg === 2 ? 0.09 : 0.18, cg === 2 ? 0.32 : 0.24, 1.25);
    }
    // Redoble de toms al final de cada frase de 8 compases
    if (phrase === 7 && s >= 8) drum(t, TOM_F[1 + ((s - 8) >> 1) % 3] * (1 + (s - 8) * 0.04), 0.2, 0.42);

    if (bar >= 1 && BASS[s]) bassNote(t, BASS_NOTE[s]);

    nextTime += STEP;
    step++;
  }
}

export async function start() {
  if (!ctx) build();
  const c = ctx!;
  if (c.state === 'suspended') await c.resume();
  step = 0;
  nextTime = c.currentTime + 0.06;
  startTime = nextTime;
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(master.gain.value, c.currentTime);
  master.gain.linearRampToValueAtTime(0.8, c.currentTime + 0.4);
  if (timer) clearInterval(timer);
  timer = setInterval(schedule, 25);
  schedule();
  rave.playing = true;
  emit();
}

export function stop() {
  if (!ctx) return;
  const c = ctx;
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(master.gain.value, c.currentTime);
  master.gain.linearRampToValueAtTime(0, c.currentTime + 0.25);
  if (timer) clearInterval(timer);
  timer = null;
  rave.playing = false;
  emit();
}

export const toggle = () => (rave.playing ? stop() : start());

/** Semicorcheas transcurridas desde el último golpe de un patrón cíclico. */
function age(pattern: number[], pos: number) {
  const n = pattern.length;
  const i = Math.floor(pos);
  for (let k = 0; k < n; k++) {
    const idx = (((i - k) % n) + n) % n;
    if (pattern[idx]) return pos - (i - k);
  }
  return n;
}

/** Actualiza `rave` para el cuadro actual. `t` en ms (requestAnimationFrame). */
export function sample(t: number) {
  rave.mx += (rave.tx - rave.mx) * 0.06;
  rave.my += (rave.ty - rave.my) * 0.06;

  const live = rave.playing && ctx;
  // Posición del reloj en semicorcheas (con audio, el reloj del audio manda)
  const pos = live ? Math.max(0, (ctx!.currentTime - startTime) / STEP) : t / 1000 / STEP;
  rave.beats = pos / 4;

  const dec = (a: number, k: number) => Math.exp(-a * k);
  rave.beat = dec((pos % 4), 2.2);
  rave.halfPhase = (pos % 8) / 8;
  rave.half = dec(pos % 8, 0.9);
  rave.p3 = dec(age(TRESILLO, pos % 16), 1.6);
  rave.p5 = dec(age(BELL, pos % 16), 1.3);
  rave.p7 = dec(age(TOMS7, pos % 7), 1.4);

  if (live) {
    analyser.getByteFrequencyData(freq);
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += freq[i];
      return s / (b - a) / 255;
    };
    rave.bass = avg(0, 3);
    rave.mid = avg(3, 28);
    rave.high = avg(28, 120);
    for (let i = 0; i < SPEC_BINS; i++) {
      const a = Math.floor(Math.pow(i / SPEC_BINS, 1.8) * 160);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / SPEC_BINS, 1.8) * 160));
      let m = 0;
      for (let j = a; j < b; j++) m = Math.max(m, freq[j]);
      rave.spec[i] = m;
    }
  } else {
    // En silencio: misma polirritmia, más tenue
    rave.beat *= 0.5;
    rave.bass = 0.18 + rave.half * 0.3;
    rave.mid = 0.15 + rave.p3 * 0.2;
    rave.high = 0.1 + rave.p5 * 0.25;
    for (let i = 0; i < SPEC_BINS; i++) {
      const band = i < 6 ? rave.half : i < 16 ? rave.p7 : rave.p5;
      const base = 0.5 + 0.5 * Math.sin(i * 0.7 + t / 900);
      rave.spec[i] = Math.floor((0.1 + base * 0.18 + band * 0.4) * 255);
    }
  }
}
