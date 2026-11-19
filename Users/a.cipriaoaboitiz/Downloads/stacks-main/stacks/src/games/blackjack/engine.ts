import type { FrenchCard } from '../../engine/deck.ts';
import { frenchShoe, shuffle } from '../../engine/deck.ts';

/** Baraja inglesa de 52 cartas: J, Q y K valen 10 y el As 1 u 11. */
export type BJCard = FrenchCard;

/**
 * Reglas: 4 mazos · el crupier se planta en TODOS los 17 (S17) · blackjack paga 3:2 ·
 * doblar solo con las dos primeras cartas · dividir cartas del mismo valor (máx. 4 manos) ·
 * tras dividir ases solo se recibe una carta por mano · 21 tras dividir no es blackjack.
 */
export const DECKS = 4;
export const MAX_HANDS = 4;
export const RESHUFFLE_BELOW = 52;

export type Outcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust';

export interface Hand {
  cards: BJCard[];
  bet: number;
  doubled: boolean;
  done: boolean;
  fromSplit: boolean;
  outcome?: Outcome;
  /** Fichas devueltas al jugador por esta mano (apuesta incluida). */
  payout?: number;
}

export interface BJState {
  shoe: BJCard[];
  dealer: BJCard[];
  hands: Hand[];
  active: number;
  phase: 'player' | 'dealer' | 'settled';
  holeHidden: boolean;
}

export const cardPoints = (c: BJCard): number => (c.rank === 1 ? 11 : c.rank >= 10 ? 10 : c.rank);

/** Total óptimo: los ases cuentan 11 mientras no te pases (blando) y 1 si hace falta (duro). */
export function handValue(cards: readonly BJCard[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += cardPoints(c);
    if (c.rank === 1) aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

export const isNatural = (h: Hand): boolean => !h.fromSplit && h.cards.length === 2 && handValue(h.cards).total === 21;
export const isBust = (cards: readonly BJCard[]): boolean => handValue(cards).total > 21;

function draw(shoe: BJCard[]): [BJCard, BJCard[]] {
  const pool = shoe.length > 0 ? shoe : newShoe();
  return [pool[0]!, pool.slice(1)];
}

/** Zapato de 4 barajas inglesas (208 cartas), mezclado. */
export function newShoe(): BJCard[] {
  return shuffle(frenchShoe(DECKS));
}

/** Reparte: jugador, crupier (visible), jugador, crupier (oculta). Resuelve naturales al instante. */
export function deal(shoeIn: BJCard[], bet: number): BJState {
  let shoe = shoeIn.length < RESHUFFLE_BELOW ? newShoe() : shoeIn;
  let p1: BJCard, p2: BJCard, d1: BJCard, d2: BJCard;
  [p1, shoe] = draw(shoe); [d1, shoe] = draw(shoe); [p2, shoe] = draw(shoe); [d2, shoe] = draw(shoe);
  const state: BJState = {
    shoe, dealer: [d1, d2], holeHidden: true, active: 0, phase: 'player',
    hands: [{ cards: [p1, p2], bet, doubled: false, done: false, fromSplit: false }],
  };
  const dealerBJ = handValue(state.dealer).total === 21;
  if (dealerBJ || isNatural(state.hands[0]!)) return settle({ ...state, holeHidden: false });
  return state;
}

export const canHit = (s: BJState): boolean => s.phase === 'player' && !s.hands[s.active]!.done;
export const canDouble = (s: BJState, chips: number): boolean => {
  const h = s.hands[s.active];
  return s.phase === 'player' && !!h && !h.done && h.cards.length === 2 && chips >= h.bet;
};
export const canSplit = (s: BJState, chips: number): boolean => {
  const h = s.hands[s.active];
  return s.phase === 'player' && !!h && !h.done && h.cards.length === 2 && h.cards[0]!.rank === h.cards[1]!.rank
    && s.hands.length < MAX_HANDS && chips >= h.bet;
};

/** Cierra la mano activa si procede y pasa a la siguiente / al crupier. */
function advance(s: BJState): BJState {
  const hands = s.hands.map((h, i) => {
    if (h.done) return h;
    const t = handValue(h.cards).total;
    const auto = h.doubled || t >= 21 || (h.fromSplit && h.cards[0]!.rank === 1 && h.cards.length >= 2);
    return i === s.active && auto ? { ...h, done: true } : h;
  });
  const next = hands.findIndex((h) => !h.done);
  if (next === -1) {
    const anyLive = hands.some((h) => !isBust(h.cards));
    const st: BJState = { ...s, hands, phase: 'dealer', holeHidden: false };
    return anyLive ? st : settle(st);
  }
  return { ...s, hands, active: next };
}

export function hit(s: BJState): BJState {
  const [card, shoe] = draw(s.shoe);
  const hands = s.hands.map((h, i) => (i === s.active ? { ...h, cards: [...h.cards, card] } : h));
  return advance({ ...s, shoe, hands });
}

export function stand(s: BJState): BJState {
  const hands = s.hands.map((h, i) => (i === s.active ? { ...h, done: true } : h));
  return advance({ ...s, hands });
}

/** El coste extra (igual a la apuesta de la mano) lo cobra la UI vía `canDouble`. */
export function double(s: BJState): BJState {
  const [card, shoe] = draw(s.shoe);
  const hands = s.hands.map((h, i) =>
    i === s.active ? { ...h, cards: [...h.cards, card], bet: h.bet * 2, doubled: true } : h);
  return advance({ ...s, shoe, hands });
}

export function split(s: BJState): BJState {
  const h = s.hands[s.active]!;
  let shoe = s.shoe;
  let c1: BJCard, c2: BJCard;
  [c1, shoe] = draw(shoe); [c2, shoe] = draw(shoe);
  const a: Hand = { cards: [h.cards[0]!, c1], bet: h.bet, doubled: false, done: false, fromSplit: true };
  const b: Hand = { cards: [h.cards[1]!, c2], bet: h.bet, doubled: false, done: false, fromSplit: true };
  const hands = [...s.hands.slice(0, s.active), a, b, ...s.hands.slice(s.active + 1)];
  // Se evalúan ambas manos nuevas (ases divididos y 21 se cierran solos).
  let st: BJState = { ...s, shoe, hands };
  for (let i = st.active; i <= st.active + 1; i++) {
    st = advance({ ...st, active: i });
    if (st.phase !== 'player') return st;
  }
  const first = st.hands.findIndex((x) => !x.done);
  return { ...st, active: first === -1 ? 0 : first };
}

/** Un paso del crupier: pide si tiene menos de 17, si no cierra y liquida. */
export function dealerStep(s: BJState): BJState {
  if (handValue(s.dealer).total < 17) {
    const [card, shoe] = draw(s.shoe);
    return { ...s, shoe, dealer: [...s.dealer, card] };
  }
  return settle(s);
}

export function settle(s: BJState): BJState {
  const dealerTotal = handValue(s.dealer).total;
  const dealerBJ = s.dealer.length === 2 && dealerTotal === 21;
  const hands = s.hands.map((h): Hand => {
    const t = handValue(h.cards).total;
    let outcome: Outcome;
    let payout: number;
    if (t > 21) { outcome = 'bust'; payout = 0; }
    else if (isNatural(h)) {
      if (dealerBJ) { outcome = 'push'; payout = h.bet; }
      else { outcome = 'blackjack'; payout = Math.floor(h.bet * 2.5); }
    } else if (dealerBJ) { outcome = 'lose'; payout = 0; }
    else if (dealerTotal > 21 || t > dealerTotal) { outcome = 'win'; payout = h.bet * 2; }
    else if (t === dealerTotal) { outcome = 'push'; payout = h.bet; }
    else { outcome = 'lose'; payout = 0; }
    return { ...h, done: true, outcome, payout };
  });
  return { ...s, hands, phase: 'settled', holeHidden: false };
}

export const totalBet = (s: BJState): number => s.hands.reduce((n, h) => n + h.bet, 0);
export const totalPayout = (s: BJState): number => s.hands.reduce((n, h) => n + (h.payout ?? 0), 0);
