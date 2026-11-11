import type { Card, GameEvent, GameRequest, GameResponse, PublicState, RoomConfig, Seat, SignId, Team } from '@mus/engine';

/**
 * Lo único que la app necesita del servidor. `supabaseBackend.ts` lo implementa con Supabase y los tests
 * usan una versión en memoria: así el cliente (RemoteSource) se prueba sin red.
 */
export type RoomStatus = 'lobby' | 'playing' | 'finished' | 'abandoned';

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  config: Partial<RoomConfig>;
}

export interface PlayerRow {
  seat: Seat;
  user_id: string | null;
  is_bot: boolean;
  name: string | null;
}

export interface PublicRow {
  version: number;
  view: PublicState;
  events: GameEvent[];
  updated_at: string;
}

export interface HandRow {
  seat: Seat;
  version: number;
  cards: Card[];
}

export interface SignPayload {
  id: SignId;
  from: Seat;
  at: number;
}

export interface Watcher {
  onRoom(): void;
  onPlayers(): void;
  onPublic(row: PublicRow | null): void;
  onHand(row: HandRow | null): void;
  onStatus(connected: boolean): void;
}

export interface TeamChannel {
  send(p: SignPayload): void;
  close(): void;
}

export interface Backend {
  ensureUser(name: string): Promise<{ id: string; name: string }>;

  createRoom(config: Partial<RoomConfig>, codeLen?: number): Promise<{ roomId: string; code: string; seat: Seat }>;
  joinRoom(code: string): Promise<{ roomId: string; seat: Seat }>;
  leaveRoom(roomId: string): Promise<void>;
  chooseSeat(roomId: string, seat: Seat): Promise<void>;
  addBot(roomId: string, seat: Seat): Promise<void>;
  removeBot(roomId: string, seat: Seat): Promise<void>;
  setConfig(roomId: string, config: Partial<RoomConfig>): Promise<void>;
  resetRoom(roomId: string): Promise<void>;

  getRoom(roomId: string): Promise<RoomRow | null>;
  getPlayers(roomId: string): Promise<PlayerRow[]>;
  getPublic(roomId: string): Promise<PublicRow | null>;
  getHand(roomId: string, seat: Seat): Promise<HandRow | null>;

  /** Cambios de tabla. `getSeat` se consulta en cada evento porque en el lobby el asiento puede cambiar. */
  watch(roomId: string, getSeat: () => Seat, w: Watcher): () => void;
  presence(roomId: string, userId: string, onSync: (online: Set<string>) => void): () => void;
  /** Canal privado de la pareja: por aquí viajan las señas. */
  teamChannel(roomId: string, team: Team, onSign: (p: SignPayload) => void): TeamChannel;

  gameRequest(roomId: string, req: GameRequest): Promise<GameResponse>;
}

export const BOT_NAMES = ['Jon', 'Nerea', 'Aitor', 'Maite'];
