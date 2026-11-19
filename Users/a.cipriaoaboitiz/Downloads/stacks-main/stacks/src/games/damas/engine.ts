import type { DuelPlayer } from '../shared/duel.ts';

/**
 * Damas 8×8: las fichas (hombres) avanzan en diagonal y capturan solo hacia delante; la Dama (coronada) se mueve y captura un paso
 * en las 4 diagonales. Capturar es obligatorio y los saltos se encadenan. `p0` (oro) sube; `p1` (marfil) baja.
 */
export type Side = 0 | 1;
export interface Piece { side: Side; king: boolean }
export interface Move { from: number; to: number; path: number[]; captured: number[]; crowns: boolean }
export interface DState {
  players: DuelPlayer[];
  board: (Piece | null)[];
  turn: Side;
  winner: Side | 'draw' | null;
  /** Último movimiento (para animar el salto). */
  last: Move | null;
  seq: number;
  /** Plies sin captura ni movimiento de hombre (tablas a los 80). */
  quiet: number;
}

const dir = (side: Side): number => (side === 0 ? -1 : 1);

export function newDamas(players: DuelPlayer[]): DState {
  const board: (Piece | null)[] = Array(64).fill(null);
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if ((r + c) % 2 !== 1) continue;
    if (r < 3) board[r * 8 + c] = { side: 1, king: false };
    else if (r > 4) board[r * 8 + c] = { side: 0, king: false };
  }
  return { players, board, turn: 0, winner: null, last: null, seq: 0, quiet: 0 };
}

const inside = (r: number, c: number): boolean => r >= 0 && r < 8 && c >= 0 && c < 8;
const dirsFor = (p: Piece): [number, number][] => (p.king ? [[-1, -1], [-1, 1], [1, -1], [1, 1]] : [[dir(p.side), -1], [dir(p.side), 1]]);
const crownRow = (side: Side): number => (side === 0 ? 0 : 7);

function jumps(board: (Piece | null)[], from: number, piece: Piece, start: number, captured: number[], path: number[], out: Move[]): void {
  const r = Math.floor(from / 8); const c = from % 8;
  let extended = false;
  for (const [dr, dc] of dirsFor(piece)) {
    const mr = r + dr; const mc = c + dc; const lr = r + 2 * dr; const lc = c + 2 * dc;
    if (!inside(lr, lc)) continue;
    const mid = board[mr * 8 + mc];
    const landIdx = lr * 8 + lc;
    const landFree = board[landIdx] === null || landIdx === start;
    if (mid && mid.side !== piece.side && !captured.includes(mr * 8 + mc) && landFree) {
      extended = true;
      const crowned = !piece.king && lr === crownRow(piece.side);
      const nextPiece: Piece = crowned ? { ...piece, king: true } : piece;
      const nc = [...captured, mr * 8 + mc]; const np = [...path, landIdx];
      // coronar al saltar termina la cadena (regla clásica)
      if (crowned) out.push({ from: start, to: landIdx, path: np, captured: nc, crowns: true });
      else jumps(board, landIdx, nextPiece, start, nc, np, out);
    }
  }
  if (!extended && captured.length) out.push({ from: start, to: from, path, captured, crowns: false });
}

/** Todos los movimientos legales del bando `side` (si hay capturas, solo capturas). */
export function legalMoves(s: DState, side: Side = s.turn): Move[] {
  const caps: Move[] = []; const steps: Move[] = [];
  s.board.forEach((p, i) => {
    if (!p || p.side !== side) return;
    jumps(s.board, i, p, i, [], [], caps);
    const r = Math.floor(i / 8); const c = i % 8;
    for (const [dr, dc] of dirsFor(p)) {
      const nr = r + dr; const nc = c + dc;
      if (inside(nr, nc) && s.board[nr * 8 + nc] === null) steps.push({ from: i, to: nr * 8 + nc, path: [nr * 8 + nc], captured: [], crowns: !p.king && nr === crownRow(side) });
    }
  });
  return caps.length ? caps : steps;
}

export type DAction = { k: 'move'; from: number; to: number };

export function applyDamas(prev: DState, pid: string, a: DAction): DState | null {
  const idx = prev.players.findIndex((p) => p.id === pid);
  if (prev.winner !== null || idx !== prev.turn) return null;
  const mv = legalMoves(prev).find((m) => m.from === a.from && m.to === a.to);
  if (!mv) return null;
  const board = prev.board.slice();
  const piece = board[mv.from]!;
  board[mv.from] = null;
  mv.captured.forEach((i) => { board[i] = null; });
  board[mv.to] = mv.crowns ? { ...piece, king: true } : piece;
  const next = (1 - prev.turn) as Side;
  const s: DState = { ...prev, board, last: mv, seq: prev.seq + 1, quiet: mv.captured.length || !piece.king ? 0 : prev.quiet + 1, turn: next };
  if (legalMoves(s, next).length === 0) s.winner = prev.turn;
  else if (s.quiet >= 80) s.winner = 'draw';
  return s;
}

// ─── IA: minimax con poda alfa-beta ─────────────────────────────────────────────────────────────
function evalBoard(board: (Piece | null)[], me: Side): number {
  let v = 0;
  board.forEach((p, i) => {
    if (!p) return;
    const r = Math.floor(i / 8);
    const adv = p.side === 0 ? 7 - r : r;
    const val = p.king ? 3.2 : 1 + adv * 0.06 + (i % 8 === 0 || i % 8 === 7 ? 0.05 : 0);
    v += p.side === me ? val : -val;
  });
  return v;
}
function search(s: DState, depth: number, alpha: number, beta: number, me: Side): number {
  if (s.winner !== null) return s.winner === 'draw' ? 0 : s.winner === me ? 100 + depth : -100 - depth;
  if (depth === 0) return evalBoard(s.board, me);
  const moves = legalMoves(s);
  let best = s.turn === me ? -1e9 : 1e9;
  for (const m of moves) {
    const n = applyDamas(s, s.players[s.turn]!.id, { k: 'move', from: m.from, to: m.to });
    if (!n) continue;
    const v = search(n, depth - 1, alpha, beta, me);
    if (s.turn === me) { best = Math.max(best, v); alpha = Math.max(alpha, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= alpha) break;
  }
  return best;
}

export function botMove(s: DState): { from: number; to: number } | null {
  const moves = legalMoves(s);
  if (!moves.length) return null;
  if (Math.random() < 0.1) { const m = moves[Math.floor(Math.random() * moves.length)]!; return { from: m.from, to: m.to }; }
  const me = s.turn;
  let best = -1e9; let pick = moves[0]!;
  for (const m of moves.sort(() => Math.random() - 0.5)) {
    const n = applyDamas(s, s.players[me]!.id, { k: 'move', from: m.from, to: m.to });
    if (!n) continue;
    const v = search(n, 4, -1e9, 1e9, me);
    if (v > best) { best = v; pick = m; }
  }
  return { from: pick.from, to: pick.to };
}
