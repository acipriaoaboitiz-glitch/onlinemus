import { useSyncExternalStore } from 'react';
import { connectClub, type Card, type ClubTransport, type Presence, type Status, type Wire } from '../services/club.ts';
import { dbExpireInvites, dbInvite, dbLoadFriendships, dbRequest, dbRespondInvite, dbSearch, dbSetFriendship, dbSubscribe, dbTop, toCard } from '../services/socialDb.ts';
import { pushProfile } from './profileSync.ts';
import { feedback } from './settings.ts';
import { findGame } from '../games/registry.ts';
import { tr, trf } from '../i18n/index.ts';
import { displayName, getIdent, handleOf } from './identity.ts';
import { getWallet } from './wallet.ts';

/**
 * Sistema social: amigos, solicitudes, presencia en vivo e invitaciones.
 * El estado (amigos / solicitudes) se guarda en localStorage por jugador; la presencia y los mensajes viajan por `services/club.ts`
 * (Supabase Realtime o BroadcastChannel) y, si existen las tablas, también se persisten en Supabase (`services/socialDb.ts`).
 */
export interface Friend extends Card { since: number; chips: number; wins: number }
export interface Notice {
  id: number;
  kind: 'friend' | 'invite' | 'info';
  from?: Card;
  game?: string;
  code?: string;
  /** Fila de `stacks_game_invites` (para aceptar o rechazar en la base de datos). */
  inviteId?: string;
  text: string;
}
interface Persisted { friends: Record<string, Friend>; incoming: Record<string, Card & { at: number }>; outgoing: Record<string, Card & { at: number }> }
export interface SocialSnapshot {
  friends: Friend[];
  incoming: (Card & { at: number })[];
  outgoing: (Card & { at: number })[];
  /** Jugadores conectados ahora mismo (presencia del club), sin contarte a ti. */
  peers: Presence[];
  transport: 'supabase' | 'local' | 'off';
  notices: Notice[];
}

const storeKey = (uid: string): string => `stacks_social_${uid}`;
const empty = (): Persisted => ({ friends: {}, incoming: {}, outgoing: {} });
function load(uid: string): Persisted {
  try {
    const raw = localStorage.getItem(storeKey(uid));
    if (raw) { const p = JSON.parse(raw) as Partial<Persisted>; return { friends: p.friends ?? {}, incoming: p.incoming ?? {}, outgoing: p.outgoing ?? {} }; }
  } catch { /* estado nuevo */ }
  return empty();
}

let data: Persisted = load(getIdent().uid);
let peers = new Map<string, Presence>();
let notices: Notice[] = [];
let transport: ClubTransport | null = null;
let activity: { status: Status; game?: string; code?: string } = { status: 'lobby' };
let snap: SocialSnapshot = build();
let nextId = 1;
const listeners = new Set<() => void>();
const sentTo = new Set<string>(); // solicitudes ya reenviadas en esta sesión de presencia del destinatario

function build(): SocialSnapshot {
  return {
    friends: Object.values(data.friends).sort((a, b) => Number(peers.has(b.uid)) - Number(peers.has(a.uid)) || a.name.localeCompare(b.name)),
    incoming: Object.values(data.incoming).sort((a, b) => b.at - a.at),
    outgoing: Object.values(data.outgoing).sort((a, b) => b.at - a.at),
    peers: [...peers.values()],
    transport: transport?.kind ?? 'off',
    notices,
  };
}
function publish(persist = false): void {
  if (persist) { try { localStorage.setItem(storeKey(getIdent().uid), JSON.stringify(data)); } catch { /* sin almacenamiento */ } }
  snap = build();
  listeners.forEach((l) => l());
}

export const myCard = (): Card => ({ uid: getIdent().uid, name: displayName(), tag: getIdent().tag, avatar: getWallet().avatar });
const myPresence = (): Presence => ({ ...myCard(), ...activity, chips: getWallet().chips, wins: Object.values(getWallet().wins).reduce((a, b) => a + b, 0), at: Date.now() });

function notify(n: Omit<Notice, 'id'>): void {
  // Una sola alerta por remitente y tipo: si llega otra igual, sustituye a la anterior.
  notices = [...notices.filter((x) => !(x.kind === n.kind && x.from?.uid === n.from?.uid && x.code === n.code)), { ...n, id: nextId++ }].slice(-3);
  feedback('turn');
  publish();
}

const send = (w: Wire): void => transport?.send(w);
const sameCard = (c: Card): Card => ({ uid: c.uid, name: c.name, tag: c.tag, avatar: c.avatar });

function addFriend(c: Card, stats?: { chips: number; wins: number }): void {
  data.friends[c.uid] = { ...sameCard(c), since: data.friends[c.uid]?.since ?? Date.now(), chips: stats?.chips ?? data.friends[c.uid]?.chips ?? 0, wins: stats?.wins ?? data.friends[c.uid]?.wins ?? 0 };
  delete data.incoming[c.uid];
  delete data.outgoing[c.uid];
}

function onMsg(w: Wire): void {
  if (w.to !== getIdent().uid) return;
  const from = w.from;
  switch (w.k) {
    case 'req': {
      if (data.friends[from.uid]) { send({ k: 'ack', to: from.uid, from: myCard() }); return; }
      if (data.outgoing[from.uid]) { addFriend(from); send({ k: 'ack', to: from.uid, from: myCard() }); publish(true); notify({ kind: 'info', from, text: trf('n.alreadyFriends', { h: handleOf(from.name, from.tag) }) }); return; }
      const fresh = !data.incoming[from.uid];
      data.incoming[from.uid] = { ...sameCard(from), at: Date.now() };
      publish(true);
      if (fresh) notify({ kind: 'friend', from, text: trf('n.newFriend', { h: handleOf(from.name, from.tag) }) });
      return;
    }
    case 'ack':
      if (data.outgoing[from.uid] || !data.friends[from.uid]) { addFriend(from); publish(true); notify({ kind: 'info', from, text: trf('n.accepted', { h: handleOf(from.name, from.tag) }) }); }
      return;
    case 'no': delete data.outgoing[from.uid]; publish(true); return;
    case 'rm': if (data.friends[from.uid]) { delete data.friends[from.uid]; publish(true); } return;
    case 'invite': {
      if (!data.friends[from.uid]) return; // solo los amigos pueden invitar
      const gameName = findGame(w.game) ? tr(`g.${w.game}.name`) : w.game;
      notify({ kind: 'invite', from, game: w.game, code: w.code, text: trf('n.invite', { h: handleOf(from.name, from.tag), g: gameName }) });
      return;
    }
  }
}

function onPeers(list: Presence[]): void {
  const next = new Map(list.map((p) => [p.uid, p]));
  for (const uid of sentTo) if (!next.has(uid)) sentTo.delete(uid);
  peers = next;
  // Mantiene al día los datos de los amigos (apodo, avatar, fichas, victorias).
  let changed = false;
  for (const p of list) {
    const f = data.friends[p.uid];
    if (f && (f.name !== p.name || f.avatar !== p.avatar || f.chips !== p.chips || f.wins !== p.wins)) { data.friends[p.uid] = { ...f, name: p.name, tag: p.tag, avatar: p.avatar, chips: p.chips, wins: p.wins }; changed = true; }
  }
  // Solicitudes enviadas a alguien que no estaba conectado: se entregan cuando aparece.
  for (const uid of Object.keys(data.outgoing)) if (next.has(uid) && !sentTo.has(uid)) { sentTo.add(uid); send({ k: 'req', to: uid, from: myCard() }); }
  publish(changed);
}

let started = false;
let unsubDb: (() => void) | null = null;
let beat = 0;

/** Carga amistades de `stacks_friendships` y las mezcla con el estado local. */
async function loadFriends(): Promise<void> {
  const me = getIdent().uid;
  const { rows, profiles } = await dbLoadFriendships(me);
  for (const row of rows) {
    const other = row.requester_id === me ? row.addressee_id : row.requester_id;
    const p = profiles[other];
    if (!p) continue;
    const card = toCard(p);
    const stats = { chips: Number(p.chips), wins: p.wins };
    if (row.status === 'accepted') addFriend(card, stats);
    else if (row.addressee_id === me && !data.friends[other]) data.incoming[other] = { ...card, at: data.incoming[other]?.at ?? Date.now() };
    else if (row.requester_id === me && !data.friends[other]) data.outgoing[other] = { ...card, at: data.outgoing[other]?.at ?? Date.now() };
  }
  publish(true);
}

async function syncDb(): Promise<void> {
  // Primero el perfil propio (las amistades e invitaciones lo referencian), luego amigos y cambios en vivo.
  if ((await pushProfile()) !== 'ok') return;
  const me = getIdent().uid;
  await loadFriends();
  unsubDb?.();
  unsubDb = dbSubscribe(me, () => { void loadFriends(); }, (inv) => {
    const f = data.friends[inv.from_user_id];
    if (f) notify({ kind: 'invite', from: sameCard(f), game: inv.game_type, code: inv.room_code, inviteId: inv.id, text: trf('n.invite', { h: handleOf(f.name, f.tag), g: findGame(inv.game_type) ? tr(`g.${inv.game_type}.name`) : inv.game_type }) });
  });
}

export const social = {
  /** Arranca la presencia del club (se llama una vez que hay perfil). */
  async start(): Promise<void> {
    if (started) return;
    started = true;
    data = load(getIdent().uid);
    try {
      transport = await connectClub(myPresence(), onPeers, onMsg);
    } catch { transport = null; }
    publish();
    // Latido: refresca fichas/victorias y estado en la presencia.
    beat = window.setInterval(() => transport?.update(myPresence()), 20000);
    void syncDb();
  },
  stop(): void {
    started = false;
    window.clearInterval(beat);
    unsubDb?.();
    transport?.close();
    transport = null;
    peers = new Map();
    publish();
  },
  /** Qué está haciendo el jugador (lo ven sus amigos): lobby, jugando a X o en una sala privada. */
  setActivity(status: Status, game?: string, code?: string): void {
    if (activity.status === status && activity.game === game && activity.code === code) return;
    activity = { status, game, code };
    transport?.update(myPresence());
  },
  /** Busca entre los conectados y, si hay base de datos, entre todos los perfiles. */
  async search(q: string): Promise<Card[]> {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    const me = getIdent().uid;
    const live = [...peers.values()].filter((p) => `${p.name}#${p.tag}`.toLowerCase().includes(needle) || p.tag === needle);
    const db = await dbSearch(q);
    const out = new Map<string, Card>();
    for (const p of [...live, ...db]) if (p.uid !== me) out.set(p.uid, sameCard(p));
    return [...out.values()].slice(0, 8);
  },
  request(c: Card): 'sent' | 'friend' | 'self' {
    if (c.uid === getIdent().uid) return 'self';
    if (data.friends[c.uid]) return 'friend';
    data.outgoing[c.uid] = { ...sameCard(c), at: Date.now() };
    sentTo.delete(c.uid);
    send({ k: 'req', to: c.uid, from: myCard() });
    if (peers.has(c.uid)) sentTo.add(c.uid);
    void dbRequest(getIdent().uid, c.uid);
    publish(true);
    return 'sent';
  },
  accept(uid: string): void {
    const c = data.incoming[uid];
    if (!c) return;
    addFriend(c);
    send({ k: 'ack', to: uid, from: myCard() });
    void dbSetFriendship(uid, getIdent().uid, 'accepted');
    publish(true);
  },
  decline(uid: string): void {
    const c = data.incoming[uid];
    if (!c) return;
    delete data.incoming[uid];
    send({ k: 'no', to: uid, from: myCard() });
    void dbSetFriendship(uid, getIdent().uid, 'removed');
    publish(true);
  },
  remove(uid: string): void {
    delete data.friends[uid];
    send({ k: 'rm', to: uid, from: myCard() });
    void dbSetFriendship(getIdent().uid, uid, 'removed');
    publish(true);
  },
  /** Acepta o rechaza una invitación recibida (actualiza `stacks_game_invites`). */
  respondInvite(n: Notice, status: 'accepted' | 'declined'): void {
    if (n.inviteId) void dbRespondInvite(n.inviteId, status);
    notices = notices.filter((x) => x.id !== n.id);
    publish();
  },
  invite(uid: string, game: string, code: string): void {
    send({ k: 'invite', to: uid, from: myCard(), game, code });
    void dbInvite(getIdent().uid, uid, game, code);
  },
  /**
   * Al terminar o salir de una sala: caducan sus invitaciones (en la base y en los avisos locales), la presencia vuelve al lobby
   * y los amigos quedan libres para recibir una invitación nueva a una sala limpia.
   */
  closeRoom(code: string | null | undefined): void {
    if (code) {
      notices = notices.filter((n) => n.code !== code);
      void dbExpireInvites(getIdent().uid, code);
    }
    activity = { status: 'lobby' };
    transport?.update(myPresence());
    publish();
  },
  dismiss(id: number): void { notices = notices.filter((n) => n.id !== id); publish(); },
  /** Clasificación global: perfiles de la base de datos si existe, y si no, jugadores conectados. */
  async top(): Promise<{ rows: (Card & { chips: number; wins: number })[]; source: 'db' | 'live' }> {
    const db = await dbTop(30);
    if (db.length) return { rows: db, source: 'db' };
    const w = getWallet();
    const me = { ...myCard(), chips: w.chips, wins: Object.values(w.wins).reduce((a, b) => a + b, 0) };
    return { rows: [me, ...[...peers.values()].map((p) => ({ ...sameCard(p), chips: p.chips, wins: p.wins }))], source: 'live' };
  },
  /** Borra todo lo social de este dispositivo (usado por «Restablecer datos locales»). */
  wipe(): void { data = empty(); try { localStorage.removeItem(storeKey(getIdent().uid)); } catch { /* sin almacenamiento */ } publish(); },
};

export const getSocial = (): SocialSnapshot => snap;
export const useSocial = (): SocialSnapshot => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getSocial);

export function statusLabel(p: Presence | undefined, gameName: (id: string) => string, t: (key: string, vars?: Record<string, string | number>) => string = (k, v) => trf(k, v ?? {})): string {
  if (!p) return t('st.off');
  if (p.status === 'playing') return t('st.playing', { g: gameName(p.game ?? '') });
  if (p.status === 'room') return t('st.room');
  return t('st.lobby');
}
