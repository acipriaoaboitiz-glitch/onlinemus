import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  act, botAction, handleGameRequest, legalActions, newMatch, nextRandom, publicView, sanitizeAction, SEATS,
} from '../src/index.ts';
import type { Action, GameRow, MusState, PlayerRow, RoomRow, Seat, ServerDeps } from '../src/index.ts';

function seededRand(seed: number): () => number {
  let s = seed;
  return () => { const r = nextRandom(s); s = r.state; return r.value; };
}

function checkCards(s: MusState): void {
  const ids = [...s.hands.flat(), ...s.stock, ...s.discards].map((c) => c.id);
  assert.equal(new Set(ids).size, 40);
  s.hands.forEach((h) => assert.equal(h.length, 4));
}

// ───────────────────────────────── Bots ─────────────────────────────────────

test('Bots: 120 partidas de cuatro bots terminan y todas sus jugadas son legales', () => {
  const rand = seededRand(99);
  for (let g = 0; g < 120; g++) {
    let s = newMatch({ targetPoints: 30, juegosParaVaca: 2, eightKings: g % 6 !== 0 }, g + 1, (g % 4) as Seat);
    for (let steps = 0; s.phase !== 'matchEnd'; steps++) {
      assert.ok(steps < 20000, `la partida ${g} no termina`);
      const seat = SEATS.find((x) => legalActions(s, x).length > 0);
      assert.notEqual(seat, undefined);
      const action = botAction(s, seat as Seat, { rand, aggression: 0.5 + (g % 3) * 0.5 });
      assert.ok(action, 'el bot siempre decide algo');
      const r = act(s, seat as Seat, action as Action);
      assert.ok(r.ok, `partida ${g}: ${JSON.stringify(action)} (${s.phase}): ${r.ok ? '' : r.error}`);
      s = r.state;
      checkCards(s);
    }
  }
});

test('Bots: con buena mano cortan el mus, con mala suelen pedirlo, y descartan al menos una carta', () => {
  const rand = seededRand(5);
  const rig = (hand: string[]) => {
    const s = newMatch({}, 1, 0);
    const ids = new Set(hand);
    const all = [...s.hands.flat(), ...s.stock, ...s.discards];
    const picked = hand.map((id) => all.find((c) => c.id === id)!);
    const rest = all.filter((c) => !ids.has(c.id));
    s.hands = [picked, rest.slice(0, 4), rest.slice(4, 8), rest.slice(8, 12)];
    s.stock = rest.slice(12);
    return s;
  };
  const good = rig(['o12', 'c12', 'e12', 'b11']); // tres reyes (y un 12) con 8 reyes: cuatro reyes
  const bad = rig(['o4', 'c5', 'e6', 'b7']);
  let cut = 0, mus = 0;
  for (let i = 0; i < 200; i++) {
    if (botAction(good, 0, { rand })?.type === 'NO_MUS') cut++;
    if (botAction(bad, 0, { rand })?.type === 'MUS') mus++;
  }
  assert.ok(cut > 150, `con buena mano debe cortar casi siempre (${cut}/200)`);
  assert.ok(mus > 150, `con mala mano debe pedir mus casi siempre (${mus}/200)`);

  const d = act(bad, 0, { type: 'MUS' });
  assert.ok(d.ok);
  let s = d.state;
  for (const seat of [1, 2, 3] as Seat[]) s = (act(s, seat, { type: 'MUS' }) as { state: MusState }).state;
  assert.equal(s.phase, 'discard');
  const a = botAction(s, 0, { rand });
  assert.equal(a?.type, 'DISCARD');
  assert.ok((a as { cardIds: string[] }).cardIds.length >= 1);
});

// ──────────────────────────── Núcleo del servidor ───────────────────────────

function memory(opts: { humans: number; config?: Record<string, unknown> }) {
  const players: PlayerRow[] = SEATS.map((seat) =>
    seat < opts.humans
      ? { seat, user_id: `u${seat}`, is_bot: false }
      : { seat, user_id: null, is_bot: true });
  const room: RoomRow = { id: 'r1', host_id: 'u0', status: 'lobby', config: opts.config ?? { targetPoints: 30, turnSeconds: 20 } };
  let game: GameRow | null = null;
  let clock = 1_000_000;
  let failNextCommit = 0;
  const commits: { seat: number | null; version: number }[] = [];
  const deps: ServerDeps = {
    async getRoom() { return room; },
    async getPlayers() { return players; },
    async loadGame() { return game ? { ...game, state: structuredClone(game.state) } : null; },
    async commit(c) {
      if (failNextCommit > 0) { failNextCommit--; return false; }
      if (c.expected < 0 ? game !== null : game === null || game.version !== c.expected) return false;
      game = { version: c.state.version, state: structuredClone(c.state), updatedAtMs: clock };
      commits.push({ seat: c.seat, version: c.state.version });
      return true;
    },
    async setRoomStatus(_id, status) { room.status = status; },
    now: () => clock,
    randomSeed: () => [4242, 2],
  };
  return {
    deps, room, players, commits,
    advance: (ms: number) => { clock += ms; },
    failCommits: (n: number) => { failNextCommit = n; },
    get state() { return game!.state; },
    get game() { return game; },
  };
}

const start = (m: ReturnType<typeof memory>, user = 'u0') => handleGameRequest(m.deps, 'r1', user, { kind: 'start' });
const send = (m: ReturnType<typeof memory>, user: string, action: unknown) =>
  handleGameRequest(m.deps, 'r1', user, { kind: 'action', action });

test('Servidor: solo el anfitrión empieza, con 4 asientos, y una sola vez', async () => {
  const m = memory({ humans: 1 });
  assert.equal((await start(m, 'intruso')).status, 403);
  assert.equal((await start(m, 'u0')).status, 200);
  assert.equal(m.room.status, 'playing');
  assert.equal((await start(m, 'u0')).status, 403, 'ya está en marcha');

  const m2 = memory({ humans: 1 });
  m2.players.pop();
  assert.equal((await start(m2)).status, 422, 'faltan jugadores');

  const m3 = memory({ humans: 1, config: { targetPoints: 3 } });
  assert.equal((await start(m3)).status, 422, 'configuración inválida');
});

test('Servidor: tras empezar los bots juegan hasta que le toca al humano', async () => {
  const m = memory({ humans: 1 });
  await start(m);
  const s = m.state;
  assert.ok(legalActions(s, 0).length > 0, 'la palabra está en el humano');
  checkCards(s);
});

test('Servidor: valida al jugador, el turno y el formato de la acción', async () => {
  const m = memory({ humans: 2 });
  await start(m);
  const s = m.state;
  const waiting = SEATS.find((x) => legalActions(s, x).length > 0) as Seat;
  const other = waiting === 0 ? 'u1' : 'u0';
  assert.equal((await send(m, 'nadie', { type: 'MUS' })).status, 403);
  assert.equal((await send(m, other, { type: 'MUS' })).status, 422, 'no es su turno');
  assert.equal((await send(m, `u${waiting}`, { type: 'HACK' })).status, 422);
  assert.equal((await send(m, `u${waiting}`, { type: 'DISCARD', cardIds: 'o1' })).status, 422);
  assert.equal((await send(m, `u${waiting}`, { type: 'ENVIDO', amount: 1e9 })).status, 422);
  assert.equal((await send(m, `u${waiting}`, null)).status, 422);
});

test('Servidor: dos humanos y dos bots juegan una partida entera y la sala acaba', async () => {
  const m = memory({ humans: 2 });
  await start(m);
  const rand = seededRand(7);
  for (let i = 0; m.room.status !== 'finished'; i++) {
    assert.ok(i < 5000, 'la partida no termina');
    const s = m.state;
    const seat = SEATS.find((x) => x < 2 && legalActions(s, x).length > 0);
    assert.notEqual(seat, undefined, `nadie humano puede actuar en ${s.phase}`);
    const action = botAction(s, seat as Seat, { rand })!;
    const r = await send(m, `u${seat}`, action);
    assert.equal(r.status, 200, JSON.stringify([action, r.body]));
    checkCards(m.state);
  }
  assert.equal(m.state.phase, 'matchEnd');
  assert.equal(publicView(m.state).handCounts.length, 4);
});

test('Servidor: si otro movimiento se cuela, relee y reintenta', async () => {
  const m = memory({ humans: 1 });
  await start(m);
  const s = m.state;
  const action = botAction(s, 0, { rand: seededRand(1) })!;
  m.failCommits(2); // dos choques de versión seguidos
  const before = m.commits.length;
  const r = await send(m, 'u0', action);
  assert.equal(r.status, 200);
  assert.ok(m.commits.length > before);
});

test('Servidor: el tiempo se agota → jugada segura; antes de tiempo no se puede adelantar', async () => {
  const m = memory({ humans: 2 });
  await start(m);
  const s0 = m.state;
  const seat = SEATS.find((x) => x < 2 && legalActions(s0, x).length > 0) as Seat;

  const early = await handleGameRequest(m.deps, 'r1', 'u0', { kind: 'tick' });
  assert.equal(early.body.error, 'not_expired');
  assert.ok((early.body.remainingMs as number) > 0);
  assert.equal(m.state.version, s0.version, 'no cambia nada');

  m.advance(20_001);
  const late = await handleGameRequest(m.deps, 'r1', 'u0', { kind: 'tick' });
  assert.equal(late.body.ok, true);
  assert.ok(m.state.version > s0.version, `el turno de ${seat} se ha jugado solo`);
  checkCards(m.state);
});

test('Servidor: al acabar la mano el tiempo continúa por todos los que no han respondido', async () => {
  const m = memory({ humans: 2, config: { targetPoints: 10, turnSeconds: 20 } });
  await start(m);
  const rand = seededRand(11);
  for (let i = 0; m.state.phase !== 'handEnd'; i++) {
    assert.ok(i < 3000);
    const seat = SEATS.find((x) => x < 2 && legalActions(m.state, x).length > 0) as Seat;
    await send(m, `u${seat}`, botAction(m.state, seat, { rand })!);
  }
  const before = m.state.mano;
  m.advance(25_000);
  const r = await handleGameRequest(m.deps, 'r1', 'u1', { kind: 'tick' });
  assert.equal(r.body.ok, true);
  assert.notEqual(m.state.phase, 'handEnd', 'nueva mano repartida');
  assert.notEqual(m.state.mano, before);
});

test('sanitizeAction: acepta lo legítimo y descarta basura', () => {
  assert.deepEqual(sanitizeAction({ type: 'PASO', extra: 1 }), { type: 'PASO' });
  assert.deepEqual(sanitizeAction({ type: 'ENVIDO', amount: 4 }), { type: 'ENVIDO', amount: 4 });
  assert.deepEqual(sanitizeAction({ type: 'DISCARD', cardIds: ['o1', 'c12'] }), { type: 'DISCARD', cardIds: ['o1', 'c12'] });
  for (const bad of [undefined, 3, 'MUS', {}, { type: 'X' }, { type: 'ENVIDO', amount: 2.5 }, { type: 'ENVIDO' },
    { type: 'DISCARD', cardIds: [1] }, { type: 'DISCARD', cardIds: ['a', 'b', 'c', 'd', 'e'] }]) {
    assert.equal(sanitizeAction(bad), null, JSON.stringify(bad));
  }
});
