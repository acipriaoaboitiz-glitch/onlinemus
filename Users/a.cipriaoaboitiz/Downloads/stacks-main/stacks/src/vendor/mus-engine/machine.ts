/**
 * Máquina de estados del Mus. Funciones puras: act(estado, asiento, acción) → estado nuevo + eventos.
 *
 *   mus ──(los 4 dicen "Mus")──▶ discard ──(4 descartes)──▶ mus …
 *    │
 *    └─("No hay mus")──▶ lance: grande → chica → pares → juego | punto
 *                          │   cada lance: paso · envido · órdago · quiero · no quiero
 *                          ▼
 *                      showdown ──▶ handEnd ──(los 4 pulsan CONTINUE)──▶ mus (mano siguiente)
 *                          └─────────────────▶ matchEnd (alguien gana la partida)
 *
 * Cuándo se cuentan los puntos:
 *  · "No quiero" → el equipo que envidó cobra AL INSTANTE el "deje" (las piedras ya aceptadas, 1 como mínimo).
 *  · Envite aceptado o todos pasan → se reparte al enseñar, en orden Grande → Chica → Pares → Juego/Punto.
 *  · Gana el juego quien llega antes al tope contando en ese orden (por eso el orden importa).
 *  · Órdago aceptado → decide el juego en el acto; lo pendiente de lances anteriores ya no cuenta.
 */
import { createDeck, shuffle } from './cards.ts';
import { bestSeat, hasJuego, juegoPoints, paresInfo, paresPoints, strength } from './evaluate.ts';
import { nextSeat, opponentsAfter, orderFrom, teamOf } from './seats.ts';
import type {
  Action, ActResult, AwardKind, Card, GameEvent, HandResult, Lance, LanceRound, LegalAction,
  MusState, PublicState, RoomConfig, Seat, Team,
} from './types.ts';

export const DEFAULT_CONFIG: RoomConfig = {
  targetPoints: 40,
  juegosParaVaca: 2,
  vacasParaPartida: 1,
  eightKings: true,
  juegoReal: false,
  minBet: 2,
  minRaise: 2,
  truthfulSigns: true,
  turnSeconds: 30,
};

/** Valida y completa una configuración. Acepta entrada no fiable (p. ej. el jsonb de la sala). */
export function normalizeConfig(partial: Partial<RoomConfig> = {}): RoomConfig {
  const cfg: RoomConfig = { ...DEFAULT_CONFIG };
  for (const key of Object.keys(DEFAULT_CONFIG) as (keyof RoomConfig)[]) {
    const value = partial[key];
    if (value !== undefined) (cfg as unknown as Record<string, unknown>)[key] = value;
  }
  for (const key of ['targetPoints', 'juegosParaVaca', 'vacasParaPartida', 'minBet', 'minRaise'] as const) {
    if (!Number.isInteger(cfg[key]) || cfg[key] < 1) throw new Error(`Configuración inválida: ${key}`);
  }
  if (cfg.targetPoints < 10 || cfg.targetPoints > 60) throw new Error('targetPoints debe estar entre 10 y 60');
  return cfg;
}

/** Crea una partida nueva con la primera mano repartida. `seed` debe salir de crypto en el servidor. */
export function newMatch(config: Partial<RoomConfig> = {}, seed = 1, mano: Seat = 0): MusState {
  const s: MusState = {
    config: normalizeConfig(config),
    version: 0,
    rng: seed >>> 0,
    phase: 'mus',
    mano,
    turn: mano,
    musCount: 0,
    discardCount: 0,
    lance: null,
    settlements: [],
    score: { points: [0, 0], juegos: [0, 0], vacas: [0, 0] },
    awards: [],
    ready: [false, false, false, false],
    handResult: null,
    hands: [],
    stock: [],
    discards: [],
    revealed: false,
    signalWindow: null,
    signalCatchCooldowns: [0, 0, 0, 0],
    signalPauseUntilMs: 0,
  };
  dealHand(s);
  return s;
}

// ════════════════════════════════ API pública ════════════════════════════════

/** Aplica una acción de `seat`. No muta `prev`. */
export function act(prev: MusState, seat: Seat, action: Action): ActResult {
  const s = structuredClone(prev);
  const events: GameEvent[] = [];
  const error = dispatch(s, seat, action, events);
  if (error) return { ok: false, error };
  s.version += 1;
  return { ok: true, state: s, events };
}

/** Solo necesita la vista pública: el cliente puede calcular sus botones sin conocer cartas ajenas. */
export type LegalCtx = Pick<PublicState, 'config' | 'phase' | 'turn' | 'lance' | 'ready'>;

export function legalActions(s: LegalCtx, seat: Seat): LegalAction[] {
  switch (s.phase) {
    case 'mus':
      return s.turn === seat ? [{ type: 'MUS' }, { type: 'NO_MUS' }] : [];
    case 'discard':
      return s.turn === seat ? [{ type: 'DISCARD', min: 1, max: 4 }] : [];
    case 'handEnd':
      return s.ready[seat] ? [] : [{ type: 'CONTINUE' }];
    case 'matchEnd':
      return [];
    case 'lance': {
      const L = s.lance;
      if (!L || L.turn !== seat) return [];
      const cfg = s.config;
      if (L.stage === 'open') {
        return [{ type: 'PASO' }, { type: 'ENVIDO', min: cfg.minBet, max: cfg.targetPoints }, { type: 'ORDAGO' }];
      }
      const out: LegalAction[] = [{ type: 'QUIERO' }, { type: 'NO_QUIERO' }];
      const total = L.bet?.total;
      if (total !== undefined && total !== 'ordago') {
        if (total + cfg.minRaise <= cfg.targetPoints) {
          out.push({ type: 'ENVIDO', min: cfg.minRaise, max: cfg.targetPoints - total });
        }
        out.push({ type: 'ORDAGO' });
      }
      return out;
    }
  }
}

/** Estado que puede ver cualquiera: sin manos, sin mazo, sin semilla. */
export function publicView(s: MusState): PublicState {
  const {
    rng: _rng, hands, stock, discards: _discards, revealed,
    signalWindow: _signalWindow, signalCatchCooldowns: _signalCatchCooldowns,
    signalPauseUntilMs: _signalPauseUntilMs, ...pub
  } = s;
  return {
    ...pub,
    handCounts: hands.map((h) => h.length),
    stockCount: stock.length,
    revealedHands: revealed ? hands : null,
  };
}

/** Las cartas de un asiento: solo se entregan a su dueño. */
export const handOf = (s: MusState, seat: Seat): Card[] => s.hands[seat];

/**
 * Jugada segura para turnos que caducan o asientos desconectados / bots básicos:
 * cortar el mus, descartar la carta más floja, pasar, no querer y continuar.
 */
export function autoAction(s: MusState, seat: Seat): Action | null {
  const kinds = new Set(legalActions(s, seat).map((l) => l.type));
  if (kinds.has('NO_MUS')) return { type: 'NO_MUS' };
  if (kinds.has('DISCARD')) {
    const weakest = [...s.hands[seat]].sort((a, b) => strength(a.rank, s.config) - strength(b.rank, s.config))[0];
    return { type: 'DISCARD', cardIds: [weakest.id] };
  }
  if (kinds.has('PASO')) return { type: 'PASO' };
  if (kinds.has('NO_QUIERO')) return { type: 'NO_QUIERO' };
  if (kinds.has('CONTINUE')) return { type: 'CONTINUE' };
  return null;
}

// ═════════════════════════════════ Transiciones ══════════════════════════════

function dispatch(s: MusState, seat: Seat, a: Action, ev: GameEvent[]): string | null {
  switch (s.phase) {
    case 'mus': return doMus(s, seat, a, ev);
    case 'discard': return doDiscard(s, seat, a, ev);
    case 'lance': return doLance(s, seat, a, ev);
    case 'handEnd': return doContinue(s, seat, a, ev);
    case 'matchEnd': return 'La partida ha terminado';
  }
}

/** Reparte 4 cartas a cada asiento con el mazo barajado y deja el estado listo para decir Mus. */
function dealHand(s: MusState): GameEvent[] {
  const mixed = shuffle(createDeck(), s.rng);
  s.rng = mixed.rng;
  s.hands = [0, 1, 2, 3].map((i) => mixed.items.slice(i * 4, i * 4 + 4));
  s.stock = mixed.items.slice(16);
  s.discards = [];
  s.phase = 'mus';
  s.turn = s.mano;
  s.musCount = 0;
  s.discardCount = 0;
  s.lance = null;
  s.settlements = [];
  s.awards = [];
  s.ready = [false, false, false, false];
  s.revealed = false;
  s.signalWindow = null;
  s.handResult = null;
  return [{ t: 'handStart', mano: s.mano }];
}

// ── Mus ────────────────────────────────────────────────────────────────────

function doMus(s: MusState, seat: Seat, a: Action, ev: GameEvent[]): string | null {
  if (seat !== s.turn) return 'No es tu turno';
  if (a.type === 'MUS') {
    ev.push({ t: 'mus', seat });
    s.musCount += 1;
    if (s.musCount === 4) {
      s.phase = 'discard';
      s.musCount = 0;
      s.discardCount = 0;
      s.turn = s.mano;
    } else {
      s.turn = nextSeat(seat);
    }
    return null;
  }
  if (a.type === 'NO_MUS') {
    ev.push({ t: 'noMus', seat });
    s.musCount = 0;
    s.phase = 'lance';
    s.settlements = [];
    enterLance(s, 'grande', ev);
    return null;
  }
  return 'Toca decir Mus o No hay mus';
}

// ── Descarte (por turno desde la mano; todos ven cuántas cartas pide cada uno) ──

function doDiscard(s: MusState, seat: Seat, a: Action, ev: GameEvent[]): string | null {
  if (seat !== s.turn) return 'No es tu turno';
  if (a.type !== 'DISCARD') return 'Toca descartar';
  const ids = a.cardIds;
  if (new Set(ids).size !== ids.length) return 'Cartas repetidas';
  if (ids.length < 1 || ids.length > 4) return 'Descarta de 1 a 4 cartas';
  const hand = s.hands[seat];
  const out = hand.filter((c) => ids.includes(c.id));
  if (out.length !== ids.length) return 'Alguna de esas cartas no está en tu mano';

  const keep = hand.filter((c) => !ids.includes(c.id));
  s.hands[seat] = [...keep, ...drawCards(s, out.length)]; // se roba antes de tirar: no recibes lo que acabas de descartar
  s.discards.push(...out);
  ev.push({ t: 'discard', seat, count: out.length });

  s.discardCount += 1;
  if (s.discardCount === 4) {
    s.phase = 'mus';
    s.discardCount = 0;
    s.musCount = 0;
    s.turn = s.mano;
  } else {
    s.turn = nextSeat(seat);
  }
  return null;
}

/** Si el mazo se agota se baraja el descarte (sin las cartas que acaba de tirar quien roba). */
function drawCards(s: MusState, n: number): Card[] {
  const out: Card[] = [];
  while (out.length < n) {
    if (s.stock.length === 0) {
      if (s.discards.length === 0) throw new Error('Invariante rota: no quedan cartas que repartir');
      const mixed = shuffle(s.discards, s.rng);
      s.rng = mixed.rng;
      s.stock = mixed.items;
      s.discards = [];
    }
    out.push(s.stock.shift() as Card);
  }
  return out;
}

// ── Lances ─────────────────────────────────────────────────────────────────

/**
 * Abre un lance. En Pares y Juego cada jugador declara con sinceridad si lo tiene (aquí se calcula solo:
 * es información pública y no hay decisión), y solo juegan los que dicen "sí".
 */
function enterLance(s: MusState, requested: Lance, ev: GameEvent[]): void {
  const cfg = s.config;
  const order = orderFrom(s.mano);
  let lance = requested;
  let participants: Seat[] = order;

  if (lance === 'pares' || lance === 'juego') {
    const kind = lance;
    participants = order.filter((seat) => {
      const has = kind === 'pares' ? paresInfo(s.hands[seat], cfg).kind > 0 : hasJuego(s.hands[seat], cfg);
      ev.push({ t: 'declare', seat, lance: kind, has });
      return has;
    });
    if (participants.length === 0) {
      if (kind === 'pares') {
        ev.push({ t: 'lanceSkipped', lance: 'pares' });
        return nextLance(s, 'pares', ev);
      }
      lance = 'punto'; // nadie tiene juego: se juega al Punto entre los cuatro
      participants = order;
    }
  }

  ev.push({ t: 'lanceStart', lance, participants });

  if (new Set(participants.map(teamOf)).size < 2) {
    // Solo una pareja tiene el lance: no hay apuesta y puntúa al enseñar.
    s.settlements.push({ lance, participants, outcome: 'passed', stake: 0, foldWinner: null });
    return nextLance(s, lance, ev);
  }

  s.phase = 'lance';
  s.lance = {
    lance, participants, stage: 'open', turn: participants[0],
    openQueue: [...participants], bet: null, level: 1, responders: [],
  };
  s.turn = participants[0];
}

function nextLance(s: MusState, done: Lance, ev: GameEvent[]): void {
  s.lance = null;
  if (done === 'grande') return enterLance(s, 'chica', ev);
  if (done === 'chica') return enterLance(s, 'pares', ev);
  if (done === 'pares') return enterLance(s, 'juego', ev);
  showdown(s, ev); // tras Juego o Punto
}

function checkAmount(amount: number, min: number, max: number): string | null {
  if (!Number.isInteger(amount) || amount < min) return `El envite mínimo es ${min}`;
  if (amount > max) return `El envite máximo es ${max}`;
  return null;
}

/** Un envite (o subida) pasa la palabra a los rivales que juegan el lance, empezando por el siguiente en orden. */
function placeBet(s: MusState, L: LanceRound, seat: Seat, total: number | 'ordago'): void {
  L.bet = { team: teamOf(seat), by: seat, total };
  L.stage = 'respond';
  L.openQueue = [];
  L.responders = opponentsAfter(seat, L.participants);
  L.turn = L.responders[0];
  s.turn = L.turn;
}

function doLance(s: MusState, seat: Seat, a: Action, ev: GameEvent[]): string | null {
  const L = s.lance;
  if (!L) return 'Estado inconsistente: no hay lance en curso';
  if (seat !== L.turn) return 'No es tu turno';
  const cfg = s.config;
  const lance = L.lance;

  // ── Apertura: se va pasando hasta que alguien envida (o todos pasan) ──
  if (L.stage === 'open') {
    switch (a.type) {
      case 'PASO': {
        ev.push({ t: 'paso', seat, lance });
        L.openQueue.shift();
        if (L.openQueue.length === 0) {
          s.settlements.push({ lance, participants: L.participants, outcome: 'passed', stake: 0, foldWinner: null });
          nextLance(s, lance, ev);
        } else {
          L.turn = L.openQueue[0];
          s.turn = L.turn;
        }
        return null;
      }
      case 'ENVIDO': {
        const error = checkAmount(a.amount, cfg.minBet, cfg.targetPoints);
        if (error) return error;
        ev.push({ t: 'envido', seat, lance, amount: a.amount, total: a.amount, raise: false });
        placeBet(s, L, seat, a.amount);
        return null;
      }
      case 'ORDAGO':
        ev.push({ t: 'ordago', seat, lance });
        placeBet(s, L, seat, 'ordago');
        return null;
      default:
        return 'Ahora toca: paso, envido u órdago';
    }
  }

  // ── Respuesta a un envite: quiero · no quiero · subir · órdago ──
  const bet = L.bet;
  if (!bet) return 'Estado inconsistente: no hay envite en litigio';
  switch (a.type) {
    case 'QUIERO': {
      ev.push({ t: 'quiero', seat, lance });
      if (bet.total === 'ordago') {
        resolveOrdago(s, L, ev);
      } else {
        s.settlements.push({ lance, participants: L.participants, outcome: 'seen', stake: bet.total, foldWinner: null });
        nextLance(s, lance, ev);
      }
      return null;
    }
    case 'NO_QUIERO': {
      ev.push({ t: 'noQuiero', seat, lance });
      L.responders.shift();
      if (L.responders.length > 0) {
        // Decide la pareja: si uno no quiere, su compañero todavía puede querer o subir.
        L.turn = L.responders[0];
        s.turn = L.turn;
        return null;
      }
      // Rechazado por todos: "deje" inmediato (el envite aceptado antes, 1 como mínimo).
      if (addPoints(s, bet.team, L.level, lance, 'deje', ev)) return null; // el deje puede decidir el juego
      if (lance !== 'grande' && lance !== 'chica') {
        // Pares/Juego/Punto: quien envidó gana el lance sin enseñar y aún cobra su jugada al final.
        s.settlements.push({ lance, participants: L.participants, outcome: 'folded', stake: 0, foldWinner: bet.team });
      }
      nextLance(s, lance, ev);
      return null;
    }
    case 'ENVIDO': {
      if (bet.total === 'ordago') return 'Un órdago no se puede subir';
      if (!Number.isInteger(a.amount) || a.amount < cfg.minRaise) return `La subida mínima es ${cfg.minRaise}`;
      const total = bet.total + a.amount;
      if (total > cfg.targetPoints) return `El envite máximo es ${cfg.targetPoints}`;
      ev.push({ t: 'envido', seat, lance, amount: a.amount, total, raise: true });
      L.level = bet.total; // lo anterior queda aceptado: es lo que cobra quien sube si le rechazan
      placeBet(s, L, seat, total);
      return null;
    }
    case 'ORDAGO': {
      if (bet.total === 'ordago') return 'Un órdago no se puede subir';
      ev.push({ t: 'ordago', seat, lance });
      L.level = bet.total;
      placeBet(s, L, seat, 'ordago');
      return null;
    }
    default:
      return 'Ahora toca: quiero, no quiero o subir';
  }
}

// ── Puntuación ─────────────────────────────────────────────────────────────

/** Suma piedras. Devuelve true si con ellas el equipo gana el juego (y entonces la mano termina). */
function addPoints(s: MusState, team: Team, points: number, lance: Lance, kind: AwardKind, ev: GameEvent[]): boolean {
  if (points <= 0) return false;
  s.score.points[team] += points;
  s.awards.push({ lance, team, points, kind });
  ev.push({ t: 'award', team, points, lance, kind });
  if (s.score.points[team] >= s.config.targetPoints) {
    winGame(s, team, 'points', ev);
    return true;
  }
  return false;
}

function winGame(s: MusState, team: Team, by: 'points' | 'ordago', ev: GameEvent[]): void {
  const sc = s.score;
  sc.points[team] = s.config.targetPoints;
  sc.juegos[team] += 1;
  ev.push({ t: 'gameWon', team, by });
  const result: HandResult = { gameWinner: team, vacaWinner: null, matchWinner: null, by };
  if (sc.juegos[team] >= s.config.juegosParaVaca) {
    sc.vacas[team] += 1;
    result.vacaWinner = team;
    ev.push({ t: 'vacaWon', team });
    if (sc.vacas[team] >= s.config.vacasParaPartida) {
      result.matchWinner = team;
      ev.push({ t: 'matchWon', team });
    }
  }
  s.handResult = result;
  s.lance = null;
  s.turn = null;
  s.phase = result.matchWinner === null ? 'handEnd' : 'matchEnd';
}

/** Órdago aceptado: se enseñan las cartas del lance y quien lo gane gana el juego. */
function resolveOrdago(s: MusState, L: LanceRound, ev: GameEvent[]): void {
  s.revealed = true;
  ev.push({ t: 'showdown' });
  const winner = bestSeat(L.lance, L.participants, s.hands, s.config);
  winGame(s, teamOf(winner), 'ordago', ev);
}

/**
 * Enseñar cartas y contar, en orden. Reglas de reparto (Pagat):
 *  · Grande/Chica: todos pasan → 1 · envite visto → lo envidado · rechazado → ya se cobró el deje.
 *  · Pares/Juego: envite visto → lo envidado + la jugada de AMBOS compañeros del equipo ganador;
 *    sin envite → solo la jugada · rechazado → gana quien envidó (sin comparar) y cobra su jugada.
 *  · Punto: 1 piedra extra para el ganador (además del envite o del deje).
 */
function showdown(s: MusState, ev: GameEvent[]): void {
  s.lance = null;
  s.turn = null;
  s.revealed = true;
  ev.push({ t: 'showdown' });
  const cfg = s.config;

  for (const st of s.settlements) {
    const { lance } = st;
    const winner: Team =
      st.outcome === 'folded' ? (st.foldWinner as Team) : teamOf(bestSeat(lance, st.participants, s.hands, cfg));

    if (lance === 'grande' || lance === 'chica') {
      const ended = st.outcome === 'seen'
        ? addPoints(s, winner, st.stake, lance, 'envite', ev)
        : addPoints(s, winner, 1, lance, 'paso', ev);
      if (ended) return;
      continue;
    }

    if (st.outcome === 'seen' && addPoints(s, winner, st.stake, lance, 'envite', ev)) return;

    let bonus = 0;
    if (lance === 'punto') {
      bonus = 1;
    } else {
      for (const seat of st.participants) {
        if (teamOf(seat) !== winner) continue;
        bonus += lance === 'pares' ? paresPoints(s.hands[seat], cfg) : juegoPoints(s.hands[seat], cfg);
      }
    }
    if (addPoints(s, winner, bonus, lance, 'jugada', ev)) return;
  }

  s.phase = 'handEnd';
  s.handResult = { gameWinner: null, vacaWinner: null, matchWinner: null, by: null };
}

// ── Fin de mano ────────────────────────────────────────────────────────────

/** Cuando los cuatro asientos pulsan continuar: marcador a cero si hubo juego, y mano al siguiente. */
function doContinue(s: MusState, seat: Seat, a: Action, ev: GameEvent[]): string | null {
  if (a.type !== 'CONTINUE') return 'La mano ha terminado: pulsa continuar';
  s.ready[seat] = true;
  if (s.ready.every(Boolean)) {
    const res = s.handResult;
    if (res?.gameWinner != null) s.score.points = [0, 0];
    if (res?.vacaWinner != null) s.score.juegos = [0, 0];
    s.mano = nextSeat(s.mano);
    ev.push(...dealHand(s));
  }
  return null;
}
