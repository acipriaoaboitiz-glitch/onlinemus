/**
 * Motor de barajas compartido. Los tipos de la baraja española son idénticos a `@mus/engine`
 * (ids "o7", "c12"…, mismos palos y rangos) para poder enchufar el motor de Mus sin adaptar nada.
 */

export type SpanishSuit = 'oros' | 'copas' | 'espadas' | 'bastos';
export type SpanishRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;
export type FrenchSuit = 'picas' | 'corazones' | 'treboles' | 'diamantes';
export type FrenchRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface SpanishCard {
  deck: 'es';
  id: string; // "o7", "c12"
  suit: SpanishSuit;
  rank: SpanishRank;
}
export interface FrenchCard {
  deck: 'fr';
  id: string; // "p1", "h13"
  suit: FrenchSuit;
  rank: FrenchRank;
}
export type AnyCard = SpanishCard | FrenchCard;

export const SPANISH_SUITS: readonly SpanishSuit[] = ['oros', 'copas', 'espadas', 'bastos'];
export const SPANISH_RANKS: readonly SpanishRank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const FRENCH_SUITS: readonly FrenchSuit[] = ['picas', 'corazones', 'treboles', 'diamantes'];
export const FRENCH_RANKS: readonly FrenchRank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];

const FR_INITIAL: Record<FrenchSuit, string> = { picas: 'p', corazones: 'h', treboles: 't', diamantes: 'd' };

export const spanishDeck = (): SpanishCard[] =>
  SPANISH_SUITS.flatMap((suit) =>
    SPANISH_RANKS.map((rank): SpanishCard => ({ deck: 'es', id: `${suit[0]}${rank}`, suit, rank })),
  );

export const frenchDeck = (): FrenchCard[] =>
  FRENCH_SUITS.flatMap((suit) =>
    FRENCH_RANKS.map((rank): FrenchCard => ({ deck: 'fr', id: `${FR_INITIAL[suit]}${rank}`, suit, rank })),
  );

/** Varios mazos mezclados (el blackjack usa 4–6). Los ids se hacen únicos con un sufijo. */
export const frenchShoe = (decks: number): FrenchCard[] =>
  Array.from({ length: decks }, (_, d) => frenchDeck().map((c) => ({ ...c, id: `${c.id}#${d}` }))).flat();

/** Fisher–Yates, sin mutar la entrada. */
export function shuffle<T>(items: readonly T[], rand: () => number = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export const SPANISH_RANK_NAMES: Record<SpanishRank, string> = {
  1: 'As', 2: 'Dos', 3: 'Tres', 4: 'Cuatro', 5: 'Cinco', 6: 'Seis', 7: 'Siete', 10: 'Sota', 11: 'Caballo', 12: 'Rey',
};
export const FRENCH_RANK_LABEL = (r: FrenchRank): string =>
  r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r);

export const SUIT_LABEL: Record<SpanishSuit | FrenchSuit, string> = {
  oros: 'oros', copas: 'copas', espadas: 'espadas', bastos: 'bastos',
  picas: 'picas', corazones: 'corazones', treboles: 'tréboles', diamantes: 'diamantes',
};

export const cardLabel = (c: AnyCard): string =>
  c.deck === 'es'
    ? `${SPANISH_RANK_NAMES[c.rank]} de ${SUIT_LABEL[c.suit]}`
    : `${FRENCH_RANK_LABEL(c.rank)} de ${SUIT_LABEL[c.suit]}`;

/** Archivo SVG de la baraja francesa (public/cards/french/): `ace_of_spades.svg`, `10_of_hearts.svg`, `king_of_clubs.svg`… */
const FR_SUIT_FILE: Record<FrenchSuit, string> = { picas: 'spades', corazones: 'hearts', treboles: 'clubs', diamantes: 'diamonds' };
export const frenchFileName = (c: FrenchCard): string => {
  const rank = c.rank === 1 ? 'ace' : c.rank === 11 ? 'jack' : c.rank === 12 ? 'queen' : c.rank === 13 ? 'king' : String(c.rank);
  return `${rank}_of_${FR_SUIT_FILE[c.suit]}.svg`;
};
/** Proporción de las cartas SVG francesas (ancho / alto). */
export const FRENCH_ASPECT = 167.0869141 / 242.6669922;
