import type { Card } from './club.ts';
import { ensureSession, getSupabase } from '../lib/supabase.ts';

/**
 * Persistencia en Supabase de STACKS. Todas las tablas llevan el prefijo `stacks_` porque el proyecto se comparte con otra app:
 * `stacks_profiles`, `stacks_friendships`, `stacks_game_invites` y `stacks_rooms` (ver supabase/schema.sql).
 * Todo es «mejor esfuerzo»: sin Supabase, sin sesión o sin las tablas, cada función devuelve un valor vacío y la app sigue en local.
 */
export interface DbProfile {
  id: string; username: string; tag: string; avatar_id: string | null; title: string | null;
  chips: number; wins: number; games_played: number; equipped_card_back: string; equipped_table: string;
}
export interface DbFriendship { requester_id: string; addressee_id: string; status: 'pending' | 'accepted' }
export interface DbInvite { id: string; from_user_id: string; to_user_id: string; game_type: string; room_code: string; status: string; created_at: string }

export const T = { profiles: 'stacks_profiles', friendships: 'stacks_friendships', invites: 'stacks_game_invites', rooms: 'stacks_rooms' } as const;

let broken = false;
/** Cliente listo para consultar tablas (hay Supabase, sesión y las tablas existen). */
export async function dbClient() {
  if (broken) return null;
  const c = getSupabase();
  if (!c) return null;
  return (await ensureSession()) ? c : null;
}
/** ¿Falló la operación? Si faltan las tablas se desactiva la capa de datos hasta recargar. */
export function dbFail(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === '42P01' || err.code === 'PGRST205' || /relation .* does not exist|schema cache/i.test(err.message ?? '')) broken = true;
  return true;
}
/** Uid del usuario autenticado en Supabase (anónimo, email o Google). */
export async function authUserId(): Promise<string | null> { return (await ensureSession())?.user.id ?? null; }

const stripTag = (t: string): string => t.replace('#', '');
export const toCard = (r: DbProfile): Card => ({ uid: r.id, name: r.username, tag: stripTag(r.tag), avatar: Number(r.avatar_id ?? 0) || 0 });
const COLS = 'id,username,tag,avatar_id,title,chips,wins,games_played,equipped_card_back,equipped_table';

export type ProfilePayload = Omit<DbProfile, 'id'> & { id: string };

/** Crea o actualiza el perfil propio. `conflict` = ese Apodo#TAG ya lo usa otra persona (hay que sortear otro TAG). */
export async function dbUpsertProfile(p: ProfilePayload): Promise<'ok' | 'conflict' | 'off'> {
  const c = await dbClient();
  const auth = await authUserId();
  if (!c || !auth) return 'off';
  const { error } = await c.from(T.profiles).upsert({ ...p, auth_id: auth }, { onConflict: 'id' });
  if (error?.code === '23505') return 'conflict';
  return dbFail(error) ? 'off' : 'ok';
}

/** Perfil guardado en la nube del usuario autenticado (para recuperar la cuenta en otro dispositivo). */
export async function dbLoadOwnProfile(): Promise<DbProfile | null> {
  const c = await dbClient();
  const auth = await authUserId();
  if (!c || !auth) return null;
  const { data, error } = await c.from(T.profiles).select(COLS).eq('auth_id', auth).maybeSingle();
  if (dbFail(error) || !data) return null;
  return data as DbProfile;
}

/** Busca por «Apodo#TAG» (exacto), por TAG suelto o por parte del apodo. */
export async function dbSearch(q: string): Promise<(Card & { chips: number; wins: number })[]> {
  const c = await dbClient();
  if (!c) return [];
  const raw = q.trim();
  const hash = raw.indexOf('#');
  const bareTag = /^#?\d{4}$/.test(raw);
  const name = bareTag ? '' : (hash >= 0 ? raw.slice(0, hash) : raw).trim().replace(/[%,()]/g, '');
  const tag = bareTag ? raw.replace('#', '') : hash >= 0 ? raw.slice(hash + 1).trim() : '';
  let query = c.from(T.profiles).select(COLS).limit(8);
  if (tag) query = query.in('tag', [tag, `#${tag}`]);
  if (name) query = query.ilike('username', `${name}%`);
  const { data, error } = await query;
  if (dbFail(error) || !data) return [];
  return (data as DbProfile[]).map((r) => ({ ...toCard(r), chips: Number(r.chips), wins: r.wins }));
}

export async function dbTop(limit = 30): Promise<(Card & { chips: number; wins: number })[]> {
  const c = await dbClient();
  if (!c) return [];
  const { data, error } = await c.from(T.profiles).select(COLS).order('chips', { ascending: false }).limit(limit);
  if (dbFail(error) || !data) return [];
  return (data as DbProfile[]).map((r) => ({ ...toCard(r), chips: Number(r.chips), wins: r.wins }));
}

/** Filtro PostgREST que cubre la pareja en ambos sentidos (A→B o B→A). */
const pairOr = (a: string, b: string): string => `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`;

/**
 * Solicitud de amistad. Consulta la pareja en los dos sentidos: si ya son amigos no hace nada, y si la otra persona ya había
 * enviado la suya, la acepta en vez de crear una fila inversa (evita claves duplicadas y estados atascados).
 */
export async function dbRequest(from: string, to: string): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const { data, error: e0 } = await c.from(T.friendships).select('requester_id,addressee_id,status').or(pairOr(from, to));
  if (dbFail(e0)) return;
  const rows = (data ?? []) as DbFriendship[];
  if (rows.some((r) => r.status === 'accepted')) return;
  const reverse = rows.find((r) => r.requester_id === to && r.addressee_id === from);
  if (reverse) { await dbSetFriendship(to, from, 'accepted'); return; }
  if (rows.length) return; // ya pendiente de mi parte
  const { error } = await c.from(T.friendships).insert({ requester_id: from, addressee_id: to, status: 'pending' });
  if (error?.code !== '23505') dbFail(error);
}
export async function dbSetFriendship(requester: string, addressee: string, status: 'accepted' | 'removed'): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const q = status === 'removed'
    ? c.from(T.friendships).delete().or(`and(requester_id.eq.${requester},addressee_id.eq.${addressee}),and(requester_id.eq.${addressee},addressee_id.eq.${requester})`)
    : c.from(T.friendships).update({ status }).eq('requester_id', requester).eq('addressee_id', addressee);
  const { error } = await q;
  dbFail(error);
}
export async function dbLoadFriendships(me: string): Promise<{ rows: DbFriendship[]; profiles: Record<string, DbProfile> }> {
  const c = await dbClient();
  if (!c) return { rows: [], profiles: {} };
  const { data, error } = await c.from(T.friendships).select('requester_id,addressee_id,status').or(`requester_id.eq.${me},addressee_id.eq.${me}`);
  if (dbFail(error) || !data) return { rows: [], profiles: {} };
  const rows = data as DbFriendship[];
  const ids = [...new Set(rows.flatMap((r) => [r.requester_id, r.addressee_id]).filter((u) => u !== me))];
  const profiles: Record<string, DbProfile> = {};
  if (ids.length) {
    const { data: ps, error: e2 } = await c.from(T.profiles).select(COLS).in('id', ids);
    if (!dbFail(e2) && ps) for (const p of ps as DbProfile[]) profiles[p.id] = p;
  }
  return { rows, profiles };
}

/** Invitación a partida. Devuelve el id de la fila (para que el destinatario la acepte o rechace). */
export async function dbInvite(from: string, to: string, game: string, code: string): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const { error } = await c.from(T.invites).insert({ from_user_id: from, to_user_id: to, game_type: game, room_code: code });
  dbFail(error);
}
export async function dbRespondInvite(id: string, status: 'accepted' | 'declined' | 'expired'): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const { error } = await c.from(T.invites).update({ status }).eq('id', id);
  dbFail(error);
}

/** Marca como 'expired' las invitaciones pendientes de una sala que ya terminó (o de la que sales), enviadas o recibidas. */
export async function dbExpireInvites(me: string, roomCode: string): Promise<void> {
  const c = await dbClient();
  if (!c) return;
  const { error } = await c.from(T.invites).update({ status: 'expired' }).eq('room_code', roomCode).eq('status', 'pending').or(`from_user_id.eq.${me},to_user_id.eq.${me}`);
  dbFail(error);
}

/** Cambios en vivo (`postgres_changes`) de las amistades y las invitaciones dirigidas a este jugador. */
export function dbSubscribe(me: string, onFriendship: (r: DbFriendship) => void, onInvite: (r: DbInvite) => void): () => void {
  let off = () => {};
  let cancelled = false;
  void dbClient().then((c) => {
    if (!c || cancelled) return;
    const ch = c.channel(`stacks-social:${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: T.friendships, filter: `addressee_id=eq.${me}` }, (p) => { if (p.new && 'status' in p.new) onFriendship(p.new as DbFriendship); })
      .on('postgres_changes', { event: '*', schema: 'public', table: T.friendships, filter: `requester_id=eq.${me}` }, (p) => { if (p.new && 'status' in p.new) onFriendship(p.new as DbFriendship); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: T.invites, filter: `to_user_id=eq.${me}` }, (p) => onInvite(p.new as DbInvite))
      .subscribe();
    off = () => { void c.removeChannel(ch); };
  });
  return () => { cancelled = true; off(); };
}
