import type { SpanishCard, SpanishRank, SpanishSuit } from '../../engine/deck.ts';
import { shuffle, spanishDeck } from '../../engine/deck.ts';

/**
 * Brisca (120 puntos). Puerto a TypeScript del motor aportado, con una diferencia: al echar la última
 * carta de la baza el estado queda en `trickDone` (la baza completa se ve en mesa) y `resolveTrick` la cierra.
 * Parejas en 4 jugadores: asientos 0+2 contra 1+3.
 */
export const BRISCA_POINTS: Record<SpanishRank, number> = { 1: 11, 3: 10, 12: 4, 11: 3, 10: 2, 7: 0, 6: 0, 5: 0, 4: 0, 2: 0 };
/** Fuerza: menor índice = carta más fuerte. */
export const BRISCA_POWER: readonly SpanishRank[] = [1, 3, 12, 11, 10, 7, 6, 5, 4, 2];

export const points = (c: SpanishCard): number => BRISCA_POINTS[c.rank];
export const power = (c: SpanishCard): number => BRISCA_POWER.indexOf(c.rank); // menor = más fuerte

export interface BPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
export interface Play { playerId: string; card: SpanishCard }

export interface BriscaState {
  players: BPlayer[];
  deck: SpanishCard[];
  trumpCard: SpanishCard;
  trumpSuit: SpanishSuit;
  hands: Record<string, SpanishCard[]>;
  wonCards: Record<string, SpanishCard[]>;
  currentTrick: Play[];
  turnIndex: number;
  phase: 'playing' | 'trickDone' | 'finished';
  lastTrickWinner: string | null;
}

export function initBriscaGame(players: BPlayer[]): BriscaState {
  const deck = shuffle(spanishDeck());
  const hands: Record<string, SpanishCard[]> = {};
  const wonCards: Record<string, SpanishCard[]> = {};
  for (const p of players) { hands[p.id] = deck.splice(0, 3); wonCards[p.id] = []; }
  // La pintada se muestra boca arriba y queda al fondo del mazo.
  const trumpCard = deck.shift()!;
  deck.push(trumpCard);
  return {
    players, deck, trumpCard, trumpSuit: trumpCard.suit, hands, wonCards,
    currentTrick: [], turnIndex: 0, phase: 'playing', lastTrickWinner: null,
  };
}

/** ¿Gana `chal` a la jugada ganadora actual `win`? */
function beats(chal: SpanishCard, win: SpanishCard, trump: SpanishSuit): boolean {
  const cT = chal.suit === trump;
  const wT = win.suit === trump;
  if (cT && !wT) return true;
  if (cT === wT && chal.suit === win.suit) return power(chal) < power(win);
  return false;
}

export function evaluateBriscaTrick(trick: Play[], trump: SpanishSuit): { winnerId: string; points: number } {
  let win = trick[0]!;
  for (let i = 1; i < trick.length; i++) if (beats(trick[i]!.card, win.card, trump)) win = trick[i]!;
  return { winnerId: win.playerId, points: trick.reduce((n, t) => n + points(t.card), 0) };
}

export function playBriscaCard(s: BriscaState, playerId: string, cardId: string): BriscaState {
  if (s.phase !== 'playing') return s;
  if (s.players[s.turnIndex]!.id !== playerId) return s;
  const hand = s.hands[playerId]!;
  const card = hand.find((c) => c.id === cardId);
  if (!card) return s;
  const hands = { ...s.hands, [playerId]: hand.filter((c) => c.id !== cardId) };
  const currentTrick = [...s.currentTrick, { playerId, card }];
  if (currentTrick.length < s.players.length) {
    return { ...s, hands, currentTrick, turnIndex: (s.turnIndex + 1) % s.players.length };
  }
  return { ...s, hands, currentTrick, phase: 'trickDone' };
}

/** Cierra la baza completa: reparte al ganador, roba empezando por él y decide si acaba la partida. */
export function resolveTrick(s: BriscaState): BriscaState {
  if (s.phase !== 'trickDone') return s;
  const n = s.players.length;
  const { winnerId } = evaluateBriscaTrick(s.currentTrick, s.trumpSuit);
  const winnerIdx = s.players.findIndex((p) => p.id === winnerId);
  const wonCards = { ...s.wonCards, [winnerId]: [...s.wonCards[winnerId]!, ...s.currentTrick.map((t) => t.card)] };
  const hands = { ...s.hands };
  const deck = s.deck.slice();
  if (deck.length >= n) {
    for (let i = 0; i < n; i++) {
      const id = s.players[(winnerIdx + i) % n]!.id;
      hands[id] = [...hands[id]!, deck.shift()!];
    }
  }
  const finished = Object.values(hands).every((h) => h.length === 0);
  return {
    ...s, deck, hands, wonCards, currentTrick: [], turnIndex: winnerIdx, lastTrickWinner: winnerId,
    phase: finished ? 'finished' : 'playing',
  };
}

export const teamOf = (s: BriscaState, playerId: string): number | null => {
  if (s.players.length !== 4) return null;
  return s.players.findIndex((p) => p.id === playerId) % 2;
};

const sumPoints = (cards: SpanishCard[]): number => cards.reduce((n, c) => n + points(c), 0);

export type BriscaScores =
  | { mode: 'teams'; teamA: { label: string; points: number }; teamB: { label: string; points: number } }
  | { mode: 'individual'; scores: { playerId: string; name: string; points: number }[] };

export function getBriscaScores(s: BriscaState): BriscaScores {
  if (s.players.length === 4) {
    const team = (a: number, b: number): number => sumPoints(s.wonCards[s.players[a]!.id]!) + sumPoints(s.wonCards[s.players[b]!.id]!);
    return { mode: 'teams', teamA: { label: 'Tu pareja', points: team(0, 2) }, teamB: { label: 'Rivales', points: team(1, 3) } };
  }
  return { mode: 'individual', scores: s.players.map((p) => ({ playerId: p.id, name: p.name, points: sumPoints(s.wonCards[p.id]!) })) };
}

/** Puntos de «mi lado» y del rival para decidir ganador (el humano es siempre el asiento 0). */
export function sides(s: BriscaState): { mine: number; theirs: number } { return sidesFor(s, 'p0'); }

/** Puntos de «mi lado» y del contrario desde el punto de vista del jugador `me`. */
export function sidesFor(s: BriscaState, me: string): { mine: number; theirs: number } {
  const sc = getBriscaScores(s);
  if (sc.mode === 'teams') return teamOf(s, me) === 0 ? { mine: sc.teamA.points, theirs: sc.teamB.points } : { mine: sc.teamB.points, theirs: sc.teamA.points };
  const mine = sc.scores.find((x) => x.playerId === me) ?? sc.scores[0]!;
  const other = sc.scores.find((x) => x.playerId !== mine.playerId)!;
  return { mine: mine.points, theirs: other.points };
}

export type BriscaAction = { k: 'play'; cardId: string };
/** Reductor para partidas en sala: devuelve null si la jugada no vale. */
export function applyBriscaAction(s: BriscaState, pid: string, a: BriscaAction): BriscaState | null {
  const next = playBriscaCard(s, pid, a.cardId);
  return next === s ? null : next;
}

// ─── IA ──────────────────────────────────────────────────────────────────────────────────
/** Valor de «gastar» una carta: los triunfos y las cartas de puntos cuestan más. */
const spendCost = (c: SpanishCard, trump: SpanishSuit): number => points(c) * 2 + (c.suit === trump ? 14 : 0) + (9 - power(c)) * 0.3;

export function botChoose(s: BriscaState, playerId: string): string {
  const hand = s.hands[playerId]!;
  const trump = s.trumpSuit;
  const byCheap = (a: SpanishCard, b: SpanishCard): number => spendCost(a, trump) - spendCost(b, trump);
  const trick = s.currentTrick;
  if (hand.length === 1) return hand[0]!.id;

  if (trick.length === 0) {
    // Sale: la carta más barata; si solo hay triunfos, el más bajo.
    return [...hand].sort(byCheap)[0]!.id;
  }

  const { winnerId, points: onTable } = evaluateBriscaTrick(trick, trump);
  let winPlay = trick[0]!;
  for (const t of trick) if (t.playerId === winnerId) winPlay = t;
  const me = s.players.findIndex((p) => p.id === playerId);
  const teams = s.players.length === 4;
  const sameTeam = (id: string): boolean => teams && s.players.findIndex((p) => p.id === id) % 2 === me % 2;
  const partnerWinning = sameTeam(winnerId);
  // Rivales que aún tienen que tirar tras de mí.
  const left = s.players.length - trick.length - 1;
  let opponentsAfter = 0;
  for (let k = 1; k <= left; k++) {
    const id = s.players[(me + k) % s.players.length]!.id;
    if (!sameTeam(id)) opponentsAfter++;
  }

  if (partnerWinning) {
    // Si nadie puede ya quitársela, cargar puntos; si no, tirar lo más barato.
    if (opponentsAfter === 0) return [...hand].sort((a, b) => points(b) - points(a) || byCheap(a, b))[0]!.id;
    return [...hand].sort(byCheap)[0]!.id;
  }

  const winners = hand.filter((c) => beats(c, winPlay.card, trump)).sort(byCheap);
  const worth = onTable >= 10 || (onTable >= 3 && winners[0] && winners[0].suit !== trump) || (onTable > 0 && winners[0] && points(winners[0]) < onTable);
  if (winners.length > 0 && worth) return winners[0]!.id;
  return [...hand].sort(byCheap)[0]!.id;
}
