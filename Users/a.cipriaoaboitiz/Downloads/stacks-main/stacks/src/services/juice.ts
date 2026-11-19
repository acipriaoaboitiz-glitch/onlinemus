import { useMemo } from 'react';
import {
  feedback, playCardDraw, playCinematicSound, playCardSnap, playChipClink, playCoinCascade, playDefeatTone, playFeltThud, playImpact, playTurnPing, playVictoryFanfare, playWhoosh,
} from '../store/settings.ts';

/**
 * Game Feel centralizado. El sonido y la vibración respetan los interruptores globales (Ajustes / botón de sonido).
 * Los efectos visuales (temblor de mesa, golpe de carta, vuelo de fichas y textos de impacto) viajan por un pequeño bus
 * que escucha `GameFrame`.
 */
export type CalloutTone = 'gold' | 'neon' | 'red';
export type CinematicTone = 'gold' | 'ruby' | 'emerald' | 'electric';
/** Hacia qué lado de la mesa vuelan las fichas (donde está el ganador). */
export type ChipTarget = 'me' | 'top' | 'left' | 'right';
export interface Cinematic { id: number; title: string; sub?: string; tone: CinematicTone }
export interface Callout { id: number; text: string; tone: CalloutTone }
export interface Slam { id: number }
export interface ChipBurst { id: number; target: ChipTarget; n: number }
type Listener = {
  onShake: () => void; onCallout: (c: Callout) => void; onCinematic?: (c: Cinematic) => void;
  onSlam?: (s: Slam) => void; onChips?: (c: ChipBurst) => void;
};

const listeners = new Set<Listener>();
let nextId = 1;

export const subscribeJuice = (l: Listener): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const shake = (): void => listeners.forEach((l) => l.onShake());
const callout = (text: string, tone: CalloutTone = 'gold'): void => { const c = { id: nextId++, text, tone }; listeners.forEach((l) => l.onCallout(c)); };

/** Cinemática épica de jugada (≈1,5 s, sin bloquear). `good` = jugada tuya (fanfarria) o castigo (grave). */
const cinematic = (c: { title: string; sub?: string; tone?: CinematicTone; good?: boolean }): void => {
  const full: Cinematic = { id: nextId++, title: c.title, sub: c.sub, tone: c.tone ?? 'gold' };
  playCinematicSound(c.good ?? full.tone !== 'ruby');
  shake();
  listeners.forEach((l) => l.onCinematic?.(full));
};

/** Golpe de carta clave: golpe grave en el fieltro + sacudida vertical de la mesa + chispas doradas en el centro. */
const slam = (): void => { playFeltThud(); const s = { id: nextId++ }; listeners.forEach((l) => l.onSlam?.(s)); };

/** Fichas doradas en cascada del centro de la mesa hacia el ganador (6–10) con sonido de monedas. */
const chips = (target: ChipTarget = 'me', n = 8): void => {
  playCoinCascade(n);
  const c = { id: nextId++, target, n };
  listeners.forEach((l) => l.onChips?.(c));
};

export const juice = {
  cinematic, slam, chips,
  playCardSnap, playCardDraw, playTurnPing, playImpact, playChipClink, playVictoryFanfare, playDefeatTone, playWhoosh,
  /** Texto grande en el centro de la mesa. */
  callout,
  /** Micro-temblor de 250 ms de la mesa. */
  shake,
  /** Jugada fuerte (+2/+4, corte con un 2, Órdago, cierre): golpe grave + temblor + texto. */
  impact(text?: string, tone: CalloutTone = 'gold'): void { playImpact(); shake(); if (text) callout(text, tone); },
  /** Texto de impacto con tintineo de fichas/puntos. */
  points(text: string, tone: CalloutTone = 'gold'): void { playChipClink(); callout(text, tone); },
  feedback,
};

/** Hook de acceso al sistema de Game Feel (las funciones son estables). */
export function useGameJuice(): typeof juice {
  return useMemo(() => juice, []);
}
