/**
 * El Mentiroso (dados de farol), 2 a 4 jugadores. Cada jugador tiene 5 dados bajo su cubilete. En su turno se sube la apuesta
 * («cuatro 5s» = al menos cuatro dados con un 5 entre todos los de la mesa): más cantidad, o la misma cantidad con una cara mayor;
 * o se canta «¡MENTIROSO!» (si hay menos dados de los apostados pierde el que apostó; si hay igual o más, pierde el que cantó) o «¡EXACTO!»
 * (si hay justo los apostados, recuperas un dado; si no, pierdes uno). Quien pierde el duelo empieza la ronda siguiente. Gana el último
 * jugador con dados.
 */
export const START_DICE = 5;

export interface LPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
export interface Bid { qty: number; face: number; by: string }
export interface Reveal {
  caller: string; kind: 'liar' | 'exact'; bid: Bid; count: number;
  /** Dados de todos al destapar (antes de perder o ganar un dado), para el recuento animado. */
  dice: Record<string, number[]>;
  /** Quién pierde un dado (null si «exacto» acierta). */
  loser: string | null;
  /** Quién recupera un dado (solo «exacto» acertado). */
  gainer: string | null;
}
export interface LEvent { seq: number; by: string; text: string; kind: 'info' | 'bid' | 'liar' | 'exact' | 'out' }

export interface LiarState {
  players: LPlayer[];
  dice: Record<string, number[]>;
  turn: number;
  bid: Bid | null;
  phase: 'bid' | 'reveal' | 'over';
  round: number;
  reveal: Reveal | null;
  winner: string | null;
  event: LEvent | null;
}

let seq = 0;
const say = (s: LiarState, by: string, text: string, kind: LEvent['kind'] = 'info'): void => { s.event = { seq: ++seq, by, text, kind }; };

const roll = (n: number): number[] => Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6));
export const alive = (s: LiarState): number[] => s.players.map((_, i) => i).filter((i) => s.dice[s.players[i]!.id]!.length > 0);
export const totalDice = (s: LiarState): number => s.players.reduce((n, p) => n + s.dice[p.id]!.length, 0);
export const countFace = (s: LiarState, face: number): number => s.players.reduce((n, p) => n + s.dice[p.id]!.filter((d) => d === face).length, 0);

export function newGame(players: LPlayer[]): LiarState {
  const dice: Record<string, number[]> = {};
  players.forEach((p) => { dice[p.id] = roll(START_DICE); });
  return { players, dice, turn: 0, bid: null, phase: 'bid', round: 1, reveal: null, winner: null, event: null };
}

/** ¿Es válida esta apuesta sobre la actual? */
export function validBid(s: LiarState, qty: number, face: number): boolean {
  if (qty < 1 || qty > totalDice(s) || face < 1 || face > 6) return false;
  if (!s.bid) return true;
  return qty > s.bid.qty || (qty === s.bid.qty && face > s.bid.face);
}

const nextAlive = (s: LiarState, from: number): number => {
  for (let k = 1; k <= s.players.length; k++) { const i = (from + k) % s.players.length; if (s.dice[s.players[i]!.id]!.length > 0) return i; }
  return from;
};

export function raise(prev: LiarState, pid: string, qty: number, face: number): LiarState | null {
  if (prev.phase !== 'bid' || prev.players[prev.turn]!.id !== pid || !validBid(prev, qty, face)) return null;
  const s = structuredClone(prev);
  s.bid = { qty, face, by: pid };
  say(s, pid, `${qty}×${face}`, 'bid');
  s.turn = nextAlive(s, prev.turn);
  return s;
}

function resolve(prev: LiarState, pid: string, kind: 'liar' | 'exact'): LiarState | null {
  if (prev.phase !== 'bid' || prev.players[prev.turn]!.id !== pid || !prev.bid) return null;
  const s = structuredClone(prev);
  const bid = s.bid!;
  const count = countFace(s, bid.face);
  let loser: string | null = null;
  let gainer: string | null = null;
  if (kind === 'liar') loser = count >= bid.qty ? pid : bid.by;
  else if (count === bid.qty) gainer = pid;
  else loser = pid;
  if (loser) s.dice[loser] = s.dice[loser]!.slice(1);
  if (gainer && s.dice[gainer]!.length < START_DICE) s.dice[gainer] = [...s.dice[gainer]!, 1]; // el dado nuevo se tira en la ronda siguiente
  s.reveal = { caller: pid, kind, bid, count, dice: structuredClone(prev.dice), loser, gainer };
  s.phase = 'reveal';
  say(s, pid, kind === 'liar' ? '¡MENTIROSO!' : '¡EXACTO!', kind);
  return s;
}
export const callLiar = (s: LiarState, pid: string): LiarState | null => resolve(s, pid, 'liar');
export const callExact = (s: LiarState, pid: string): LiarState | null => resolve(s, pid, 'exact');

/** Tras el duelo: elimina a quien se quedó sin dados y reparte la ronda siguiente (o proclama al ganador). */
export function nextRound(prev: LiarState): LiarState | null {
  if (prev.phase !== 'reveal' || !prev.reveal) return null;
  const s = structuredClone(prev);
  const left = alive(s);
  if (s.reveal!.loser && s.dice[s.reveal!.loser]!.length === 0) say(s, s.reveal!.loser, '', 'out');
  if (left.length <= 1) { s.phase = 'over'; s.winner = s.players[left[0] ?? 0]!.id; return s; }
  for (const p of s.players) s.dice[p.id] = roll(s.dice[p.id]!.length);
  const starter = s.players.findIndex((p) => p.id === (s.reveal!.loser ?? s.reveal!.gainer ?? s.reveal!.caller));
  s.turn = s.dice[s.players[starter]!.id]!.length > 0 ? starter : nextAlive(s, starter);
  s.bid = null; s.reveal = null; s.phase = 'bid'; s.round++;
  return s;
}

export type LiarAction = { k: 'raise'; qty: number; face: number } | { k: 'liar' } | { k: 'exact' } | { k: 'next' };

export function applyLiarAction(s: LiarState, pid: string, a: LiarAction): LiarState | null {
  switch (a.k) {
    case 'raise': return raise(s, pid, a.qty, a.face);
    case 'liar': return callLiar(s, pid);
    case 'exact': return callExact(s, pid);
    case 'next': return nextRound(s);
  }
}

/** Apuesta mínima siguiente (una más de cantidad con la misma cara, o la misma cantidad con cara superior). */
export function minBid(s: LiarState): { qty: number; face: number } {
  if (!s.bid) return { qty: 1, face: 2 };
  return s.bid.face < 6 ? { qty: s.bid.qty, face: s.bid.face + 1 } : { qty: s.bid.qty + 1, face: 1 };
}

/** IA: estima cuántos dados hay con cada cara (los suyos + un sexto de los ajenos) y farolea a veces. */
export function botMove(s: LiarState): LiarAction {
  const me = s.players[s.turn]!;
  const mine = s.dice[me.id]!;
  const others = totalDice(s) - mine.length;
  const expect = (face: number): number => mine.filter((d) => d === face).length + others / 6;
  if (s.bid) {
    const e = expect(s.bid.face);
    const over = s.bid.qty - e;
    if (over >= 1.6 || (over >= 0.9 && Math.random() < 0.55)) return { k: 'liar' };
    if (Math.abs(over) < 0.25 && Math.random() < 0.18) return { k: 'exact' };
  }
  let best: { qty: number; face: number; score: number } | null = null;
  for (let face = 1; face <= 6; face++) {
    const qty = !s.bid ? Math.max(1, Math.round(expect(face))) : face > s.bid.face ? s.bid.qty : s.bid.qty + 1;
    if (!validBid(s, qty, face)) continue;
    const score = expect(face) - qty + Math.random() * 0.8;
    if (!best || score > best.score) best = { qty, face, score };
  }
  if (!best) return s.bid ? { k: 'liar' } : { k: 'raise', qty: 1, face: 2 };
  return { k: 'raise', qty: best.qty, face: best.face };
}
