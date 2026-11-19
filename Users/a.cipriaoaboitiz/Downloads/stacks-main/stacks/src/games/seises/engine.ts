import type { SpanishCard, SpanishRank, SpanishSuit } from '../../engine/deck.ts';
import { SPANISH_SUITS, shuffle, spanishDeck } from '../../engine/deck.ts';

/**
 * Los Seises («Escaleras al corte por palos»): baraja española de 40 cartas repartida entre 2–4 jugadores.
 * Abre quien tiene el 6 de oros. En su turno se coloca un 6 (abre un palo) o la carta inmediatamente superior
 * o inferior de un palo ya abierto; si no hay jugada, se pasa. Quien se queda sin cartas gana la ronda (−10);
 * los demás suman las cartas que les quedan. Al llegar alguien a 150 puntos acaba la partida y gana quien menos tenga.
 */
export const SEISES_LIMIT = 150;
export const WIN_ROUND = -10;
/** Escalera de cada palo, de abajo (As) a arriba (Rey). No hay 8 ni 9: tras el 7 va la Sota. */
export const LADDER: readonly SpanishRank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const SIX_INDEX = LADDER.indexOf(6);
export const OPENER = 'o6';
export const cardValue = (c: SpanishCard): number => c.rank;
export const ladderIndex = (c: SpanishCard): number => LADDER.indexOf(c.rank);

export interface SPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
/** Tramo ya colocado de un palo (índices de LADDER), o null si el palo aún no está abierto. */
export type Lane = { lo: number; hi: number } | null;
export interface RoundLine { hand: SpanishCard[]; points: number; delta: number }
export interface SeisesEvent { seq: number; by: number; text: string; kind: 'info' | 'pass' | 'out' }

export interface SeisesState {
  players: SPlayer[];
  hands: SpanishCard[][];
  board: Record<SpanishSuit, Lane>;
  turn: number;
  scores: number[];
  phase: 'playing' | 'roundOver' | 'gameOver';
  roundNo: number;
  /** Última carta colocada (para animar y avisar). */
  last: { by: number; card: SpanishCard } | null;
  /** Desglose de la ronda terminada. */
  lines: RoundLine[] | null;
  roundWinner: number | null;
  /** Ganador de la partida (el que menos puntos tiene al acabar). */
  winner: number | null;
  event: SeisesEvent | null;
}

let seq = 0;
const say = (s: SeisesState, by: number, text: string, kind: SeisesEvent['kind'] = 'info'): void => { s.event = { seq: ++seq, by, text, kind }; };
const emptyBoard = (): Record<SpanishSuit, Lane> => ({ oros: null, copas: null, espadas: null, bastos: null });

function deal(s: SeisesState): void {
  const deck = shuffle(spanishDeck());
  const n = s.players.length;
  s.hands = s.players.map(() => []);
  deck.forEach((c, i) => s.hands[i % n]!.push(c));
  s.hands = s.hands.map((h) => [...h].sort((a, b) => SPANISH_SUITS.indexOf(a.suit) - SPANISH_SUITS.indexOf(b.suit) || ladderIndex(a) - ladderIndex(b)));
  s.board = emptyBoard();
  s.turn = Math.max(0, s.hands.findIndex((h) => h.some((c) => c.id === OPENER)));
  s.phase = 'playing';
  s.last = null;
  s.lines = null;
  s.roundWinner = null;
}

export function newSeises(players: SPlayer[]): SeisesState {
  const s: SeisesState = {
    players, hands: [], board: emptyBoard(), turn: 0, scores: players.map(() => 0), phase: 'playing', roundNo: 1,
    last: null, lines: null, roundWinner: null, winner: null, event: null,
  };
  deal(s);
  return s;
}

export function nextRound(prev: SeisesState): SeisesState | null {
  if (prev.phase !== 'roundOver') return null;
  const s = structuredClone(prev);
  s.roundNo++;
  deal(s);
  return s;
}

/** ¿Se puede colocar esta carta ahora mismo? */
export function isPlayable(s: SeisesState, card: SpanishCard): boolean {
  if (s.phase !== 'playing') return false;
  if (s.board.oros === null) return card.id === OPENER; // apertura obligatoria
  const lane = s.board[card.suit];
  const idx = ladderIndex(card);
  if (lane === null) return card.rank === 6; // cualquier otro 6 abre su palo
  return idx === lane.lo - 1 || idx === lane.hi + 1;
}

export const playable = (s: SeisesState, seat: number): SpanishCard[] => s.hands[seat]!.filter((c) => isPlayable(s, c));
/** Solo se puede pasar si de verdad no hay jugada. */
export const canPass = (s: SeisesState, seat: number): boolean => s.phase === 'playing' && s.turn === seat && playable(s, seat).length === 0;

function endRound(s: SeisesState, winner: number): void {
  s.roundWinner = winner;
  s.lines = s.hands.map((h, i) => {
    const points = h.reduce((n, c) => n + cardValue(c), 0);
    const delta = i === winner ? WIN_ROUND : points;
    return { hand: h, points, delta };
  });
  s.lines.forEach((l, i) => { s.scores[i] = s.scores[i]! + l.delta; });
  if (s.scores.some((v) => v >= SEISES_LIMIT)) {
    s.phase = 'gameOver';
    s.winner = s.scores.indexOf(Math.min(...s.scores));
  } else s.phase = 'roundOver';
  say(s, winner, `${s.players[winner]!.name} se queda sin cartas`, 'out');
}

export function playCard(prev: SeisesState, seat: number, cardId: string): SeisesState | null {
  if (prev.phase !== 'playing' || prev.turn !== seat) return null;
  const card = prev.hands[seat]!.find((c) => c.id === cardId);
  if (!card || !isPlayable(prev, card)) return null;
  const s = structuredClone(prev);
  s.hands[seat] = s.hands[seat]!.filter((c) => c.id !== cardId);
  const idx = ladderIndex(card);
  const lane = s.board[card.suit];
  s.board[card.suit] = lane === null ? { lo: idx, hi: idx } : { lo: Math.min(lane.lo, idx), hi: Math.max(lane.hi, idx) };
  s.last = { by: seat, card };
  if (s.hands[seat]!.length === 0) { endRound(s, seat); return s; }
  s.turn = (seat + 1) % s.players.length;
  return s;
}

export function passTurn(prev: SeisesState, seat: number): SeisesState | null {
  if (!canPass(prev, seat)) return null;
  const s = structuredClone(prev);
  say(s, seat, 'Pasa', 'pass');
  s.turn = (seat + 1) % s.players.length;
  return s;
}

export type SeisesAction = { k: 'play'; cardId: string } | { k: 'pass' } | { k: 'next' };
/** Reductor para local y salas: `pid` es el id del jugador que envía la acción. */
export function applySeisesAction(s: SeisesState, pid: string, a: SeisesAction): SeisesState | null {
  if (a.k === 'next') return nextRound(s);
  const seat = s.players.findIndex((p) => p.id === pid);
  if (seat < 0) return null;
  return a.k === 'play' ? playCard(s, seat, a.cardId) : passTurn(s, seat);
}

export type BotMove = { type: 'play'; cardId: string } | { type: 'pass' };
/** IA: se deshace primero de las cartas que más puntos restan y guarda los 6 para abrir palos cuando le conviene. */
export function botMove(s: SeisesState): BotMove {
  const opts = playable(s, s.turn);
  if (opts.length === 0) return { type: 'pass' };
  const hand = s.hands[s.turn]!;
  const score = (c: SpanishCard): number => {
    if (c.id === OPENER) return 100;
    const lane = s.board[c.suit];
    // Una carta que deja jugar a la siguiente de la misma mano vale más (encadena jugadas).
    const next = ladderIndex(c) >= (lane?.hi ?? SIX_INDEX) ? ladderIndex(c) + 1 : ladderIndex(c) - 1;
    const chain = hand.some((h) => h.suit === c.suit && ladderIndex(h) === next) ? 3 : 0;
    return cardValue(c) + chain + (c.rank === 6 ? -4 : 0) + Math.random() * 0.5;
  };
  return { type: 'play', cardId: [...opts].sort((a, b) => score(b) - score(a))[0]!.id };
}
