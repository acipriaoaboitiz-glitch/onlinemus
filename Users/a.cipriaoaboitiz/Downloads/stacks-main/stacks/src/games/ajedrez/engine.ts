import type { DuelPlayer } from '../shared/duel.ts';

/**
 * Ajedrez con reglas oficiales: movimientos legales, jaque, jaque mate, tablas por ahogado / 50 jugadas / material insuficiente,
 * enroque, captura al paso y coronación. Tablero de 64 números: 1 peón · 2 caballo · 3 alfil · 4 torre · 5 dama · 6 rey;
 * positivo = blancas (`p0`, oro), negativo = negras (`p1`, obsidiana). Índice = fila * 8 + columna, fila 0 arriba (lado negro).
 */
export type Side = 0 | 1;
export type Kind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
const KIND_OF: Kind[] = ['p', 'n', 'b', 'r', 'q', 'k'];
export const kindOf = (v: number): Kind => KIND_OF[Math.abs(v) - 1]!;
export const sideOf = (v: number): Side => (v > 0 ? 0 : 1);
const VAL = [0, 100, 320, 330, 500, 900, 20000];

export interface Move { from: number; to: number; promo?: Kind; castle?: 'K' | 'Q'; ep?: boolean }
export interface CState {
  players: DuelPlayer[];
  board: number[];
  turn: Side;
  /** bits: 1 = O-O blancas · 2 = O-O-O blancas · 4 = O-O negras · 8 = O-O-O negras */
  castling: number;
  ep: number;
  half: number;
  full: number;
  winner: Side | 'draw' | null;
  reason: 'mate' | 'stalemate' | 'fifty' | 'material' | null;
  inCheck: boolean;
  last: { from: number; to: number } | null;
  /** Piezas capturadas por cada bando (valores absolutos del tipo). */
  captured: [number[], number[]];
  seq: number;
}

export function newChess(players: DuelPlayer[]): CState {
  const back = [4, 2, 3, 5, 6, 3, 2, 4];
  const board = Array<number>(64).fill(0);
  back.forEach((v, c) => { board[c] = -v; board[56 + c] = v; });
  for (let c = 0; c < 8; c++) { board[8 + c] = -1; board[48 + c] = 1; }
  return { players, board, turn: 0, castling: 15, ep: -1, half: 0, full: 1, winner: null, reason: null, inCheck: false, last: null, captured: [[], []], seq: 0 };
}

const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
const DI = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const OR = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const on = (r: number, c: number): boolean => r >= 0 && r < 8 && c >= 0 && c < 8;

export function isAttacked(b: number[], sq: number, by: Side): boolean {
  const r = Math.floor(sq / 8); const c = sq % 8;
  const sgn = by === 0 ? 1 : -1;
  const pr = r + (by === 0 ? 1 : -1);
  for (const dc of [-1, 1]) if (on(pr, c + dc) && b[pr * 8 + c + dc] === sgn) return true;
  for (const [dr, dc] of KN) if (on(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === 2 * sgn) return true;
  for (const [dr, dc] of KG) if (on(r + dr, c + dc) && b[(r + dr) * 8 + c + dc] === 6 * sgn) return true;
  for (const [dirs, kinds] of [[DI, [3, 5]], [OR, [4, 5]]] as [number[][], number[]][]) {
    for (const [dr, dc] of dirs) {
      let rr = r + dr; let cc = c + dc;
      while (on(rr, cc)) {
        const v = b[rr * 8 + cc]!;
        if (v) { if (sideOf(v) === by && kinds.includes(Math.abs(v))) return true; break; }
        rr += dr; cc += dc;
      }
    }
  }
  return false;
}

/** Movimientos pseudo-legales (sin comprobar si el rey queda en jaque, salvo el paso del enroque). */
function pseudo(s: Pick<CState, 'board' | 'turn' | 'castling' | 'ep'>): Move[] {
  const { board: b, turn, castling, ep } = s;
  const out: Move[] = [];
  const sgn = turn === 0 ? 1 : -1;
  for (let i = 0; i < 64; i++) {
    const v = b[i]!;
    if (!v || sideOf(v) !== turn) continue;
    const r = Math.floor(i / 8); const c = i % 8;
    const k = Math.abs(v);
    if (k === 1) {
      const dr = turn === 0 ? -1 : 1; const start = turn === 0 ? 6 : 1; const last = turn === 0 ? 0 : 7;
      const add = (to: number, extra: Partial<Move> = {}): void => {
        if (Math.floor(to / 8) === last) for (const p of ['q', 'r', 'b', 'n'] as Kind[]) out.push({ from: i, to, promo: p, ...extra }); else out.push({ from: i, to, ...extra });
      };
      if (on(r + dr, c) && !b[(r + dr) * 8 + c]) {
        add((r + dr) * 8 + c);
        if (r === start && !b[(r + 2 * dr) * 8 + c]) out.push({ from: i, to: (r + 2 * dr) * 8 + c });
      }
      for (const dc of [-1, 1]) {
        if (!on(r + dr, c + dc)) continue;
        const to = (r + dr) * 8 + c + dc;
        if (b[to] && sideOf(b[to]!) !== turn) add(to);
        else if (to === ep) out.push({ from: i, to, ep: true });
      }
    } else if (k === 2 || k === 6) {
      for (const [dr, dc] of k === 2 ? KN : KG) {
        if (!on(r + dr, c + dc)) continue;
        const to = (r + dr) * 8 + c + dc;
        if (!b[to] || sideOf(b[to]!) !== turn) out.push({ from: i, to });
      }
      if (k === 6) {
        const home = turn === 0 ? 60 : 4;
        if (i === home) {
          const ks = turn === 0 ? 1 : 4; const qs = turn === 0 ? 2 : 8;
          if ((castling & ks) && !b[home + 1] && !b[home + 2] && b[home + 3] === 4 * sgn) out.push({ from: i, to: home + 2, castle: 'K' });
          if ((castling & qs) && !b[home - 1] && !b[home - 2] && !b[home - 3] && b[home - 4] === 4 * sgn) out.push({ from: i, to: home - 2, castle: 'Q' });
        }
      }
    } else {
      for (const [dr, dc] of k === 3 ? DI : k === 4 ? OR : [...DI, ...OR]) {
        let rr = r + dr; let cc = c + dc;
        while (on(rr, cc)) {
          const to = rr * 8 + cc;
          if (b[to]) { if (sideOf(b[to]!) !== turn) out.push({ from: i, to }); break; }
          out.push({ from: i, to });
          rr += dr; cc += dc;
        }
      }
    }
  }
  return out;
}

/** Aplica un movimiento al tablero (sin validar). Devuelve el tablero nuevo, derechos de enroque y casilla de al paso. */
function make(s: Pick<CState, 'board' | 'turn' | 'castling' | 'ep'>, m: Move): { board: number[]; castling: number; ep: number; captured: number } {
  const b = s.board.slice();
  const piece = b[m.from]!;
  let captured = b[m.to]!;
  b[m.from] = 0;
  if (m.ep) { const capSq = m.to + (s.turn === 0 ? 8 : -8); captured = b[capSq]!; b[capSq] = 0; }
  b[m.to] = m.promo ? (KIND_OF.indexOf(m.promo) + 1) * (piece > 0 ? 1 : -1) : piece;
  if (m.castle) {
    const home = s.turn === 0 ? 60 : 4;
    if (m.castle === 'K') { b[home + 1] = b[home + 3]!; b[home + 3] = 0; } else { b[home - 1] = b[home - 4]!; b[home - 4] = 0; }
  }
  let castling = s.castling;
  if (Math.abs(piece) === 6) castling &= s.turn === 0 ? ~3 : ~12;
  for (const sq of [m.from, m.to]) { if (sq === 63) castling &= ~1; if (sq === 56) castling &= ~2; if (sq === 7) castling &= ~4; if (sq === 0) castling &= ~8; }
  const ep = Math.abs(piece) === 1 && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1;
  return { board: b, castling, ep, captured };
}

const kingSq = (b: number[], side: Side): number => b.indexOf(side === 0 ? 6 : -6);

export function legalMoves(s: CState, from?: number): Move[] {
  const res: Move[] = [];
  for (const m of pseudo(s)) {
    if (from !== undefined && m.from !== from) continue;
    if (m.castle) {
      const home = s.turn === 0 ? 60 : 4;
      const foe = (1 - s.turn) as Side;
      const path = m.castle === 'K' ? [home, home + 1, home + 2] : [home, home - 1, home - 2];
      if (path.some((q) => isAttacked(s.board, q, foe))) continue;
    }
    const n = make(s, m);
    if (!isAttacked(n.board, kingSq(n.board, s.turn), (1 - s.turn) as Side)) res.push(m);
  }
  return res;
}

export type CAction = { k: 'move'; from: number; to: number; promo?: Kind };

function insufficient(b: number[]): boolean {
  const rest = b.filter((v) => v && Math.abs(v) !== 6).map(Math.abs);
  if (rest.length === 0) return true;
  if (rest.length === 1 && (rest[0] === 2 || rest[0] === 3)) return true;
  return false;
}

export function applyChess(prev: CState, pid: string, a: CAction): CState | null {
  const idx = prev.players.findIndex((p) => p.id === pid);
  if (prev.winner !== null || idx !== prev.turn) return null;
  const m = legalMoves(prev, a.from).find((x) => x.to === a.to && (x.promo ?? undefined) === (a.promo ?? undefined));
  if (!m) return null;
  const piece = prev.board[m.from]!;
  const n = make(prev, m);
  const captured: [number[], number[]] = [prev.captured[0].slice(), prev.captured[1].slice()];
  if (n.captured) captured[prev.turn].push(Math.abs(n.captured));
  const next = (1 - prev.turn) as Side;
  const s: CState = {
    ...prev, board: n.board, castling: n.castling, ep: n.ep, turn: next, last: { from: m.from, to: m.to }, captured, seq: prev.seq + 1,
    half: Math.abs(piece) === 1 || n.captured ? 0 : prev.half + 1, full: prev.full + (prev.turn === 1 ? 1 : 0),
    inCheck: isAttacked(n.board, kingSq(n.board, next), prev.turn),
  };
  const replies = legalMoves(s);
  if (!replies.length) { if (s.inCheck) { s.winner = prev.turn; s.reason = 'mate'; } else { s.winner = 'draw'; s.reason = 'stalemate'; } }
  else if (s.half >= 100) { s.winner = 'draw'; s.reason = 'fifty'; }
  else if (insufficient(s.board)) { s.winner = 'draw'; s.reason = 'material'; }
  return s;
}

// ─── IA ────────────────────────────────────────────────────────────────────────────────────────
const CENTER = (i: number): number => { const r = Math.floor(i / 8); const c = i % 8; return 3.5 - Math.max(Math.abs(r - 3.5), Math.abs(c - 3.5)); };
function evaluate(b: number[], side: Side): number {
  let sc = 0;
  for (let i = 0; i < 64; i++) {
    const v = b[i]!;
    if (!v) continue;
    const k = Math.abs(v); const sd = sideOf(v);
    const r = Math.floor(i / 8);
    let x = VAL[k]!;
    if (k === 1) x += (sd === 0 ? 6 - r : r - 1) * 8 + CENTER(i) * 2;
    else if (k === 2 || k === 3) x += CENTER(i) * 9;
    else if (k === 5) x += CENTER(i) * 2;
    sc += sd === side ? x : -x;
  }
  return sc;
}
function orderMoves(b: number[], ms: Move[]): Move[] {
  return ms.sort((x, y) => (Math.abs(b[y.to]!) * 10 - Math.abs(b[y.from]!)) - (Math.abs(b[x.to]!) * 10 - Math.abs(b[x.from]!)));
}
function negamax(st: Pick<CState, 'board' | 'turn' | 'castling' | 'ep'>, depth: number, alpha: number, beta: number): number {
  const ms = pseudo(st);
  if (depth === 0) return evaluate(st.board, st.turn);
  let best = -1e9;
  for (const m of orderMoves(st.board, ms)) {
    if (Math.abs(st.board[m.to]!) === 6) return 50000 + depth; // capturar el rey: la jugada anterior era ilegal
    const n = make(st, m);
    const v = -negamax({ board: n.board, turn: (1 - st.turn) as Side, castling: n.castling, ep: n.ep }, depth - 1, -beta, -alpha);
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -1e9 ? 0 : best;
}

export const LEVEL_DEPTH: Record<string, number> = { easy: 1, normal: 2, expert: 3 };

export function botMove(s: CState, level: string): CAction | null {
  const ms = legalMoves(s);
  if (!ms.length) return null;
  const depth = LEVEL_DEPTH[level] ?? 2;
  if (level === 'easy' && Math.random() < 0.3) { const m = ms[Math.floor(Math.random() * ms.length)]!; return { k: 'move', from: m.from, to: m.to, promo: m.promo }; }
  let best = -1e9; const picks: Move[] = [];
  for (const m of orderMoves(s.board, ms.slice())) {
    const n = make(s, m);
    const v = -negamax({ board: n.board, turn: (1 - s.turn) as Side, castling: n.castling, ep: n.ep }, depth - 1, -1e9, 1e9) + Math.random() * 3 + (m.promo === 'q' ? 400 : 0);
    if (v > best + 0.5) { best = v; picks.length = 0; picks.push(m); } else if (Math.abs(v - best) <= 0.5) picks.push(m);
  }
  const m = picks[Math.floor(Math.random() * picks.length)]!;
  return { k: 'move', from: m.from, to: m.to, promo: m.promo };
}
