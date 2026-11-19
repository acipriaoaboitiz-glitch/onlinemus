import { shuffle } from '../../engine/deck.ts';

/**
 * Uno de 108 cartas: por color un 0, dos de cada 1–9 y dos «salta», «cambio de sentido» y «+2»;
 * más 4 comodines y 4 «+4». Reglas: se juega por color o por número/símbolo; el +4 solo si no tienes el color
 * en juego; si no puedes jugar robas una y, si sirve, puedes jugarla o pasar; +2 y +4 hacen robar y perder el turno.
 * Gana quien se queda sin cartas (el «¡UNO!» se canta solo al quedarte con una).
 */
export const COLORS = ['red', 'yellow', 'green', 'blue'] as const;
export type Color = (typeof COLORS)[number];
export type Kind = 'num' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard { id: string; color: Color | 'wild'; kind: Kind; n: number }
export interface UnoPlayer { id: string; name: string; human: boolean; /** Jugador de la sala (partida online). */ peerId?: string }

export interface UnoState {
  players: UnoPlayer[];
  hands: Record<string, UnoCard[]>;
  drawPile: UnoCard[];
  discard: UnoCard[];
  /** Color vigente (el de la carta superior o el elegido con un comodín). */
  color: Color;
  dir: 1 | -1;
  turn: number;
  winner: string | null;
  /** Carta recién robada por quien tiene el turno y que se puede jugar (o pasar). */
  drawn: UnoCard | null;
  /** Último suceso, para avisos: `seq` cambia con cada uno. */
  event: { seq: number; by: string; text: string; kind: 'info' | 'draw' | 'uno' } | null;
  /** Jugador que se ha quedado con 1 carta sin cantar «¡UNO!»: cualquiera puede cantarlo antes (+2 para él). */
  uno: { pid: string; at: number } | null;
}

/** Ventana (ms) para cantar «¡UNO!» o cazar al que no lo ha cantado. */
export const UNO_WINDOW = 2800;

export const COLOR_NAME: Record<Color, string> = { red: 'rojo', yellow: 'amarillo', green: 'verde', blue: 'azul' };

export function buildDeck(): UnoCard[] {
  const d: UnoCard[] = [];
  let k = 0;
  const add = (color: Color | 'wild', kind: Kind, n = 0): void => { d.push({ id: `u${k++}`, color, kind, n }); };
  for (const c of COLORS) {
    add(c, 'num', 0);
    for (let n = 1; n <= 9; n++) { add(c, 'num', n); add(c, 'num', n); }
    for (const kind of ['skip', 'reverse', 'draw2'] as const) { add(c, kind); add(c, kind); }
  }
  for (let i = 0; i < 4; i++) { add('wild', 'wild'); add('wild', 'wild4'); }
  return d;
}

export const cardPoints = (c: UnoCard): number => (c.kind === 'num' ? c.n : c.kind === 'wild' || c.kind === 'wild4' ? 50 : 20);

export function cardLabel(c: UnoCard): string {
  const col = c.color === 'wild' ? '' : ` ${COLOR_NAME[c.color]}`;
  switch (c.kind) {
    case 'num': return `${c.n}${col}`;
    case 'skip': return `Salta${col}`;
    case 'reverse': return `Cambio de sentido${col}`;
    case 'draw2': return `+2${col}`;
    case 'wild': return 'Comodín';
    case 'wild4': return 'Comodín +4';
  }
}

const mod = (n: number, m: number): number => ((n % m) + m) % m;
const top = (s: UnoState): UnoCard => s.discard[s.discard.length - 1]!;
const nextIdx = (s: UnoState, from: number, steps = 1): number => mod(from + s.dir * steps, s.players.length);

/** Roba `n` cartas para `pid`; si se acaba el mazo, baraja el descarte (menos la carta superior). */
function take(s: UnoState, pid: string, n: number): UnoCard[] {
  const got: UnoCard[] = [];
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0 && s.discard.length > 1) {
      const keep = s.discard.pop()!;
      s.drawPile = shuffle(s.discard);
      s.discard = [keep];
    }
    const c = s.drawPile.shift();
    if (!c) break;
    got.push(c);
  }
  s.hands[pid] = [...s.hands[pid]!, ...got];
  return got;
}

export function isPlayable(s: UnoState, card: UnoCard, hand: readonly UnoCard[]): boolean {
  if (s.drawn && card.id !== s.drawn.id) return false; // tras robar solo puede jugarse esa carta
  if (card.kind === 'wild') return true;
  if (card.kind === 'wild4') return !hand.some((c) => c.color === s.color);
  const t = top(s);
  return card.color === s.color || (card.kind === t.kind && (card.kind !== 'num' || card.n === t.n));
}

export const playableCards = (s: UnoState, pid: string): UnoCard[] => s.hands[pid]!.filter((c) => isPlayable(s, c, s.hands[pid]!));

let seq = 0;
const say = (s: UnoState, by: string, text: string, kind: 'info' | 'draw' | 'uno' = 'info'): void => { s.event = { seq: ++seq, by, text, kind }; };

/** Si quien debía cantar «¡UNO!» ya no tiene exactamente 1 carta, se anula el aviso. */
const settleUno = (s: UnoState): void => { if (s.uno && s.hands[s.uno.pid]!.length !== 1) s.uno = null; };

/** Aplica el efecto de la carta que acaba de caer y pasa el turno. */
function applyEffect(s: UnoState, card: UnoCard, pid: string): void {
  const n = s.players.length;
  const me = s.players.findIndex((p) => p.id === pid);
  s.turn = me;
  switch (card.kind) {
    case 'skip': s.turn = nextIdx(s, me, 2); say(s, pid, 'Salta turno'); break;
    case 'reverse':
      s.dir = (s.dir * -1) as 1 | -1;
      s.turn = n === 2 ? me : nextIdx(s, me); // con 2 jugadores equivale a «salta»
      say(s, pid, 'Cambio de sentido');
      break;
    case 'draw2': {
      const victim = s.players[nextIdx(s, me)]!;
      take(s, victim.id, 2);
      s.turn = nextIdx(s, me, 2);
      say(s, pid, `+2 para ${victim.name}`, 'draw');
      break;
    }
    case 'wild4': {
      const victim = s.players[nextIdx(s, me)]!;
      take(s, victim.id, 4);
      s.turn = nextIdx(s, me, 2);
      say(s, pid, `+4 para ${victim.name}`, 'draw');
      break;
    }
    default: s.turn = nextIdx(s, me);
  }
}

export function newGame(players: UnoPlayer[]): UnoState {
  const deck = shuffle(buildDeck());
  const s: UnoState = {
    players, hands: {}, drawPile: deck, discard: [], color: 'red', dir: 1, turn: 0, winner: null, drawn: null, event: null, uno: null,
  };
  for (const p of players) s.hands[p.id] = [];
  for (let i = 0; i < 7; i++) for (const p of players) take(s, p.id, 1);
  // Carta inicial: no puede ser +4 (se devuelve al mazo).
  let first = s.drawPile.shift()!;
  while (first.kind === 'wild4') { s.drawPile.push(first); s.drawPile = shuffle(s.drawPile); first = s.drawPile.shift()!; }
  s.discard.push(first);
  s.color = first.color === 'wild' ? COLORS[Math.floor(Math.random() * 4)]! : first.color;
  const p0 = players[0]!.id;
  if (first.kind === 'skip') { s.turn = 1 % players.length; say(s, p0, 'Empieza con «Salta»'); }
  else if (first.kind === 'reverse') { s.dir = -1; s.turn = 0; }
  else if (first.kind === 'draw2') { take(s, p0, 2); s.turn = 1 % players.length; say(s, p0, 'Empieza con +2', 'draw'); }
  return s;
}

export function playCard(prev: UnoState, pid: string, cardId: string, chosen?: Color): UnoState | null {
  if (prev.winner || prev.players[prev.turn]!.id !== pid) return null;
  const card = prev.hands[pid]!.find((c) => c.id === cardId);
  if (!card || !isPlayable(prev, card, prev.hands[pid]!)) return null;
  const isWild = card.color === 'wild';
  if (isWild && !chosen) return null;
  const s = structuredClone(prev);
  s.hands[pid] = s.hands[pid]!.filter((c) => c.id !== cardId);
  s.discard.push(card);
  s.color = isWild ? chosen! : (card.color as Color);
  s.drawn = null;
  if (s.hands[pid]!.length === 0) { s.winner = pid; s.uno = null; say(s, pid, '¡Se queda sin cartas!'); return s; }
  applyEffect(s, card, pid);
  // Quedarse con 1 carta abre la ventana del «¡UNO!»: hay que cantarlo (o te cazan y robas 2).
  if (s.hands[pid]!.length === 1) s.uno = { pid, at: Date.now() };
  settleUno(s);
  // Con 1 carta no hay aviso automático: lo canta el jugador (o lo caza otro).
  if (isWild && card.kind === 'wild') say(s, pid, `Color ${COLOR_NAME[chosen!]}`);
  return s;
}

/** Robar: solo si no tienes ninguna carta jugable. Si la robada sirve, puedes jugarla o pasar. */
export function drawCard(prev: UnoState, pid: string): UnoState | null {
  if (prev.winner || prev.drawn || prev.players[prev.turn]!.id !== pid) return null;
  if (playableCards(prev, pid).length > 0) return null;
  const s = structuredClone(prev);
  const got = take(s, pid, 1)[0];
  say(s, pid, 'Roba una carta');
  settleUno(s);
  if (got && isPlayable(s, got, s.hands[pid]!)) s.drawn = got;
  else s.turn = nextIdx(s, s.turn);
  return s;
}

export function passTurn(prev: UnoState, pid: string): UnoState | null {
  if (prev.winner || !prev.drawn || prev.players[prev.turn]!.id !== pid) return null;
  const s = structuredClone(prev);
  s.drawn = null;
  s.turn = nextIdx(s, s.turn);
  say(s, pid, 'Pasa');
  return s;
}

export type BotMove = { type: 'play'; cardId: string; color?: Color } | { type: 'draw' } | { type: 'pass' };

/** IA: guarda comodines para el final, castiga al siguiente jugador si le queda poco y elige el color que más tiene. */
export function botMove(s: UnoState): BotMove {
  const me = s.players[s.turn]!;
  const hand = s.hands[me.id]!;
  const options = playableCards(s, me.id);
  if (options.length === 0) return s.drawn ? { type: 'pass' } : { type: 'draw' };
  const next = s.players[nextIdx(s, s.turn)]!;
  const nextLow = s.hands[next.id]!.length <= 2;
  const count: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) if (c.color !== 'wild') count[c.color]++;
  let best = options[0]!;
  let bestScore = -Infinity;
  for (const c of options) {
    let sc = 0;
    if (c.kind === 'num') sc = c.n * 0.4 + (c.color !== 'wild' ? count[c.color] * 0.8 : 0);
    else if (c.kind === 'wild') sc = hand.length <= 2 || options.length === 1 ? 3 : -4;
    else if (c.kind === 'wild4') sc = nextLow ? 8 : options.length === 1 ? 2 : -5;
    else sc = 2 + (nextLow ? 4 : 0) + (c.color !== 'wild' ? count[c.color] * 0.5 : 0);
    sc += Math.random() * 0.3;
    if (sc > bestScore) { bestScore = sc; best = c; }
  }
  if (best.color !== 'wild') return { type: 'play', cardId: best.id };
  const rest: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) if (c.id !== best.id && c.color !== 'wild') rest[c.color]++;
  const color = [...COLORS].sort((a, b) => rest[b] - rest[a])[0]!;
  return { type: 'play', cardId: best.id, color: rest[color] === 0 ? COLORS[Math.floor(Math.random() * 4)]! : color };
}

export const handPoints = (hand: readonly UnoCard[]): number => hand.reduce((n, c) => n + cardPoints(c), 0);

/** Canta «¡UNO!» quien se ha quedado con 1 carta. */
export function callUno(prev: UnoState, pid: string): UnoState | null {
  if (!prev.uno || prev.uno.pid !== pid || prev.winner) return null;
  const s = structuredClone(prev);
  s.uno = null;
  say(s, pid, '¡UNO!', 'uno');
  return s;
}

/** Otro jugador canta «¡UNO!» antes que el afectado: este roba 2 cartas de penalización. */
export function catchUno(prev: UnoState, byPid: string): UnoState | null {
  if (!prev.uno || prev.uno.pid === byPid || prev.winner) return null;
  const s = structuredClone(prev);
  const victim = s.players.find((p) => p.id === prev.uno!.pid)!;
  const by = s.players.find((p) => p.id === byPid)!;
  take(s, victim.id, 2);
  s.uno = null;
  say(s, byPid, `¡UNO! ${by.name} caza a ${victim.name}: +2`, 'draw');
  return s;
}

/** Se acabó el tiempo de la ventana sin que nadie actuara. */
export const expireUno = (prev: UnoState): UnoState | null => (prev.uno ? { ...prev, uno: null } : null);

/** Acciones que un jugador puede enviar (en local o a través de la sala). «uno» canta el propio o caza a otro. */
export type UnoAction = { k: 'play'; cardId: string; color?: Color } | { k: 'draw' } | { k: 'pass' } | { k: 'uno' };

export function applyUnoAction(s: UnoState, pid: string, a: UnoAction): UnoState | null {
  switch (a.k) {
    case 'play': return playCard(s, pid, a.cardId, a.color);
    case 'draw': return drawCard(s, pid);
    case 'pass': return passTurn(s, pid);
    case 'uno': return s.uno?.pid === pid ? callUno(s, pid) : catchUno(s, pid);
  }
}
