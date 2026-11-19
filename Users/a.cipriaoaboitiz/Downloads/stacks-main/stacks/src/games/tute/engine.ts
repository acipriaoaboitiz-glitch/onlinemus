import type { SpanishCard, SpanishRank, SpanishSuit } from '../../engine/deck.ts';
import { shuffle, spanishDeck } from '../../engine/deck.ts';
import { BRISCA_POWER, points, power } from '../brisca/engine.ts';

/**
 * Tute para 2 jugadores o 4 (por parejas, 0+2 contra 1+3). Baraja de 40: 8 cartas cada uno y la última del mazo
 * es el triunfo. Hay que asistir al palo, «montar» (superar la carta que va ganando) y, si no tienes del palo,
 * «fallar» con triunfo. Valores y fuerza como la Brisca (120 puntos) y +10 por la última baza («diez de últimas»).
 * Tras ganar una baza puedes cantar «las 20» (Rey + Caballo del mismo palo) o «las 40» (en el palo de triunfo).
 * Cuatro reyes o cuatro caballos en la mano son «Tute» y ganan la partida.
 */
export interface TPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
export interface TPlay { playerId: string; card: SpanishCard }

export interface TuteState {
  players: TPlayer[];
  deck: SpanishCard[];
  trumpCard: SpanishCard;
  trumpSuit: SpanishSuit;
  hands: Record<string, SpanishCard[]>;
  won: Record<string, SpanishCard[]>;
  trick: TPlay[];
  turn: number;
  phase: 'playing' | 'trickDone' | 'finished';
  lastWinner: string | null;
  /** Bazas ganadas por equipo. */
  tricks: number[];
  /** Puntos de cantes por equipo. */
  cantes: number[];
  sung: Partial<Record<SpanishSuit, boolean>>;
  tuteTeam: number | null;
  event: { seq: number; text: string; by: string } | null;
}

export const teamOf = (s: TuteState, i: number): number => (s.players.length === 4 ? i % 2 : i);
const idx = (s: TuteState, id: string): number => s.players.findIndex((p) => p.id === id);
let seq = 0;
const say = (s: TuteState, by: string, text: string): void => { s.event = { seq: ++seq, text, by }; };

export function newTute(players: TPlayer[]): TuteState {
  const deck = shuffle(spanishDeck());
  const hands: Record<string, SpanishCard[]> = {};
  const won: Record<string, SpanishCard[]> = {};
  for (const p of players) { hands[p.id] = deck.splice(0, 8); won[p.id] = []; }
  const trumpCard = deck.shift()!;
  deck.push(trumpCard); // la muestra se roba la última
  const teams = players.length === 4 ? 2 : players.length;
  return {
    players, deck, trumpCard, trumpSuit: trumpCard.suit, hands, won, trick: [], turn: 0, phase: 'playing', lastWinner: null,
    tricks: Array.from({ length: teams }, () => 0), cantes: Array.from({ length: teams }, () => 0), sung: {}, tuteTeam: null, event: null,
  };
}

/** ¿`a` gana a `b` (la jugada que va ganando)? */
function beats(a: SpanishCard, b: SpanishCard, trump: SpanishSuit): boolean {
  const aT = a.suit === trump, bT = b.suit === trump;
  if (aT && !bT) return true;
  if (aT === bT && a.suit === b.suit) return power(a) < power(b);
  return false;
}

function winning(trick: TPlay[], trump: SpanishSuit): TPlay {
  let w = trick[0]!;
  for (const t of trick.slice(1)) if (beats(t.card, w.card, trump)) w = t;
  return w;
}

/** Cartas que puedes jugar: asistir, montar o fallar. */
export function legalCards(s: TuteState, pid: string): SpanishCard[] {
  const hand = s.hands[pid]!;
  if (s.trick.length === 0) return hand;
  const lead = s.trick[0]!.card.suit;
  const cur = winning(s.trick, s.trumpSuit);
  const sameSuit = hand.filter((c) => c.suit === lead);
  if (sameSuit.length > 0) {
    if (cur.card.suit === lead) {
      const over = sameSuit.filter((c) => beats(c, cur.card, s.trumpSuit));
      return over.length > 0 ? over : sameSuit;
    }
    return sameSuit; // ya está fallada: no se puede montar con el palo de salida
  }
  const trumps = hand.filter((c) => c.suit === s.trumpSuit);
  if (trumps.length > 0 && lead !== s.trumpSuit) {
    if (cur.card.suit === s.trumpSuit) {
      const over = trumps.filter((c) => beats(c, cur.card, s.trumpSuit));
      return over.length > 0 ? over : trumps;
    }
    return trumps;
  }
  return hand;
}

export function playTute(prev: TuteState, pid: string, cardId: string): TuteState | null {
  if (prev.phase !== 'playing' || prev.players[prev.turn]!.id !== pid) return null;
  const card = legalCards(prev, pid).find((c) => c.id === cardId);
  if (!card) return null;
  const s = structuredClone(prev);
  s.hands[pid] = s.hands[pid]!.filter((c) => c.id !== cardId);
  s.trick.push({ playerId: pid, card });
  if (s.trick.length < s.players.length) s.turn = (s.turn + 1) % s.players.length;
  else s.phase = 'trickDone';
  return s;
}

export function resolveTute(prev: TuteState): TuteState {
  if (prev.phase !== 'trickDone') return prev;
  const s = structuredClone(prev);
  const n = s.players.length;
  const w = winning(s.trick, s.trumpSuit);
  const wi = idx(s, w.playerId);
  s.won[w.playerId] = [...s.won[w.playerId]!, ...s.trick.map((t) => t.card)];
  s.tricks[teamOf(s, wi)]!++;
  if (s.deck.length >= n) for (let k = 0; k < n; k++) { const id = s.players[(wi + k) % n]!.id; s.hands[id] = [...s.hands[id]!, s.deck.shift()!]; }
  s.trick = [];
  s.turn = wi;
  s.lastWinner = w.playerId;
  if (Object.values(s.hands).every((h) => h.length === 0)) { s.phase = 'finished'; say(s, w.playerId, '10 de últimas'); } else s.phase = 'playing';
  return s;
}

/** Palos que puedes cantar ahora (solo al abrir baza, tras haber ganado alguna con tu equipo). */
export function singable(s: TuteState, pid: string): SpanishSuit[] {
  const i = idx(s, pid);
  if (s.phase !== 'playing' || s.trick.length > 0 || s.turn !== i || (s.tricks[teamOf(s, i)] ?? 0) === 0) return [];
  const hand = s.hands[pid]!;
  const suits = (['oros', 'copas', 'espadas', 'bastos'] as SpanishSuit[]).filter((su) => !s.sung[su] && hand.some((c) => c.suit === su && c.rank === 12) && hand.some((c) => c.suit === su && c.rank === 11));
  return suits.sort((a, b) => (a === s.trumpSuit ? -1 : 0) - (b === s.trumpSuit ? -1 : 0));
}

export function sing(prev: TuteState, pid: string, suit: SpanishSuit): TuteState | null {
  if (!singable(prev, pid).includes(suit)) return null;
  const s = structuredClone(prev);
  const pts = suit === s.trumpSuit ? 40 : 20;
  s.cantes[teamOf(s, idx(s, pid))]! += pts;
  s.sung[suit] = true;
  say(s, pid, pts === 40 ? 'Canta las 40' : 'Canta las 20');
  return s;
}

export const hasTute = (s: TuteState, pid: string): boolean => {
  const h = s.hands[pid]!;
  const count = (r: SpanishRank): number => h.filter((c) => c.rank === r).length;
  return s.phase === 'playing' && s.trick.length === 0 && s.players[s.turn]!.id === pid && (count(12) === 4 || count(11) === 4);
};

export function declareTute(prev: TuteState, pid: string): TuteState | null {
  if (!hasTute(prev, pid)) return null;
  const s = structuredClone(prev);
  s.tuteTeam = teamOf(s, idx(s, pid));
  s.phase = 'finished';
  say(s, pid, '¡TUTE!');
  return s;
}

/** Puntos de cada equipo: cartas ganadas + cantes + 10 de últimas. */
export function teamPoints(s: TuteState): number[] {
  const pts = s.tricks.map((_, t) => s.players.reduce((n, p, i) => (teamOf(s, i) === t ? n + s.won[p.id]!.reduce((a, c) => a + points(c), 0) : n), 0));
  if (s.phase === 'finished' && s.tuteTeam === null && s.lastWinner) pts[teamOf(s, idx(s, s.lastWinner))]! += 10;
  return pts.map((p, t) => p + s.cantes[t]!);
}

export function winnerTeam(s: TuteState): number | null {
  if (s.tuteTeam !== null) return s.tuteTeam;
  const pts = teamPoints(s);
  const max = Math.max(...pts);
  return pts.filter((p) => p === max).length === 1 ? pts.indexOf(max) : null;
}

const spend = (c: SpanishCard, trump: SpanishSuit): number => points(c) * 2 + (c.suit === trump ? 14 : 0) + (BRISCA_POWER.length - 1 - power(c)) * 0.3;

export function botTute(s: TuteState, pid: string): string {
  const legal = legalCards(s, pid);
  const trump = s.trumpSuit;
  const cheap = (a: SpanishCard, b: SpanishCard): number => spend(a, trump) - spend(b, trump);
  if (s.trick.length === 0) return [...legal].sort(cheap)[0]!.id;
  const me = idx(s, pid);
  const w = winning(s.trick, trump);
  const partnerWinning = s.players.length === 4 && idx(s, w.playerId) % 2 === me % 2;
  let opponentsAfter = 0;
  for (let k = 1; k <= s.players.length - s.trick.length - 1; k++) if (s.players.length !== 4 || (me + k) % 2 !== me % 2) opponentsAfter++;
  if (partnerWinning) return opponentsAfter === 0 ? [...legal].sort((a, b) => points(b) - points(a) || cheap(a, b))[0]!.id : [...legal].sort(cheap)[0]!.id;
  const onTable = s.trick.reduce((n, t) => n + points(t.card), 0);
  const winners = legal.filter((c) => beats(c, w.card, trump)).sort(cheap);
  if (winners.length > 0 && (onTable >= 8 || points(winners[0]!) < onTable || (onTable > 0 && winners[0]!.suit !== trump))) return winners[0]!.id;
  return [...legal].sort(cheap)[0]!.id;
}

export type TuteAction = { k: 'play'; cardId: string } | { k: 'sing'; suit: SpanishSuit } | { k: 'tute' };
/** Reductor para partidas en sala: devuelve null si la acción no vale. */
export function applyTuteAction(s: TuteState, pid: string, a: TuteAction): TuteState | null {
  switch (a.k) {
    case 'play': return playTute(s, pid, a.cardId);
    case 'sing': return sing(s, pid, a.suit);
    case 'tute': return declareTute(s, pid);
  }
}
