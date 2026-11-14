/**
 * Evaluación de manos: Grande, Chica, Pares, Juego y Punto.
 * Las comparaciones devuelven > 0 si `a` es mejor que `b`, < 0 si es peor y 0 si empatan.
 * Los empates los resuelve `bestSeat`: gana quien esté antes en el orden desde la mano.
 */
import type { Card, Lance, Rank, RoomConfig, Seat } from './types.ts';

export type Rules = Pick<RoomConfig, 'eightKings' | 'juegoReal'>;

const ORDER_8: readonly number[] = [1, 4, 5, 6, 7, 10, 11, 12];
const ORDER_4: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

/** Con 8 reyes: el 3 cuenta como rey y el 2 como as ("cerdo"). */
export function norm(rank: Rank, r: Rules): number {
  if (!r.eightKings) return rank;
  return rank === 3 ? 12 : rank === 2 ? 1 : rank;
}

/** Fuerza para Grande, Chica y Pares: 1 (as) … 8 (rey) con 8 reyes. */
export function strength(rank: Rank, r: Rules): number {
  return (r.eightKings ? ORDER_8 : ORDER_4).indexOf(norm(rank, r)) + 1;
}

/** Valor en puntos para Juego y Punto: figuras (y treses) = 10, ases (y doses) = 1, el resto su número. */
export function pointValue(rank: Rank, r: Rules): number {
  const n = norm(rank, r);
  return n >= 10 ? 10 : n;
}

const strengths = (hand: readonly Card[], r: Rules): number[] => hand.map((c) => strength(c.rank, r));

// ───────────────────────────── Grande y Chica ─────────────────────────────

/** Grande: gana la carta más alta; si empatan, la segunda, etc. */
export function compareGrande(a: readonly Card[], b: readonly Card[], r: Rules): number {
  const sa = strengths(a, r).sort((x, y) => y - x);
  const sb = strengths(b, r).sort((x, y) => y - x);
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sa[i] - sb[i];
  return 0;
}

/** Chica: gana la carta más baja; si empatan, la segunda más baja, etc. */
export function compareChica(a: readonly Card[], b: readonly Card[], r: Rules): number {
  const sa = strengths(a, r).sort((x, y) => x - y);
  const sb = strengths(b, r).sort((x, y) => x - y);
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return sb[i] - sa[i];
  return 0;
}

// ─────────────────────────────────── Pares ──────────────────────────────────

export interface ParesInfo {
  /** 0 = nada · 1 = pares · 2 = medias · 3 = duples (cuatro iguales cuenta como duples) */
  kind: 0 | 1 | 2 | 3;
  /** Rangos a comparar dentro del mismo tipo: [pareja] · [trío] · [pareja alta, pareja baja]. */
  key: number[];
}

export function paresInfo(hand: readonly Card[], r: Rules): ParesInfo {
  const counts = new Map<number, number>();
  for (const c of hand) {
    const s = strength(c.rank, r);
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  const groups = [...counts].map(([s, n]) => ({ s, n })).sort((x, y) => y.n - x.n || y.s - x.s);
  switch (groups.map((g) => g.n).join('')) {
    case '4': return { kind: 3, key: [groups[0].s, groups[0].s] };
    case '22': return { kind: 3, key: [groups[0].s, groups[1].s] };
    case '31': return { kind: 2, key: [groups[0].s] };
    case '211': return { kind: 1, key: [groups[0].s] };
    default: return { kind: 0, key: [] };
  }
}

export function compareParesInfo(a: ParesInfo, b: ParesInfo): number {
  if (a.kind !== b.kind) return a.kind - b.kind;
  for (let i = 0; i < a.key.length; i++) if (a.key[i] !== b.key[i]) return a.key[i] - b.key[i];
  return 0;
}

/** Piedras que vale la jugada: 1 pares, 2 medias, 3 duples. */
export const paresPoints = (hand: readonly Card[], r: Rules): number => paresInfo(hand, r).kind;

// ──────────────────────────────── Juego y Punto ─────────────────────────────

/** De mejor a peor. 38 y 39 son imposibles con esta baraja. */
export const JUEGO_ORDER: readonly number[] = [31, 32, 40, 37, 36, 35, 34, 33];

export function handTotal(hand: readonly Card[], r: Rules): number {
  return hand.reduce((total, c) => total + pointValue(c.rank, r), 0);
}

export const hasJuego = (hand: readonly Card[], r: Rules): boolean => handTotal(hand, r) >= 31;

/** Tres sietes y una carta de 10 puntos (variante opcional). */
export function isJuegoReal(hand: readonly Card[], r: Rules): boolean {
  const sevens = hand.filter((c) => c.rank === 7).length;
  return sevens === 3 && hand.some((c) => c.rank !== 7 && pointValue(c.rank, r) === 10);
}

/** Puntuación comparable del Juego: mayor = mejor; -1 si no hay juego. */
export function juegoScore(hand: readonly Card[], r: Rules): number {
  if (r.juegoReal && isJuegoReal(hand, r)) return 100;
  const idx = JUEGO_ORDER.indexOf(handTotal(hand, r));
  return idx < 0 ? -1 : 50 - idx;
}

/** Piedras que vale tener juego: 3 por el 31, 2 por cualquier otro. */
export function juegoPoints(hand: readonly Card[], r: Rules): number {
  if (!hasJuego(hand, r)) return 0;
  return handTotal(hand, r) === 31 ? 3 : 2;
}

// ────────────────────────────── Comparar jugadores ──────────────────────────

export function compareForLance(lance: Lance, a: readonly Card[], b: readonly Card[], r: Rules): number {
  switch (lance) {
    case 'grande': return compareGrande(a, b, r);
    case 'chica': return compareChica(a, b, r);
    case 'pares': return compareParesInfo(paresInfo(a, r), paresInfo(b, r));
    case 'juego': return juegoScore(a, r) - juegoScore(b, r);
    case 'punto': return handTotal(a, r) - handTotal(b, r);
  }
}

/**
 * Mejor jugador del lance. `order` debe venir ordenado desde la mano:
 * ante un empate gana el primero (la mano, o el más cercano a ella en sentido antihorario).
 */
export function bestSeat(
  lance: Lance,
  order: readonly Seat[],
  hands: readonly (readonly Card[])[],
  r: Rules,
): Seat {
  let best = order[0];
  for (const seat of order.slice(1)) {
    if (compareForLance(lance, hands[seat], hands[best], r) > 0) best = seat;
  }
  return best;
}
