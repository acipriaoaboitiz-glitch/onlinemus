/**
 * Tipos del motor de Mus. Todo es JSON-serializable: el estado completo cabe en una columna jsonb.
 */

export type Suit = 'oros' | 'copas' | 'espadas' | 'bastos';
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  /** "o7" = 7 de oros · "c12" = rey de copas · "e1" = as de espadas · "b10" = sota de bastos */
  id: string;
  suit: Suit;
  rank: Rank;
}

/** Asientos 0..3 en orden de palabra (sentido antihorario). Las parejas se sientan enfrente: 0-2 y 1-3. */
export type Seat = 0 | 1 | 2 | 3;
export type Team = 0 | 1;
export type Lance = 'grande' | 'chica' | 'pares' | 'juego' | 'punto';
export type SignId =
  | 'ciego' | 'dos_reyes' | 'tres_reyes' | 'cuatro_reyes' | 'solomillo'
  | 'dos_cerdos' | 'tres_cerdos' | 'cuatro_cerdos'
  | 'medias' | 'duples' | 'treinta_y_una' | 'treinta'
  | 'quiero_mus' | 'no_mus';

export interface RoomConfig {
  /** Piedras para ganar un juego (40 por defecto; 30 y 25 también son habituales). */
  targetPoints: number;
  /** Juegos que hay que ganar para llevarse una vaca (2 = "mejor de tres"). */
  juegosParaVaca: number;
  /** Vacas que hay que ganar para ganar la partida. */
  vacasParaPartida: number;
  /** Baraja de 8 reyes: los 3 son reyes y los 2 son ases ("cerdos"). false = 4 reyes y 4 ases. */
  eightKings: boolean;
  /** Variante: tres sietes + una figura = "juego real", que gana al 31. */
  juegoReal: boolean;
  /** Envite mínimo al abrir. */
  minBet: number;
  /** Subida mínima sobre un envite. */
  minRaise: number;
  /** Las señas solo se pueden enviar si coinciden con tu mano (en el Mus real no se miente con las señas). */
  truthfulSigns: boolean;
  /** Segundos por turno (0 = sin límite). Lo aplica el servidor; el motor solo lo transporta. */
  turnSeconds: number;
}

export interface Score {
  /** Piedras de cada equipo en el juego en curso. */
  points: [number, number];
  /** Juegos ganados en la vaca en curso. */
  juegos: [number, number];
  /** Vacas ganadas en la partida. */
  vacas: [number, number];
}

export type Phase = 'mus' | 'discard' | 'lance' | 'handEnd' | 'matchEnd';

/** Envite pendiente de respuesta. */
export interface Bet {
  team: Team;
  by: Seat;
  total: number | 'ordago';
}

export interface LanceRound {
  lance: Lance;
  /** Quién juega el lance, ordenados desde la mano (en Pares/Juego solo quien "tiene"). */
  participants: Seat[];
  /** open: se va pasando o envidando · respond: hay un envite pendiente */
  stage: 'open' | 'respond';
  turn: Seat;
  /** Quién falta por hablar en la apertura (el primero es el turno). */
  openQueue: Seat[];
  bet: Bet | null;
  /**
   * Piedras ya "aceptadas": lo que cobra quien envida si todos los rivales dicen "no quiero" (el "deje").
   * Empieza en 1 y, tras una subida, pasa a ser el total anterior.
   */
  level: number;
  /** Rivales que aún tienen que contestar (el primero es el turno). Decide la pareja: basta un "quiero". */
  responders: Seat[];
}

/** Resultado de un lance, pendiente de contarse en el showdown. */
export interface Settlement {
  lance: Lance;
  participants: Seat[];
  outcome: 'passed' | 'seen' | 'folded';
  /** Envite aceptado (solo cuando outcome = 'seen'). */
  stake: number;
  /** Equipo que hizo la última apuesta o subida (solo 'folded'): gana el lance sin enseñar cartas. */
  foldWinner: Team | null;
}

export type AwardKind = 'deje' | 'envite' | 'paso' | 'jugada';

export interface AwardLine {
  lance: Lance;
  team: Team;
  points: number;
  kind: AwardKind;
}

export interface HandResult {
  gameWinner: Team | null;
  vacaWinner: Team | null;
  matchWinner: Team | null;
  by: 'points' | 'ordago' | null;
}

/** Lo que ve toda la mesa. Nunca contiene cartas ocultas. */
export interface PublicState {
  config: RoomConfig;
  version: number;
  phase: Phase;
  mano: Seat;
  turn: Seat | null;
  /** Cuántos han dicho "Mus" en la ronda actual. */
  musCount: number;
  /** Cuántos han descartado en la ronda actual. */
  discardCount: number;
  lance: LanceRound | null;
  settlements: Settlement[];
  score: Score;
  /** Piedras repartidas en la mano actual (resumen de fin de mano). */
  awards: AwardLine[];
  /** Quién ha pulsado "continuar" al terminar la mano. */
  ready: boolean[];
  handResult: HandResult | null;
  /** Cartas en la mano de cada asiento (siempre 4). */
  handCounts: number[];
  stockCount: number;
  /** Las cuatro manos: solo tras el showdown o un órdago aceptado. */
  revealedHands: Card[][] | null;
}

/** Estado completo (solo servidor). */
export interface MusState extends Omit<PublicState, 'handCounts' | 'stockCount' | 'revealedHands'> {
  /** Estado del PRNG: la partida es reproducible a partir de la semilla inicial. */
  rng: number;
  hands: Card[][];
  stock: Card[];
  discards: Card[];
  revealed: boolean;
  /** Seña vigente, privada salvo por el pulso público sin el identificador. */
  signalWindow: { seat: Seat; id: SignId; startedAtMs: number; expiresAtMs: number } | null;
  /** Cooldown validado por el servidor para evitar intentos repetidos de captura. */
  signalCatchCooldowns: number[];
  /** Pausa autoritativa de un segundo tras confirmar una seña cazada. */
  signalPauseUntilMs: number;
}

export type Action =
  | { type: 'MUS' }
  | { type: 'NO_MUS' }
  | { type: 'DISCARD'; cardIds: string[] }
  | { type: 'PASO' }
  /** Al abrir es el envite (mín. 2). Respondiendo es la subida: "y X más". */
  | { type: 'ENVIDO'; amount: number }
  | { type: 'ORDAGO' }
  | { type: 'QUIERO' }
  | { type: 'NO_QUIERO' }
  | { type: 'CONTINUE' };

/** Lo que puede hacer un asiento ahora mismo: alimenta los botones de la UI. */
export type LegalAction =
  | { type: 'MUS' | 'NO_MUS' | 'PASO' | 'ORDAGO' | 'QUIERO' | 'NO_QUIERO' | 'CONTINUE' }
  | { type: 'DISCARD'; min: number; max: number }
  | { type: 'ENVIDO'; min: number; max: number };

/** Eventos públicos de cada movimiento: alimentan animaciones, burbujas de "habla" y el historial. */
export type GameEvent =
  | { t: 'handStart'; mano: Seat }
  | { t: 'mus'; seat: Seat }
  | { t: 'noMus'; seat: Seat }
  | { t: 'discard'; seat: Seat; count: number }
  | { t: 'declare'; seat: Seat; lance: 'pares' | 'juego'; has: boolean }
  | { t: 'lanceStart'; lance: Lance; participants: Seat[] }
  | { t: 'lanceSkipped'; lance: Lance }
  | { t: 'paso'; seat: Seat; lance: Lance }
  | { t: 'envido'; seat: Seat; lance: Lance; amount: number; total: number; raise: boolean }
  | { t: 'ordago'; seat: Seat; lance: Lance }
  | { t: 'quiero'; seat: Seat; lance: Lance }
  | { t: 'noQuiero'; seat: Seat; lance: Lance }
  | { t: 'award'; team: Team; points: number; lance: Lance; kind: AwardKind }
  | { t: 'showdown' }
  | { t: 'gameWon'; team: Team; by: 'points' | 'ordago' }
  | { t: 'vacaWon'; team: Team }
  | { t: 'matchWon'; team: Team }
  | { t: 'signal_pulse'; seat: Seat; at: number }
  | { t: 'signal_resolution'; result: 'caught' | 'false_alarm'; signalSeat: Seat | null; catcher: Seat; team: Team };

export type ActResult =
  | { ok: true; state: MusState; events: GameEvent[] }
  | { ok: false; error: string };
