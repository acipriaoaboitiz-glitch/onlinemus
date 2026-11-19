import { handTotal, paresInfo, strength, teamOf } from '@mus/engine';
import type { AwardLine, Card, GameEvent, Lance, PublicState, RoomConfig, Seat, Team } from '@mus/engine';

export const LANCE_LABEL: Record<Lance, string> = {
  grande: 'Grande',
  chica: 'Chica',
  pares: 'Pares',
  juego: 'Juego',
  punto: 'Punto',
};

export const teamLabel = (team: Team, mySeat: Seat): string => (team === teamOf(mySeat) ? 'Nosotros' : 'Ellos');

export type Tone = 'neutral' | 'bet' | 'good' | 'bad' | 'ordago';

export interface Bubble {
  text: string;
  tone: Tone;
  at: number;
}

/** Lo que dice cada jugador, en su globo de diálogo. */
export function bubbleFor(e: GameEvent): { seat: Seat; text: string; tone: Tone } | null {
  switch (e.t) {
    case 'mus': return { seat: e.seat, text: 'Mus', tone: 'neutral' };
    case 'noMus': return { seat: e.seat, text: 'No hay mus', tone: 'good' };
    case 'discard': return { seat: e.seat, text: `Descarto ${e.count}`, tone: 'neutral' };
    case 'declare':
      return {
        seat: e.seat,
        text: e.lance === 'pares' ? (e.has ? 'Hay pares' : 'No hay pares') : e.has ? 'Hay juego' : 'No hay juego',
        tone: e.has ? 'good' : 'neutral',
      };
    case 'paso': return { seat: e.seat, text: 'Paso', tone: 'neutral' };
    case 'envido': return { seat: e.seat, text: e.raise ? `Subo ${e.amount} más` : `Envido ${e.amount}`, tone: 'bet' };
    case 'ordago': return { seat: e.seat, text: '¡Órdago!', tone: 'ordago' };
    case 'quiero': return { seat: e.seat, text: 'Quiero', tone: 'good' };
    case 'noQuiero': return { seat: e.seat, text: 'No quiero', tone: 'bad' };
    default: return null;
  }
}

/** Mensaje destacado en el centro de la mesa. */
export function bannerFor(e: GameEvent, mySeat: Seat): string | null {
  switch (e.t) {
    // El cambio de lance lo anuncia <PhaseCinematic/>; aquí solo quedan avisos que no tienen cinemática propia.
    case 'showdown': return 'Enseñar cartas';
    case 'award':
      // Los puntos del enseñar los detalla el resumen de la mano; aquí solo el deje, que ocurre en pleno juego.
      return e.kind === 'deje' ? `Deje: ${teamLabel(e.team, mySeat)} +${e.points}` : null;
    case 'gameWon': return `¡Juego para ${teamLabel(e.team, mySeat).toLowerCase()}!`;
    case 'vacaWon': return `¡Vaca para ${teamLabel(e.team, mySeat).toLowerCase()}!`;
    case 'matchWon': return `¡Partida para ${teamLabel(e.team, mySeat).toLowerCase()}!`;
    default: return null;
  }
}

export interface AwardRow {
  key: string;
  lance: Lance;
  label: string;
  team: Team;
  who: string;
  points: number;
}

export function awardRows(awards: readonly AwardLine[], mySeat: Seat): AwardRow[] {
  return awards.map((a, i) => ({
    key: `${i}-${a.lance}-${a.kind}`,
    lance: a.lance,
    label:
      a.kind === 'deje' ? 'deje (no quiero)'
      : a.kind === 'paso' ? 'todos pasan'
      : a.kind === 'envite' ? 'envite aceptado'
      : a.lance === 'pares' ? 'jugada de pares'
      : a.lance === 'juego' ? 'jugada de juego'
      : 'ganar el punto',
    team: a.team,
    who: teamLabel(a.team, mySeat),
    points: a.points,
  }));
}

const NAMES_8 = ['as', 'cuatro', 'cinco', 'seis', 'siete', 'sota', 'caballo', 'rey'];
const PLURAL_8 = ['ases', 'cuatros', 'cincos', 'seises', 'sietes', 'sotas', 'caballos', 'reyes'];
const NAMES_4 = ['as', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'sota', 'caballo', 'rey'];
const PLURAL_4 = ['ases', 'doses', 'treses', 'cuatros', 'cincos', 'seises', 'sietes', 'sotas', 'caballos', 'reyes'];

/** `strength` es la fuerza del motor (1 = as … máximo = rey). */
export function rankName(strength: number, cfg: Pick<RoomConfig, 'eightKings'>, plural = false): string {
  const list = cfg.eightKings ? (plural ? PLURAL_8 : NAMES_8) : plural ? PLURAL_4 : NAMES_4;
  return list[strength - 1] ?? '?';
}

export interface HandInfo {
  pares: string | null;
  juego: string;
}

/** Descripción corta de una mano enseñada: "Duples de reyes y sotas", "Juego 31"… */
export function describeHand(hand: readonly Card[], cfg: RoomConfig): HandInfo {
  const p = paresInfo(hand, cfg);
  const total = handTotal(hand, cfg);
  const r = (s: number) => rankName(s, cfg, true);
  let pares: string | null = null;
  if (p.kind === 1) pares = `Pares de ${r(p.key[0])}`;
  else if (p.kind === 2) pares = `Medias de ${r(p.key[0])}`;
  else if (p.kind === 3) pares = p.key[0] === p.key[1] ? `Duples de ${r(p.key[0])}` : `Duples de ${r(p.key[0])} y ${r(p.key[1])}`;
  return { pares, juego: total >= 31 ? `Juego ${total}` : `Punto ${total}` };
}

export function betText(total: number | 'ordago'): string {
  return total === 'ordago' ? 'un órdago' : `un envite de ${total}`;
}

/** Texto de ayuda sobre a quién le toca y qué se espera. */
export function turnHint(view: PublicState, mySeat: Seat, names: readonly string[]): { text: string; mine: boolean } {
  const nm = (s: Seat) => names[s] ?? `Jugador ${s + 1}`;
  switch (view.phase) {
    case 'mus':
      return view.turn === mySeat
        ? { text: '¿Mus?', mine: true }
        : { text: `${nm(view.turn as Seat)} decide si hay mus`, mine: false };
    case 'discard':
      return view.turn === mySeat
        ? { text: 'Marca las cartas que quieres cambiar', mine: true }
        : { text: `${nm(view.turn as Seat)} descarta`, mine: false };
    case 'lance': {
      const L = view.lance;
      if (!L) return { text: '', mine: false };
      if (L.turn !== mySeat) return { text: `Habla ${nm(L.turn)}`, mine: false };
      if (L.stage === 'open') return { text: `Tu palabra en ${LANCE_LABEL[L.lance]}`, mine: true };
      const bet = L.bet;
      return { text: bet ? `Te plantan ${betText(bet.total)}: ¿quieres?` : '¿Quieres?', mine: true };
    }
    case 'handEnd': return { text: 'Mano terminada', mine: false };
    case 'matchEnd': return { text: 'Partida terminada', mine: false };
  }
}

/** Resumen de la apuesta en curso para el centro de la mesa. */
export function betSummary(view: PublicState, mySeat: Seat, names: readonly string[]): { head: string; sub: string } | null {
  const L = view.lance;
  if (!L) return null;
  const nm = (s: Seat) => (s === mySeat ? 'Tú' : names[s] ?? '');
  const players = L.lance === 'pares' || L.lance === 'juego' ? `Juegan: ${L.participants.map(nm).join(', ')}` : '';
  if (L.stage === 'open' || !L.bet) return { head: 'Sin envite', sub: players || 'Se va pasando' };
  // level > 1 significa que ya hubo un envite aceptado por debajo: lo actual es una subida.
  const head =
    L.bet.total === 'ordago' ? `${nm(L.bet.by)} canta órdago`
    : L.level > 1 ? `${nm(L.bet.by)} sube a ${L.bet.total}`
    : `${nm(L.bet.by)} envida ${L.bet.total}`;
  return { head, sub: `Si no quieren: +${L.level}${players ? ' · ' + players : ''}` };
}

const SUIT_ORDER = ['oros', 'copas', 'espadas', 'bastos'];

/** Orden de lectura cómodo: lo más alto a la izquierda. */
export function sortHand(hand: readonly Card[], cfg: Pick<RoomConfig, 'eightKings' | 'juegoReal'>): Card[] {
  return [...hand].sort((a, b) => strength(b.rank, cfg) - strength(a.rank, cfg) || SUIT_ORDER.indexOf(a.suit) - SUIT_ORDER.indexOf(b.suit));
}

export function cardName(card: Card): string {
  const n = card.rank === 10 ? 'Sota' : card.rank === 11 ? 'Caballo' : card.rank === 12 ? 'Rey' : String(card.rank);
  return `${n} de ${card.suit}`;
}

export interface LogLine {
  text: string;
  tone: Tone | 'head';
}

/** Una línea del registro de la mano (panel lateral en escritorio). */
export function logLine(e: GameEvent, names: readonly string[], mySeat: Seat): LogLine | null {
  const nm = (s: Seat) => (s === mySeat ? 'Tú' : names[s] || `Jugador ${s + 1}`);
  switch (e.t) {
    case 'handStart': return { text: `Nueva mano · es mano ${nm(e.mano)}`, tone: 'head' };
    case 'lanceStart': return { text: LANCE_LABEL[e.lance], tone: 'head' };
    case 'lanceSkipped': return { text: 'Nadie tiene pares', tone: 'neutral' };
    case 'showdown': return { text: 'Se enseñan las cartas', tone: 'head' };
    case 'award':
      return { text: `${LANCE_LABEL[e.lance]}: ${teamLabel(e.team, mySeat)} +${e.points}`, tone: e.team === teamOf(mySeat) ? 'good' : 'bad' };
    case 'gameWon': return { text: `¡Juego para ${teamLabel(e.team, mySeat).toLowerCase()}!`, tone: 'head' };
    case 'vacaWon': return { text: `¡Vaca para ${teamLabel(e.team, mySeat).toLowerCase()}!`, tone: 'head' };
    case 'matchWon': return { text: `¡Partida para ${teamLabel(e.team, mySeat).toLowerCase()}!`, tone: 'head' };
    case 'declare': return null;
    default: {
      const b = bubbleFor(e);
      return b ? { text: `${nm(b.seat)}: ${b.text}`, tone: b.tone } : null;
    }
  }
}
