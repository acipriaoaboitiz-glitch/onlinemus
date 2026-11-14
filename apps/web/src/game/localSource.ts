import { act, autoAction, botAction, legalActions, newMatch, publicView, signIsTruthful, teamOf } from '@mus/engine';
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
  /** Probabilidad de que un rival bot se haga una seña con su pareja al repartir (tú puedes pillarla con el ojo). */
  rivalSignChance?: number;
  /** Espera (ms) entre repartir y la seña del rival bot. */
  rivalSignDelay?: number;
  /** Probabilidad de que un rival bot pille la seña que tú le haces a tu pareja. */
  catchChance?: number;
  /** Espera (ms) [mín, máx] que tarda un rival bot en pillar tu seña. */
  catchDelay?: [number, number];
  /** Cuánto dura viva una seña (ms). Por defecto 3 s, como en el servidor. */
  signalMs?: number;
  /** Pausa al cazar una seña (ms). Por defecto 3,6 s: lo que dura la cinemática de «SEÑA CAZADA». */
  catchPauseMs?: number;
  /** Bloqueo del ojo tras una falsa alarma (ms). Por defecto 10 s, como en el servidor. */
  catchCooldownMs?: number;
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
  const [dMin, dMax] = opts.botDelay ?? (fast ? [15, 30] : [1500, 2400]);
  const seed = opts.seed ?? randomSeed();
  const names = [opts.name || 'Tú', ...BOT_NAMES];

  let state: MusState = newMatch(opts.config ?? {}, seed, (seed % 4) as Seat);
  const listeners = new Set<() => void>();
  const eventListeners = new Set<(e: GameEvent[]) => void>();
  const signListeners = new Set<(s: IncomingSign) => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let signTimer: ReturnType<typeof setTimeout> | null = null;
  let rivalTimer: ReturnType<typeof setTimeout> | null = null;
  const catchTimers = new Set<ReturnType<typeof setTimeout>>();
  let destroyed = false;
  let paused = false;

  // Sospecha de señas contra bots: mismas reglas que el servidor (ventana de 3 s, pausa de 1 s, cooldown de 10 s)
  // y sin tocar nunca las piedras. El contenido de la seña solo se revela al cazarla.
  const signalMs = opts.signalMs ?? 3_000;
  const pauseMs = opts.catchPauseMs ?? 3_600;
  const cooldownMs = opts.catchCooldownMs ?? 10_000;
  let signal: { seat: Seat; id: SignId; at: number } | null = null;
  let cooldownUntil = 0;
  let pauseUntil = 0;

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
    if (events.some((e) => e.t === 'handStart')) { signal = null; scheduleSign(); scheduleRivalSign(); }
    schedule();
  }

  function schedule(): void {
    if (destroyed || paused || timer !== null || state.phase === 'matchEnd') return;
    const seat = ([1, 2, 3] as Seat[]).find((x) => legalActions(state, x).length > 0);
    if (seat === undefined) return;
    const base = state.phase === 'handEnd' ? 0 : dMin + Math.random() * (dMax - dMin);
    const wait = Math.max(base, pauseUntil - Date.now());
    timer = setTimeout(() => {
      timer = null;
      botStep(seat);
    }, wait);
  }

  function botStep(seat: Seat): void {
    if (destroyed || paused) return;
    if (Date.now() < pauseUntil) { schedule(); return; } // la mesa está en pausa por una seña cazada
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

  function emit(events: GameEvent[]): void {
    eventListeners.forEach((l) => l(events));
  }

  /** Una seña nueva: aviso público (solo quién y cuándo) y ventana de captura. */
  function raise(seat: Seat, id: SignId): number {
    const at = Date.now();
    signal = { seat, id, at };
    emit([{ t: 'signal_pulse', seat, at }]);
    return at;
  }

  function resolve(catcher: Seat, caught: boolean): void {
    const now = Date.now();
    const s = signal;
    if (caught && s) {
      signal = null;
      pauseUntil = now + pauseMs;
    }
    emit([{
      t: 'signal_resolution',
      result: caught ? 'caught' : 'false_alarm',
      signalSeat: caught && s ? s.seat : null,
      signalId: caught && s ? s.id : null,
      catcher,
      team: teamOf(catcher),
    }]);
  }

  /** Un rival bot se hace una seña con su pareja: solo la pillas si pulsas el ojo a tiempo. */
  function scheduleRivalSign(): void {
    if (rivalTimer !== null) clearTimeout(rivalTimer);
    rivalTimer = setTimeout(() => {
      rivalTimer = null;
      if (destroyed || state.phase !== 'mus' || Math.random() > (opts.rivalSignChance ?? 0.5)) return;
      const seat: Seat = Math.random() < 0.5 ? 1 : 3;
      const id = PARTNER_SIGNS.find((s) => signIsTruthful(s, state.hands[seat], state.config));
      if (id) raise(seat, id);
    }, opts.rivalSignDelay ?? 1400);
  }

  scheduleSign();
  scheduleRivalSign();
  schedule();

  return {
    getSnapshot: () => snap,
    subscribe(cb) {
      listeners.add(cb);
      return () => { listeners.delete(cb); };
    },
    async send(action: Action) {
      if (Date.now() < pauseUntil) return 'La mesa está resolviendo una seña';
      const res = act(state, 0, action);
      if (!res.ok) return res.error;
      commit(res.state, res.events);
      return null;
    },
    /** Tu pareja bot no entiende de señas, pero los rivales bot pueden pillártelas. */
    async sendSign(id: SignId) {
      if (state.phase === 'matchEnd') return 'La partida ha terminado';
      if (Date.now() < pauseUntil) return 'La mesa está resolviendo una seña';
      if (state.config.truthfulSigns && !signIsTruthful(id, state.hands[0], state.config)) return 'Esa seña no coincide con tu mano';
      const at = raise(0, id);
      if (Math.random() < (opts.catchChance ?? 0.3)) {
        const [cMin, cMax] = opts.catchDelay ?? [700, 1700];
        const t = setTimeout(() => {
          catchTimers.delete(t);
          // Solo si sigue siendo tu seña, nadie la ha cazado ya y sigue viva.
          if (destroyed || signal === null || signal.at !== at || Date.now() - at >= signalMs) return;
          resolve(Math.random() < 0.5 ? 1 : 3, true);
        }, cMin + Math.random() * (cMax - cMin));
        catchTimers.add(t);
      }
      return null;
    },
    async catchSignal() {
      const now = Date.now();
      if (state.phase === 'matchEnd') return 'La partida ha terminado';
      if (now < pauseUntil) return 'La mesa está resolviendo una seña';
      if (now < cooldownUntil) return 'Espera antes de volver a sospechar';
      const caught = signal !== null && now - signal.at < signalMs && teamOf(signal.seat) !== teamOf(0);
      if (!caught) {
        if (signal !== null && now - signal.at >= signalMs) signal = null;
        cooldownUntil = now + cooldownMs;
      }
      resolve(0, caught);
      return null;
    },
    onSign(cb) {
      signListeners.add(cb);
      return () => { signListeners.delete(cb); };
    },
    onEvents(cb) {
      eventListeners.add(cb);
      return () => { eventListeners.delete(cb); };
    },
    tick() { /* sin límite de tiempo en local */ },
    setPaused(next: boolean) {
      if (paused === next) return;
      paused = next;
      if (next) {
        if (timer !== null) { clearTimeout(timer); timer = null; }
      } else {
        schedule();
      }
    },
    destroy() {
      destroyed = true;
      if (timer !== null) clearTimeout(timer);
      if (signTimer !== null) clearTimeout(signTimer);
      if (rivalTimer !== null) clearTimeout(rivalTimer);
      catchTimers.forEach((x) => clearTimeout(x));
      catchTimers.clear();
      listeners.clear();
      eventListeners.clear();
      signListeners.clear();
    },
  };
}
