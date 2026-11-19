import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase.ts';
import { useSyncExternalStore } from 'react';
import { shareBase } from './env.ts';
import { getIdent } from '../store/identity.ts';
import { dbCloseRoom, dbCreateRoom, dbUpdateRoom } from './roomsDb.ts';

/**
 * Multijugador en tiempo real para cualquier juego de STACKS.
 *  · Transporte Supabase Realtime: un `channel` por sala con **Presence** (quién está, listo, asiento) y
 *    **Broadcast** (inicio, reacciones, ping y mensajes de juego).
 *  · Fallback local: sin `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` se usa `BroadcastChannel`
 *    (varias pestañas del mismo navegador), con la misma API, para probar todo sin backend.
 * No hay servidor autoritativo: el anfitrión es el jugador con `isHost`; si se va, hereda el más antiguo.
 */

// ─── Configuración de juegos ─────────────────────────────────────────────────────────────
export interface RoomLayout {
  capacity: 2 | 4;
  /** 'teams' = 2v2 con asientos en cruz (A: 0 y 2 · B: 1 y 3). 'table' = mesa libre alrededor. */
  mode: 'teams' | 'table';
  min: number;
}

export const ROOM_LAYOUTS: Record<string, RoomLayout> = {
  mus: { capacity: 4, mode: 'teams', min: 4 },
  brisca: { capacity: 4, mode: 'teams', min: 2 },
  tute: { capacity: 4, mode: 'teams', min: 2 },
  poker: { capacity: 4, mode: 'table', min: 2 },
  chinchon: { capacity: 4, mode: 'table', min: 2 },
  cinquillo: { capacity: 4, mode: 'table', min: 2 },
  escoba: { capacity: 4, mode: 'table', min: 2 },
  uno: { capacity: 4, mode: 'table', min: 2 },
  presidente: { capacity: 4, mode: 'table', min: 2 },
  seises: { capacity: 4, mode: 'table', min: 2 },
  blackjack: { capacity: 4, mode: 'table', min: 1 },
  sieteymedia: { capacity: 4, mode: 'table', min: 2 },
  domino: { capacity: 4, mode: 'teams', min: 2 },
  mentiroso: { capacity: 4, mode: 'table', min: 2 },
  ruleta: { capacity: 4, mode: 'table', min: 1 },
  tres: { capacity: 2, mode: 'table', min: 2 },
  cuatro: { capacity: 2, mode: 'table', min: 2 },
  flota: { capacity: 2, mode: 'table', min: 2 },
  parchis: { capacity: 4, mode: 'table', min: 2 },
  ajedrez: { capacity: 2, mode: 'table', min: 2 },
  damas: { capacity: 2, mode: 'table', min: 2 },
};
export const layoutFor = (gameId: string): RoomLayout => ROOM_LAYOUTS[gameId] ?? { capacity: 4, mode: 'table', min: 2 };
export const teamOfSeat = (seat: number): 'A' | 'B' => (seat % 2 === 0 ? 'A' : 'B');

// ─── Códigos de sala ─────────────────────────────────────────────────────────────────────
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I/L
export const ROOM_CODE_LENGTH = 5;
export const normalizeRoomCode = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH);
export const isValidRoomCode = (s: string): boolean => new RegExp(`^[${ALPHABET}]{${ROOM_CODE_LENGTH}}$`).test(s);
export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function inviteLink(code: string, gameId: string): string {
  // Enlace viral: al abrirlo (WhatsApp…) la app entra directa en la sala.
  return `${shareBase()}#/?join=${code}&game=${gameId}`;
}

// ─── Tipos públicos ──────────────────────────────────────────────────────────────────────
interface PeerMeta { id: string; name: string; ready: boolean; seat: number; joinedAt: number; isHost: boolean }

export interface PlayerView {
  id: string; name: string; ready: boolean; seat: number; isHost: boolean; isSelf: boolean;
  /** Latencia ida y vuelta en ms (null = aún sin medir). */
  ping: number | null;
}
export interface ReactionView { id: string; name: string; text: string }
export type ConnStatus = 'connecting' | 'online' | 'offline';

export interface RoomSnapshot {
  code: string;
  gameId: string;
  layout: RoomLayout;
  status: ConnStatus;
  transport: 'supabase' | 'local';
  /** true = había Supabase configurado pero no respondió: se usa el modo local. */
  fallback: boolean;
  players: PlayerView[];
  seats: (PlayerView | null)[];
  reactions: ReactionView[];
  started: boolean;
  fillBots: boolean;
  canStart: boolean;
  me: PlayerView | null;
}

type Msg =
  | { ev: 'start'; fillBots: boolean }
  | { ev: 'fill'; on: boolean }
  | { ev: 'react'; id: string; name: string; text: string }
  | { ev: 'ping'; from: string; t: number }
  | { ev: 'pong'; to: string; from: string; t: number }
  | { ev: 'game'; from: string; data: unknown };

interface Handlers {
  onPeers(list: PeerMeta[]): void;
  onMessage(m: Msg): void;
  onStatus(s: ConnStatus): void;
}
interface Transport {
  connect(code: string, meta: PeerMeta, h: Handlers): Promise<void>;
  update(meta: PeerMeta): void;
  send(m: Msg): void;
  close(): void;
}

// ─── Transporte Supabase (Presence + Broadcast) ──────────────────────────────────────────
export { isSupabaseConfigured };

class SupabaseTransport implements Transport {
  private ch: RealtimeChannel | null = null;
  private client = getSupabase()!;

  connect(code: string, meta: PeerMeta, h: Handlers): Promise<void> {
    const ch = this.client.channel(`stacks:${code}`, { config: { presence: { key: meta.id }, broadcast: { self: false } } });
    this.ch = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<PeerMeta>();
      h.onPeers(Object.values(state).flat().map((p) => ({
        id: p.id, name: p.name, ready: p.ready, seat: p.seat, joinedAt: p.joinedAt, isHost: p.isHost,
      })));
    });
    ch.on('broadcast', { event: 'msg' }, ({ payload }) => h.onMessage(payload as Msg));
    return new Promise((resolve, reject) => {
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          h.onStatus('online');
          void ch.track(meta).then(() => resolve());
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          h.onStatus('offline');
          reject(new Error('No se pudo conectar con el servidor en tiempo real'));
        } else if (status === 'CLOSED') {
          h.onStatus('offline');
        }
      });
    });
  }
  update(meta: PeerMeta): void { void this.ch?.track(meta); }
  send(m: Msg): void { void this.ch?.send({ type: 'broadcast', event: 'msg', payload: m }); }
  close(): void {
    const ch = this.ch;
    this.ch = null;
    if (ch) { void ch.untrack(); void this.client.removeChannel(ch); }
  }
}

// ─── Transporte local (BroadcastChannel) ─────────────────────────────────────────────────
type LocalWire =
  | { t: 'presence'; meta: PeerMeta }
  | { t: 'hello' }
  | { t: 'bye'; id: string }
  | { t: 'msg'; m: Msg };

class LocalTransport implements Transport {
  private bc: BroadcastChannel | null = null;
  private peers = new Map<string, { meta: PeerMeta; seen: number }>();
  private meta: PeerMeta | null = null;
  private timer = 0;
  private h: Handlers | null = null;

  connect(code: string, meta: PeerMeta, h: Handlers): Promise<void> {
    this.meta = meta;
    this.h = h;
    const bc = new BroadcastChannel(`stacks-room-${code}`);
    this.bc = bc;
    bc.onmessage = (e: MessageEvent<LocalWire>) => {
      const w = e.data;
      if (w.t === 'presence') { this.peers.set(w.meta.id, { meta: w.meta, seen: Date.now() }); this.emit(); }
      else if (w.t === 'hello') { this.announce(); }
      else if (w.t === 'bye') { this.peers.delete(w.id); this.emit(); }
      else h.onMessage(w.m);
    };
    this.timer = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, p] of this.peers) if (now - p.seen > 4500) { this.peers.delete(id); changed = true; }
      this.announce();
      if (changed) this.emit();
    }, 1500);
    h.onStatus('online');
    bc.postMessage({ t: 'hello' } satisfies LocalWire);
    this.announce();
    this.emit();
    return Promise.resolve();
  }
  private announce(): void { if (this.meta) this.bc?.postMessage({ t: 'presence', meta: this.meta } satisfies LocalWire); }
  private emit(): void {
    if (!this.meta || !this.h) return;
    this.h.onPeers([this.meta, ...[...this.peers.values()].map((p) => p.meta)]);
  }
  update(meta: PeerMeta): void { this.meta = meta; this.announce(); this.emit(); }
  send(m: Msg): void { this.bc?.postMessage({ t: 'msg', m } satisfies LocalWire); }
  close(): void {
    window.clearInterval(this.timer);
    if (this.meta) this.bc?.postMessage({ t: 'bye', id: this.meta.id } satisfies LocalWire);
    this.bc?.close();
    this.bc = null;
  }
}

// ─── Sala ────────────────────────────────────────────────────────────────────────────────
const PING_EVERY = 3000;
const REACTION_TTL = 4200;

function resolveSeats(peers: PeerMeta[], capacity: number): Map<string, number> {
  const out = new Map<string, number>();
  const taken = new Set<number>();
  for (const p of [...peers].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))) {
    let seat = p.seat >= 0 && p.seat < capacity && !taken.has(p.seat) ? p.seat : -1;
    if (seat === -1) for (let i = 0; i < capacity; i++) if (!taken.has(i)) { seat = i; break; }
    if (seat !== -1) { taken.add(seat); out.set(p.id, seat); }
  }
  return out;
}

const randomId = (): string => crypto.randomUUID();

export class Room {
  readonly code: string;
  readonly gameId: string;
  private readonly layout: RoomLayout;
  private transport: Transport;
  private kind: 'supabase' | 'local' = 'local';
  private fallback = false;
  private meta: PeerMeta;
  private peers: PeerMeta[] = [];
  private pings = new Map<string, number>();
  private reactions: ReactionView[] = [];
  private status: ConnStatus = 'connecting';
  private started = false;
  private sawHost = false;
  private fillBots = true;
  private listeners = new Set<() => void>();
  private startCbs = new Set<(fillBots: boolean) => void>();
  private gameCbs = new Set<(from: string, data: unknown) => void>();
  private timers: number[] = [];
  private snap: RoomSnapshot;

  constructor(code: string, gameId: string, name: string, isHost: boolean) {
    this.code = code;
    this.gameId = gameId;
    this.layout = layoutFor(gameId);
    this.transport = this.makeTransport();
    this.meta = { id: randomId(), name, ready: isHost, seat: -1, joinedAt: Date.now(), isHost };
    this.peers = [this.meta];
    this.snap = this.build();
  }

  get transportName(): 'supabase' | 'local' { return this.kind; }

  /** Supabase si hay claves y el cliente se crea bien; si no, local (nunca lanza). */
  private makeTransport(): Transport {
    if (isSupabaseConfigured) {
      try { const t = new SupabaseTransport(); this.kind = 'supabase'; return t; } catch { this.fallback = true; }
    }
    this.kind = 'local';
    return new LocalTransport();
  }

  /** Conecta y, si no eres el creador, espera a ver al anfitrión (si no aparece: sala inexistente). */
  async connect(): Promise<void> {
    const handlers: Handlers = {
      onPeers: (list) => this.onPeers(list),
      onMessage: (m) => this.onMessage(m),
      onStatus: (s) => { this.status = s; this.publish(); },
    };
    try {
      await Promise.race([
        this.transport.connect(this.code, this.meta, handlers),
        new Promise<never>((_, rej) => window.setTimeout(() => rej(new Error('timeout')), 6000)),
      ]);
    } catch (e) {
      if (this.kind !== 'supabase') throw e;
      // Sin conexión a Supabase: modo local automático.
      try { this.transport.close(); } catch { /* ya cerrado */ }
      this.transport = new LocalTransport();
      this.kind = 'local';
      this.fallback = true;
      await this.transport.connect(this.code, this.meta, handlers);
    }
    this.timers.push(window.setInterval(() => this.transport.send({ ev: 'ping', from: this.meta.id, t: Date.now() }), PING_EVERY));
    this.transport.send({ ev: 'ping', from: this.meta.id, t: Date.now() });
    if (!this.meta.isHost) {
      await new Promise((r) => window.setTimeout(r, 1300));
      const others = this.peers.filter((p) => p.id !== this.meta.id);
      if (others.length === 0) { this.leave(); throw new Error('Sala no encontrada'); }
      if (others.length >= this.layout.capacity) { this.leave(); throw new Error('La sala está llena'); }
    }
  }

  // — API de React —
  subscribe = (l: () => void): (() => void) => { this.listeners.add(l); return () => { this.listeners.delete(l); }; };
  getSnapshot = (): RoomSnapshot => this.snap;

  // — Acciones —
  setReady(ready: boolean): void { this.patchMe({ ready: this.meta.isHost ? true : ready }); }
  sitAt(seat: number): void {
    if (seat < 0 || seat >= this.layout.capacity) return;
    if (this.snap.seats[seat] && this.snap.seats[seat]!.id !== this.meta.id) return;
    this.patchMe({ seat, ready: this.meta.isHost });
  }
  setFillBots(on: boolean): void {
    if (!this.meta.isHost) return;
    this.fillBots = on;
    this.transport.send({ ev: 'fill', on });
    this.publish();
  }
  react(text: string): void {
    const r: ReactionView = { id: randomId(), name: this.meta.name, text };
    this.addReaction(r);
    this.transport.send({ ev: 'react', ...r });
  }
  start(): void {
    if (!this.snap.canStart) return;
    this.transport.send({ ev: 'start', fillBots: this.fillBots });
    this.handleStart(this.fillBots);
  }
  /** Canal genérico para sincronizar el estado de cualquier juego. */
  sendGame(data: unknown): void { this.transport.send({ ev: 'game', from: this.meta.id, data }); }
  onGame(cb: (from: string, data: unknown) => void): () => void { this.gameCbs.add(cb); return () => { this.gameCbs.delete(cb); }; }
  onStart(cb: (fillBots: boolean) => void): () => void { this.startCbs.add(cb); return () => { this.startCbs.delete(cb); }; }
  /** El anfitrión refleja el estado de la sala en `stacks_rooms` (mejor esfuerzo, no bloquea el juego). */
  private registry(status: 'waiting' | 'playing'): void {
    if (!this.meta.isHost) return;
    void dbUpdateRoom(this.code, { status, players: this.peers.map((p) => ({ name: p.name, seat: p.seat, host: p.isHost })) });
  }
  private registryTimer = 0;
  leave(): void {
    window.clearTimeout(this.registryTimer);
    if (this.meta.isHost) void dbCloseRoom(this.code); // sin salas colgadas en la base de datos
    this.timers.forEach((t) => window.clearInterval(t));
    this.timers = [];
    this.transport.close();
    this.listeners.clear();
  }

  // — Internos —
  private patchMe(patch: Partial<PeerMeta>): void {
    this.meta = { ...this.meta, ...patch };
    this.peers = this.peers.map((p) => (p.id === this.meta.id ? this.meta : p));
    this.transport.update(this.meta);
    this.publish();
  }
  private onPeers(list: PeerMeta[]): void {
    if (this.meta.isHost && !this.started) { window.clearTimeout(this.registryTimer); this.registryTimer = window.setTimeout(() => this.registry('waiting'), 900); }
    this.peers = list.some((p) => p.id === this.meta.id) ? list : [...list, this.meta];
    // Mi propio meta es la fuente de verdad para mí.
    this.peers = this.peers.map((p) => (p.id === this.meta.id ? this.meta : p));
    const hosts = this.peers.filter((p) => p.isHost);
    if (hosts.some((p) => p.id !== this.meta.id)) this.sawHost = true;
    // Si el anfitrión se fue (y lo habíamos visto), hereda el más antiguo.
    if (hosts.length === 0 && this.sawHost) {
      const heir = [...this.peers].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      if (heir?.id === this.meta.id) { this.patchMe({ isHost: true, ready: true }); return; }
    }
    // Dos anfitriones a la vez (carrera): se queda el más antiguo.
    if (hosts.length > 1 && this.meta.isHost) {
      const oldest = [...hosts].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))[0]!;
      if (oldest.id !== this.meta.id) { this.patchMe({ isHost: false, ready: false }); return; }
    }
    this.publish();
  }
  private onMessage(m: Msg): void {
    switch (m.ev) {
      case 'start': this.handleStart(m.fillBots); break;
      case 'fill': this.fillBots = m.on; this.publish(); break;
      case 'react': this.addReaction({ id: m.id, name: m.name, text: m.text }); break;
      case 'ping': this.transport.send({ ev: 'pong', to: m.from, from: this.meta.id, t: m.t }); break;
      case 'pong': if (m.to === this.meta.id) { this.pings.set(m.from, Date.now() - m.t); this.publish(); } break;
      case 'game': this.gameCbs.forEach((cb) => cb(m.from, m.data)); break;
    }
  }
  private handleStart(fillBots: boolean): void {
    if (this.started) return;
    this.started = true;
    window.clearTimeout(this.registryTimer);
    this.registry('playing');
    this.publish();
    this.startCbs.forEach((cb) => cb(fillBots));
  }
  private addReaction(r: ReactionView): void {
    this.reactions = [...this.reactions, r].slice(-5);
    this.publish();
    this.timers.push(window.setTimeout(() => { this.reactions = this.reactions.filter((x) => x.id !== r.id); this.publish(); }, REACTION_TTL));
  }
  private publish(): void {
    this.snap = this.build();
    this.listeners.forEach((l) => l());
  }
  private build(): RoomSnapshot {
    const seatOf = resolveSeats(this.peers, this.layout.capacity);
    const players: PlayerView[] = this.peers
      .filter((p) => seatOf.has(p.id))
      .map((p) => ({
        id: p.id, name: p.name, ready: p.isHost || p.ready, seat: seatOf.get(p.id)!, isHost: p.isHost,
        isSelf: p.id === this.meta.id, ping: p.id === this.meta.id ? 0 : this.pings.get(p.id) ?? null,
      }))
      .sort((a, b) => a.seat - b.seat);
    const seats: (PlayerView | null)[] = Array.from({ length: this.layout.capacity }, (_, i) => players.find((p) => p.seat === i) ?? null);
    const me = players.find((p) => p.isSelf) ?? null;
    const allReady = players.every((p) => p.ready);
    const enough = this.fillBots ? players.length >= 1 : players.length >= this.layout.min;
    return {
      code: this.code, gameId: this.gameId, layout: this.layout, status: this.status, transport: this.kind, fallback: this.fallback,
      players, seats, reactions: this.reactions, started: this.started, fillBots: this.fillBots, me,
      canStart: Boolean(me?.isHost) && allReady && enough && !this.started,
    };
  }
}

export const createRoom = async (gameId: string, name: string, code?: string): Promise<Room> => {
  const room = new Room(code ?? generateRoomCode(), gameId, name, true);
  await room.connect();
  void dbCreateRoom(room.code, gameId, getIdent().uid, layoutFor(gameId).capacity);
  return room;
};
export const joinRoom = async (code: string, gameId: string, name: string): Promise<Room> => {
  const room = new Room(normalizeRoomCode(code), gameId, name, false);
  await room.connect();
  return room;
};

export const useRoom = (room: Room | null): RoomSnapshot | null =>
  useSyncExternalStore(
    (l) => (room ? room.subscribe(l) : () => {}),
    () => (room ? room.getSnapshot() : null),
  );

/** Sala activa que sobrevive a la navegación lobby → partida (para sincronizar el juego con `sendGame`). */
let activeRoom: Room | null = null;
export const setActiveRoom = (r: Room | null): void => {
  if (activeRoom && activeRoom !== r) activeRoom.leave();
  activeRoom = r;
};
export const getActiveRoom = (): Room | null => activeRoom;

// ─── Partida pública ─────────────────────────────────────────────────────────────────────
/** Código fijo por juego: quien llega primero crea la sala pública y los demás entran en ella. */
export function publicRoomCode(gameId: string): string {
  let h = 7;
  for (const ch of gameId) h = (h * 31 + ch.charCodeAt(0)) % 99991;
  return 'P' + Array.from({ length: ROOM_CODE_LENGTH - 1 }, (_, i) => ALPHABET[Math.floor(h / 31 ** i) % ALPHABET.length]).join('');
}
export const isPublicRoom = (code: string, gameId: string): boolean => code === publicRoomCode(gameId);
/** Entra en la sala pública del juego o, si no hay nadie, la abre. */
export async function joinPublic(gameId: string, name: string): Promise<Room> {
  const code = publicRoomCode(gameId);
  try { return await joinRoom(code, gameId, name); } catch { return createRoom(gameId, name, code); }
}
/** Segundos de espera en una partida pública antes de completar los huecos con bots. */
export const PUBLIC_WAIT_SECONDS = 12;
