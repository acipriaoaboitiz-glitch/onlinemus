import type { Action, Card, GameEvent, PublicState, RoomConfig, Seat, SignId } from '@mus/engine';

export type Status = 'connecting' | 'lobby' | 'playing' | 'finished' | 'error';

export interface SeatInfo {
  seat: Seat;
  userId: string | null;
  /** null = asiento libre */
  name: string | null;
  isBot: boolean;
  online: boolean;
}

export interface RoomInfo {
  id: string;
  code: string;
  hostId: string;
  config: RoomConfig;
}

/** Todo lo que la interfaz necesita saber, venga la partida de local o de Supabase. */
export interface Snapshot {
  status: Status;
  error: string | null;
  connected: boolean;
  mySeat: Seat;
  isHost: boolean;
  room: RoomInfo | null;
  seats: SeatInfo[];
  view: PublicState | null;
  hand: Card[];
  /** Instante (ms) en que caduca el turno, o null si no hay límite. */
  deadline: number | null;
}

export interface IncomingSign {
  id: SignId;
  from: Seat;
  at: number;
}

export interface GameSource {
  getSnapshot(): Snapshot;
  subscribe(cb: () => void): () => void;
  /** null = aceptada; texto = motivo del rechazo. */
  send(action: Action): Promise<string | null>;
  sendSign(id: SignId): Promise<string | null>;
  catchSignal(): Promise<string | null>;
  onSign(cb: (s: IncomingSign) => void): () => void;
  onEvents(cb: (events: GameEvent[]) => void): () => void;
  /** El cliente avisa de que se acabó el tiempo; el servidor decide si es cierto. */
  tick(): void;
  destroy(): void;
}

/** Fuente de una sala online: además de jugar, gestiona el lobby. */
export interface RoomSource extends GameSource {
  chooseSeat(seat: Seat): Promise<string | null>;
  addBot(seat: Seat): Promise<string | null>;
  removeBot(seat: Seat): Promise<string | null>;
  setConfig(config: Partial<RoomConfig>): Promise<string | null>;
  start(): Promise<string | null>;
  leave(): Promise<string | null>;
  rematch(): Promise<string | null>;
}
