import type { FrenchCard } from '../../engine/deck.ts';
import { frenchDeck, shuffle } from '../../engine/deck.ts';

/**
 * Póker sin límite para 2–4 jugadores (torneo: todos empiezan con 1000 fichas, ciegas 10/20).
 * Rondas: preflop, flop, turn y river con pasar / igualar / subir / retirarse, all-in, botes laterales
 * y evaluador completo de manos (carta alta … escalera de color).
 */
export const SB = 10;
export const BB = 20;
export const START_STACK = 1000;

// ─── Evaluador ───────────────────────────────────────────────────────────────────────────────────
export const HAND_NAMES = ['Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera', 'Color', 'Full', 'Póker', 'Escalera de color'] as const;
const val = (c: FrenchCard): number => (c.rank === 1 ? 14 : c.rank);

/** Puntuación de 5 cartas: categoría y desempates empaquetados en un número comparable. */
function eval5(cards: FrenchCard[]): number {
  const v = cards.map(val).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0]!.suit);
  const uniq = [...new Set(v)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (v[0]! - v[4]! === 4) straightHigh = v[0]!;
    else if (v[0] === 14 && v[1] === 5 && v[2] === 4 && v[3] === 3 && v[4] === 2) straightHigh = 5; // rueda A-2-3-4-5
  }
  const counts = new Map<number, number>();
  for (const x of v) counts.set(x, (counts.get(x) ?? 0) + 1);
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const kick = groups.map(([r]) => r);
  const pack = (cat: number, ks: number[]): number => { let n = cat; for (let i = 0; i < 5; i++) n = n * 15 + (ks[i] ?? 0); return n; };
  if (straightHigh && flush) return pack(8, [straightHigh]);
  if (groups[0]![1] === 4) return pack(7, kick);
  if (groups[0]![1] === 3 && groups[1]![1] === 2) return pack(6, kick);
  if (flush) return pack(5, v);
  if (straightHigh) return pack(4, [straightHigh]);
  if (groups[0]![1] === 3) return pack(3, kick);
  if (groups[0]![1] === 2 && groups[1]![1] === 2) return pack(2, kick);
  if (groups[0]![1] === 2) return pack(1, kick);
  return pack(0, v);
}

/** Mejor mano de 5 entre hasta 7 cartas. */
export function bestScore(cards: FrenchCard[]): number {
  let best = -1;
  const n = cards.length;
  if (n < 5) return -1;
  for (let a = 0; a < n - 4; a++) for (let b = a + 1; b < n - 3; b++) for (let c = b + 1; c < n - 2; c++)
    for (let d = c + 1; d < n - 1; d++) for (let e = d + 1; e < n; e++) {
      const sc = eval5([cards[a]!, cards[b]!, cards[c]!, cards[d]!, cards[e]!]);
      if (sc > best) best = sc;
    }
  return best;
}
export const handCategory = (score: number): number => Math.floor(score / 15 ** 5);
export const handName = (score: number): string => (score < 0 ? '' : HAND_NAMES[handCategory(score)]!);

// ─── Estado ──────────────────────────────────────────────────────────────────────────────────────
export interface PPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
export interface PSeat {
  stack: number;
  /** Apuesta de la ronda en curso. */
  bet: number;
  /** Fichas ya recogidas en el bote en rondas anteriores. */
  committed: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  out: boolean;
  hole: FrenchCard[];
  last: string | null;
}
export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
export interface PokerResult {
  reason: 'fold' | 'showdown';
  wins: { seat: number; amount: number; hand: string }[];
  shown: boolean[];
  names: string[];
}
export interface PokerState {
  players: PPlayer[];
  seats: PSeat[];
  deck: FrenchCard[];
  community: FrenchCard[];
  button: number;
  turn: number;
  street: Street;
  currentBet: number;
  minRaise: number;
  handNo: number;
  phase: 'betting' | 'handOver' | 'gameOver';
  result: PokerResult | null;
  winner: number | null;
}

export const pot = (s: PokerState): number => s.seats.reduce((n, x) => n + x.committed + x.bet, 0);
const n = (s: PokerState): number => s.players.length;
const canAct = (x: PSeat): boolean => !x.out && !x.folded && !x.allIn;
const inHand = (x: PSeat): boolean => !x.out && !x.folded;
const nextFrom = (s: PokerState, from: number, pred: (x: PSeat) => boolean): number => {
  for (let k = 1; k <= n(s); k++) { const i = (from + k) % n(s); if (pred(s.seats[i]!)) return i; }
  return from;
};

function post(x: PSeat, amount: number): void {
  const a = Math.min(amount, x.stack);
  x.stack -= a; x.bet += a;
  if (x.stack === 0) x.allIn = true;
}

function dealHand(s: PokerState): void {
  s.deck = shuffle(frenchDeck());
  s.community = [];
  s.result = null;
  s.street = 'preflop';
  s.phase = 'betting';
  for (const x of s.seats) { x.bet = 0; x.committed = 0; x.folded = x.out; x.allIn = false; x.acted = false; x.last = null; x.hole = x.out ? [] : [s.deck.pop()!, s.deck.pop()!]; }
  const active = s.seats.filter((x) => !x.out).length;
  const sb = active === 2 ? s.button : nextFrom(s, s.button, (x) => !x.out);
  const bb = nextFrom(s, sb, (x) => !x.out);
  post(s.seats[sb]!, SB); post(s.seats[bb]!, BB);
  s.currentBet = BB;
  s.minRaise = BB;
  s.turn = active === 2 ? sb : nextFrom(s, bb, canAct);
  if (!canAct(s.seats[s.turn]!)) settleIfNoAction(s);
}

export function newPoker(players: PPlayer[]): PokerState {
  const s: PokerState = {
    players, seats: players.map(() => ({ stack: START_STACK, bet: 0, committed: 0, folded: false, allIn: false, acted: false, out: false, hole: [], last: null })),
    deck: [], community: [], button: players.length - 1, turn: 0, street: 'preflop', currentBet: 0, minRaise: BB, handNo: 1, phase: 'betting', result: null, winner: null,
  };
  dealHand(s);
  return s;
}

export function nextHand(prev: PokerState): PokerState {
  const s = structuredClone(prev);
  s.button = nextFrom(s, s.button, (x) => !x.out);
  s.handNo++;
  dealHand(s);
  return s;
}

export interface Legal { toCall: number; canCheck: boolean; canCall: boolean; callAmount: number; canRaise: boolean; minTo: number; maxTo: number }
export function legal(s: PokerState): Legal {
  const x = s.seats[s.turn]!;
  const toCall = Math.max(0, s.currentBet - x.bet);
  const maxTo = x.bet + x.stack;
  const canRaise = maxTo > s.currentBet;
  return {
    toCall, canCheck: toCall === 0, canCall: toCall > 0, callAmount: Math.min(toCall, x.stack), canRaise,
    minTo: Math.min(maxTo, s.currentBet + s.minRaise), maxTo,
  };
}

export type PAction = { type: 'fold' } | { type: 'check' } | { type: 'call' } | { type: 'raise'; to: number };

function collect(s: PokerState): void { for (const x of s.seats) { x.committed += x.bet; x.bet = 0; } }

/** Reparte el bote por capas (botes laterales) entre quienes llegan al showdown. */
function showdown(s: PokerState): void {
  collect(s);
  s.street = 'showdown';
  const scores = s.seats.map((x) => (inHand(x) ? bestScore([...x.hole, ...s.community]) : -1));
  const levels = [...new Set(s.seats.map((x) => x.committed).filter((c) => c > 0))].sort((a, b) => a - b);
  const won = s.seats.map(() => 0);
  let prev = 0;
  for (const lv of levels) {
    let amount = 0;
    for (const x of s.seats) amount += Math.max(0, Math.min(x.committed, lv) - prev);
    const eligible = s.seats.map((_x, i) => i).filter((i) => inHand(s.seats[i]!) && s.seats[i]!.committed >= lv);
    prev = lv;
    if (eligible.length === 0 || amount === 0) continue;
    const top = Math.max(...eligible.map((i) => scores[i]!));
    const winners = eligible.filter((i) => scores[i] === top);
    const share = Math.floor(amount / winners.length);
    winners.forEach((w, k) => { won[w]! += share + (k === 0 ? amount - share * winners.length : 0); });
  }
  s.seats.forEach((x, i) => { x.stack += won[i]!; x.committed = 0; });
  s.result = {
    reason: 'showdown', shown: s.seats.map((x) => inHand(x)), names: s.players.map((p) => p.name),
    wins: won.map((a, i) => ({ seat: i, amount: a, hand: handName(scores[i]!) })).filter((w) => w.amount > 0),
  };
  finishHand(s);
}

function finishHand(s: PokerState): void {
  for (const x of s.seats) if (!x.out && x.stack === 0) x.out = true;
  const left = s.seats.map((_x, i) => i).filter((i) => !s.seats[i]!.out);
  if (left.length <= 1 || s.seats[0]!.out) { s.phase = 'gameOver'; s.winner = left.length === 1 ? left[0]! : s.seats.reduce((b, x, i) => (x.stack > s.seats[b]!.stack ? i : b), 0); } else s.phase = 'handOver';
}

/** Si nadie más puede actuar, se reparten las cartas que faltan y se resuelve. */
function runOut(s: PokerState): void {
  collect(s);
  while (s.community.length < 5) s.community.push(s.deck.pop()!);
  showdown(s);
}

function advanceStreet(s: PokerState): void {
  collect(s);
  s.currentBet = 0; s.minRaise = BB;
  for (const x of s.seats) x.acted = false;
  if (s.street === 'preflop') { s.community.push(s.deck.pop()!, s.deck.pop()!, s.deck.pop()!); s.street = 'flop'; }
  else if (s.street === 'flop') { s.community.push(s.deck.pop()!); s.street = 'turn'; }
  else if (s.street === 'turn') { s.community.push(s.deck.pop()!); s.street = 'river'; }
  else { showdown(s); return; }
  if (s.seats.filter(canAct).length <= 1) { runOut(s); return; }
  s.turn = nextFrom(s, s.button, canAct);
}

/** Tras una acción: ¿queda un solo jugador? ¿terminó la ronda de apuestas? Si no, pasa el turno. */
function settleIfNoAction(s: PokerState): void {
  const live = s.seats.filter(inHand);
  if (live.length === 1) {
    collect(s);
    const wi = s.seats.findIndex(inHand);
    const total = s.seats.reduce((a, x) => a + x.committed, 0);
    s.seats.forEach((x) => { x.committed = 0; });
    s.seats[wi]!.stack += total;
    s.street = 'showdown';
    s.result = { reason: 'fold', shown: s.seats.map(() => false), names: s.players.map((p) => p.name), wins: [{ seat: wi, amount: total, hand: '' }] };
    finishHand(s);
    return;
  }
  const able = s.seats.filter(canAct);
  const matched = able.every((x) => x.acted && x.bet === s.currentBet);
  const allMatched = s.seats.filter(inHand).every((x) => x.allIn || x.bet === s.currentBet);
  if ((able.length === 0 || matched) && allMatched) { advanceStreet(s); return; }
  if (able.length === 1 && able[0]!.bet >= s.currentBet) { advanceStreet(s); return; }
  s.turn = nextFrom(s, s.turn, canAct);
}

export function act(prev: PokerState, action: PAction): PokerState | null {
  if (prev.phase !== 'betting') return null;
  const s = structuredClone(prev);
  const x = s.seats[s.turn]!;
  const lg = legal(s);
  switch (action.type) {
    case 'fold': x.folded = true; x.last = 'Retirada'; break;
    case 'check': if (!lg.canCheck) return null; x.acted = true; x.last = 'Pasa'; break;
    case 'call': if (!lg.canCall) return null; post(x, lg.callAmount); x.acted = true; x.last = x.allIn ? 'All-in' : 'Iguala'; break;
    case 'raise': {
      if (!lg.canRaise) return null;
      const to = Math.max(lg.minTo, Math.min(lg.maxTo, Math.round(action.to)));
      const size = to - s.currentBet;
      post(x, to - x.bet);
      if (size > 0) { s.minRaise = Math.max(s.minRaise, size); for (const o of s.seats) if (o !== x) o.acted = false; }
      s.currentBet = Math.max(s.currentBet, x.bet);
      x.acted = true;
      x.last = x.allIn ? 'All-in' : `Sube a ${x.bet}`;
      break;
    }
  }
  settleIfNoAction(s);
  return s;
}

// ─── IA ──────────────────────────────────────────────────────────────────────────────────────────
/** Equity aproximada por Monte Carlo contra manos aleatorias. */
export function equity(hole: FrenchCard[], community: FrenchCard[], opponents: number, iters = 140): number {
  const known = new Set([...hole, ...community].map((c) => c.id));
  const rest = frenchDeck().filter((c) => !known.has(c.id));
  let score = 0;
  for (let it = 0; it < iters; it++) {
    const d = shuffle(rest);
    const board = [...community];
    let k = 0;
    while (board.length < 5) board.push(d[k++]!);
    const mine = bestScore([...hole, ...board]);
    let best = -1; let ties = 0;
    for (let o = 0; o < opponents; o++) {
      const sc = bestScore([d[k++]!, d[k++]!, ...board]);
      if (sc > best) { best = sc; ties = 1; } else if (sc === best) ties++;
    }
    if (mine > best) score += 1; else if (mine === best) score += 1 / (ties + 1);
  }
  return score / iters;
}

export function botAct(s: PokerState): PAction {
  const x = s.seats[s.turn]!;
  const lg = legal(s);
  const opps = Math.max(1, s.seats.filter((o, i) => inHand(o) && i !== s.turn).length);
  const eq = equity(x.hole, s.community, opps) + (Math.random() - 0.5) * 0.06;
  const p = pot(s);
  const sizeTo = (frac: number): number => Math.min(lg.maxTo, Math.max(lg.minTo, Math.round((s.currentBet + p * frac) / 10) * 10));
  if (lg.canCheck) {
    if (lg.canRaise && eq > 0.66 && Math.random() < 0.8) return { type: 'raise', to: sizeTo(0.7) };
    if (lg.canRaise && eq > 0.52 && Math.random() < 0.3) return { type: 'raise', to: sizeTo(0.45) };
    return { type: 'check' };
  }
  const need = lg.callAmount / (p + lg.callAmount);
  if (lg.canRaise && eq > 0.78 && Math.random() < 0.65) return { type: 'raise', to: sizeTo(0.9) };
  if (eq > need + 0.04) return { type: 'call' };
  if (eq > need - 0.05 && Math.random() < 0.2) return { type: 'call' };
  return { type: 'fold' };
}

export type PokerAction = { k: 'act'; a: PAction } | { k: 'next' };
/** Reductor para partidas en sala: solo mueve quien tiene el turno; «next» reparte la mano siguiente. */
export function applyPokerAction(s: PokerState, pid: string, a: PokerAction): PokerState | null {
  if (a.k === 'next') return s.phase === 'handOver' ? nextHand(s) : null;
  if (s.phase !== 'betting' || s.players[s.turn]?.id !== pid) return null;
  return act(s, a.a);
}
