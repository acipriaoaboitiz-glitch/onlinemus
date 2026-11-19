import { getSupabase, supabaseEnabled } from './supabase.ts';

/**
 * Canal global del club: presencia (quién está conectado y qué hace) + mensajes directos entre jugadores
 * (solicitud de amistad, aceptación, invitación a sala). Mismo contrato con dos transportes:
 *  · Supabase Realtime (`presence` + `broadcast`) si hay claves y no se fuerza el modo local.
 *  · BroadcastChannel (pestañas del mismo navegador) como respaldo, con latido para detectar quién se ha ido.
 */
export type Status = 'lobby' | 'playing' | 'room';
/** Datos públicos de un jugador. */
export interface Card { uid: string; name: string; tag: string; avatar: number }
export interface Presence extends Card { status: Status; game?: string; code?: string; chips: number; wins: number; at: number }

export type Wire =
  | { k: 'req'; to: string; from: Card }
  | { k: 'ack'; to: string; from: Card }
  | { k: 'no'; to: string; from: Card }
  | { k: 'rm'; to: string; from: Card }
  | { k: 'invite'; to: string; from: Card; game: string; code: string };

export interface ClubTransport {
  readonly kind: 'supabase' | 'local';
  connect(me: Presence, onPeers: (list: Presence[]) => void, onMsg: (w: Wire) => void): Promise<void>;
  update(me: Presence): void;
  send(w: Wire): void;
  close(): void;
}

const CHANNEL = 'stacks-presence';

class SupabaseClub implements ClubTransport {
  readonly kind = 'supabase' as const;
  private ch: ReturnType<NonNullable<ReturnType<typeof getSupabase>>['channel']> | null = null;
  private me: Presence | null = null;

  connect(me: Presence, onPeers: (l: Presence[]) => void, onMsg: (w: Wire) => void): Promise<void> {
    const c = getSupabase();
    if (!c) return Promise.reject(new Error('sin Supabase'));
    this.me = me;
    const ch = c.channel(CHANNEL, { config: { presence: { key: me.uid }, broadcast: { self: false } } });
    this.ch = ch;
    ch.on('presence', { event: 'sync' }, () => {
      const all = Object.values(ch.presenceState<Presence>()).flat() as Presence[];
      onPeers(all.filter((p) => p.uid !== me.uid));
    });
    ch.on('broadcast', { event: 'dm' }, ({ payload }) => onMsg(payload as Wire));
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error('timeout')), 6000);
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') { window.clearTimeout(timer); void ch.track(this.me!).then(() => resolve()); }
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') { window.clearTimeout(timer); reject(new Error('canal')); }
      });
    });
  }
  update(me: Presence): void { this.me = me; void this.ch?.track(me); }
  send(w: Wire): void { void this.ch?.send({ type: 'broadcast', event: 'dm', payload: w }); }
  close(): void {
    const c = getSupabase();
    const ch = this.ch;
    this.ch = null;
    if (ch) { void ch.untrack(); void c?.removeChannel(ch); }
  }
}

type LocalWire = { t: 'p'; p: Presence } | { t: 'hello' } | { t: 'bye'; uid: string } | { t: 'dm'; w: Wire };

class LocalClub implements ClubTransport {
  readonly kind = 'local' as const;
  private bc: BroadcastChannel | null = null;
  private peers = new Map<string, { p: Presence; seen: number }>();
  private me: Presence | null = null;
  private timer = 0;
  private onPeers: ((l: Presence[]) => void) | null = null;

  connect(me: Presence, onPeers: (l: Presence[]) => void, onMsg: (w: Wire) => void): Promise<void> {
    this.me = me;
    this.onPeers = onPeers;
    const bc = new BroadcastChannel('stacks-club');
    this.bc = bc;
    bc.onmessage = (e: MessageEvent<LocalWire>) => {
      const m = e.data;
      if (m.t === 'p') { if (m.p.uid !== this.me?.uid) { this.peers.set(m.p.uid, { p: m.p, seen: Date.now() }); this.emit(); } }
      else if (m.t === 'hello') this.announce();
      else if (m.t === 'bye') { if (this.peers.delete(m.uid)) this.emit(); }
      else onMsg(m.w);
    };
    this.timer = window.setInterval(() => {
      const now = Date.now();
      let changed = false;
      for (const [uid, v] of this.peers) if (now - v.seen > 4500) { this.peers.delete(uid); changed = true; }
      this.announce();
      if (changed) this.emit();
    }, 1500);
    bc.postMessage({ t: 'hello' } satisfies LocalWire);
    this.announce();
    return Promise.resolve();
  }
  private announce(): void { if (this.me) this.bc?.postMessage({ t: 'p', p: this.me } satisfies LocalWire); }
  private emit(): void { this.onPeers?.([...this.peers.values()].map((v) => v.p)); }
  update(me: Presence): void { this.me = me; this.announce(); }
  send(w: Wire): void { this.bc?.postMessage({ t: 'dm', w } satisfies LocalWire); }
  close(): void {
    window.clearInterval(this.timer);
    if (this.me) this.bc?.postMessage({ t: 'bye', uid: this.me.uid } satisfies LocalWire);
    this.bc?.close();
    this.bc = null;
  }
}

/** Conecta con Supabase si se puede y, si falla (sin red, claves erróneas), cae solo al modo local. */
export async function connectClub(me: Presence, onPeers: (l: Presence[]) => void, onMsg: (w: Wire) => void): Promise<ClubTransport> {
  if (supabaseEnabled) {
    const t = new SupabaseClub();
    try { await t.connect(me, onPeers, onMsg); return t; } catch { try { t.close(); } catch { /* ya cerrado */ } }
  }
  const l = new LocalClub();
  await l.connect(me, onPeers, onMsg);
  return l;
}
