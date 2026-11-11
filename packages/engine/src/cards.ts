import type { Card, Rank, Suit } from './types.ts';

export const SUITS: readonly Suit[] = ['oros', 'copas', 'espadas', 'bastos'];
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const SUIT_BY_INITIAL: Record<string, Suit> = { o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' };

export const cardId = (suit: Suit, rank: Rank): string => `${suit[0]}${rank}`;

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ id: cardId(suit, rank), suit, rank });
  return deck;
}

/** "o7" → 7 de oros. Útil para tests y fixtures. */
export function cardFromId(id: string): Card {
  const suit = SUIT_BY_INITIAL[id[0]];
  const rank = Number(id.slice(1)) as Rank;
  if (!suit || !RANKS.includes(rank)) throw new Error(`Carta inválida: ${id}`);
  return { id, suit, rank };
}

/**
 * PRNG mulberry32 con el estado fuera de la función: el estado cabe en la partida (jsonb),
 * así cada reparto es reproducible desde la semilla y se puede repetir una partida entera.
 * En el servidor la semilla inicial sale de crypto.getRandomValues.
 */
export function nextRandom(state: number): { value: number; state: number } {
  const a = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(a ^ (a >>> 15), a | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a };
}

/** Fisher-Yates con el PRNG anterior. Devuelve el mazo mezclado y el nuevo estado del PRNG. */
export function shuffle<T>(items: readonly T[], rngState: number): { items: T[]; rng: number } {
  const out = items.slice();
  let rng = rngState;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextRandom(rng);
    rng = r.state;
    const j = Math.floor(r.value * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return { items: out, rng };
}
