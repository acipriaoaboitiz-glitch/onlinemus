import type { SpanishCard } from '../../engine/deck.ts';
import { shuffle, spanishDeck } from '../../engine/deck.ts';

/**
 * Chinchón con baraja española de 40. 7 cartas por jugador; en tu turno robas del mazo o del descarte y descartas una.
 * Ligas: tríos/póker del mismo número, o escaleras de 3+ cartas del mismo palo en el orden 1-2-3-4-5-6-7-10-11-12.
 * Cierras cuando las 7 cartas que te quedan tienen 7 puntos o menos sueltos (figuras = 10).
 * El cierre con todo ligado (incluido el Chinchón de 7 seguidas) resta 10. Quien llega a 100 queda eliminado.
 */
export const CLOSE_LIMIT = 7;
export const OUT_AT = 100;
/** Quien cierra gana la ronda y resta 10 puntos; con Chinchón puro (7 cartas seguidas del mismo palo), 25. */
export const CLOSE_BONUS = -10;
export const CHINCHON_BONUS = -25;
const ORDER = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
const pos = (c: SpanishCard): number => ORDER.indexOf(c.rank);
export const looseValue = (c: SpanishCard): number => (c.rank >= 10 ? 10 : c.rank);

function isMeld(cards: SpanishCard[]): boolean {
  if (cards.length < 3) return false;
  if (cards.every((c) => c.rank === cards[0]!.rank)) return cards.length <= 4;
  if (!cards.every((c) => c.suit === cards[0]!.suit)) return false;
  const p = cards.map(pos).sort((a, b) => a - b);
  return p.every((v, i) => i === 0 || v === p[i - 1]! + 1);
}

export interface Arrangement { unmatched: number; groups: SpanishCard[][]; loose: SpanishCard[] }

/** Mejor reparto de la mano en ligas (mínimo de puntos sueltos). Fuerza bruta sobre ≤ 8 cartas. */
export function arrange(hand: readonly SpanishCard[]): Arrangement {
  const n = hand.length;
  const melds: number[] = [];
  for (let mask = 7; mask < 1 << n; mask++) {
    let bits = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) bits++;
    if (bits < 3) continue;
    if (isMeld(hand.filter((_, i) => mask & (1 << i)))) melds.push(mask);
  }
  const memo = new Map<number, { v: number; groups: number[] }>();
  const f = (avail: number): { v: number; groups: number[] } => {
    if (avail === 0) return { v: 0, groups: [] };
    const hit = memo.get(avail);
    if (hit) return hit;
    let low = 0;
    while (!(avail & (1 << low))) low++;
    const rest = avail & ~(1 << low);
    const skip = f(rest);
    let best = { v: looseValue(hand[low]!) + skip.v, groups: skip.groups };
    for (const m of melds) {
      if (!(m & (1 << low)) || (m & avail) !== m) continue;
      const r = f(avail & ~m);
      if (r.v < best.v) best = { v: r.v, groups: [m, ...r.groups] };
    }
    memo.set(avail, best);
    return best;
  };
  const full = (1 << n) - 1;
  const res = f(full);
  let used = 0;
  const groups = res.groups.map((m) => { used |= m; return hand.filter((_, i) => m & (1 << i)); });
  return { unmatched: res.v, groups, loose: hand.filter((_, i) => !(used & (1 << i))) };
}

export interface ChPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
export interface RoundRow { hand: SpanishCard[]; unmatched: number; delta: number; chinchon: boolean }

export interface ChState {
  players: ChPlayer[];
  hands: SpanishCard[][];
  stock: SpanishCard[];
  discard: SpanishCard[];
  scores: number[];
  out: boolean[];
  turn: number;
  dealer: number;
  phase: 'draw' | 'discard' | 'roundOver' | 'gameOver';
  /** Última carta robada por quien tiene el turno (para resaltarla). */
  drawn: string | null;
  closer: number | null;
  /** Descartes de la ronda: con 120 sin cierre se anula (tablas). */
  turns: number;
  rows: RoundRow[] | null;
  roundNo: number;
  winner: number | null;
  event: { seq: number; text: string } | null;
}

let seq = 0;
const say = (s: ChState, text: string): void => { s.event = { seq: ++seq, text }; };
const alive = (s: ChState, from: number): number => {
  for (let k = 1; k <= s.players.length; k++) { const i = (from + k) % s.players.length; if (!s.out[i]) return i; }
  return from;
};

function takeStock(s: ChState): SpanishCard {
  if (s.stock.length === 0) {
    const top = s.discard.pop()!;
    s.stock = shuffle(s.discard);
    s.discard = [top];
  }
  return s.stock.shift()!;
}

function dealRound(s: ChState): void {
  const deck = shuffle(spanishDeck());
  s.hands = s.players.map((_, i) => (s.out[i] ? [] : deck.splice(0, 7)));
  s.stock = deck;
  s.discard = [s.stock.shift()!];
  s.turn = alive(s, s.dealer);
  s.phase = 'draw';
  s.drawn = null;
  s.closer = null;
  s.turns = 0;
  s.rows = null;
}

export function newGame(players: ChPlayer[]): ChState {
  const s: ChState = {
    players, hands: [], stock: [], discard: [], scores: players.map(() => 0), out: players.map(() => false), turn: 0,
    dealer: players.length - 1, phase: 'draw', drawn: null, closer: null, turns: 0, rows: null, roundNo: 1, winner: null, event: null,
  };
  dealRound(s);
  return s;
}

export function nextRound(prev: ChState): ChState {
  const s = structuredClone(prev);
  s.dealer = alive(s, s.dealer);
  s.roundNo++;
  dealRound(s);
  return s;
}

export function drawFrom(prev: ChState, source: 'stock' | 'discard'): ChState | null {
  if (prev.phase !== 'draw') return null;
  const s = structuredClone(prev);
  const card = source === 'stock' ? takeStock(s) : s.discard.pop()!;
  s.hands[s.turn] = [...s.hands[s.turn]!, card];
  s.drawn = card.id;
  s.phase = 'discard';
  say(s, source === 'stock' ? 'Roba del mazo' : 'Roba el descarte');
  return s;
}

export function discardCard(prev: ChState, cardId: string): ChState | null {
  if (prev.phase !== 'discard') return null;
  const card = prev.hands[prev.turn]!.find((c) => c.id === cardId);
  if (!card) return null;
  const s = structuredClone(prev);
  s.hands[s.turn] = s.hands[s.turn]!.filter((c) => c.id !== cardId);
  s.discard.push(card);
  s.turn = alive(s, s.turn);
  s.phase = 'draw';
  s.drawn = null;
  if (++s.turns >= 120) { s.phase = 'roundOver'; s.rows = s.players.map((_, i) => ({ hand: s.hands[i]!, unmatched: s.out[i] ? 0 : arrange(s.hands[i]!).unmatched, delta: 0, chinchon: false })); say(s, 'Ronda anulada'); }
  return s;
}

/** Cierra la ronda descartando `cardId`: las 7 cartas restantes deben tener ≤ CLOSE_LIMIT puntos sueltos. */
export function canClose(s: ChState, cardId: string): boolean {
  if (s.phase !== 'discard') return false;
  const rest = s.hands[s.turn]!.filter((c) => c.id !== cardId);
  return rest.length === 7 && arrange(rest).unmatched <= CLOSE_LIMIT;
}

export function closeRound(prev: ChState, cardId: string): ChState | null {
  if (!canClose(prev, cardId)) return null;
  const s = structuredClone(prev);
  const closer = s.turn;
  const card = s.hands[closer]!.find((c) => c.id === cardId)!;
  s.hands[closer] = s.hands[closer]!.filter((c) => c.id !== cardId);
  s.discard.push(card);
  s.closer = closer;
  s.rows = s.players.map((_, i) => {
    if (s.out[i]) return { hand: [], unmatched: 0, delta: 0, chinchon: false };
    const arr = arrange(s.hands[i]!);
    const chinchon = isMeld(s.hands[i]!);
    let delta = arr.unmatched;
    if (i === closer) delta = chinchon ? CHINCHON_BONUS : CLOSE_BONUS;
    return { hand: s.hands[i]!, unmatched: arr.unmatched, delta, chinchon: i === closer && chinchon };
  });
  s.rows.forEach((r, i) => { s.scores[i] = s.scores[i]! + r.delta; if (s.scores[i]! >= OUT_AT) s.out[i] = true; });
  const left = s.players.map((_, i) => i).filter((i) => !s.out[i]);
  if (left.length <= 1 || s.out[0]) {
    s.phase = 'gameOver';
    s.winner = left.length === 1 ? left[0]! : s.scores.indexOf(Math.min(...s.scores));
  } else s.phase = 'roundOver';
  say(s, s.rows[closer]!.chinchon ? '¡CHINCHÓN!' : 'Cierra la ronda');
  return s;
}

export type ChMove = { type: 'draw'; source: 'stock' | 'discard' } | { type: 'discard'; cardId: string } | { type: 'close'; cardId: string };

/** IA: coge el descarte si mejora su mano; descarta la carta que deja menos puntos sueltos y cierra en cuanto puede. */
export function botMove(s: ChState): ChMove {
  const hand = s.hands[s.turn]!;
  if (s.phase === 'draw') {
    const cur = arrange(hand).unmatched;
    const top = s.discard[s.discard.length - 1]!;
    const withTop = [...hand, top];
    let bestAfter = Infinity;
    for (const c of withTop) if (c.id !== top.id) bestAfter = Math.min(bestAfter, arrange(withTop.filter((x) => x.id !== c.id)).unmatched);
    return { type: 'draw', source: bestAfter < cur - 1 ? 'discard' : 'stock' };
  }
  let bestId = hand[0]!.id;
  let bestU = Infinity;
  let bestPts = -1;
  for (const c of hand) {
    const u = arrange(hand.filter((x) => x.id !== c.id)).unmatched;
    const p = looseValue(c);
    if (u < bestU || (u === bestU && p > bestPts)) { bestU = u; bestPts = p; bestId = c.id; }
  }
  if (bestU <= 5 || (bestU <= CLOSE_LIMIT && Math.random() < 0.5)) return { type: 'close', cardId: bestId };
  return { type: 'discard', cardId: bestId };
}

export type ChAction = { k: 'draw'; source: 'stock' | 'discard' } | { k: 'discard'; cardId: string } | { k: 'close'; cardId: string } | { k: 'next' };
/** Reductor para partidas en sala (solo mueve quien tiene el turno). */
export function applyChAction(s: ChState, pid: string, a: ChAction): ChState | null {
  if (a.k === 'next') return s.phase === 'roundOver' ? nextRound(s) : null;
  if (s.players[s.turn]?.id !== pid) return null;
  switch (a.k) {
    case 'draw': return drawFrom(s, a.source);
    case 'discard': return discardCard(s, a.cardId);
    case 'close': return closeRound(s, a.cardId);
  }
}
