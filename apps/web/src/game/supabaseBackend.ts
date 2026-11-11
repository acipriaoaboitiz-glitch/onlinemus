import type { SupabaseClient } from '@supabase/supabase-js';
import type { GameRequest, GameResponse, RoomConfig, Seat, Team } from '@mus/engine';
import { BOT_NAMES } from './backend.ts';
import type { Backend, HandRow, PlayerRow, PublicRow, RoomRow, SignPayload, TeamChannel, Watcher } from './backend.ts';

/** Mensajes de las excepciones de las RPC (supabase/migrations) traducidos para el jugador. */
const ERRORS: Record<string, string> = {
  not_authenticated: 'Tu sesión ha caducado. Recarga la página.',
  room_not_found: 'No existe ninguna sala con ese código.',
  room_full: 'La sala está llena.',
  room_in_progress: 'La partida ya ha empezado.',
  seat_taken: 'Ese asiento ya está ocupado.',
  not_in_room: 'No estás en esa sala.',
  not_host: 'Solo puede hacerlo el anfitrión.',
  bad_state: 'No se puede hacer eso ahora mismo.',
  bad_seat: 'Asiento no válido.',
  bad_code_length: 'El código debe tener entre 4 y 6 dígitos.',
  no_free_codes: 'No hay códigos libres, inténtalo de nuevo.',
};

function friendly(message: string): string {
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  return key ? ERRORS[key] : message;
}

/** Adaptador fino entre la interfaz `Backend` y supabase-js. Toda la lógica está en el motor y en el SQL. */
export function createSupabaseBackend(client: SupabaseClient): Backend {
  async function rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(friendly(error.message));
    return data as T;
  }

  /** Los canales privados de Realtime necesitan el JWT de la sesión. */
  async function authRealtime(): Promise<void> {
    const { data } = await client.auth.getSession();
    client.realtime.setAuth(data.session?.access_token ?? null);
  }

  return {
    async ensureUser(name) {
      const { data: current } = await client.auth.getSession();
      let user = current.session?.user ?? null;
      if (!user) {
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw new Error('No se pudo iniciar sesión: ' + error.message);
        user = data.user;
      }
      if (!user) throw new Error('No se pudo iniciar sesión');
      const { error } = await client.from('profiles').upsert({ id: user.id, display_name: name });
      if (error) throw new Error(friendly(error.message));
      return { id: user.id, name };
    },

    async createRoom(config, codeLen = 6) {
      const r = await rpc<{ room_id: string; code: string; seat: number }>('create_room', { p_config: config, p_code_len: codeLen });
      return { roomId: r.room_id, code: r.code, seat: r.seat as Seat };
    },
    async joinRoom(code) {
      const r = await rpc<{ room_id: string; seat: number }>('join_room', { p_code: code });
      return { roomId: r.room_id, seat: r.seat as Seat };
    },
    leaveRoom: (roomId) => rpc('leave_room', { p_room: roomId }),
    chooseSeat: (roomId, seat) => rpc('choose_seat', { p_room: roomId, p_seat: seat }),
    addBot: (roomId, seat) => rpc('add_bot', { p_room: roomId, p_seat: seat }),
    removeBot: (roomId, seat) => rpc('remove_bot', { p_room: roomId, p_seat: seat }),
    setConfig: (roomId, config: Partial<RoomConfig>) => rpc('set_room_config', { p_room: roomId, p_config: config }),
    resetRoom: (roomId) => rpc('reset_room', { p_room: roomId }),

    async getRoom(roomId) {
      const { data, error } = await client.from('rooms').select('id, code, host_id, status, config').eq('id', roomId).maybeSingle();
      if (error) throw new Error(friendly(error.message));
      return (data as RoomRow | null) ?? null;
    },
    async getPlayers(roomId) {
      const { data, error } = await client
        .from('room_players')
        .select('seat, user_id, is_bot, profiles(display_name)')
        .eq('room_id', roomId);
      if (error) throw new Error(friendly(error.message));
      return ((data ?? []) as unknown as { seat: number; user_id: string | null; is_bot: boolean; profiles: { display_name: string } | { display_name: string }[] | null }[]).map(
        (r): PlayerRow => {
          const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
          return {
            seat: r.seat as Seat,
            user_id: r.user_id,
            is_bot: r.is_bot,
            name: r.is_bot ? BOT_NAMES[r.seat] : (prof?.display_name ?? null),
          };
        },
      );
    },
    async getPublic(roomId) {
      const { data, error } = await client.from('game_public').select('version, view, events, updated_at').eq('room_id', roomId).maybeSingle();
      if (error) throw new Error(friendly(error.message));
      return (data as PublicRow | null) ?? null;
    },
    async getHand(roomId, seat) {
      const { data, error } = await client.from('game_hands').select('seat, version, cards').eq('room_id', roomId).eq('seat', seat).maybeSingle();
      if (error) throw new Error(friendly(error.message));
      return (data as HandRow | null) ?? null;
    },

    watch(roomId, getSeat, w: Watcher) {
      const ch = client
        .channel(`db:${roomId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` }, () => w.onRoom())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, () => w.onPlayers())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_public', filter: `room_id=eq.${roomId}` }, (p: { eventType: string; new: unknown }) => {
          w.onPublic(p.eventType === 'DELETE' ? null : (p.new as PublicRow));
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_hands', filter: `room_id=eq.${roomId}` }, (p: { eventType: string; new: unknown }) => {
          if (p.eventType === 'DELETE') return w.onHand(null);
          const row = p.new as HandRow;
          if (row.seat === getSeat()) w.onHand(row);
        })
        .subscribe((status: string) => w.onStatus(status === 'SUBSCRIBED'));
      return () => { void client.removeChannel(ch); };
    },

    presence(roomId, userId, onSync) {
      let alive = true;
      let ch: ReturnType<SupabaseClient['channel']> | null = null;
      void authRealtime().then(() => {
        if (!alive) return;
        const channel = client.channel(`room:${roomId}`, { config: { private: true, presence: { key: userId } } });
        channel.on('presence', { event: 'sync' }, () => onSync(new Set(Object.keys(channel.presenceState()))));
        channel.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') await channel.track({ at: Date.now() });
        });
        ch = channel;
      });
      return () => {
        alive = false;
        if (ch) void client.removeChannel(ch);
      };
    },

    teamChannel(roomId, team: Team, onSign): TeamChannel {
      let alive = true;
      let ch: ReturnType<SupabaseClient['channel']> | null = null;
      void authRealtime().then(() => {
        if (!alive) return;
        const channel = client.channel(`room:${roomId}:team:${team}`, { config: { private: true, broadcast: { self: false, ack: false } } });
        channel.on('broadcast', { event: 'sign' }, (m: { payload: unknown }) => onSign(m.payload as SignPayload)).subscribe();
        ch = channel;
      });
      return {
        send(p) {
          void ch?.send({ type: 'broadcast', event: 'sign', payload: p });
        },
        close() {
          alive = false;
          if (ch) void client.removeChannel(ch);
        },
      };
    },

    async gameRequest(roomId, req: GameRequest): Promise<GameResponse> {
      const { data, error } = await client.functions.invoke('game-action', { body: { roomId, ...req } });
      if (error) {
        const res = (error as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          try { return { status: res.status, body: await res.json() }; } catch { /* cuerpo no JSON */ }
        }
        return { status: 500, body: { error: error.message } };
      }
      return { status: 200, body: (data ?? {}) as Record<string, unknown> };
    },
  };
}
