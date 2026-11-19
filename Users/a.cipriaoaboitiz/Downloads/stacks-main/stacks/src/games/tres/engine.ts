import type { DuelPlayer } from '../shared/duel.ts';

/** 3 en Raya: `p0` juega con la X (oro) y `p1` con la O (marfil). Cada ronda abre uno distinto. */
export type Mark = 0 | 1;
export interface TState {
  players: DuelPlayer[];
  board: (Mark | null)[];
  turn: Mark;
  round: number;
  /** 0 o 1 = ganador de la ronda · 'draw' = tablas. */
  winner: Mark | 'draw' | null;
  line: number[] | null;
  last: number | null;
  seq: number;
}

export const LINES: number[][] = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

export function newTTT(players: DuelPlayer[], round = 1): TState {
  return { players, board: Array<Mark | null>(9).fill(null), turn: ((round - 1) % 2) as Mark, round, winner: null, line: null, last: null, seq: 0 };
}

export function lineOf(b: (Mark | null)[]): { mark: Mark; line: number[] } | null {
  for (const l of LINES) { const m = b[l[0]!]; if (m !== null && m === b[l[1]!] && m === b[l[2]!]) return { mark: m, line: l }; }
  return null;
}

export type TAction = { k: 'place'; i: number };

export function applyTTT(prev: TState, pid: string, a: TAction): TState | null {
  const idx = prev.players.findIndex((p) => p.id === pid);
  if (prev.winner !== null || idx !== prev.turn || a.i < 0 || a.i > 8 || prev.board[a.i] !== null) return null;
  const s: TState = { ...prev, board: prev.board.slice(), seq: prev.seq + 1, last: a.i };
  s.board[a.i] = prev.turn;
  const w = lineOf(s.board);
  if (w) { s.winner = w.mark; s.line = w.line; } else if (s.board.every((c) => c !== null)) s.winner = 'draw';
  else s.turn = (1 - prev.turn) as Mark;
  return s;
}

export const nextTTT = (s: TState): TState => newTTT(s.players, s.round + 1);

/** Minimax completo (3×3 es pequeño): devuelve la puntuación para `me`. */
function score(b: (Mark | null)[], turn: Mark, me: Mark, depth: number): number {
  const w = lineOf(b);
  if (w) return w.mark === me ? 10 - depth : depth - 10;
  if (b.every((c) => c !== null)) return 0;
  let best = turn === me ? -99 : 99;
  for (let i = 0; i < 9; i++) {
    if (b[i] !== null) continue;
    b[i] = turn;
    const v = score(b, (1 - turn) as Mark, me, depth + 1);
    b[i] = null;
    best = turn === me ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}

/** IA: juega perfecto casi siempre, pero un 22 % de las veces se despista, así que se le puede ganar. */
export function botCell(s: TState): number {
  const free = s.board.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  if (Math.random() < 0.22) return free[Math.floor(Math.random() * free.length)]!;
  const me = s.turn;
  let best = -99; let pick = free[0]!;
  const order = free.slice().sort(() => Math.random() - 0.5);
  for (const i of order) {
    const b = s.board.slice();
    b[i] = me;
    const v = score(b, (1 - me) as Mark, me, 1);
    if (v > best) { best = v; pick = i; }
  }
  return pick;
}
