import type { DuelPlayer } from '../shared/duel.ts';

/** 4 en Raya (7 columnas × 6 filas). `p0` juega con oro y `p1` con rubí; cada ronda abre uno distinto. */
export const COLS = 7;
export const ROWS = 6;
export type Disc = 0 | 1;
export interface CState {
  players: DuelPlayer[];
  /** r * 7 + c, con r = 0 arriba. */
  board: (Disc | null)[];
  turn: Disc;
  round: number;
  winner: Disc | 'draw' | null;
  line: number[] | null;
  last: number | null;
  seq: number;
}

export function newC4(players: DuelPlayer[], round = 1): CState {
  return { players, board: Array<Disc | null>(COLS * ROWS).fill(null), turn: ((round - 1) % 2) as Disc, round, winner: null, line: null, last: null, seq: 0 };
}

/** Fila donde caería una ficha en la columna `c` (−1 si está llena). */
export function dropRow(b: (Disc | null)[], c: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (b[r * COLS + c] === null) return r;
  return -1;
}

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
function winLine(b: (Disc | null)[], r: number, c: number): number[] | null {
  const m = b[r * COLS + c];
  if (m === null) return null;
  for (const [dr, dc] of DIRS) {
    const cells = [r * COLS + c];
    for (const sgn of [1, -1]) {
      let rr = r + dr * sgn; let cc = c + dc * sgn;
      while (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && b[rr * COLS + cc] === m) { cells.push(rr * COLS + cc); rr += dr * sgn; cc += dc * sgn; }
    }
    if (cells.length >= 4) return cells.sort((x, y) => x - y).slice(0, 4);
  }
  return null;
}

export type CAction = { k: 'drop'; c: number };

export function applyC4(prev: CState, pid: string, a: CAction): CState | null {
  const idx = prev.players.findIndex((p) => p.id === pid);
  if (prev.winner !== null || idx !== prev.turn || a.c < 0 || a.c >= COLS) return null;
  const r = dropRow(prev.board, a.c);
  if (r < 0) return null;
  const s: CState = { ...prev, board: prev.board.slice(), seq: prev.seq + 1, last: r * COLS + a.c };
  s.board[r * COLS + a.c] = prev.turn;
  const l = winLine(s.board, r, a.c);
  if (l) { s.winner = prev.turn; s.line = l; } else if (s.board.every((x) => x !== null)) s.winner = 'draw';
  else s.turn = (1 - prev.turn) as Disc;
  return s;
}

export const nextC4 = (s: CState): CState => newC4(s.players, s.round + 1);

// ─── IA: poda alfa-beta de profundidad 4 con heurística de ventanas de 4 ───────────────────────
function windowScore(w: (Disc | null)[], me: Disc): number {
  let mine = 0; let theirs = 0;
  for (const x of w) { if (x === me) mine++; else if (x !== null) theirs++; }
  if (mine && theirs) return 0;
  if (mine === 4) return 1000;
  if (mine === 3) return 12;
  if (mine === 2) return 3;
  if (theirs === 4) return -1000;
  if (theirs === 3) return -14;
  if (theirs === 2) return -2;
  return 0;
}
function evaluate(b: (Disc | null)[], me: Disc): number {
  let sc = 0;
  for (let r = 0; r < ROWS; r++) sc += (b[r * COLS + 3] === me ? 3 : b[r * COLS + 3] === null ? 0 : -3);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    for (const [dr, dc] of DIRS) {
      const er = r + dr * 3; const ec = c + dc * 3;
      if (er < 0 || er >= ROWS || ec < 0 || ec >= COLS) continue;
      sc += windowScore([0, 1, 2, 3].map((k) => b[(r + dr * k) * COLS + c + dc * k]!), me);
    }
  }
  return sc;
}
const ORDER = [3, 2, 4, 1, 5, 0, 6];
function search(b: (Disc | null)[], depth: number, alpha: number, beta: number, turn: Disc, me: Disc): number {
  const free = ORDER.filter((c) => dropRow(b, c) >= 0);
  if (!free.length) return 0;
  if (depth === 0) return evaluate(b, me);
  let best = turn === me ? -1e9 : 1e9;
  for (const c of free) {
    const r = dropRow(b, c);
    b[r * COLS + c] = turn;
    const won = winLine(b, r, c) !== null;
    const v = won ? (turn === me ? 5000 + depth : -5000 - depth) : search(b, depth - 1, alpha, beta, (1 - turn) as Disc, me);
    b[r * COLS + c] = null;
    if (turn === me) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

export function botColumn(s: CState): number {
  const free = ORDER.filter((c) => dropRow(s.board, c) >= 0);
  if (Math.random() < 0.14) return free[Math.floor(Math.random() * free.length)]!;
  const me = s.turn;
  let best = -1e9; let pick = free[0]!;
  for (const c of free) {
    const b = s.board.slice();
    const r = dropRow(b, c);
    b[r * COLS + c] = me;
    const v = winLine(b, r, c) ? 9000 : search(b, 3, -1e9, 1e9, (1 - me) as Disc, me) + Math.random() * 2;
    if (v > best) { best = v; pick = c; }
  }
  return pick;
}
