import { frenchDeck, shuffle, spanishDeck, type AnyCard } from '../../engine/deck.ts';

/**
 * COME💩 (id interno «presidente»: «De mendigo a rey de la mesa»): 3–6 jugadores, baraja española (40) o inglesa (52).
 * Jerarquía de menor a mayor: 3, 4, 5, 6, 7, (8, 9, 10 en la inglesa,) Sota/J, Caballo/Q, Rey/K, As y 2.
 * Se juega la misma cantidad de cartas del mismo valor, superando lo que hay en la mesa, o se pasa.
 * Un 2 suelto corta cualquier jugada y limpia el centro. Quien se queda sin cartas se sienta: primero Rey 👑, último COME💩.
 */
export type DeckKind = 'es' | 'fr';
export type Role = 'presidente' | 'vicepresidente' | 'pueblo' | 'subalterno' | 'mendigo';
export const ROLE_NAME: Record<Role, string> = {
  presidente: 'Rey', vicepresidente: '2º', pueblo: 'Pueblo', subalterno: '3º', mendigo: 'COME💩',
};

export interface PresPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }
export interface Table { cards: AnyCard[]; by: string; power: number }
export interface PresEvent { seq: number; by: string; text: string; kind: 'info' | 'clear' | 'out' }

export interface PresState {
  deck: DeckKind;
  players: PresPlayer[];
  hands: Record<string, AnyCard[]>;
  table: Table | null;
  turn: number;
  /** Quienes ya han pasado en la baza actual. */
  passed: string[];
  /** Orden en que se quedaron sin cartas en esta ronda. */
  finished: string[];
  /** `exchange`: el Presidente humano elige las 2 cartas que devuelve al Mendigo. */
  phase: 'exchange' | 'play' | 'done';
  /** Roles de la ronda anterior (o de esta, al terminar). */
  roles: Record<string, Role> | null;
  round: number;
  /** En la primera ronda abre quien tiene el 3 de oros (o de tréboles) y debe incluirlo. */
  mustInclude: string | null;
  exchange: { president: string; beggar: string; received: AnyCard[] } | null;
  event: PresEvent | null;
}

const ORDER_ES = [3, 4, 5, 6, 7, 10, 11, 12, 1, 2];
const ORDER_FR = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 1, 2];
export const power = (c: AnyCard): number => (c.deck === 'es' ? ORDER_ES : ORDER_FR).indexOf(c.rank);
export const TOP = (deck: DeckKind): number => (deck === 'es' ? ORDER_ES : ORDER_FR).length - 1;
const sortHand = (h: AnyCard[]): AnyCard[] => [...h].sort((a, b) => power(a) - power(b) || a.suit.localeCompare(b.suit));

let seq = 0;
const say = (s: PresState, by: string, text: string, kind: PresEvent['kind'] = 'info'): void => { s.event = { seq: ++seq, by, text, kind }; };

const active = (s: PresState): string[] => s.players.map((p) => p.id).filter((id) => !s.finished.includes(id));
/** Siguiente jugador (desde `from`) que sigue en la ronda y no ha pasado. */
function nextTurn(s: PresState, from: number): number {
  const n = s.players.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k) % n;
    const id = s.players[i]!.id;
    if (!s.finished.includes(id) && !s.passed.includes(id)) return i;
  }
  return from;
}

export function rolesFor(order: string[]): Record<string, Role> {
  const n = order.length;
  const r: Record<string, Role> = {};
  order.forEach((id, i) => {
    r[id] = i === 0 ? 'presidente' : i === n - 1 ? 'mendigo' : n >= 4 && i === 1 ? 'vicepresidente' : n >= 4 && i === n - 2 ? 'subalterno' : 'pueblo';
  });
  return r;
}

/** Reparte y prepara la ronda. Con roles previos, el Mendigo entrega sus 2 mejores cartas al Presidente. */
export function newRound(players: PresPlayer[], deck: DeckKind, prev?: PresState): PresState {
  const cards = shuffle<AnyCard>(deck === 'es' ? spanishDeck() : frenchDeck());
  const hands: Record<string, AnyCard[]> = {};
  players.forEach((p) => { hands[p.id] = []; });
  cards.forEach((c, i) => hands[players[i % players.length]!.id]!.push(c));
  players.forEach((p) => { hands[p.id] = sortHand(hands[p.id]!); });
  const opener = deck === 'es' ? 'o3' : 't3';
  const s: PresState = {
    deck, players, hands, table: null, turn: 0, passed: [], finished: [], phase: 'play',
    roles: prev?.roles ?? null, round: (prev?.round ?? 0) + 1, mustInclude: null, exchange: null, event: null,
  };
  if (!s.roles) {
    const holder = players.findIndex((p) => hands[p.id]!.some((c) => c.id === opener));
    // Ronda 1: abre quien tiene el 3 de oros, pero NO está obligado a jugarlo (cualquier carta o grupo vale).
    s.turn = Math.max(0, holder);
    return s;
  }
  const pres = players.find((p) => s.roles![p.id] === 'presidente')!;
  const beg = players.find((p) => s.roles![p.id] === 'mendigo')!;
  // El Mendigo entrega sus 2 mejores cartas (las más altas).
  const best = sortHand(hands[beg.id]!).slice(-2);
  hands[beg.id] = hands[beg.id]!.filter((c) => !best.includes(c));
  hands[pres.id] = sortHand([...hands[pres.id]!, ...best]);
  s.exchange = { president: pres.id, beggar: beg.id, received: best };
  s.turn = players.indexOf(beg); // abre el Mendigo
  if (pres.human) { s.phase = 'exchange'; say(s, beg.id, `${beg.name} (COME💩) te entrega sus 2 mejores cartas: devuelve tus 2 peores`); }
  else {
    const worst = sortHand(hands[pres.id]!).filter((c) => !best.includes(c)).slice(0, 2);
    hands[pres.id] = hands[pres.id]!.filter((c) => !worst.includes(c));
    hands[beg.id] = sortHand([...hands[beg.id]!, ...worst]);
    say(s, pres.id, `${beg.name} entrega sus 2 mejores cartas a ${pres.name}`);
  }
  return s;
}

/** El Presidente humano devuelve 2 cartas al Mendigo y empieza la ronda. */
export function giveBack(prev: PresState, ids: string[]): PresState | null {
  if (prev.phase !== 'exchange' || !prev.exchange || ids.length !== 2) return null;
  const { president, beggar } = prev.exchange;
  const give = prev.hands[president]!.filter((c) => ids.includes(c.id));
  if (give.length !== 2) return null;
  const s = structuredClone(prev);
  s.hands[president] = s.hands[president]!.filter((c) => !ids.includes(c.id));
  s.hands[beggar] = sortHand([...s.hands[beggar]!, ...give]);
  s.phase = 'play';
  say(s, president, 'Intercambio hecho');
  return s;
}

const sameSet = (cards: AnyCard[]): boolean => cards.length > 0 && cards.every((c) => power(c) === power(cards[0]!));

/** ¿Es válida esta jugada ahora mismo? */
export function canPlay(s: PresState, pid: string, ids: string[]): boolean {
  if (s.phase !== 'play' || s.players[s.turn]!.id !== pid) return false;
  const cards = s.hands[pid]!.filter((c) => ids.includes(c.id));
  if (cards.length !== ids.length || !sameSet(cards)) return false;
  if (!s.table) return !s.mustInclude || ids.includes(s.mustInclude);
  const p = power(cards[0]!);
  const top = TOP(s.deck);
  return (cards.length === s.table.cards.length && p > s.table.power) || (p === top && cards.length === 1);
}

function finishIfOut(s: PresState, pid: string): void {
  if (s.hands[pid]!.length > 0) return;
  s.finished.push(pid);
  const p = s.players.find((x) => x.id === pid)!;
  say(s, pid, `${p.name} se queda sin cartas`, 'out');
  const left = active(s);
  if (left.length <= 1) {
    if (left[0]) s.finished.push(left[0]);
    s.roles = rolesFor(s.finished);
    s.phase = 'done';
    s.table = null;
  }
}

export function playCards(prev: PresState, pid: string, ids: string[]): PresState | null {
  if (!canPlay(prev, pid, ids)) return null;
  const s = structuredClone(prev);
  const me = s.players.findIndex((p) => p.id === pid);
  const cards = s.hands[pid]!.filter((c) => ids.includes(c.id));
  s.hands[pid] = s.hands[pid]!.filter((c) => !ids.includes(c.id));
  s.mustInclude = null;
  const p = power(cards[0]!);
  const cut = Boolean(s.table) && p === TOP(s.deck);
  s.passed = [];
  s.table = { cards, by: pid, power: p };
  finishIfOut(s, pid);
  if (s.phase === 'done') return s;
  if (cut) {
    // Un 2 corta: se limpia el centro y vuelve a salir quien lo tiró (o el siguiente, si ya terminó).
    s.table = null;
    s.turn = s.finished.includes(pid) ? nextTurn(s, me) : me;
    say(s, pid, '¡Corta con un 2!', 'clear');
  } else {
    s.turn = nextTurn(s, me);
  }
  return s;
}

export function passTurn(prev: PresState, pid: string): PresState | null {
  if (prev.phase !== 'play' || !prev.table || prev.players[prev.turn]!.id !== pid) return null;
  const s = structuredClone(prev);
  const me = s.turn;
  s.passed.push(pid);
  say(s, pid, 'Pasa');
  const by = s.table!.by;
  const waiting = active(s).filter((id) => id !== by && !s.passed.includes(id));
  if (waiting.length === 0) {
    // Todos han pasado: se limpia la mesa y sale quien ganó la baza.
    const byIdx = s.players.findIndex((p) => p.id === by);
    s.table = null;
    s.passed = [];
    s.turn = s.finished.includes(by) ? nextTurn(s, byIdx) : byIdx;
    say(s, by, 'Mesa limpia', 'clear');
  } else {
    s.turn = nextTurn(s, me);
  }
  return s;
}

export type BotMove = { type: 'play'; ids: string[] } | { type: 'pass' };

/** Agrupa la mano por valor. */
export const groups = (hand: AnyCard[]): Map<number, AnyCard[]> => {
  const m = new Map<number, AnyCard[]>();
  for (const c of hand) { const p = power(c); m.set(p, [...(m.get(p) ?? []), c]); }
  return m;
};

/** IA: abre con lo más bajo (incluido el 3 inicial), responde con lo mínimo que supera y reserva los 2 para cortar al final. */
export function botMove(s: PresState): BotMove {
  const me = s.players[s.turn]!;
  const hand = s.hands[me.id]!;
  const g = [...groups(hand).entries()].sort((a, b) => a[0] - b[0]);
  const top = TOP(s.deck);
  if (!s.table) {
    if (s.mustInclude) {
      const c = hand.find((x) => x.id === s.mustInclude)!;
      return { type: 'play', ids: groups(hand).get(power(c))!.map((x) => x.id) };
    }
    const low = g.find(([p]) => p !== top) ?? g[0]!;
    return { type: 'play', ids: low[1].map((x) => x.id) };
  }
  const k = s.table.cards.length;
  const beat = g.find(([p, cs]) => p > s.table!.power && p !== top && cs.length >= k);
  if (beat) return { type: 'play', ids: beat[1].slice(0, k).map((x) => x.id) };
  // Corta con un 2 si alguien está a punto de salir o si me queda poco.
  const twos = groups(hand).get(top);
  const danger = s.players.some((p) => p.id !== me.id && !s.finished.includes(p.id) && s.hands[p.id]!.length <= 2);
  if (twos && (danger || hand.length <= 4)) return { type: 'play', ids: [twos[0]!.id] };
  return { type: 'pass' };
}

export const roleOf = (s: PresState, id: string): Role | null => s.roles?.[id] ?? null;
/** Cuántas fichas gana el jugador humano al terminar la ronda. */
export const ROLE_PRIZE: Record<Role, number> = { presidente: 100, vicepresidente: 60, pueblo: 30, subalterno: 10, mendigo: 0 };

/** Acciones de un jugador (en local o a través de la sala). */
export type PresAction = { k: 'play'; ids: string[] } | { k: 'pass' } | { k: 'give'; ids: string[] };

export function applyPresAction(s: PresState, pid: string, a: PresAction): PresState | null {
  switch (a.k) {
    case 'play': return playCards(s, pid, a.ids);
    case 'pass': return passTurn(s, pid);
    case 'give': return s.exchange?.president === pid ? giveBack(s, a.ids) : null;
  }
}
