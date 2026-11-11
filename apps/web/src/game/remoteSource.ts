import { DEFAULT_CONFIG, SEATS, normalizeConfig } from '@mus/engine';
import type { Action, Card, GameEvent, PublicState, RoomConfig, Seat, SignId, Team } from '@mus/engine';
import { BOT_NAMES } from './backend.ts';
import type { Backend, HandRow, PlayerRow, PublicRow, RoomRow, SignPayload, TeamChannel } from './backend.ts';
import type { IncomingSign, RoomSource, SeatInfo, Snapshot } from './types.ts';

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function parseConfig(raw: Partial<RoomConfig> | undefined): RoomConfig {
  try {
    return normalizeConfig(raw ?? {});
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export interface RemoteOptions {
  /** Relectura periódica de seguridad por si se pierde algún evento (0 = desactivada). */
  refreshMs?: number;
  /** Tras enviar una acción, si no llega el cambio en este tiempo se relee el estado. */
  sendCheckMs?: number;
}

/**
 * Cliente de una sala online. El servidor es la autoridad: aquí solo se envían intenciones y se
 * refleja el estado que llega por Realtime (con control de versión para no pisar nada con datos viejos).
 */
export function createRemoteSource(
  backend: Backend,
  roomId: string,
  me: { id: string; name: string },
  opts: RemoteOptions = {},
): RoomSource {
  const refreshMs = opts.refreshMs ?? 15_000;
  const sendCheckMs = opts.sendCheckMs ?? 2_500;

  let roomRow: RoomRow | null = null;
  let players: PlayerRow[] = [];
  let online = new Set<string>();
  let mySeat: Seat = 0;
  let lastVersion = -1;
  let handVersion = -1;
  let view: PublicState | null = null;
  let hand: Card[] = [];
  let deadline: number | null = null;
  let status: Snapshot['status'] = 'connecting';
  let error: string | null = null;
  let connected = true;
  let destroyed = false;
  let team: TeamChannel | null = null;
  let tickBusy = false;
  const stops: (() => void)[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let interval: ReturnType<typeof setInterval> | null = null;

  const listeners = new Set<() => void>();
  const eventListeners = new Set<(e: GameEvent[]) => void>();
  const signListeners = new Set<(s: IncomingSign) => void>();

  function buildSeats(): SeatInfo[] {
    return SEATS.map((seat): SeatInfo => {
      const p = players.find((x) => x.seat === seat);
      if (!p) return { seat, userId: null, name: null, isBot: false, online: false };
      return {
        seat,
        userId: p.user_id,
        name: p.is_bot ? (p.name ?? BOT_NAMES[seat]) : (p.name ?? 'Jugador'),
        isBot: p.is_bot,
        online: p.is_bot || (p.user_id !== null && online.has(p.user_id)),
      };
    });
  }

  function build(): Snapshot {
    return {
      status, error, connected, mySeat,
      isHost: roomRow?.host_id === me.id,
      room: roomRow
        ? { id: roomRow.id, code: roomRow.code, hostId: roomRow.host_id, config: parseConfig(roomRow.config) }
        : null,
      seats: buildSeats(),
      view, hand, deadline,
    };
  }

  let snap = build();
  function publish(): void {
    if (destroyed) return;
    snap = build();
    listeners.forEach((l) => l());
  }

  const later = (fn: () => void, ms: number): void => {
    const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
    timers.add(t);
  };

  function clearGame(): void {
    view = null;
    hand = [];
    lastVersion = -1;
    handVersion = -1;
    deadline = null;
  }

  function applyRoom(r: RoomRow): void {
    roomRow = r;
    if (r.status === 'abandoned') {
      status = 'error';
      error = 'La sala ha caducado';
    } else {
      status = r.status;
      error = null;
    }
    if (r.status === 'lobby' && view) clearGame(); // revancha: se vuelve al lobby
  }

  function openTeamChannel(): void {
    team?.close();
    team = backend.teamChannel(roomId, (mySeat % 2) as Team, (p: SignPayload) => {
      if (p.from === mySeat) return;
      signListeners.forEach((l) => l({ id: p.id, from: p.from, at: p.at }));
    });
  }

  function applyPlayers(rows: PlayerRow[]): void {
    players = rows;
    const mine = rows.find((p) => p.user_id === me.id);
    if (mine) {
      if (mine.seat !== mySeat) {
        mySeat = mine.seat;
        if (team) openTeamChannel();
      }
    } else if (status !== 'connecting' && status !== 'error') {
      status = 'error';
      error = 'Ya no estás en esta sala';
    }
  }

  function applyPublic(row: PublicRow | null, mode: 'live' | 'load'): void {
    if (!row) {
      clearGame();
      publish();
      return;
    }
    if (row.version <= lastVersion) return;
    lastVersion = row.version;
    view = row.view;
    const secs = row.view.config.turnSeconds;
    if (secs > 0 && row.view.phase !== 'matchEnd') {
      const full = secs * 1000;
      const left = mode === 'live' ? full : full - (Date.now() - Date.parse(row.updated_at));
      deadline = Date.now() + Math.max(3_000, Math.min(full, Number.isFinite(left) ? left : full));
    } else {
      deadline = null;
    }
    publish();
    if (mode === 'live' && row.events.length > 0) eventListeners.forEach((l) => l(row.events));
  }

  function applyHand(row: HandRow | null): void {
    if (!row) {
      hand = [];
      handVersion = -1;
      publish();
      return;
    }
    if (row.seat !== mySeat || row.version < handVersion) return;
    handVersion = row.version;
    hand = row.cards;
    publish();
  }

  async function reloadRoom(): Promise<void> {
    const r = await backend.getRoom(roomId);
    if (destroyed) return;
    if (r) applyRoom(r);
    publish();
  }

  async function reloadPlayers(): Promise<void> {
    applyPlayers(await backend.getPlayers(roomId));
    if (!destroyed) publish();
  }

  async function refreshGame(): Promise<void> {
    if (destroyed) return;
    try {
      const [pub, h] = await Promise.all([backend.getPublic(roomId), backend.getHand(roomId, mySeat)]);
      if (destroyed) return;
      applyHand(h);
      applyPublic(pub, lastVersion >= 0 ? 'live' : 'load');
    } catch { /* se reintenta con el siguiente evento o relectura */ }
  }

  async function refreshAll(): Promise<void> {
    try {
      await Promise.all([reloadRoom(), reloadPlayers()]);
      await refreshGame();
    } catch { /* idem */ }
  }

  async function init(): Promise<void> {
    try {
      const room = await backend.getRoom(roomId);
      if (!room) {
        status = 'error';
        error = 'Esa sala no existe o no estás en ella';
        return publish();
      }
      players = await backend.getPlayers(roomId);
      const mine = players.find((p) => p.user_id === me.id);
      if (!mine) {
        status = 'error';
        error = 'No estás sentado en esta sala';
        return publish();
      }
      mySeat = mine.seat;
      applyRoom(room);
      openTeamChannel();
      stops.push(
        backend.watch(roomId, () => mySeat, {
          onRoom: () => void reloadRoom(),
          onPlayers: () => void reloadPlayers(),
          onPublic: (row) => applyPublic(row, 'live'),
          onHand: (row) => applyHand(row),
          onStatus: (c) => {
            connected = c;
            publish();
            if (c) void refreshAll();
          },
        }),
        backend.presence(roomId, me.id, (ids) => {
          online = ids;
          publish();
        }),
      );
      await refreshGame();
      publish();
      if (refreshMs > 0) interval = setInterval(() => void refreshAll(), refreshMs);
    } catch (e) {
      status = 'error';
      error = errMsg(e);
      publish();
    }
  }

  const guard = async (fn: () => Promise<void>): Promise<string | null> => {
    try {
      await fn();
      return null;
    } catch (e) {
      return errMsg(e);
    }
  };

  const request = async (kind: 'start'): Promise<string | null> => {
    const r = await backend.gameRequest(roomId, { kind });
    if (r.status >= 200 && r.status < 300) {
      await refreshAll();
      return null;
    }
    return String(r.body.error ?? 'No se ha podido completar la acción');
  };

  void init();

  return {
    getSnapshot: () => snap,
    subscribe(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    async send(action: Action) {
      const before = lastVersion;
      const r = await backend.gameRequest(roomId, { kind: 'action', action });
      if (r.status >= 200 && r.status < 300) {
        // Red de seguridad: si el cambio no llega por Realtime, se relee.
        later(() => { if (lastVersion === before) void refreshGame(); }, sendCheckMs);
        return null;
      }
      return String(r.body.error ?? 'No se ha podido completar la acción');
    },
    sendSign(id: SignId) {
      team?.send({ id, from: mySeat, at: Date.now() });
    },
    onSign(cb) {
      signListeners.add(cb);
      return () => { signListeners.delete(cb); };
    },
    onEvents(cb) {
      eventListeners.add(cb);
      return () => { eventListeners.delete(cb); };
    },
    tick() {
      if (tickBusy || destroyed || status !== 'playing') return;
      tickBusy = true;
      backend
        .gameRequest(roomId, { kind: 'tick' })
        .then((r) => {
          if (r.body.error === 'not_expired' && typeof r.body.remainingMs === 'number') {
            deadline = Date.now() + r.body.remainingMs + 250;
            publish();
          }
        })
        .catch(() => undefined)
        .finally(() => { tickBusy = false; });
    },
    chooseSeat: (seat) => guard(async () => { await backend.chooseSeat(roomId, seat); await reloadPlayers(); }),
    addBot: (seat) => guard(async () => { await backend.addBot(roomId, seat); await reloadPlayers(); }),
    removeBot: (seat) => guard(async () => { await backend.removeBot(roomId, seat); await reloadPlayers(); }),
    setConfig: (config) => guard(async () => { await backend.setConfig(roomId, config); await reloadRoom(); }),
    start: () => request('start'),
    leave: () => guard(() => backend.leaveRoom(roomId)),
    rematch: () => guard(async () => { await backend.resetRoom(roomId); await refreshAll(); }),
    destroy() {
      destroyed = true;
      stops.forEach((s) => s());
      stops.length = 0;
      team?.close();
      team = null;
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (interval !== null) clearInterval(interval);
      listeners.clear();
      eventListeners.clear();
      signListeners.clear();
    },
  };
}
