/**
 * Motor de la portada: sintetizador techno en vivo (Web Audio) + estado compartido
 * que alimenta las visuales (graves, medios, agudos, golpe del bombo, espectro y puntero).
 *
 * Sin audio encendido, `sample()` genera un pulso sintético a tempo para que la escena
 * siga "bailando" en silencio.
 */

export const BPM = 136;
const STEP = 60 / BPM / 4; // semicorchea
export const SPEC_BINS = 32;

// Línea acid en La menor (Hz); 0 = silencio. acc = acento, sl = ligado.
const A = 55;
const n = (semi: number) => A * Math.pow(2, semi / 12);
const ACID: { f: number; acc?: boolean; sl?: boolean }[] = [
  { f: n(0), acc: true }, { f: n(0) }, { f: n(12), sl: true }, { f: n(0) },
  { f: 0 }, { f: n(3), acc: true }, { f: n(0) }, { f: n(15), sl: true },
  { f: n(0) }, { f: n(10) }, { f: n(0), acc: true }, { f: n(12) },
  { f: n(7), sl: true }, { f: n(0) }, { f: n(3) }, { f: n(5), acc: true },
];

type State = {
  playing: boolean;
  bass: number;
  mid: number;
  high: number;
  beat: number;
  spec: Uint8Array;
  /** Puntero suavizado en [-1, 1] (x derecha, y arriba). */
  mx: number;
  my: number;
  /** Puntero objetivo (crudo). */
  tx: number;
  ty: number;
};

export const rave: State = {
  playing: false,
  bass: 0, mid: 0, high: 0, beat: 0,
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
let acidFilterBus: GainNode;
let delaySend: GainNode;
let bus: AudioNode;
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0;
let step = 0;
let bar = 0;
const kicks: number[] = [];

function build() {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new AC();
  const c = ctx!;

  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
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

  // Delay con retroalimentación para la línea acid
  const delay = c.createDelay(1);
  delay.delayTime.value = STEP * 3;
  const fb = c.createGain();
  fb.gain.value = 0.38;
  const dlp = c.createBiquadFilter();
  dlp.type = 'lowpass';
  dlp.frequency.value = 2200;
  delaySend = c.createGain();
  delaySend.gain.value = 0.28;
  delaySend.connect(delay);
  delay.connect(dlp);
  dlp.connect(fb);
  fb.connect(delay);
  dlp.connect(comp);

  acidFilterBus = c.createGain();
  acidFilterBus.gain.value = 0.32;
  acidFilterBus.connect(comp);
  acidFilterBus.connect(delaySend);

  noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  bus = comp;
}

const out = () => bus;

function kick(t: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(160, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
  g.gain.setValueAtTime(1.1, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + 0.45);
  // rumble: cola grave filtrada
  const r = c.createOscillator();
  const rg = c.createGain();
  r.frequency.value = 44;
  rg.gain.setValueAtTime(0, t + 0.08);
  rg.gain.linearRampToValueAtTime(0.22, t + 0.12);
  rg.gain.exponentialRampToValueAtTime(0.001, t + STEP * 3.6);
  r.connect(rg).connect(out());
  r.start(t + 0.08);
  r.stop(t + STEP * 4);
  kicks.push(t);
  if (kicks.length > 8) kicks.shift();
}

function noiseHit(t: number, type: BiquadFilterType, f: number, dur: number, vol: number, q = 1) {
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
  s.connect(fl).connect(g).connect(out());
  s.start(t, Math.random() * 0.5);
  s.stop(t + dur + 0.02);
}

function clap(t: number) {
  [0, 0.011, 0.023].forEach((o, i) => noiseHit(t + o, 'bandpass', 1400, i === 2 ? 0.18 : 0.03, 0.55, 1.4));
}

function acid(t: number, s: number) {
  const note = ACID[s];
  if (!note.f) return;
  const c = ctx!;
  // El puntero toca el filtro: X = corte, Y = resonancia.
  const cutoff = 180 + Math.pow((rave.tx + 1) / 2, 1.6) * 3600;
  const res = 6 + ((rave.ty + 1) / 2) * 18;
  const o = c.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(note.f, t);
  const next = ACID[(s + 1) % 16];
  const len = note.sl ? STEP * 1.05 : STEP * 0.62;
  if (note.sl && next.f) o.frequency.exponentialRampToValueAtTime(next.f, t + STEP);
  const fl = c.createBiquadFilter();
  fl.type = 'lowpass';
  fl.Q.value = res;
  const peak = cutoff * (note.acc ? 3.2 : 1.9);
  fl.frequency.setValueAtTime(peak, t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(90, cutoff * 0.5), t + len);
  const g = c.createGain();
  const v = note.acc ? 0.55 : 0.36;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.004);
  g.gain.setValueAtTime(v, t + len * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  o.connect(fl).connect(g).connect(acidFilterBus);
  o.start(t);
  o.stop(t + len + 0.02);
}

function schedule() {
  const c = ctx!;
  while (nextTime < c.currentTime + 0.12) {
    const s = step % 16;
    const intro = bar < 2; // primeros compases: solo bombo y hats
    if (s % 4 === 0) kick(nextTime);
    if (s % 4 === 2) noiseHit(nextTime, 'highpass', 7500, 0.09, 0.32);
    else if (!intro) noiseHit(nextTime, 'highpass', 9000, 0.025, s % 2 ? 0.08 : 0.13);
    if (!intro && (s === 4 || s === 12)) clap(nextTime);
    if (bar >= 1) acid(nextTime, s);
    nextTime += STEP;
    step++;
    if (step % 16 === 0) bar++;
  }
}

export async function start() {
  if (!ctx) build();
  const c = ctx!;
  if (c.state === 'suspended') await c.resume();
  step = 0;
  bar = 0;
  nextTime = c.currentTime + 0.06;
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
  kicks.length = 0;
  rave.playing = false;
  emit();
}

export const toggle = () => (rave.playing ? stop() : start());

/** Actualiza `rave` para el cuadro actual. `t` en ms (requestAnimationFrame). */
export function sample(t: number) {
  // Puntero con inercia
  rave.mx += (rave.tx - rave.mx) * 0.06;
  rave.my += (rave.ty - rave.my) * 0.06;

  if (rave.playing && ctx) {
    analyser.getByteFrequencyData(freq);
    const avg = (a: number, b: number) => {
      let s = 0;
      for (let i = a; i < b; i++) s += freq[i];
      return s / (b - a) / 255;
    };
    // bins de ~86 Hz (44.1k / 512)
    rave.bass = avg(0, 3);
    rave.mid = avg(3, 28);
    rave.high = avg(28, 120);
    const now = ctx.currentTime;
    let last = -1;
    for (const k of kicks) if (k <= now) last = k;
    rave.beat = last < 0 ? 0 : Math.exp(-(now - last) * 9);
    // Espectro logarítmico comprimido a SPEC_BINS
    for (let i = 0; i < SPEC_BINS; i++) {
      const a = Math.floor(Math.pow(i / SPEC_BINS, 1.8) * 160);
      const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / SPEC_BINS, 1.8) * 160));
      let m = 0;
      for (let j = a; j < b; j++) m = Math.max(m, freq[j]);
      rave.spec[i] = m;
    }
  } else {
    // Pulso fantasma a tempo, más tenue
    const beatMs = 60000 / BPM;
    const ph = (t % beatMs) / beatMs;
    rave.beat = Math.pow(1 - ph, 5) * 0.55;
    rave.bass = 0.2 + rave.beat * 0.35;
    rave.mid = 0.18 + 0.1 * Math.sin(t / 900);
    rave.high = 0.12 + 0.08 * Math.sin(t / 370);
    for (let i = 0; i < SPEC_BINS; i++) {
      const base = 0.5 + 0.5 * Math.sin(i * 0.7 + t / 700) * Math.cos(i * 0.23 - t / 1300);
      rave.spec[i] = Math.floor((0.12 + base * 0.3 + (i < 4 ? rave.beat * 0.5 : 0)) * 255);
    }
  }
}
