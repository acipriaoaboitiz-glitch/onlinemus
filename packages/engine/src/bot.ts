/**
 * Bot heurístico. Mira solo su mano y lo que ve en la mesa (nunca las cartas ajenas).
 * Sirve para el modo "contra bots", para rellenar asientos en una sala y para jugar por quien se ha ido.
 * Es deliberadamente humano: duda, a veces se tira un farol y a veces canta un órdago.
 */
import { handTotal, norm, paresInfo } from './evaluate.ts';
import type { ParesInfo } from './evaluate.ts';
import { legalActions } from './machine.ts';
import type { Action, Card, Lance, MusState, RoomConfig, Seat } from './types.ts';

export interface BotOptions {
  /** Fuente de azar (inyectable para tests deterministas). */
  rand?: () => number;
  /** 0 = prudente · 1 = normal · 1.5 = lanzado. */
  aggression?: number;
}

interface Features {
  kings: number;
  aces: number;
  horses: number;
  pares: ParesInfo;
  total: number;
}

function features(hand: readonly Card[], cfg: RoomConfig): Features {
  const ns = hand.map((c) => norm(c.rank, cfg));
  return {
    kings: ns.filter((n) => n === 12).length,
    aces: ns.filter((n) => n === 1).length,
    horses: ns.filter((n) => n === 11).length,
    pares: paresInfo(hand, cfg),
    total: handTotal(hand, cfg),
  };
}

const BY_COUNT = [0.1, 0.32, 0.58, 0.85, 1];
const JUEGO_POWER: Record<number, number> = { 31: 1, 32: 0.85, 40: 0.75, 37: 0.65, 36: 0.55, 35: 0.45, 34: 0.4, 33: 0.35 };

/** Estimación grosera (0 a 1) de lo fuerte que es la mano en cada lance. */
function power(lance: Lance, f: Features): number {
  switch (lance) {
    case 'grande': return Math.min(1, BY_COUNT[f.kings] + 0.04 * f.horses);
    case 'chica': return BY_COUNT[f.aces];
    case 'pares':
      if (f.pares.kind === 3) return Math.min(1, 0.88 + 0.015 * f.pares.key[0]);
      if (f.pares.kind === 2) return 0.55 + 0.04 * f.pares.key[0];
      if (f.pares.kind === 1) return 0.2 + 0.045 * f.pares.key[0];
      return 0;
    case 'juego': return JUEGO_POWER[f.total] ?? 0;
    case 'punto':
      return f.total >= 30 ? 0.9 : f.total >= 29 ? 0.75 : f.total >= 28 ? 0.62 : f.total >= 27 ? 0.5 : f.total >= 26 ? 0.4 : f.total >= 25 ? 0.3 : 0.15;
  }
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

export function botAction(s: MusState, seat: Seat, opts: BotOptions = {}): Action | null {
  const legal = legalActions(s, seat);
  if (legal.length === 0) return null;
  const rand = opts.rand ?? Math.random;
  const aggr = opts.aggression ?? 1;
  const kinds = new Set(legal.map((l) => l.type));
  const hand = s.hands[seat];
  const f = features(hand, s.config);

  if (kinds.has('CONTINUE')) return { type: 'CONTINUE' };
  if (kinds.has('MUS')) return botMus(f, rand);
  if (kinds.has('DISCARD')) return botDiscard(hand, s.config, rand);

  const L = s.lance;
  if (!L) return null;
  const p = clamp01(power(L.lance, f) + (rand() - 0.5) * 0.1);
  const bettable = legal.find((l) => l.type === 'ENVIDO') as { min: number; max: number } | undefined;

  if (L.stage === 'open') {
    const bet = (n: number): Action => ({
      type: 'ENVIDO',
      amount: Math.max(s.config.minBet, Math.min(n, bettable?.max ?? s.config.minBet)),
    });
    if (p >= 0.97 && L.lance !== 'chica' && rand() < 0.12 * aggr) return { type: 'ORDAGO' };
    if (p >= 0.72) return bet([2, 2, 3, 4, 5][Math.floor(rand() * 5)]);
    if (p >= 0.52 && rand() < 0.45 * aggr) return bet(2);
    if (p < 0.3 && rand() < 0.05 * aggr) return bet(2); // farol
    return { type: 'PASO' };
  }

  // Responder a un envite: cuanto más alto, más fuerza hace falta para querer.
  const total = L.bet?.total === 'ordago' || L.bet === null ? Infinity : L.bet.total;
  const need = total === Infinity ? 0.95 : total <= 2 ? 0.4 : total <= 4 ? 0.5 : total <= 8 ? 0.62 : 0.75;
  if (bettable && p >= 0.88 && rand() < 0.45 * aggr) {
    return { type: 'ENVIDO', amount: Math.min(bettable.max, bettable.min + Math.floor(rand() * 3)) };
  }
  if (p >= need) return { type: 'QUIERO' };
  if (p >= need - 0.1 && rand() < 0.3) return { type: 'QUIERO' };
  return { type: 'NO_QUIERO' };
}

function botMus(f: Features, rand: () => number): Action {
  const good =
    f.pares.kind >= 2 ||
    (f.pares.kind >= 1 && f.total >= 31) ||
    f.total === 31 || f.total === 32 ||
    f.kings >= 3 || f.aces >= 3;
  const cut = good ? rand() < 0.92 : rand() < 0.06;
  return { type: cut ? 'NO_MUS' : 'MUS' };
}

/** Conserva reyes, parejas y ases en pareja; cambia lo demás (al menos una carta, como exige el reglamento). */
function botDiscard(hand: readonly Card[], cfg: RoomConfig, rand: () => number): Action {
  const ns = hand.map((c) => norm(c.rank, cfg));
  const count = (n: number) => ns.filter((x) => x === n).length;
  const keepValue = (c: Card): number => {
    const n = norm(c.rank, cfg);
    let v = n === 12 ? 9 : n === 1 ? (count(1) >= 2 ? 7 : 3) : n === 11 || n === 10 ? 4 : n === 7 ? 3.5 : 2.5;
    if (count(n) >= 2) v += 5 + count(n);
    return v + rand() * 0.4;
  };
  const scored = hand.map((c) => ({ id: c.id, v: keepValue(c) })).sort((a, b) => a.v - b.v);
  let drop = scored.filter((x) => x.v < 4.6).map((x) => x.id);
  if (drop.length === 0) drop = [scored[0].id];
  return { type: 'DISCARD', cardIds: drop.slice(0, 4) };
}
