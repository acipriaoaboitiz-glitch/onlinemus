import { isNative, nativeVibrate } from './native.ts';
import { store } from './storage.ts';

export const PREFS = { sound: 'mus.sound', haptic: 'mus.haptic', volume: 'mus.volume' } as const;

export function prefOn(key: string, fallback = true): boolean {
  const v = store.get(key);
  return v === null ? fallback : v === '1';
}

export function getVolume(): number {
  const v = store.get(PREFS.volume);
  if (v === null) return 1;
  const num = Number(v);
  if (!Number.isFinite(num)) return 1;
  return Math.min(1, Math.max(0, num));
}

export function setPref(key: string, on: boolean): void {
  store.set(key, on ? '1' : '0');
}

export function setVolumeLevel(level: number): void {
  const v = Math.min(1, Math.max(0, Number(level) || 0));
  store.set(PREFS.volume, String(v));
}

export function haptic(pattern: number | number[] = 10): void {
  if (!prefOn(PREFS.haptic)) return;
  if (isNative()) {
    const ms = Array.isArray(pattern) ? Math.max(...pattern) : pattern;
    void nativeVibrate(Math.min(60, Math.max(10, ms)));
    return;
  }
  try { navigator.vibrate?.(pattern); } catch { /* sin soporte */ }
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx ??= new Ctor();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function tone(c: AudioContext, freq: number, at: number, dur: number, gain = 0.04, type: OscillatorType = 'sine'): void {
  const o = c.createOscillator();
  const g = c.createGain();
  const t0 = c.currentTime + at;
  const level = Math.max(0.0001, gain * getVolume());
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(level, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

export type SoundName =
  | 'tap' | 'turn' | 'point' | 'win' | 'lose' | 'sign'
  | 'card_deal' | 'card_play' | 'chips' | 'alert_caught' | 'alert_fail' | 'click';

/** Sonidos sintetizados (sin archivos): discretos y cortos. */
export function sound(name: SoundName): void {
  if (!prefOn(PREFS.sound)) return;
  const volume = getVolume();
  if (volume <= 0) return;
  const c = audio();
  if (!c) return;
  switch (name) {
    case 'tap': tone(c, 520, 0, 0.05, 0.03); break;
    case 'turn': tone(c, 660, 0, 0.09); tone(c, 880, 0.09, 0.12); break;
    case 'point': tone(c, 740, 0, 0.09); tone(c, 988, 0.09, 0.14); break;
    case 'sign': tone(c, 880, 0, 0.05, 0.03); tone(c, 880, 0.09, 0.05, 0.03); break;
    case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.11, 0.2)); break;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(c, f, i * 0.14, 0.24, 0.035, 'triangle')); break;
    // Sustitutos sintetizados de los MP3 de /sounds/ (ver lib/sounds.ts): suenan cuando falta el archivo.
    case 'click': tone(c, 520, 0, 0.04, 0.03); break;
    case 'card_deal': [260, 300, 340].forEach((f, i) => tone(c, f, i * 0.055, 0.045, 0.035, 'triangle')); break;
    case 'card_play': tone(c, 210, 0, 0.07, 0.05, 'triangle'); tone(c, 150, 0.03, 0.06, 0.03, 'triangle'); break;
    case 'chips': [1400, 1750, 1250].forEach((f, i) => tone(c, f, i * 0.045, 0.035, 0.022, 'square')); break;
    case 'alert_caught': [440, 554, 740].forEach((f, i) => tone(c, f, i * 0.1, 0.12, 0.04, 'sawtooth')); tone(c, 988, 0.32, 0.34, 0.045, 'sawtooth'); break;
    case 'alert_fail': tone(c, 300, 0, 0.13, 0.04, 'sawtooth'); tone(c, 190, 0.13, 0.22, 0.04, 'sawtooth'); break;
  }
}
