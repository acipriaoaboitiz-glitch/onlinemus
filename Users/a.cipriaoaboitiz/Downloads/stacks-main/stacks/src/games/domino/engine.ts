import { shuffle } from '../../engine/deck.ts';

/**
 * Dominó (doble seis, 28 fichas). 1 contra 1 o 2 contra 2 por parejas (asientos 0-2 contra 1-3). Se reparten 7 fichas a cada jugador;
 * con 2 jugadores el resto forma el pozo (se roba hasta poder jugar). Empieza quien tiene el doble más alto (6-6). Se coloca una ficha
 * en cualquiera de los dos extremos de la cadena cuyo valor coincida. Gana la ronda quien se queda sin fichas («¡DOMINÓ!») o, si la
 * mesa se cierra (todos pasan), quien suma menos puntos («¡CIERRE!»). La ronda vale los puntos de las fichas del bando contrario.
 */
export type Tile = readonly [number, number];
export const tileId = (t: Tile): string => `${t[0]}-${t[1]}`;
export const pips = (t: Tile): number => t[0] + t[1];

export interface DPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
/** Ficha colocada: `a` es el valor que mira a la izquierda y `b` el que mira a la derecha. */
export interface Placed { a: number; b: number }
export interface DEvent { seq: number; by: string; text: string; kind: 'info' | 'domino' | 'block' | 'pass' | 'draw' }
export interface DResult { winner: string; points: number; blocked: boolean }

export interface DominoState {
  players: DPlayer[];
  hands: Record<string, Tile[]>;
  pool: Tile[];
  chain: Placed[];
  turn: number;
  phase: 'play' | 'roundOver';
  /** Pases seguidos (si todos pasan, la mesa se cierra). */
  passes: number;
  /** Ficha con la que debe abrir quien empieza la primera ronda (el doble más alto). */
  mustStart: string | null;
  round: number;
  event: DEvent | null;
  result: DResult | null;
}

/** Asientos pares contra impares (con 2 jugadores, cada uno es su propio bando). */
export const teamOf = (s: DominoState, idx: number): number => (s.players.length === 4 ? idx % 2 : idx);

let seq = 0;
const say = (s: DominoState, by: string, text: string, kind: DEvent['kind'] = 'info'): void => { s.event = { seq: ++seq, by, text, kind }; };

export const allTiles = (): Tile[] => { const t: Tile[] = []; for (let a = 0; a <= 6; a++) for (let b = a; b <= 6; b++) t.push([a, b]); return t; };

/** Reparte una ronda. `starter` = quien ganó la anterior (abre con cualquier ficha); sin él, abre el doble más alto. */
export function newRound(players: DPlayer[], round = 1, starter?: number): DominoState {
  const deck = shuffle(allTiles());
  const hands: Record<string, Tile[]> = {};
  players.forEach((p) => { hands[p.id] = deck.splice(0, 7).sort((x, y) => pips(y) - pips(x)); });
  const s: DominoState = { players, hands, pool: players.length === 4 ? [] : deck, chain: [], turn: 0, phase: 'play', passes: 0, mustStart: null, round, event: null, result: null };
  if (starter === undefined) {
    // El doble más alto; si nadie tiene dobles, la ficha de más puntos.
    let best = { i: 0, t: hands[players[0]!.id]![0]!, score: -1 };
    players.forEach((p, i) => hands[p.id]!.forEach((t) => {
      const score = (t[0] === t[1] ? 100 : 0) + pips(t);
      if (score > best.score) best = { i, t, score };
    }));
    s.turn = best.i; s.mustStart = tileId(best.t);
  } else s.turn = starter;
  return s;
}

export const ends = (s: DominoState): { left: number; right: number } | null =>
  s.chain.length ? { left: s.chain[0]!.a, right: s.chain[s.chain.length - 1]!.b } : null;

/** En qué extremos puede jugarse una ficha. */
export function sidesFor(s: DominoState, t: Tile): ('L' | 'R')[] {
  const e = ends(s);
  if (!e) return s.mustStart && tileId(t) !== s.mustStart ? [] : ['R'];
  const out: ('L' | 'R')[] = [];
  if (t[0] === e.left || t[1] === e.left) out.push('L');
  if (t[0] === e.right || t[1] === e.right) out.push('R');
  return out;
}

export const playableTiles = (s: DominoState, pid: string): Tile[] => s.hands[pid]!.filter((t) => sidesFor(s, t).length > 0);

const sum = (h: readonly Tile[]): number => h.reduce((n, t) => n + pips(t), 0);

function finish(s: DominoState, winnerIdx: number, blocked: boolean): void {
  const winner = s.players[winnerIdx]!;
  const wTeam = teamOf(s, winnerIdx);
  const points = s.players.reduce((n, p, i) => (teamOf(s, i) === wTeam ? n : n + sum(s.hands[p.id]!)), 0);
  s.phase = 'roundOver';
  s.result = { winner: winner.id, points, blocked };
  say(s, winner.id, blocked ? '¡CIERRE!' : '¡DOMINÓ!', blocked ? 'block' : 'domino');
}

export function playTile(prev: DominoState, pid: string, id: string, side: 'L' | 'R'): DominoState | null {
  if (prev.phase !== 'play' || prev.players[prev.turn]!.id !== pid) return null;
  const tile = prev.hands[pid]!.find((t) => tileId(t) === id);
  if (!tile || !sidesFor(prev, tile).includes(side)) return null;
  const s = structuredClone(prev);
  s.hands[pid] = s.hands[pid]!.filter((t) => tileId(t) !== id);
  const e = ends(s);
  if (!e) s.chain = [{ a: tile[0], b: tile[1] }];
  else if (side === 'R') s.chain.push(tile[0] === e.right ? { a: tile[0], b: tile[1] } : { a: tile[1], b: tile[0] });
  else s.chain.unshift(tile[1] === e.left ? { a: tile[0], b: tile[1] } : { a: tile[1], b: tile[0] });
  s.mustStart = null;
  s.passes = 0;
  say(s, pid, `${tile[0]}-${tile[1]}`);
  if (s.hands[pid]!.length === 0) { finish(s, prev.turn, false); return s; }
  s.turn = (prev.turn + 1) % s.players.length;
  return s;
}

/** Robar del pozo (solo con 2 jugadores y sin ficha jugable). */
export function drawTile(prev: DominoState, pid: string): DominoState | null {
  if (prev.phase !== 'play' || prev.players[prev.turn]!.id !== pid || prev.pool.length === 0 || playableTiles(prev, pid).length > 0) return null;
  const s = structuredClone(prev);
  const t = s.pool.shift()!;
  s.hands[pid] = [...s.hands[pid]!, t];
  say(s, pid, 'Roba', 'draw');
  return s;
}

export function passTurn(prev: DominoState, pid: string): DominoState | null {
  if (prev.phase !== 'play' || prev.players[prev.turn]!.id !== pid || prev.pool.length > 0 || playableTiles(prev, pid).length > 0) return null;
  const s = structuredClone(prev);
  s.passes++;
  say(s, pid, 'Pasa', 'pass');
  if (s.passes >= s.players.length) {
    // Mesa cerrada: gana quien menos puntos suma en mano.
    let w = 0;
    s.players.forEach((p, i) => { if (sum(s.hands[p.id]!) < sum(s.hands[s.players[w]!.id]!)) w = i; });
    finish(s, w, true);
    return s;
  }
  s.turn = (prev.turn + 1) % s.players.length;
  return s;
}

export type DominoAction = { k: 'play'; id: string; side: 'L' | 'R' } | { k: 'draw' } | { k: 'pass' };

export function applyDominoAction(s: DominoState, pid: string, a: DominoAction): DominoState | null {
  switch (a.k) {
    case 'play': return playTile(s, pid, a.id, a.side);
    case 'draw': return drawTile(s, pid);
    case 'pass': return passTurn(s, pid);
  }
}

/** IA: suelta la ficha de más puntos (los dobles primero) y, a igualdad, la que deja un extremo que ella misma puede seguir jugando. */
export function botMove(s: DominoState): DominoAction {
  const me = s.players[s.turn]!;
  const hand = s.hands[me.id]!;
  const options = playableTiles(s, me.id);
  if (options.length === 0) return s.pool.length > 0 ? { k: 'draw' } : { k: 'pass' };
  let best: { id: string; side: 'L' | 'R'; score: number } | null = null;
  for (const t of options) for (const side of sidesFor(s, t)) {
    const rest = hand.filter((x) => tileId(x) !== tileId(t));
    const open = ends(s);
    const newEnd = !open ? t[1] : side === 'R' ? (t[0] === open.right ? t[1] : t[0]) : (t[1] === open.left ? t[0] : t[1]);
    const keeps = rest.filter((x) => x[0] === newEnd || x[1] === newEnd).length;
    const score = pips(t) + (t[0] === t[1] ? 6 : 0) + keeps * 1.5 + Math.random();
    if (!best || score > best.score) best = { id: tileId(t), side, score };
  }
  return { k: 'play', id: best!.id, side: best!.side };
}

export const handPips = sum;
