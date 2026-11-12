/**
 * Servidor en memoria que imita a Supabase (tablas, RLS, Realtime, presencia, canal de pareja) y ejecuta
 * el MISMO núcleo de servidor que la Edge Function. Sirve para probar el cliente online sin red.
 */
import { SEATS, handleGameRequest, publicView } from '@mus/engine';
import type { CommitArgs, GameRequest, GameResponse, GameRow, RoomConfig, Seat, ServerDeps, Team } from '@mus/engine';
import { BOT_NAMES } from '../src/game/backend.ts';
import type { Backend, HandRow, PlayerRow, PublicRow, RoomRow, SignPayload, Watcher } from '../src/game/backend.ts';

interface Member { seat: Seat; user_id: string | null; is_bot: boolean }
interface Sub { roomId: string; userId: string; getSeat: () => Seat; w: Watcher }

export class MemoryServer {
  rooms = new Map<string, RoomRow>();
  members = new Map<string, Member[]>();
  names = new Map<string, string>();
  games = new Map<string, GameRow>();
  pub = new Map<string, PublicRow>();
  hands = new Map<string, HandRow[]>();
  subs = new Set<Sub>();
  presence = new Set<{ roomId: string; userId: string; cb: (s: Set<string>) => void }>();
  teams = new Set<{ roomId: string; team: Team; userId: string; cb: (p: SignPayload) => void }>();
  clock = Date.now();
  seq = 0;
  /** Para probar que el cliente se recupera cuando se pierden eventos de Realtime. */
  dropRealtime = false;

  deps: ServerDeps = {
    getRoom: async (id) => {
      const r = this.rooms.get(id);
      return r ? { id: r.id, host_id: r.host_id, status: r.status, config: r.config as Record<string, unknown> } : null;
    },
    getPlayers: async (id) => (this.members.get(id) ?? []).map((m) => ({ ...m })),
    loadGame: async (id) => {
      const g = this.games.get(id);
      return g ? { ...g, state: structuredClone(g.state) } : null;
    },
    commit: async (c) => this.commit(c),
    setRoomStatus: async (id, status) => {
      const r = this.rooms.get(id);
      if (r) { r.status = status; this.notifyRoom(id); }
    },
    now: () => this.clock,
    randomSeed: () => [20260, 3],
    publishSign: async (roomId, team, payload) => {
      for (const t of this.teams) {
        if (t.roomId === roomId && t.team === team && t.userId !== this.ownerOf(roomId, payload.from)) {
          queueMicrotask(() => t.cb(structuredClone(payload)));
        }
      }
    },
  };

  /** Como cuando supabase-js recupera la conexión: avisa a todos los suscriptores de que están conectados. */
  reconnect(): void {
    for (const s of this.subs) queueMicrotask(() => s.w.onStatus(true));
  }

  ownerOf(roomId: string, seat: number): string | null {
    return this.members.get(roomId)?.find((m) => m.seat === seat)?.user_id ?? null;
  }

  isMember(roomId: string, userId: string): boolean {
    return (this.members.get(roomId) ?? []).some((m) => m.user_id === userId);
  }

  private deliver(fn: () => void): void {
    if (!this.dropRealtime) queueMicrotask(fn);
  }

  notifyRoom(roomId: string): void {
    for (const s of this.subs) if (s.roomId === roomId) this.deliver(() => { s.w.onRoom(); s.w.onPlayers(); });
  }

  notifyPresence(roomId: string): void {
    const ids = new Set<string>();
    for (const p of this.presence) if (p.roomId === roomId) ids.add(p.userId);
    for (const p of this.presence) if (p.roomId === roomId) queueMicrotask(() => p.cb(new Set(ids)));
  }

  private commit(c: CommitArgs): boolean {
    const cur = this.games.get(c.roomId);
    if (c.expected < 0 ? cur !== undefined : !cur || cur.version !== c.expected) return false;
    this.games.set(c.roomId, { version: c.state.version, state: structuredClone(c.state), updatedAtMs: this.clock });
    const row: PublicRow = {
      version: c.state.version,
      view: structuredClone(publicView(c.state)),
      events: structuredClone(c.events),
      updated_at: new Date(this.clock).toISOString(),
    };
    this.pub.set(c.roomId, row);
    const handRows: HandRow[] = SEATS.map((seat) => ({ seat, version: c.state.version, cards: structuredClone(c.state.hands[seat]) }));
    this.hands.set(c.roomId, handRows);
    for (const s of this.subs) {
      if (s.roomId !== c.roomId) continue;
      this.deliver(() => {
        s.w.onPublic(structuredClone(row));
        const seat = s.getSeat();
        const mine = handRows.find((h) => h.seat === seat);
        if (mine && this.ownerOf(c.roomId, seat) === s.userId) s.w.onHand(structuredClone(mine));
      });
    }
    return true;
  }

  freshCode(len: number): string {
    for (let i = 0; i < 50; i++) {
      const code = String(Math.floor(Math.random() * 10 ** len)).padStart(len, '0');
      const taken = [...this.rooms.values()].some((r) => r.code === code && (r.status === 'lobby' || r.status === 'playing'));
      if (!taken) return code;
    }
    throw new Error('No hay códigos libres, inténtalo de nuevo.');
  }
}

export function createMemoryBackend(server: MemoryServer, userId: string): Backend {
  const must = (roomId: string): { room: RoomRow; members: Member[] } => {
    const room = server.rooms.get(roomId);
    const members = server.members.get(roomId);
    if (!room || !members) throw new Error('No estás en esa sala.');
    return { room, members };
  };
  const asHost = (roomId: string) => {
    const r = must(roomId);
    if (r.room.host_id !== userId) throw new Error('Solo puede hacerlo el anfitrión.');
    return r;
  };

  return {
    async ensureUser(name) {
      server.names.set(userId, name);
      return { id: userId, name };
    },
    async createRoom(config, codeLen = 6) {
      const id = `room-${++server.seq}`;
      const code = server.freshCode(codeLen);
      server.rooms.set(id, { id, code, host_id: userId, status: 'lobby', config: config as Partial<RoomConfig> });
      server.members.set(id, [{ seat: 0, user_id: userId, is_bot: false }]);
      return { roomId: id, code, seat: 0 };
    },
    async joinRoom(code) {
      const room = [...server.rooms.values()].find((r) => r.code === code && (r.status === 'lobby' || r.status === 'playing'));
      if (!room) throw new Error('No existe ninguna sala con ese código.');
      const members = server.members.get(room.id) as Member[];
      const mine = members.find((m) => m.user_id === userId);
      if (mine) return { roomId: room.id, seat: mine.seat };
      if (room.status !== 'lobby') throw new Error('La partida ya ha empezado.');
      const seat = SEATS.find((s) => !members.some((m) => m.seat === s));
      if (seat === undefined) throw new Error('La sala está llena.');
      members.push({ seat, user_id: userId, is_bot: false });
      server.notifyRoom(room.id);
      return { roomId: room.id, seat };
    },
    async leaveRoom(roomId) {
      const { room, members } = must(roomId);
      const i = members.findIndex((m) => m.user_id === userId);
      if (i < 0) return;
      if (room.status === 'playing') members[i] = { seat: members[i].seat, user_id: null, is_bot: true };
      else members.splice(i, 1);
      server.notifyRoom(roomId);
    },
    async chooseSeat(roomId, seat) {
      const { room, members } = must(roomId);
      if (room.status !== 'lobby') throw new Error('No se puede hacer eso ahora mismo.');
      if (members.some((m) => m.seat === seat)) throw new Error('Ese asiento ya está ocupado.');
      const mine = members.find((m) => m.user_id === userId);
      if (!mine) throw new Error('No estás en esa sala.');
      mine.seat = seat;
      server.notifyRoom(roomId);
    },
    async addBot(roomId, seat) {
      const { room, members } = asHost(roomId);
      if (room.status !== 'lobby') throw new Error('No se puede hacer eso ahora mismo.');
      if (members.some((m) => m.seat === seat)) throw new Error('Ese asiento ya está ocupado.');
      members.push({ seat, user_id: null, is_bot: true });
      server.notifyRoom(roomId);
    },
    async removeBot(roomId, seat) {
      const { room, members } = asHost(roomId);
      if (room.status !== 'lobby') throw new Error('No se puede hacer eso ahora mismo.');
      const i = members.findIndex((m) => m.seat === seat && m.is_bot);
      if (i >= 0) members.splice(i, 1);
      server.notifyRoom(roomId);
    },
    async setConfig(roomId, config) {
      const { room } = asHost(roomId);
      if (room.status !== 'lobby') throw new Error('No se puede hacer eso ahora mismo.');
      room.config = config;
      server.notifyRoom(roomId);
    },
    async resetRoom(roomId) {
      const { room } = asHost(roomId);
      server.games.delete(roomId);
      server.pub.delete(roomId);
      server.hands.delete(roomId);
      room.status = 'lobby';
      for (const s of server.subs) {
        if (s.roomId === roomId) queueMicrotask(() => { s.w.onPublic(null); s.w.onHand(null); });
      }
      server.notifyRoom(roomId);
    },

    async getRoom(roomId) {
      return server.isMember(roomId, userId) ? structuredClone(server.rooms.get(roomId) ?? null) : null;
    },
    async getPlayers(roomId) {
      if (!server.isMember(roomId, userId)) return [];
      return (server.members.get(roomId) ?? []).map((m): PlayerRow => ({
        seat: m.seat, user_id: m.user_id, is_bot: m.is_bot,
        name: m.is_bot ? BOT_NAMES[m.seat] : (server.names.get(m.user_id as string) ?? null),
      }));
    },
    async getPublic(roomId) {
      return server.isMember(roomId, userId) ? structuredClone(server.pub.get(roomId) ?? null) : null;
    },
    async getHand(roomId, seat) {
      if (server.ownerOf(roomId, seat) !== userId) return null;
      return structuredClone(server.hands.get(roomId)?.find((h) => h.seat === seat) ?? null);
    },

    watch(roomId, getSeat, w) {
      const sub: Sub = { roomId, userId, getSeat, w };
      server.subs.add(sub);
      queueMicrotask(() => w.onStatus(true));
      return () => { server.subs.delete(sub); };
    },
    presence(roomId, uid, onSync) {
      const p = { roomId, userId: uid, cb: onSync };
      server.presence.add(p);
      server.notifyPresence(roomId);
      return () => { server.presence.delete(p); server.notifyPresence(roomId); };
    },
    teamChannel(roomId, team, onSign) {
      const seat = server.members.get(roomId)?.find((m) => m.user_id === userId)?.seat;
      const allowed = seat !== undefined && seat % 2 === team;
      const sub = { roomId, team, userId, cb: onSign };
      if (allowed) server.teams.add(sub); // la política RLS de Realtime: solo los de la pareja
      return {
        close() { server.teams.delete(sub); },
      };
    },

    async gameRequest(roomId, req: GameRequest): Promise<GameResponse> {
      return handleGameRequest(server.deps, roomId, userId, req);
    },
  };
}
