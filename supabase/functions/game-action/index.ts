// Autoridad del servidor (Deno · Supabase Edge Function).
//
//   { roomId, kind: 'start' }               el anfitrión arranca la partida (4 asientos ocupados)
//   { roomId, kind: 'action', action }      un jugador actúa; el motor decide si es legal
//   { roomId, kind: 'tick' }                alguien avisa de que se acabó el tiempo de un turno
//
// Toda la lógica (validación, bots, turnos que caducan) vive en el núcleo del motor, que está probado en
// memoria (packages/engine/test). Aquí solo se conectan sus funciones de acceso a datos con Supabase.
// El motor se copia a ../_shared/engine con `npm run sync:engine` (lo hace `npm run deploy:functions`).
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleGameRequest, publicView } from '../_shared/engine/index.ts';
import type { GameRequest, MusState, ServerDeps } from '../_shared/engine/index.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const deps: ServerDeps = {
  async getRoom(id) {
    const { data, error } = await admin.from('rooms').select('id, host_id, status, config').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  },
  async getPlayers(id) {
    const { data, error } = await admin.from('room_players').select('seat, user_id, is_bot').eq('room_id', id);
    if (error) throw error;
    return data ?? [];
  },
  async loadGame(id) {
    const { data, error } = await admin.from('game_private').select('version, state, updated_at').eq('room_id', id).maybeSingle();
    if (error) throw error;
    return data ? { version: data.version, state: data.state as MusState, updatedAtMs: Date.parse(data.updated_at) } : null;
  },
  async commit(c) {
    // Una sola transacción en Postgres: estado privado + vista pública + manos + registro, con control de versión.
    const { data, error } = await admin.rpc('commit_game_update', {
      p_room: c.roomId,
      p_expected: c.expected,
      p_private: c.state,
      p_public: publicView(c.state),
      p_hands: c.state.hands,
      p_events: c.events,
      p_seat: c.seat,
      p_action: c.action,
    });
    if (error) throw error;
    return data === true;
  },
  async setRoomStatus(id, status) {
    const { error } = await admin.from('rooms').update({ status }).eq('id', id);
    if (error) throw error;
  },
  now: () => Date.now(),
  randomSeed: () => {
    const r = crypto.getRandomValues(new Uint32Array(2));
    return [r[0], r[1]];
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  // Quién es: el JWT del cliente. El asiento nunca lo manda el cliente.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: 'No autorizado' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'JSON no válido' }, 400);
  }
  const roomId = typeof body.roomId === 'string' ? body.roomId : '';
  if (!/^[0-9a-f-]{36}$/i.test(roomId)) return json({ error: 'Sala no válida' }, 400);

  const kind = body.kind;
  if (kind !== 'start' && kind !== 'action' && kind !== 'tick') return json({ error: 'Petición desconocida' }, 400);
  const request: GameRequest = kind === 'action' ? { kind, action: body.action } : { kind };

  try {
    const res = await handleGameRequest(deps, roomId, auth.user.id, request);
    return json(res.body, res.status);
  } catch (e) {
    console.error('game-action', e);
    return json({ error: 'Error del servidor' }, 500);
  }
});
