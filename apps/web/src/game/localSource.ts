import { act, autoAction, botAction, legalActions, newMatch, publicView, signIsTruthful } from '@mus/engine';
import type { Action, GameEvent, MusState, RoomConfig, Seat, SignId } from '@mus/engine';
import type { GameSource, IncomingSign, SeatInfo, Snapshot } from './types.ts';

export interface LocalOptions {
  name: string;
  config?: Partial<RoomConfig>;
  seed?: number;
  /** Pausa de los bots entre jugadas, en ms [mín, máx]. [0, 0] = instantáneo (tests). */
  botDelay?: [number, number];
  /** Probabilidad de que tu pareja bot te haga una seña al repartir. */
  signChance?: number;
  /** Espera (ms) entre repartir y que tu pareja bot te haga la seña. */
  signDelay?: number;
}

/** Asientos 1..3; el 2 es tu pareja. */
const BOT_NAMES = ['Jon', 'Nerea', 'Aitor'];

/** De más a menos interesante para chivar: la pareja bot avisa de lo mejor que lleva. */
const PARTNER_SIGNS: SignId[] = [
  'cuatro_reyes', 'tres_reyes', 'solomillo', 'duples', 'medias', 'treinta_y_una',
  'dos_reyes', 'cuatro_cerdos', 'tres_cerdos', 'dos_cerdos', 'treinta', 'ciego',
];

function randomSeed(): number {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return c?.getRandomValues ? c.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 2 ** 32);
}

/** Partida contra 3 bots que corre entera en el navegador: sin cuenta, sin red. */
export function createLocalSource(opts: LocalOptions): GameSource {
  const fast = typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast');
  const [dMin, dMax] = opts.botDelay ?? (fast ? [15, 30] : [650, 1250]);
  const seed = opts.seed ?? randomSeed();
  const names = [opts.name || 'Tú', ...BOT_NAMES];

  let state: MusState = newMatch(opts.config ?? {}, seed, (seed % 4) as Seat);
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(e: GameEvent[]) => void>();
  const signListeners = new Set<(s: IncomingSign) => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let signTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;

  const seats: SeatInfo[] = names.map((name, i) => ({
    seat: i as Seat, userId: i === 0 ? 'me' : null, name, isBot: i !== 0, online: true,
  }));
  const build = (): Snapshot => ({
    status: 'playing', error: null, connected: true, mySeat: 0, isHost: true, room: null,
    seats, view: publicView(state), hand: state.hands[0], deadline: null,
  });
  let snap = build();

  function commit(next: MusState, events: GameEvent[]): void {
    state = next;
    snap = build();
    listeners.forEach((l) => l());
    eventListeners.forEach((l) => l(events));
    if (events.some((e) => e.t === 'handStart')) scheduleSign();
    schedule();
  }

  function schedule(): void {
    if (destroyed || timer !== null || state.phase === 'matchEnd') return;
    const seat = ([1, 2, 3] as Seat[]).find((x) => legalActions(state, x).length > 0);
    if (seat === undefined) return;
    const wait = state.phase === 'handEnd' ? 0 : dMin + Math.random() * (dMax - dMin);
    timer = setTimeout(() => {
      timer = null;
      botStep(seat);
    }, wait);
  }

  function botStep(seat: Seat): void {
    if (destroyed) return;
    let action = botAction(state, seat);
    let res = action ? act(state, seat, action) : null;
    if (!res || !res.ok) {
      action = autoAction(state, seat);
      res = action ? act(state, seat, action) : null;
    }
    if (res && res.ok) commit(res.state, res.events);
  }

  /** Tu pareja bot te chiva (con una seña veraz) lo mejor que lleva, como en la mesa de verdad. */
  function scheduleSign(): void {
    if (signTimer !== null) clearTimeout(signTimer);
    signTimer = setTimeout(() => {
      signTimer = null;
      if (destroyed || state.phase !== 'mus' || Math.random() > (opts.signChance ?? 0.55)) return;
      const id = PARTNER_SIGNS.find((s) => signIsTruthful(s, state.hands[2], state.config));
      if (id) signListeners.forEach((l) => l({ id, from: 2, at: Date.now() }));
    }, opts.signDelay ?? 900);
  }

  scheduleSign();
  schedule();

  return {
    getSnapshot: () => snap,
    subscribe(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    async send(action: Action) {
      const res = act(state, 0, action);
      if (!res.ok) return res.error;
      commit(res.state, res.events);
      return null;
    },
    async sendSign() { /* la pareja bot no entiende de señas: el envío es solo de adorno */ return null; },
    async catchSignal() { return 'La sospecha solo está disponible en salas online'; },
    onSign(cb) {
      signListeners.add(cb);
      return () => { signListeners.delete(cb); };
    },
    onEvents(cb) {
      eventListeners.add(cb);
      return () => { eventListeners.delete(cb); };
    },
    tick() { /* sin límite de tiempo en local */ },
    destroy() {
      destroyed = true;
      if (timer !== null) clearTimeout(timer);
      if (signTimer !== null) clearTimeout(signTimer);
      listeners.clear();
      eventListeners.clear();
      signListeners.clear();
    },
  };
}
