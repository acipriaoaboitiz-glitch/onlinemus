import type { DuelPlayer } from '../shared/duel.ts';

/** Hundir la Flota, duelo rápido 7×7 con 4 barcos (4, 3, 2 y 2 casillas). Tocar un barco permite repetir disparo. */
export const N = 7;
export const SHIPS = [4, 3, 2, 2] as const;
export type Side = 0 | 1;
export type Shot = 'water' | 'hit';
export interface Ship { cells: number[] }
export interface FState {
  players: DuelPlayer[];
  /** Flota de cada plaza (índice = plaza). */
  fleets: [Ship[], Ship[]];
  /** Disparos recibidos por el tablero de cada plaza. */
  shots: [Record<number, Shot>, Record<number, Shot>];
  ready: [boolean, boolean];
  phase: 'place' | 'battle' | 'over';
  turn: Side;
  winner: Side | null;
  round: number;
  /** Último disparo (para la onda de radar): quién disparó, a qué casilla y con qué resultado. */
  last: { by: Side; cell: number; res: 'water' | 'hit' | 'sunk' } | null;
  seq: number;
}

/** Flota aleatoria sin solapes. */
export function randomFleet(): Ship[] {
  for (let tries = 0; tries < 200; tries++) {
    const used = new Set<number>();
    const fleet: Ship[] = [];
    let ok = true;
    for (const len of SHIPS) {
      let placed = false;
      for (let k = 0; k < 60 && !placed; k++) {
        const horiz = Math.random() < 0.5;
        const r = Math.floor(Math.random() * (horiz ? N : N - len + 1));
        const c = Math.floor(Math.random() * (horiz ? N - len + 1 : N));
        const cells = Array.from({ length: len }, (_, i) => (horiz ? r * N + c + i : (r + i) * N + c));
        if (cells.some((x) => used.has(x))) continue;
        cells.forEach((x) => used.add(x));
        fleet.push({ cells });
        placed = true;
      }
      if (!placed) { ok = false; break; }
    }
    if (ok) return fleet;
  }
  return [{ cells: [0, 1, 2, 3] }, { cells: [14, 15, 16] }, { cells: [28, 29] }, { cells: [42, 43] }];
}

export function newFlota(players: DuelPlayer[], round = 1): FState {
  return {
    players, fleets: [randomFleet(), randomFleet()], shots: [{}, {}], ready: [false, !players[1]!.human], phase: 'place',
    turn: ((round - 1) % 2) as Side, winner: null, round, last: null, seq: 0,
  };
}

export const shipAt = (fleet: Ship[], cell: number): Ship | undefined => fleet.find((s) => s.cells.includes(cell));
export const isSunk = (ship: Ship, shots: Record<number, Shot>): boolean => ship.cells.every((c) => shots[c] === 'hit');
export const shipsLeft = (fleet: Ship[], shots: Record<number, Shot>): number => fleet.filter((s) => !isSunk(s, shots)).length;

export type FAction = { k: 'random' } | { k: 'ready' } | { k: 'fire'; cell: number };

export function applyFlota(prev: FState, pid: string, a: FAction): FState | null {
  const idx = prev.players.findIndex((p) => p.id === pid) as Side | -1;
  if (idx === -1) return null;
  if (a.k === 'random') {
    if (prev.phase !== 'place' || prev.ready[idx]) return null;
    const fleets: [Ship[], Ship[]] = [prev.fleets[0], prev.fleets[1]];
    fleets[idx] = randomFleet();
    return { ...prev, fleets };
  }
  if (a.k === 'ready') {
    if (prev.phase !== 'place' || prev.ready[idx]) return null;
    const ready: [boolean, boolean] = [prev.ready[0], prev.ready[1]];
    ready[idx] = true;
    return { ...prev, ready, phase: ready[0] && ready[1] ? 'battle' : 'place' };
  }
  const foe = (1 - idx) as Side;
  if (prev.phase !== 'battle' || prev.turn !== idx || a.cell < 0 || a.cell >= N * N || prev.shots[foe][a.cell]) return null;
  const ship = shipAt(prev.fleets[foe], a.cell);
  const shots: [Record<number, Shot>, Record<number, Shot>] = [{ ...prev.shots[0] }, { ...prev.shots[1] }];
  shots[foe][a.cell] = ship ? 'hit' : 'water';
  const sunk = ship ? isSunk(ship, shots[foe]) : false;
  const won = shipsLeft(prev.fleets[foe], shots[foe]) === 0;
  return {
    ...prev, shots, seq: prev.seq + 1, last: { by: idx, cell: a.cell, res: sunk ? 'sunk' : ship ? 'hit' : 'water' },
    turn: ship ? idx : foe, phase: won ? 'over' : 'battle', winner: won ? idx : null,
  };
}

/** IA: si hay un barco tocado sin hundir, dispara a su alrededor; si no, busca en tablero de ajedrez. */
export function botFire(s: FState, me: Side): number {
  const foe = (1 - me) as Side;
  const shots = s.shots[foe];
  const open = (c: number): boolean => c >= 0 && c < N * N && !shots[c];
  const hot = s.fleets[foe].filter((sh) => !isSunk(sh, shots)).flatMap((sh) => sh.cells.filter((c) => shots[c] === 'hit'));
  if (hot.length) {
    const cands: number[] = [];
    for (const h of hot) {
      const r = Math.floor(h / N); const c = h % N;
      const around = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([rr, cc]) => rr! >= 0 && rr! < N && cc! >= 0 && cc! < N).map(([rr, cc]) => rr! * N + cc!);
      for (const x of around) if (open(x)) cands.push(x);
    }
    // prioriza prolongar una línea de dos o más impactos
    const aligned = cands.filter((x) => hot.some((h) => hot.some((o) => o !== h && ((Math.floor(o / N) === Math.floor(h / N) && Math.floor(x / N) === Math.floor(h / N)) || (o % N === h % N && x % N === h % N)))));
    const pool = aligned.length ? aligned : cands;
    if (pool.length) return pool[Math.floor(Math.random() * pool.length)]!;
  }
  const all = Array.from({ length: N * N }, (_, i) => i).filter(open);
  const parity = all.filter((c) => (Math.floor(c / N) + (c % N)) % 2 === 0);
  const pool = parity.length ? parity : all;
  return pool[Math.floor(Math.random() * pool.length)]!;
}
