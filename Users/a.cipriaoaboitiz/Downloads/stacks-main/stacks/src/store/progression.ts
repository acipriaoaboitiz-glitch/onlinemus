import { useSyncExternalStore } from 'react';
import { onWin, wallet } from './wallet.ts';

/**
 * Misiones diarias: 3 retos que cambian cada día (elegidos con la fecha, así son iguales en todos los dispositivos del jugador)
 * y se alimentan solos de lo que ocurre en las partidas reales. Cada misión se cobra una vez al completarse.
 */
export type MissionEvent = 'win' | 'escoba' | 'cante' | 'hand';
interface MissionDef { id: string; text: string; target: number; reward: number; counts: (e: MissionEvent, game?: string) => boolean }

const SPANISH = ['mus', 'brisca', 'escoba', 'chinchon', 'tute', 'seises'];
const POOL: MissionDef[] = [
  { id: 'win2', text: 'Gana 2 partidas', target: 2, reward: 200, counts: (e) => e === 'win' },
  { id: 'escobaCante', text: 'Haz 1 Escoba o canta 20/40', target: 1, reward: 150, counts: (e) => e === 'escoba' || e === 'cante' },
  { id: 'hands5', text: 'Juega 5 manos de Póker o Blackjack', target: 5, reward: 150, counts: (e, g) => e === 'hand' && (g === 'poker' || g === 'blackjack') },
  { id: 'win1', text: 'Gana 1 partida', target: 1, reward: 100, counts: (e) => e === 'win' },
  { id: 'winEs', text: 'Gana una partida con baraja española', target: 1, reward: 150, counts: (e, g) => e === 'win' && SPANISH.includes(g ?? '') },
  { id: 'winUno', text: 'Gana una partida de UNO o COME💩', target: 1, reward: 150, counts: (e, g) => e === 'win' && (g === 'uno' || g === 'presidente') },
  { id: 'hands3', text: 'Juega 3 manos de Póker', target: 3, reward: 120, counts: (e, g) => e === 'hand' && g === 'poker' },
  { id: 'handsRl', text: 'Juega 5 giros de Ruleta', target: 5, reward: 150, counts: (e, g) => e === 'hand' && g === 'ruleta' },
  { id: 'winLogic', text: 'Completa un juego de Lógica & Ingenio', target: 1, reward: 150, counts: (e, g) => e === 'win' && (g === 'mahjong' || g === 'game2048' || g === 'sudoku' || g === 'buscaminas' || g === 'solitario') },
  { id: 'winTable', text: 'Gana un juego de Duelos & Mesa', target: 1, reward: 150, counts: (e, g) => e === 'win' && (g === 'domino' || g === 'mentiroso' || g === 'tres' || g === 'cuatro' || g === 'flota' || g === 'parchis' || g === 'ajedrez' || g === 'damas') },
];

export interface MissionView { id: string; text: string; target: number; reward: number; progress: number; claimed: boolean; done: boolean }
interface Saved { day: string; picks: string[]; progress: Record<string, number>; claimed: Record<string, boolean> }

const KEY = 'stacks.missions.v1';
const dayKey = (d = new Date()): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Elige 3 misiones distintas a partir de la fecha. La primera siempre es de victorias, la segunda de cantes/escobas y la tercera de manos. */
function pick(day: string): string[] {
  let h = 0;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const groups = [['win2', 'win1', 'winEs', 'winUno', 'winTable', 'winLogic'], ['escobaCante'], ['hands5', 'hands3', 'handsRl']];
  return groups.map((g, i) => g[(h >>> (i * 3)) % g.length]!);
}

function load(): Saved {
  const today = dayKey();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw) as Saved; if (p.day === today && Array.isArray(p.picks) && p.picks.every((id) => POOL.some((m) => m.id === id))) return p; }
  } catch { /* se regenera */ }
  return { day: today, picks: pick(today), progress: {}, claimed: {} };
}

let state: Saved = load();
let view: MissionView[] = build();
const listeners = new Set<() => void>();

function build(): MissionView[] {
  return state.picks.map((id) => {
    const d = POOL.find((m) => m.id === id)!;
    const progress = Math.min(d.target, state.progress[id] ?? 0);
    return { id, text: d.text, target: d.target, reward: d.reward, progress, claimed: Boolean(state.claimed[id]), done: progress >= d.target };
  });
}
function commit(): void {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
  view = build();
  listeners.forEach((l) => l());
}
/** Si pasó la medianoche, se renuevan las misiones. */
function roll(): void { if (state.day !== dayKey()) { state = load(); view = build(); } }

export const progression = {
  /** Una cosa ocurrió en una partida real (se llama solo una vez por victoria / escoba / cante / mano). */
  track(e: MissionEvent, game?: string): void {
    roll();
    let changed = false;
    for (const id of state.picks) {
      const d = POOL.find((m) => m.id === id)!;
      if (d.counts(e, game) && (state.progress[id] ?? 0) < d.target) { state.progress[id] = (state.progress[id] ?? 0) + 1; changed = true; }
    }
    if (changed) commit();
  },
  /** Cobra la misión si está completa. Devuelve las fichas ganadas. */
  claim(id: string): number {
    roll();
    const m = view.find((x) => x.id === id);
    if (!m || !m.done || m.claimed) return 0;
    state.claimed[id] = true;
    wallet.add(m.reward);
    commit();
    return m.reward;
  },
  reset(): void { try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } state = load(); commit(); },
};

// Cada victoria registrada (una vez por partida) suma a las misiones de victorias.
onWin((game) => progression.track('win', game));

export const getMissions = (): MissionView[] => { roll(); return view; };
export const useMissions = (): MissionView[] => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getMissions);
export const claimableMissions = (m: MissionView[]): number => m.filter((x) => x.done && !x.claimed).length;
