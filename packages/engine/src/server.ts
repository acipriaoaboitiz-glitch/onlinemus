/**
 * Núcleo del servidor, sin dependencias de plataforma. La Edge Function de Supabase solo aporta las
 * funciones de acceso a datos (`ServerDeps`); aquí vive toda la lógica (arranque de la partida,
 * validación de lo que manda el cliente, bots, turnos que caducan) y por eso se prueba en memoria.
 */
import { botAction } from './bot.ts';
import { act, autoAction, legalActions, newMatch, normalizeConfig } from './machine.ts';
import { SEATS } from './seats.ts';
import type { Action, GameEvent, MusState, Seat } from './types.ts';

export type RoomStatus = 'lobby' | 'playing' | 'finished' | 'abandoned';

export interface PlayerRow {
  seat: number;
  user_id: string | null;
  is_bot: boolean;
}

export interface RoomRow {
  id: string;
  host_id: string;
  status: RoomStatus;
  config: Record<string, unknown> | null;
}

export interface GameRow {
  version: number;
  state: MusState;
  /** Cuándo se confirmó el último movimiento (reloj del servidor). */
  updatedAtMs: number;
}

export interface CommitArgs {
  roomId: string;
  /** Versión que se esperaba: si ya no es la actual, el commit devuelve false. -1 = crear la partida. */
  expected: number;
  state: MusState;
  events: GameEvent[];
  seat: number | null;
  action: unknown;
}

export interface ServerDeps {
  getRoom(roomId: string): Promise<RoomRow | null>;
  getPlayers(roomId: string): Promise<PlayerRow[]>;
  loadGame(roomId: string): Promise<GameRow | null>;
  commit(args: CommitArgs): Promise<boolean>;
  setRoomStatus(roomId: string, status: RoomStatus): Promise<void>;
  now(): number;
  /** [semilla del mazo, semilla de la mano inicial]. En producción sale de crypto. */
  randomSeed(): [number, number];
}

export type GameRequest =
  | { kind: 'start' }
  | { kind: 'action'; action: unknown }
  | { kind: 'tick' };

export interface GameResponse {
  status: number;
  body: Record<string, unknown>;
}

const ok = (body: Record<string, unknown> = { ok: true }): GameResponse => ({ status: 200, body });
const fail = (status: number, error: string): GameResponse => ({ status, body: { error } });

const SIMPLE = new Set(['MUS', 'NO_MUS', 'PASO', 'ORDAGO', 'QUIERO', 'NO_QUIERO', 'CONTINUE']);

/** Todo lo que llega del cliente es no fiable: se reconstruye la acción campo a campo. */
export function sanitizeAction(raw: unknown): Action | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const a = raw as Record<string, unknown>;
  if (typeof a.type !== 'string') return null;
  if (SIMPLE.has(a.type)) return { type: a.type } as Action;
  if (a.type === 'DISCARD') {
    const ids = a.cardIds;
    if (!Array.isArray(ids) || ids.length > 4) return null;
    if (!ids.every((x) => typeof x === 'string' && x.length > 0 && x.length <= 4)) return null;
    return { type: 'DISCARD', cardIds: ids as string[] };
  }
  if (a.type === 'ENVIDO') {
    const n = a.amount;
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > 100) return null;
    return { type: 'ENVIDO', amount: n };
  }
  return null;
}

export async function handleGameRequest(
  deps: ServerDeps,
  roomId: string,
  userId: string,
  req: GameRequest,
): Promise<GameResponse> {
  const players = await deps.getPlayers(roomId);
  const me = players.find((p) => p.user_id === userId);
  if (!me) return fail(403, 'No estás en esta sala');
  switch (req.kind) {
    case 'start': return startMatch(deps, roomId, userId, players);
    case 'action': return applyAction(deps, roomId, me.seat as Seat, req.action, players);
    case 'tick': return tickTurn(deps, roomId, players);
    default: return fail(400, 'Petición desconocida');
  }
}

async function startMatch(deps: ServerDeps, roomId: string, userId: string, players: PlayerRow[]): Promise<GameResponse> {
  const room = await deps.getRoom(roomId);
  if (!room || room.host_id !== userId || room.status !== 'lobby') {
    return fail(403, 'Solo el anfitrión puede empezar la partida');
  }
  if (players.length !== 4 || new Set(players.map((p) => p.seat)).size !== 4) return fail(422, 'Hacen falta 4 jugadores');

  let state: MusState;
  try {
    const [seed, manoSeed] = deps.randomSeed();
    state = newMatch(normalizeConfig(room.config ?? {}), seed, (manoSeed % 4) as Seat);
  } catch {
    return fail(422, 'La configuración de la sala no es válida');
  }
  const created = await deps.commit({
    roomId, expected: -1, state, events: [{ t: 'handStart', mano: state.mano }], seat: null, action: { kind: 'start' },
  });
  if (!created) return fail(409, 'La partida ya había empezado');
  await deps.setRoomStatus(roomId, 'playing');
  await runBots(deps, roomId, players);
  return ok();
}

async function applyAction(
  deps: ServerDeps, roomId: string, seat: Seat, raw: unknown, players: PlayerRow[],
): Promise<GameResponse> {
  const action = sanitizeAction(raw);
  if (!action) return fail(422, 'Acción no válida');
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await deps.loadGame(roomId);
    if (!row) return fail(404, 'La partida no ha empezado');
    const res = act(row.state, seat, action);
    if (!res.ok) return fail(422, res.error);
    const committed = await deps.commit({
      roomId, expected: row.version, state: res.state, events: res.events, seat, action,
    });
    if (committed) {
      await runBots(deps, roomId, players);
      return ok({ ok: true, version: res.state.version });
    }
    // Otro movimiento se coló entre la lectura y la escritura: se relee y se vuelve a validar.
  }
  return fail(409, 'conflict');
}

/**
 * Turnos que caducan: cualquier cliente puede llamar a `tick` cuando ve que se acabó el tiempo.
 * El servidor decide con su propio reloj, así que es idempotente y no se puede adelantar.
 */
async function tickTurn(deps: ServerDeps, roomId: string, players: PlayerRow[]): Promise<GameResponse> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await deps.loadGame(roomId);
    if (!row) return fail(404, 'La partida no ha empezado');
    const s = row.state;
    const limit = s.config.turnSeconds * 1000;
    if (limit <= 0 || s.phase === 'matchEnd') return ok({ ok: true, noop: true });

    const humans = new Set(players.filter((p) => !p.is_bot).map((p) => p.seat));
    const waiting = SEATS.filter((x) => humans.has(x) && legalActions(s, x).length > 0);
    if (waiting.length === 0) {
      await runBots(deps, roomId, players); // le toca a un bot: se empuja la cadena
      return ok({ ok: true, noop: true });
    }

    const remaining = limit - (deps.now() - row.updatedAtMs);
    if (remaining > 0) return ok({ ok: false, error: 'not_expired', remainingMs: remaining });

    // Al acabar la mano se continúa por todos los que no han respondido; en el resto, solo por quien tiene la palabra.
    const seats = s.phase === 'handEnd' ? waiting : [waiting[0]];
    let state = s;
    const events: GameEvent[] = [];
    for (const seat of seats) {
      const action = autoAction(state, seat);
      if (!action) continue;
      const res = act(state, seat, action);
      if (!res.ok) return fail(500, res.error);
      state = res.state;
      events.push(...res.events);
    }
    const committed = await deps.commit({
      roomId, expected: row.version, state, events, seat: waiting[0], action: { kind: 'timeout' },
    });
    if (committed) {
      await runBots(deps, roomId, players);
      return ok({ ok: true, auto: seats });
    }
  }
  return fail(409, 'conflict');
}

const MAX_BOT_STEPS = 400;

/** Los bots juegan en cuanto les toca, encadenados, hasta que la palabra vuelve a un humano. */
export async function runBots(deps: ServerDeps, roomId: string, players: PlayerRow[]): Promise<void> {
  const bots = new Set(players.filter((p) => p.is_bot).map((p) => p.seat));
  for (let i = 0; i < MAX_BOT_STEPS; i++) {
    const row = await deps.loadGame(roomId);
    if (!row) return;
    const s = row.state;
    if (s.phase === 'matchEnd') {
      await deps.setRoomStatus(roomId, 'finished');
      return;
    }
    const seat = SEATS.find((x) => bots.has(x) && legalActions(s, x).length > 0);
    if (seat === undefined) return;

    let action = botAction(s, seat);
    let res = action ? act(s, seat, action) : null;
    if (!res || !res.ok) {
      // El bot nunca debería fallar; si lo hace, jugada segura para no bloquear la mesa.
      action = autoAction(s, seat);
      res = action ? act(s, seat, action) : null;
      if (!res || !res.ok) return;
    }
    await deps.commit({ roomId, expected: row.version, state: res.state, events: res.events, seat, action });
  }
}
