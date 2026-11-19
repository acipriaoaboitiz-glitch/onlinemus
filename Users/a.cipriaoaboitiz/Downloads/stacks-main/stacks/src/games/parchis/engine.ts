/**
 * Parchís español (2 a 4 jugadores). 68 casillas de recorrido en cruz; cada color tiene su salida, su pasillo de 7 casillas y la meta.
 * Posición de una ficha: −1 = en casa · 0..63 = recorrido (0 = su salida) · 64..70 = pasillo · 71 = meta.
 */
export const LOOP = 68;
export const TRACK_LAST = 63;
export const GOAL = 71;

export interface PPlayer { id: string; name: string; human: boolean; peerId?: string; /** 0 sur · 1 oeste · 2 norte · 3 este */ color: number }
export interface Step { pos: number }
export interface PEvent { seq: number; kind: 'exit' | 'capture' | 'goal' | 'six' | 'pass' | 'move'; by: number }
export interface PState {
  players: PPlayer[];
  /** pieces[jugador][ficha] */
  pieces: number[][];
  turn: number;
  phase: 'roll' | 'move' | 'over';
  dice: number | null;
  /** Pasos extra pendientes (20 por captura, 10 por meta) que hay que gastar con una ficha. */
  bonus: number;
  sixes: number;
  winner: number | null;
  /** Último movimiento: ficha, recorrido por casillas y si capturó (para animar y sonar). */
  last: { player: number; piece: number; path: number[]; captured: { player: number; piece: number } | null; goal: boolean } | null;
  rollSeq: number;
  event: PEvent | null;
  seq: number;
}

const start = (color: number): number => (17 * color + 13) % LOOP;
/** Índice del recorrido común al que corresponde la posición `pos` (solo 0..63). */
export const loopIndex = (color: number, pos: number): number => (start(color) + pos) % LOOP;
/** Casillas seguras: las 4 salidas y las 8 casillas de las puntas y sus vecinas (estrella dorada). */
export const SAFE = new Set<number>(Array.from({ length: 4 }, (_, k) => [17 * k + 4, 17 * k + 8, 17 * k + 13]).flat());

let ev = 0;
export function newParchis(players: PPlayer[]): PState {
  return { players, pieces: players.map(() => [-1, -1, -1, -1]), turn: 0, phase: 'roll', dice: null, bonus: 0, sixes: 0, winner: null, last: null, rollSeq: 0, event: null, seq: 0 };
}

/** Piezas en cada casilla del recorrido común: Map<índice, [{jugador, ficha}]>. */
function occupancy(s: PState): Map<number, { player: number; piece: number }[]> {
  const m = new Map<number, { player: number; piece: number }[]>();
  s.players.forEach((pl, pi) => s.pieces[pi]!.forEach((pos, k) => {
    if (pos < 0 || pos > TRACK_LAST) return;
    const idx = loopIndex(pl.color, pos);
    const arr = m.get(idx) ?? [];
    arr.push({ player: pi, piece: k });
    m.set(idx, arr);
  }));
  return m;
}

export interface PMove { piece: number; to: number; path: number[]; capture: { player: number; piece: number } | null; exit: boolean; goal: boolean }

/** Movimientos legales del jugador `pi` con `steps` casillas (tirada de dado o bonus). */
export function movesFor(s: PState, pi: number, steps: number, fromDice: boolean): PMove[] {
  const color = s.players[pi]!.color;
  const occ = occupancy(s);
  const out: PMove[] = [];
  s.pieces[pi]!.forEach((pos, k) => {
    if (pos === GOAL) return;
    if (pos === -1) {
      if (!fromDice || steps !== 5) return;
      const idx = loopIndex(color, 0);
      const here = occ.get(idx) ?? [];
      if (here.length >= 2) return; // barrera en la salida
      const foe = here.find((x) => x.player !== pi) ?? null;
      out.push({ piece: k, to: 0, path: [0], capture: foe, exit: true, goal: false });
      return;
    }
    const to = pos + steps;
    if (to > GOAL) return;
    const path: number[] = [];
    for (let p = pos + 1; p <= to; p++) {
      path.push(p);
      if (p <= TRACK_LAST) {
        const here = occ.get(loopIndex(color, p)) ?? [];
        if (here.length >= 2) return; // barrera: no se puede pasar ni caer
      }
    }
    let capture: PMove['capture'] = null;
    if (to <= TRACK_LAST) {
      const idx = loopIndex(color, to);
      const here = occ.get(idx) ?? [];
      const foe = here.find((x) => x.player !== pi);
      if (foe && !SAFE.has(idx)) capture = foe;
    }
    out.push({ piece: k, to, path, capture, exit: false, goal: to === GOAL });
  });
  return out;
}

export type PAction = { k: 'roll'; v: number } | { k: 'move'; piece: number };

const say = (s: PState, kind: PEvent['kind'], by: number): void => { s.event = { seq: ++ev, kind, by }; };
const nextAlive = (s: PState, from: number): number => (from + 1) % s.players.length;

function passTurn(s: PState): void { s.turn = nextAlive(s, s.turn); s.phase = 'roll'; s.sixes = 0; s.bonus = 0; }

export function applyParchis(prev: PState, pid: string, a: PAction): PState | null {
  const pi = prev.players.findIndex((p) => p.id === pid);
  if (pi === -1 || pi !== prev.turn || prev.phase === 'over') return null;
  const s: PState = { ...prev, pieces: prev.pieces.map((r) => r.slice()), seq: prev.seq + 1 };

  if (a.k === 'roll') {
    if (prev.phase !== 'roll' || a.v < 1 || a.v > 6) return null;
    s.dice = a.v; s.rollSeq = prev.rollSeq + 1; s.last = null;
    const sixes = a.v === 6 ? prev.sixes + 1 : 0;
    s.sixes = sixes;
    if (sixes === 3) { say(s, 'pass', pi); passTurn(s); return s; } // tres seises seguidos: pierdes el turno
    const moves = movesFor(s, pi, a.v, true);
    if (!moves.length) { say(s, 'pass', pi); if (a.v === 6) { s.phase = 'roll'; } else passTurn(s); return s; }
    s.phase = 'move';
    return s;
  }

  // mover ficha
  if (prev.phase !== 'move') return null;
  const usingBonus = prev.bonus > 0;
  const steps = usingBonus ? prev.bonus : prev.dice!;
  const mv = movesFor(prev, pi, steps, !usingBonus).find((m) => m.piece === a.piece);
  if (!mv) return null;
  s.pieces[pi]![a.piece] = mv.to;
  let captured: { player: number; piece: number } | null = null;
  if (mv.capture) { s.pieces[mv.capture.player]![mv.capture.piece] = -1; captured = mv.capture; }
  s.last = { player: pi, piece: a.piece, path: mv.path, captured, goal: mv.goal };
  if (s.pieces[pi]!.every((p) => p === GOAL)) { s.winner = pi; s.phase = 'over'; say(s, 'goal', pi); return s; }

  const gained = captured ? 20 : mv.goal ? 10 : 0;
  say(s, captured ? 'capture' : mv.goal ? 'goal' : mv.exit ? 'exit' : 'move', pi);
  s.bonus = 0;
  if (gained) {
    s.bonus = gained;
    if (movesFor(s, pi, gained, false).length) { s.phase = 'move'; return s; }
    s.bonus = 0; // sin ninguna ficha que pueda gastarlo, se pierde
  }
  if (!usingBonus && prev.dice === 6) { s.phase = 'roll'; say(s, 'six', pi); return s; } // el 6 repite turno
  if (usingBonus && prev.dice === 6 && !gained) { s.phase = 'roll'; return s; }
  passTurn(s);
  return s;
}

/** IA: puntúa cada movimiento (capturar > meta > sacar > entrar en pasillo > avanzar la ficha más adelantada) y evita dejarse capturar. */
export function botPick(s: PState): number {
  const pi = s.turn;
  const steps = s.bonus > 0 ? s.bonus : s.dice!;
  const moves = movesFor(s, pi, steps, s.bonus === 0);
  let best = moves[0]!; let bestScore = -1e9;
  const color = s.players[pi]!.color;
  for (const m of moves) {
    let sc = Math.random();
    if (m.capture) sc += 100;
    if (m.goal) sc += 80;
    if (m.exit) sc += 60;
    if (m.to > TRACK_LAST && m.to < GOAL) sc += 30;
    sc += s.pieces[pi]![m.piece]! * 0.2;
    if (m.to <= TRACK_LAST && SAFE.has(loopIndex(color, m.to))) sc += 12;
    // peligro: rival a 1–6 casillas detrás de la casilla de destino
    if (m.to >= 0 && m.to <= TRACK_LAST && !SAFE.has(loopIndex(color, m.to))) {
      const idx = loopIndex(color, m.to);
      s.players.forEach((pl, oi) => { if (oi === pi) return; s.pieces[oi]!.forEach((pos) => { if (pos < 0 || pos > TRACK_LAST) return; const d = (idx - loopIndex(pl.color, pos) + LOOP) % LOOP; if (d >= 1 && d <= 6) sc -= 9; }); });
    }
    if (sc > bestScore) { bestScore = sc; best = m; }
  }
  return best.piece;
}
