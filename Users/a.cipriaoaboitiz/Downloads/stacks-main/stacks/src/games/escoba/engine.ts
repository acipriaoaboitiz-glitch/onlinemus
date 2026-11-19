import type { SpanishCard } from '../../engine/deck.ts';
import { shuffle, spanishDeck } from '../../engine/deck.ts';

/**
 * Escoba de 15 para 2, 3 o 4 jugadores. Valores: 1–7 su número, Sota 8, Caballo 9, Rey 10.
 * Se reparten 3 cartas a cada uno y 4 a la mesa; se vuelve a repartir de 3 en 3 hasta agotar el mazo
 * (40 − 4 = 36 cartas: divisible entre 2, 3 y 4 jugadores). Capturar es obligatorio si se puede.
 * Limpiar la mesa = escoba (+1), salvo en la última jugada de la ronda. El último que captura se lleva lo que quede.
 * Puntos de ronda: más cartas, más oros, más sietes, el 7 de oros (el velo) y las escobas.
 */
export const TARGET_SCORE = 15;

export const escobaValue = (c: SpanishCard): number => (c.rank >= 10 ? c.rank - 2 : c.rank);

export interface PlayEvent {
  by: number;
  card: SpanishCard;
  taken: SpanishCard[];
  escoba: boolean;
}

export interface ScoreLine { label: string; points: number[]; /** Clave del concepto (cartas, oros, setenta, sevenGolds, sweeps) para traducirlo. */ key?: string; /** Detalle, p. ej. «12–8». */ detail?: string }

export interface EscobaState {
  n: number;
  deck: SpanishCard[];
  table: SpanishCard[];
  hands: SpanishCard[][];
  captured: SpanishCard[][];
  escobas: number[];
  /** Puntos acumulados de la partida, por jugador. */
  scores: number[];
  turn: number;
  dealer: number;
  lastCapturer: number | null;
  phase: 'playing' | 'roundOver' | 'matchOver';
  lastPlay: PlayEvent | null;
  /** Desglose de la última ronda (solo en roundOver / matchOver). */
  summary: ScoreLine[] | null;
  roundNo: number;
  /** Formato «al mejor de 3 rondas»: gana la partida quien gane 2 rondas (la ronda la gana quien más puntos sume en ella). */
  bo3?: boolean;
  /** Rondas ganadas por jugador (solo con `bo3`). */
  roundWins?: number[];
  /** Jugadores de la mesa (índice = asiento en la partida). Los rellena la mesa. */
  players?: { id: string; name: string; human: boolean; peerId?: string }[];
}

const zeros = (n: number): number[] => Array.from({ length: n }, () => 0);

export function newRound(n: number, dealer: number, scores: number[], roundNo: number, bo3 = false, roundWins?: number[]): EscobaState {
  const deck = shuffle(spanishDeck());
  const hands = Array.from({ length: n }, () => deck.splice(0, 3));
  const table = deck.splice(0, 4);
  return {
    n, deck, table, hands, captured: Array.from({ length: n }, () => []), escobas: zeros(n), scores,
    turn: (dealer + 1) % n, dealer, lastCapturer: null, phase: 'playing', lastPlay: null, summary: null, roundNo,
    ...(bo3 ? { bo3: true, roundWins: roundWins ?? zeros(n) } : {}),
  };
}

export const newMatch = (n: number, bo3 = false): EscobaState => newRound(n, n - 1, zeros(n), 1, bo3);

/** Todos los subconjuntos de la mesa (por índice) que sumados a la carta jugada dan 15. */
export function findCaptures(table: readonly SpanishCard[], card: SpanishCard): number[][] {
  const need = 15 - escobaValue(card);
  const out: number[][] = [];
  const n = table.length;
  for (let mask = 1; mask < 1 << n; mask++) {
    let sum = 0;
    for (let i = 0; i < n && sum <= need; i++) if (mask & (1 << i)) sum += escobaValue(table[i]!);
    if (sum === need) out.push(Array.from({ length: n }, (_, i) => i).filter((i) => mask & (1 << i)));
  }
  return out;
}

export const isValidCapture = (table: readonly SpanishCard[], card: SpanishCard, idx: readonly number[]): boolean =>
  idx.length > 0 && idx.reduce((s, i) => s + escobaValue(table[i]!), escobaValue(card)) === 15;

/**
 * Juega `cardId` (de la mano de quien tiene el turno). `take` = índices de la mesa a capturar
 * (vacío = tirar a la mesa; solo válido si no existe ninguna captura). Devuelve null si la jugada es ilegal.
 */
export function play(s: EscobaState, cardId: string, take: readonly number[]): EscobaState | null {
  if (s.phase !== 'playing') return null;
  const me = s.turn;
  const card = s.hands[me]!.find((c) => c.id === cardId);
  if (!card) return null;
  const possible = findCaptures(s.table, card);
  if (take.length === 0 ? possible.length > 0 : !isValidCapture(s.table, card, take)) return null;

  const hands = s.hands.map((h, i) => (i === me ? h.filter((c) => c.id !== cardId) : h.slice()));
  const taken = take.map((i) => s.table[i]!);
  const table = take.length === 0 ? [...s.table, card] : s.table.filter((_, i) => !take.includes(i));
  const captured = s.captured.map((c) => c.slice());
  const escobas = s.escobas.slice();
  let lastCapturer = s.lastCapturer;

  const roundFinishing = s.deck.length === 0 && hands.every((h) => h.length === 0);
  let escoba = false;
  if (take.length > 0) {
    captured[me] = [...captured[me]!, card, ...taken];
    lastCapturer = me;
    if (table.length === 0 && !roundFinishing) { escoba = true; escobas[me]!++; }
  }
  const lastPlay: PlayEvent = { by: me, card, taken, escoba };
  let next: EscobaState = { ...s, hands, table, captured, escobas, lastCapturer, lastPlay, turn: (me + 1) % s.n };

  if (hands.every((h) => h.length === 0)) {
    if (s.deck.length > 0) {
      const deck = s.deck.slice();
      next = { ...next, hands: Array.from({ length: s.n }, () => deck.splice(0, 3)), deck };
    } else {
      next = finishRound(next);
    }
  }
  return next;
}

const count = (cards: readonly SpanishCard[], f: (c: SpanishCard) => boolean): number => cards.filter(f).length;
const PRIMERA: Record<number, number> = { 7: 21, 6: 18, 1: 16, 5: 15, 4: 14, 3: 13, 2: 12, 10: 10, 11: 10, 12: 10 };
/** Valor de «setenta»: suma de la mejor carta de cada palo (0 si falta algún palo). */
function seventy(cards: readonly SpanishCard[]): number {
  const best: Record<string, number> = {};
  for (const c of cards) best[c.suit] = Math.max(best[c.suit] ?? 0, PRIMERA[c.rank] ?? 0);
  const suits = Object.keys(best);
  return suits.length === 4 ? suits.reduce((n, k) => n + best[k]!, 0) : 0;
}

function finishRound(s: EscobaState): EscobaState {
  const captured = s.captured.map((c) => c.slice());
  if (s.table.length > 0 && s.lastCapturer !== null) captured[s.lastCapturer] = [...captured[s.lastCapturer]!, ...s.table];

  const lines: ScoreLine[] = [];
  /** Un punto para quien tiene estrictamente más; los empates no puntúan. */
  const majority = (key: string, label: string, vals: number[]): void => {
    const max = Math.max(...vals);
    const leaders = vals.filter((v) => v === max).length;
    lines.push({ key, label, detail: vals.join('–'), points: vals.map((v) => (v === max && leaders === 1 ? 1 : 0)) });
  };
  majority('cards', 'Cartas', captured.map((c) => c.length));
  majority('golds', 'Oros', captured.map((c) => count(c, (x) => x.suit === 'oros')));
  // Setenta (primera): mejor carta de cada palo con 7 = 21, 6 = 18, As = 16, 5 = 15, 4 = 14, 3 = 13, 2 = 12 y figuras = 10; hacen falta los 4 palos.
  majority('seventy', 'Setenta', captured.map((c) => seventy(c)));
  lines.push({ key: 'sevenGolds', label: 'Siete de oros', points: captured.map((c) => (c.some((x) => x.suit === 'oros' && x.rank === 7) ? 1 : 0)) });
  lines.push({ key: 'sweeps', label: 'Escobas', points: s.escobas.slice() });

  const roundPts = s.scores.map((_, i) => lines.reduce((n, l) => n + l.points[i]!, 0));
  const scores = s.scores.map((sc, i) => sc + roundPts[i]!);
  if (s.bo3) {
    // Al mejor de 3: la ronda la gana quien más puntos sume en ella (los empates no cuentan); 2 rondas ganadas = partida.
    const top = Math.max(...roundPts);
    const winners = roundPts.map((v, i) => (v === top ? i : -1)).filter((i) => i >= 0);
    const roundWins = (s.roundWins ?? s.scores.map(() => 0)).slice();
    if (winners.length === 1) roundWins[winners[0]!]!++;
    const over = Math.max(...roundWins) >= 2;
    return { ...s, captured, table: [], scores, roundWins, summary: lines, phase: over ? 'matchOver' : 'roundOver' };
  }
  const max = Math.max(...scores);
  const over = max >= TARGET_SCORE && scores.filter((v) => v === max).length === 1;
  return { ...s, captured, table: [], scores, summary: lines, phase: over ? 'matchOver' : 'roundOver' };
}

export const nextRound = (s: EscobaState): EscobaState => ({ ...newRound(s.n, (s.dealer + 1) % s.n, s.scores, s.roundNo + 1, s.bo3, s.roundWins), players: s.players });

export type EscobaAction = { k: 'play'; cardId: string; take: number[] } | { k: 'next' };
/** Reductor para partidas en sala (solo mueve quien tiene el turno). */
export function applyEscobaAction(s: EscobaState, pid: string, a: EscobaAction): EscobaState | null {
  if (a.k === 'next') return s.phase === 'roundOver' ? nextRound(s) : null;
  if (s.players && s.players[s.turn]?.id !== pid) return null;
  return play(s, a.cardId, a.take);
}

export interface Move { cardId: string; take: number[] }

/** Todas las jugadas legales del jugador con el turno. */
export function legalMoves(s: EscobaState): Move[] {
  const moves: Move[] = [];
  for (const c of s.hands[s.turn]!) {
    const caps = findCaptures(s.table, c);
    if (caps.length === 0) moves.push({ cardId: c.id, take: [] });
    else for (const take of caps) moves.push({ cardId: c.id, take });
  }
  return moves;
}

/** Bot: valora captura (escoba, 7 de oros, sietes, oros, cartas) y castiga dejar mesas fáciles de barrer. */
export function botMove(s: EscobaState): Move {
  const moves = legalMoves(s);
  let best = moves[0]!;
  let bestScore = -Infinity;
  for (const m of moves) {
    const card = s.hands[s.turn]!.find((c) => c.id === m.cardId)!;
    const taken = m.take.map((i) => s.table[i]!);
    const remaining = s.table.filter((_, i) => !m.take.includes(i));
    const remainingSum = remaining.reduce((n, c) => n + escobaValue(c), 0);
    const gained = m.take.length > 0 ? [card, ...taken] : [];
    let score = 0;
    if (m.take.length > 0) {
      score += gained.length * 1.2;
      score += count(gained, (c) => c.suit === 'oros') * 1.5;
      score += count(gained, (c) => c.rank === 7) * 2;
      if (gained.some((c) => c.suit === 'oros' && c.rank === 7)) score += 6;
      if (remaining.length === 0) score += 10;
    } else {
      score -= escobaValue(card) * 0.25;
      if (card.suit === 'oros') score -= 2;
      if (card.rank === 7) score -= 3;
      if (card.suit === 'oros' && card.rank === 7) score -= 12;
    }
    // Mesa que el rival barre con facilidad (suma 5–14 con carta de 1–10).
    if (remaining.length > 0 && remainingSum >= 5 && remainingSum <= 14) score -= 1.5;
    score += Math.random() * 0.01;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}
