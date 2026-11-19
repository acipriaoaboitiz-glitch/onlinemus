import { dbClient, dbFail, T } from './socialDb.ts';

/**
 * Registro de salas en `stacks_rooms` (código, juego, anfitrión, estado y jugadores). El juego en vivo (jugadas, turnos) viaja por el
 * canal Realtime `stacks:CODIGO` de la sala, que es lo que necesita latencia baja; esta tabla permite descubrir y cerrar salas.
 * Mejor esfuerzo: sin Supabase, sin sesión o sin la tabla, la sala funciona igual solo con el canal.
 */
export interface RoomPlayerRow { name: string; seat: number; host: boolean }

export async function dbCreateRoom(code: string, game: string, hostId: string, maxPlayers: number): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const { error } = await c.from(T.rooms).upsert({ code, game_type: game, host_id: hostId, status: 'waiting', max_players: maxPlayers, players: [], game_state: {} }, { onConflict: 'code' });
  dbFail(error);
}

export async function dbUpdateRoom(code: string, patch: { status?: 'waiting' | 'playing' | 'closed'; players?: RoomPlayerRow[] }): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const { error } = await c.from(T.rooms).update(patch).eq('code', code);
  dbFail(error);
}

/** Cierra la sala (la borra): el anfitrión se va y no queda nada colgado en la base de datos. */
export async function dbCloseRoom(code: string): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const { error } = await c.from(T.rooms).delete().eq('code', code);
  dbFail(error);
}

/** ¿Existe una sala abierta con ese código? (null = no se puede comprobar). */
export async function dbRoomOpen(code: string): Promise<boolean | null> {
  const c = await dbClient();
  if (!c) return null;
  const { data, error } = await c.from(T.rooms).select('status').eq('code', code).maybeSingle();
  if (dbFail(error)) return null;
  return Boolean(data && data.status !== 'closed');
}
