import { getAudioContext } from '../services/audioCore.ts';

/**
 * Motor de sonido Foley de STACKS (Web Audio, sin archivos). Un único `AudioContext` global (services/audioCore) y un bus maestro
 * que permite `silence()` al salir de una partida. Cada efecto varía su tono ±7 % en cada disparo para que nunca suene robótico.
 * Las funciones reciben el contexto y el instante (`c`, `t`): el interruptor de sonido y la vibración los gestiona store/settings.ts.
 */
let master: GainNode | null = null;
let masterCtx: AudioContext | null = null;

/** Nodo de salida común de todos los efectos. */
export function masterOut(c: AudioContext): AudioNode {
  if (!master || masterCtx !== c) {
    master = c.createGain();
    master.gain.value = 1;
    master.connect(c.destination);
    masterCtx = c;
  }
  return master;
}

/** Corta al instante cualquier sonido en curso (se llama al salir de una partida). El bus se recrea solo en el siguiente efecto. */
export function silence(): void {
  const c = masterCtx;
  const m = master;
  if (!c || !m) return;
  master = null;
  try { m.gain.cancelScheduledValues(c.currentTime); m.gain.setValueAtTime(0, c.currentTime); } catch { /* contexto cerrado */ }
  window.setTimeout(() => { try { m.disconnect(); } catch { /* ya desconectado */ } }, 80);
}

/** Variación orgánica ±7 % de tono. */
export const jitter = (hz: number, amount = 0.07): number => hz * (1 + (Math.random() * 2 - 1) * amount);

let noiseBuf: AudioBuffer | null = null;
function noiseSource(c: AudioContext): AudioBufferSourceNode {
  noiseBuf ??= (() => {
    const b = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

/** Ráfaga de ruido con filtro que viaja de `f0` a `f1` y envolvente rápida (roce, golpes amortiguados). */
export function burst(c: AudioContext, t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, peak: number, q = 1): void {
  const src = noiseSource(c);
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + Math.min(0.008, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(masterOut(c));
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

/** Tono con ataque corto y caída exponencial (campanas, marimba, graves). */
export function note(c: AudioContext, t: number, hz: number, dur: number, peak: number, type: OscillatorType = 'sine', slideTo?: number, attack = 0.004): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(hz, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(masterOut(c));
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** Card Flick: roce de cartón satinado, 45 ms, bandpass de 2000 Hz a 650 Hz. */
export function flick(c: AudioContext, t: number, gain = 0.2): void {
  burst(c, t, 0.045, 'bandpass', jitter(2000), jitter(650), gain, 1.3);
  burst(c, t + 0.004, 0.02, 'highpass', 5200, 4000, gain * 0.25, 0.7); // chasquido fino del canto
}

/** Card Slam: capa grave amortiguada 115 → 42 Hz más chasquido seco de papel (ases, triunfos, 2 de COME💩, +4, escobas). */
export function slam(c: AudioContext, t: number): void {
  note(c, t, jitter(115), 0.2, 0.55, 'sine', 42, 0.003);
  burst(c, t, 0.07, 'lowpass', jitter(900), 300, 0.34, 0.8);
  burst(c, t, 0.03, 'bandpass', jitter(3200), 2400, 0.22, 1.1);
}

/** Chip Clink: dos armónicos metálicos (2900 y 4350 Hz) con decaimiento cristalino de 90 ms. */
export function clink(c: AudioContext, t: number): void {
  const k = 1 + (Math.random() * 2 - 1) * 0.07;
  note(c, t, 2900 * k, 0.09, 0.07, 'sine', undefined, 0.002);
  note(c, t, 4350 * k, 0.07, 0.04, 'sine', undefined, 0.002);
  burst(c, t, 0.018, 'highpass', 6500, 6000, 0.05, 0.7);
}

/** Cascada de fichas: `n` choques separados 35 ms. */
export function clinkCascade(c: AudioContext, t: number, n: number): void {
  for (let i = 0; i < n; i++) clink(c, t + i * 0.035 + Math.random() * 0.006);
}

/** Tu turno: acorde cálido tipo marimba/Rhodes (sine + octava suave). */
export function turnChime(c: AudioContext, t: number): void {
  const root = jitter(523.25, 0.03);
  [[1, 0], [1.26, 0.012], [1.498, 0.024]].forEach(([r, d]) => {
    const hz = root * r!;
    note(c, t + d!, hz, 0.55, 0.075, 'sine', undefined, 0.006);
    note(c, t + d!, hz * 2, 0.3, 0.022, 'sine', undefined, 0.004); // octava suave
  });
  note(c, t + 0.09, root * 1.498 * 2, 0.4, 0.03, 'triangle', undefined, 0.006);
}

/** Fanfarria armónica limpia (victoria de ronda o partida). */
export function fanfare(c: AudioContext, t: number): void {
  const root = jitter(523.25, 0.02);
  [1, 1.26, 1.498, 2].forEach((r, k) => {
    const at = t + k * 0.085;
    note(c, at, root * r, 0.5, 0.075, 'triangle', undefined, 0.006);
    note(c, at, root * r * 2, 0.35, 0.026, 'sine', undefined, 0.004);
  });
  [1, 1.26, 1.498, 2].forEach((r) => note(c, t + 0.4, root * r, 0.9, 0.05, 'sine', undefined, 0.012));
  burst(c, t + 0.4, 0.09, 'highpass', 6000, 5000, 0.04, 0.7);
}

/** Atajo para código fuera de settings: dispara un efecto con el contexto global si existe. */
export function play(fn: (c: AudioContext, t: number) => void): void {
  const c = getAudioContext();
  if (c) fn(c, c.currentTime);
}

/** Golpe seco de una ficha de dominó de marfil sobre fieltro/madera. */
export function clack(c: AudioContext, t: number): void {
  note(c, t, jitter(250), 0.07, 0.4, 'sine', 120, 0.002);
  burst(c, t, 0.025, 'bandpass', jitter(1900), 1400, 0.3, 1.2);
  burst(c, t + 0.004, 0.05, 'lowpass', jitter(650), 300, 0.2, 0.8);
}

/** Dados chocando dentro del cubilete: ráfaga de choques breves y desordenados. */
export function diceRattle(c: AudioContext, t: number, dur = 0.75): void {
  const n = 16 + Math.floor(Math.random() * 6);
  for (let i = 0; i < n; i++) {
    const at = t + Math.random() * dur;
    burst(c, at, 0.03, 'bandpass', jitter(2300, 0.25), 1500, 0.1 + Math.random() * 0.1, 1.4);
    if (i % 3 === 0) note(c, at, jitter(330, 0.2), 0.04, 0.05, 'sine', 180, 0.002);
  }
}

/** Un dado (o el cubilete) golpeando la mesa. */
export function diceDrop(c: AudioContext, t: number): void {
  note(c, t, jitter(190), 0.1, 0.35, 'sine', 90, 0.002);
  burst(c, t, 0.04, 'bandpass', jitter(1700), 1200, 0.22, 1.1);
}

/** Bola de ruleta: rodar por la pista con choques cada vez más espaciados y tres rebotes finales. */
export function rouletteRoll(c: AudioContext, t: number, dur: number): void {
  const n = 46;
  for (let i = 0; i < n; i++) {
    const p = i / (n - 1);
    const at = t + dur * (1 - (1 - p) * (1 - p) * (1 - p)) * 0.9; // los choques se espacian al frenar
    burst(c, at, 0.02, 'bandpass', jitter(3000 - p * 900, 0.1), 2400, 0.07 + p * 0.05, 2);
  }
  [0.9, 0.94, 0.98].forEach((r, k) => {
    const at = t + dur * r;
    note(c, at, jitter(1800 - k * 300), 0.05, 0.1 - k * 0.025, 'triangle', 1100, 0.002);
    burst(c, at, 0.02, 'highpass', 5000, 4000, 0.07, 0.7);
  });
}

/** Pieza de madera pulida posándose sobre el tablero (ajedrez, damas, parchís). */
export function woodTap(c: AudioContext, t: number): void {
  note(c, t, jitter(310), 0.09, 0.32, 'triangle', 150, 0.002);
  burst(c, t, 0.03, 'bandpass', jitter(1100), 700, 0.2, 1.1);
  burst(c, t + 0.003, 0.06, 'lowpass', jitter(520), 240, 0.22, 0.8);
}

/** Ficha de ajedrez/damas capturada: golpe algo más seco y grave. */
export function woodCapture(c: AudioContext, t: number): void {
  woodTap(c, t);
  note(c, t + 0.05, jitter(180), 0.12, 0.28, 'sine', 80, 0.002);
  burst(c, t + 0.05, 0.05, 'lowpass', 700, 260, 0.3, 0.8);
}

/** Fanfarria corta de victoria (misma armonía que el resto de la app). */
export function winJingle(c: AudioContext, t: number): void { fanfare(c, t); clinkCascade(c, t + 0.5, 6); }
