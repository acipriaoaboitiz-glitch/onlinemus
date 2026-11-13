import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SIGNS, legalActions, nextRandom, signIsTruthful } from '@mus/engine';
import type { Action, Card, GameEvent, Seat } from '@mus/engine';
import { createLocalSource } from '../src/game/localSource.ts';
import { createRemoteSource } from '../src/game/remoteSource.ts';
import { awardRows, bannerFor, betSummary, bubbleFor, describeHand, rankName, turnHint } from '../src/game/describe.ts';
import type { RoomSource, Snapshot } from '../src/game/types.ts';
import { MemoryServer, createMemoryBackend } from './memoryBackend.ts';

const seeded = (seed: number) => {
  let s = seed;
  return () => { const r = nextRandom(s); s = r.state; return r.value; };
};
const settle = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const until = async (cond: () => boolean, ms = 8000) => {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error('timeout esperando una condición');
    await new Promise((r) => setTimeout(r, 1));
  }
};
const H = (...ids: string[]): Card[] => ids.map((id) => ({
  id, suit: ({ o: 'oros', c: 'copas', e: 'espadas', b: 'bastos' } as const)[id[0] as 'o'], rank: Number(id.slice(1)) as Card['rank'],
}));

/** Lo que haría un jugador humano mirando solo su pantalla. */
function clientPick(s: Snapshot, rand: () => number): Action | null {
  const v = s.view;
  if (!v) return null;
  const legal = legalActions(v, s.mySeat);
  if (legal.length === 0) return null;
  const w = legal.map((l) => (l.type === 'ORDAGO' ? 0.15 : l.type === 'MUS' ? 0.6 : 1));
  let x = rand() * w.reduce((a, b) => a + b, 0);
  let pick = legal[legal.length - 1];
  for (let i = 0; i < legal.length; i++) { x -= w[i]; if (x <= 0) { pick = legal[i]; break; } }
  switch (pick.type) {
    case 'DISCARD': {
      const n = pick.min + Math.floor(rand() * (pick.max - pick.min + 1));
      return { type: 'DISCARD', cardIds: s.hand.slice(0, n).map((c) => c.id) };
    }
    case 'ENVIDO': return { type: 'ENVIDO', amount: pick.min + Math.floor(rand() * Math.min(6, pick.max - pick.min + 1)) };
    default: return { type: pick.type };
  }
}

// ───────────────────────────────── Textos ──────────────────────────────────

test('describe: globos, banners y resúmenes en español', () => {
  assert.deepEqual(bubbleFor({ t: 'envido', seat: 1, lance: 'grande', amount: 4, total: 4, raise: false }), { seat: 1, text: 'Envido 4', tone: 'bet' });
  assert.equal(bubbleFor({ t: 'envido', seat: 1, lance: 'grande', amount: 3, total: 7, raise: true })?.text, 'Subo 3 más');
  assert.equal(bubbleFor({ t: 'ordago', seat: 2, lance: 'chica' })?.tone, 'ordago');
  assert.equal(bubbleFor({ t: 'declare', seat: 0, lance: 'pares', has: false })?.text, 'No hay pares');
  assert.equal(bubbleFor({ t: 'handStart', mano: 0 }), null);
  assert.equal(bannerFor({ t: 'award', team: 0, points: 2, lance: 'grande', kind: 'envite' }, 0), null);
  assert.equal(bannerFor({ t: 'award', team: 1, points: 1, lance: 'chica', kind: 'deje' }, 0), 'Deje: Ellos +1');
  assert.equal(bannerFor({ t: 'gameWon', team: 1, by: 'ordago' }, 2), '¡Juego para nosotros!'.replace('nosotros', 'ellos'));
  const rows = awardRows([{ lance: 'pares', team: 0, points: 4, kind: 'jugada' }], 2);
  assert.equal(rows[0].who, 'Nosotros');
  assert.equal(rows[0].label, 'jugada de pares');
});

test('describe: nombres de cartas y descripción de manos', () => {
  const cfg = { eightKings: true } as never;
  assert.equal(rankName(8, cfg), 'rey');
  assert.equal(rankName(1, cfg, true), 'ases');
  const full = { ...(newCfg()) };
  assert.deepEqual(describeHand(H('o7', 'c7', 'e2', 'e1'), full), { pares: 'Duples de sietes y ases', juego: 'Punto 16' });
  assert.deepEqual(describeHand(H('o12', 'c3', 'e10', 'b1'), full), { pares: 'Pares de reyes', juego: 'Juego 31' });
  assert.deepEqual(describeHand(H('o11', 'c11', 'e11', 'e6'), full), { pares: 'Medias de caballos', juego: 'Juego 36' });
  assert.equal(describeHand(H('o1', 'o4', 'o5', 'o6'), full).pares, null);
});

function newCfg() {
  return {
    targetPoints: 40, juegosParaVaca: 2, vacasParaPartida: 1, eightKings: true, juegoReal: false,
    minBet: 2, minRaise: 2, truthfulSigns: true, turnSeconds: 30,
  };
}

// ────────────────────────────── Partida local ──────────────────────────────

test('Local: una partida entera contra 3 bots, con eventos y sin fugas de información', async () => {
  const rand = seeded(3);
  const src = createLocalSource({
    name: 'Ana', botDelay: [0, 0], seed: 11, signChance: 1, signDelay: 0,
    config: { targetPoints: 10, juegosParaVaca: 1, vacasParaPartida: 1 },
  });
  let eventCount = 0;
  const bubbles = new Set<string>();
  src.onEvents((evs) => { eventCount += evs.length; for (const e of evs) { const b = bubbleFor(e); if (b) bubbles.add(b.text); } });
  const signs: string[] = [];
  src.onSign((s) => signs.push(s.id));

  for (let step = 0; step < 3000; step++) {
    await until(() => {
      const s = src.getSnapshot();
      return s.view!.phase === 'matchEnd' || legalActions(s.view!, 0).length > 0;
    });
    const s = src.getSnapshot();
    assert.equal(s.hand.length, 4);
    assert.equal(s.seats[2].name, 'Nerea');
    if (!s.view!.revealedHands) {
      const json = JSON.stringify(s.view);
      for (const seat of [1, 2, 3]) assert.ok(json.includes('"handCounts"'), `seat ${seat}`);
    }
    if (s.view!.phase === 'matchEnd') break;
    const err = await src.send(clientPick(s, rand)!);
    assert.equal(err, null);
    assert.ok(step < 2999, 'la partida local no termina');
  }
  const end = src.getSnapshot().view!;
  assert.equal(end.phase, 'matchEnd');
  assert.notEqual(end.handResult?.matchWinner, null);
  assert.ok(eventCount > 20);
  assert.ok(bubbles.has('Paso') || bubbles.has('No hay mus'));
  assert.ok(signs.length >= 1, 'la pareja bot ha hecho alguna seña');
  const err = await src.send({ type: 'MUS' });
  assert.ok(err, 'tras acabar ya no se admiten acciones');
  src.destroy();
});

test('Local: un envío fuera de turno se rechaza con un mensaje', async () => {
  const src = createLocalSource({ name: 'Ana', botDelay: [60_000, 60_000], seed: 4 });
  const s = src.getSnapshot();
  if (s.view!.turn !== 0) {
    assert.equal(await src.send({ type: 'MUS' }), 'No es tu turno');
  } else {
    assert.equal(await src.send({ type: 'PASO' }), 'Toca decir Mus o No hay mus');
  }
  src.destroy();
});

// ─────────────────────────────── Salas online ──────────────────────────────

async function lobby(opts: { humans: string[]; bots?: Seat[]; config?: Record<string, unknown> }) {
  const server = new MemoryServer();
  const backends = opts.humans.map((u) => createMemoryBackend(server, u));
  for (const [i, b] of backends.entries()) await b.ensureUser(`Jugador ${i + 1}`);
  const created = await backends[0].createRoom(opts.config ?? { targetPoints: 10, juegosParaVaca: 1, vacasParaPartida: 1, turnSeconds: 20 });
  const clients: RoomSource[] = [];
  const open = (i: number) => createRemoteSource(backends[i], created.roomId, { id: opts.humans[i], name: `Jugador ${i + 1}` }, { refreshMs: 0, sendCheckMs: 5 });
  clients.push(open(0));
  await settle();
  for (let i = 1; i < opts.humans.length; i++) {
    await backends[i].joinRoom(created.code);
    clients.push(open(i));
  }
  await settle();
  for (const seat of opts.bots ?? []) assert.equal(await clients[0].addBot(seat), null);
  await settle();
  return { server, backends, clients, roomId: created.roomId, code: created.code, open };
}

test('Online: crear sala, entrar con código, elegir asiento y bots; solo el anfitrión empieza', async () => {
  const { clients, server } = await lobby({ humans: ['ua', 'ub', 'uc'] });
  const [A, B] = clients;
  assert.equal(A.getSnapshot().status, 'lobby');
  assert.equal(A.getSnapshot().isHost, true);
  assert.equal(B.getSnapshot().isHost, false);
  assert.match(A.getSnapshot().room!.code, /^\d{6}$/);
  assert.deepEqual(A.getSnapshot().seats.map((s) => s.name), ['Jugador 1', 'Jugador 2', 'Jugador 3', null]);

  assert.equal(await B.chooseSeat(0), 'Ese asiento ya está ocupado.');
  assert.equal(await B.chooseSeat(3), null);
  await settle();
  assert.equal(B.getSnapshot().mySeat, 3);
  assert.equal(A.getSnapshot().seats[3].name, 'Jugador 2', 'el anfitrión ve el cambio en directo');

  assert.match((await B.addBot(1)) ?? '', /anfitrión/);
  assert.match((await clients[1].start()) ?? '', /anfitrión/);
  assert.match((await A.start()) ?? '', /4 jugadores/);

  assert.equal(await A.addBot(1), null);
  await settle();
  assert.equal(A.getSnapshot().seats[1].isBot, true);
  assert.equal(await A.setConfig({ targetPoints: 30, juegosParaVaca: 2 }), null);
  await settle();
  assert.equal(B.getSnapshot().room!.config.targetPoints, 30);

  assert.equal(await A.start(), null);
  await settle(6);
  for (const c of clients) assert.equal(c.getSnapshot().status, 'playing');
  assert.equal(server.rooms.get(A.getSnapshot().room!.id)!.status, 'playing');
  assert.ok(A.getSnapshot().view);
  assert.equal(A.getSnapshot().hand.length, 4);
  clients.forEach((c) => c.destroy());
});

test('Online: cuatro humanos juegan una partida entera; cada uno solo ve sus cartas hasta enseñar', async () => {
  const { clients, server, roomId } = await lobby({ humans: ['u1', 'u2', 'u3', 'u4'] });
  assert.equal(await clients[0].start(), null);
  await settle(6);
  const rand = seeded(21);
  const seen = new Set<number>();

  for (let i = 0; server.rooms.get(roomId)!.status !== 'finished'; i++) {
    assert.ok(i < 4000, 'la partida online no termina');
    await settle(2);
    for (const c of clients) {
      const s = c.getSnapshot();
      if (!s.view) continue;
      seen.add(s.mySeat);
      assert.equal(s.hand.length, 4, 'cada cliente tiene su mano de 4');
      const others = clients.filter((o) => o !== c).flatMap((o) => o.getSnapshot().hand);
      if (!s.view.revealedHands) {
        const json = JSON.stringify(s.view);
        for (const card of others) {
          if (!s.hand.some((h) => h.id === card.id)) assert.ok(!json.includes(`"${card.id}"`), `fuga de ${card.id}`);
        }
      } else {
        assert.deepEqual(s.view.revealedHands[s.mySeat].map((x) => x.id).sort(), s.hand.map((x) => x.id).sort());
      }
    }
    const actor = clients.find((c) => { const s = c.getSnapshot(); return s.view && legalActions(s.view, s.mySeat).length > 0; });
    if (!actor) continue;
    assert.equal(await actor.send(clientPick(actor.getSnapshot(), rand)!), null);
  }
  await settle(4);
  assert.equal(seen.size, 4);
  for (const c of clients) {
    assert.equal(c.getSnapshot().status, 'finished');
    assert.equal(c.getSnapshot().view!.phase, 'matchEnd');
  }
  // Revancha: vuelve al lobby con todos sentados y sin partida
  assert.equal(await clients[1].rematch(), 'Solo puede hacerlo el anfitrión.');
  assert.equal(await clients[0].rematch(), null);
  await settle(6);
  for (const c of clients) {
    assert.equal(c.getSnapshot().status, 'lobby');
    assert.equal(c.getSnapshot().view, null);
    assert.deepEqual(c.getSnapshot().hand, []);
  }
  clients.forEach((c) => c.destroy());
});

test('Online: la seña validada solo la recibe la pareja', async () => {
  const { clients } = await lobby({ humans: ['u1', 'u2', 'u3', 'u4'] });
  await clients[0].start();
  await settle(6);
  const bySeat = new Map(clients.map((c) => [c.getSnapshot().mySeat, c]));
  const got: Record<number, string[]> = { 0: [], 1: [], 2: [], 3: [] };
  for (const [seat, c] of bySeat) c.onSign((s) => got[seat].push(`${s.id}@${s.from}`));
  assert.equal(await bySeat.get(0)!.sendSign('quiero_mus'), null);
  await settle(3);
  assert.equal(await bySeat.get(3)!.sendSign('quiero_mus'), null);
  await settle(3);
  // 0 y 2 son pareja; 1 y 3 son pareja. Los rivales no ven nada.
  assert.deepEqual(got, { 0: [], 1: ['quiero_mus@3'], 2: ['quiero_mus@0'], 3: [] });
  clients.forEach((c) => c.destroy());
});

test('Online: reconexión, eventos perdidos y turnos que caducan', async () => {
  const { clients, server, backends, roomId, open } = await lobby({ humans: ['u1', 'u2'], bots: [2, 3] });
  await clients[0].start();
  await settle(6);
  const rand = seeded(5);

  // Reconexión: un cliente nuevo del mismo usuario recupera el estado completo.
  const before = clients[1].getSnapshot();
  clients[1].destroy();
  const again = open(1);
  await settle(6);
  assert.equal(again.getSnapshot().view!.version, before.view!.version);
  assert.deepEqual(again.getSnapshot().hand.map((c) => c.id), before.hand.map((c) => c.id));
  assert.equal(again.getSnapshot().mySeat, before.mySeat);
  clients[1] = again;

  // Eventos perdidos: con Realtime caído, la relectura tras enviar deja al cliente al día.
  const waitingClient = () => clients.find((c) => { const s = c.getSnapshot(); return s.view && legalActions(s.view, s.mySeat).length > 0; })!;
  server.dropRealtime = true;
  const actor = waitingClient();
  const v0 = actor.getSnapshot().view!.version;
  assert.equal(await actor.send(clientPick(actor.getSnapshot(), rand)!), null);
  await new Promise((r) => setTimeout(r, 40));
  await settle(4);
  assert.ok(actor.getSnapshot().view!.version > v0, 'el cliente se pone al día con la relectura');
  server.dropRealtime = false;
  server.reconnect(); // supabase-js se vuelve a suscribir y cada cliente relee el estado
  await settle(8);

  // Turno que caduca: tick antes de tiempo no hace nada; pasado el plazo se juega la jugada segura.
  const waiter = waitingClient();
  const v1 = waiter.getSnapshot().view!.version;
  waiter.tick();
  await settle(4);
  assert.equal(waiter.getSnapshot().view!.version, v1, 'aún no ha caducado');
  assert.ok(waiter.getSnapshot().deadline! > Date.now() - 1000);
  server.clock += 25_000;
  waiter.tick();
  await settle(6);
  assert.ok(server.games.get(roomId)!.version > v1, 'el servidor ha jugado por quien no respondía');
  assert.equal(backends.length, 2);
  clients.forEach((c) => c.destroy());
});

test('Online: señas veraces solo si coinciden con la mano', () => {
  const cfg = newCfg();
  assert.equal(signIsTruthful('medias', H('o7', 'c7', 'e7', 'b5'), cfg), true);
  assert.equal(signIsTruthful('medias', H('o7', 'c7', 'e5', 'b5'), cfg), false);
});

test('Online: un usuario que no está en la sala recibe un error claro', async () => {
  const { server, roomId } = await lobby({ humans: ['ua'] });
  const intruder = createRemoteSource(createMemoryBackend(server, 'intruso'), roomId, { id: 'intruso', name: 'X' }, { refreshMs: 0 });
  await settle(4);
  assert.equal(intruder.getSnapshot().status, 'error');
  assert.match(intruder.getSnapshot().error ?? '', /no estás/i);
  intruder.destroy();
});

test('describe: turnHint y betSummary con una partida real', () => {
  const src = createLocalSource({ name: 'Ana', botDelay: [60_000, 60_000], seed: 8 });
  const s = src.getSnapshot();
  const names = s.seats.map((x) => x.name ?? '');
  const hint = turnHint(s.view!, 0, names);
  assert.equal(hint.mine, s.view!.turn === 0);
  assert.ok(hint.text.length > 0);
  assert.equal(betSummary(s.view!, 0, names), null);
  src.destroy();
});

// ─────────────────── Sospecha de señas contra bots (modo local) ──────────────────

type Pulse = Extract<GameEvent, { t: 'signal_pulse' }>;
type Resolution = Extract<GameEvent, { t: 'signal_resolution' }>;
const pulses = (evs: GameEvent[]) => evs.filter((e): e is Pulse => e.t === 'signal_pulse');
const resolutions = (evs: GameEvent[]) => evs.filter((e): e is Resolution => e.t === 'signal_resolution');

/** Una partida local en la que un rival bot hace una seña (se prueban semillas hasta que su mano permite alguna). */
async function localWithRivalSign(extra: Record<string, unknown> = {}) {
  for (let seed = 1; seed < 60; seed++) {
    const src = createLocalSource({
      name: 'Ana', botDelay: [60_000, 60_000], seed, rivalSignChance: 1, rivalSignDelay: 0, catchChance: 0, catchPauseMs: 0, ...extra,
    });
    const events: GameEvent[] = [];
    src.onEvents((e) => events.push(...e));
    await new Promise((r) => setTimeout(r, 25));
    if (pulses(events).length > 0) return { src, events };
    src.destroy();
  }
  throw new Error('ninguna semilla produjo una seña rival');
}

test('Local: pillar una seña rival la revela, no toca los puntos y una falsa alarma bloquea el ojo', async () => {
  const { src, events } = await localWithRivalSign();
  const pulse = pulses(events)[0];
  assert.deepEqual(Object.keys(pulse).sort(), ['at', 'seat', 't'], 'el aviso público no lleva el contenido de la seña');
  assert.ok(pulse.seat === 1 || pulse.seat === 3, 'la seña es de un rival');
  const score = JSON.stringify(src.getSnapshot().view!.score);

  assert.equal(await src.catchSignal(), null);
  const caught = resolutions(events);
  assert.equal(caught.length, 1);
  assert.equal(caught[0].result, 'caught');
  assert.equal(caught[0].signalSeat, pulse.seat);
  assert.ok(caught[0].signalId, 'se revela qué seña era');
  assert.equal(caught[0].catcher, 0);
  assert.equal(JSON.stringify(src.getSnapshot().view!.score), score, 'las piedras no cambian');

  assert.equal(await src.catchSignal(), null, 'sin seña viva es una falsa alarma');
  assert.equal(resolutions(events)[1].result, 'false_alarm');
  assert.equal(resolutions(events)[1].signalId, null);
  assert.equal(await src.catchSignal(), 'Espera antes de volver a sospechar', 'el ojo queda bloqueado');
  assert.equal(JSON.stringify(src.getSnapshot().view!.score), score, 'tampoco cambian con la falsa alarma');
  src.destroy();
});

test('Local: el bloqueo del ojo y la ventana de la seña caducan', async () => {
  const quiet = createLocalSource({ name: 'Ana', botDelay: [60_000, 60_000], seed: 2, rivalSignChance: 0, catchChance: 0, catchCooldownMs: 30 });
  assert.equal(await quiet.catchSignal(), null);
  assert.equal(await quiet.catchSignal(), 'Espera antes de volver a sospechar');
  await new Promise((r) => setTimeout(r, 50));
  assert.equal(await quiet.catchSignal(), null, 'pasado el bloqueo se puede volver a intentar');
  quiet.destroy();

  const { src, events } = await localWithRivalSign({ signalMs: 40 });
  await new Promise((r) => setTimeout(r, 70));
  assert.equal(await src.catchSignal(), null);
  assert.equal(resolutions(events)[0].result, 'false_alarm', 'la seña ya no estaba viva');
  src.destroy();
});

test('Local: tu seña se valida con tu mano, avisa sin contenido y un rival bot puede pillártela', async () => {
  const src = createLocalSource({
    name: 'Ana', botDelay: [60_000, 60_000], seed: 5, rivalSignChance: 0, catchChance: 1, catchDelay: [0, 0], catchPauseMs: 80,
  });
  const events: GameEvent[] = [];
  src.onEvents((e) => events.push(...e));
  const snap = src.getSnapshot();
  const cfg = snap.view!.config;
  const mine = SIGNS.find((s) => signIsTruthful(s.id, snap.hand, cfg))?.id;
  const lie = SIGNS.find((s) => !signIsTruthful(s.id, snap.hand, cfg))?.id;
  assert.ok(mine && lie, 'la mano permite una seña verdadera y una falsa');
  const score = JSON.stringify(snap.view!.score);

  assert.equal(await src.sendSign(lie), 'Esa seña no coincide con tu mano');
  assert.equal(pulses(events).length, 0);

  assert.equal(await src.sendSign(mine), null);
  assert.equal(pulses(events).length, 1);
  assert.equal(pulses(events)[0].seat, 0);
  await until(() => resolutions(events).length > 0, 1000);
  const r = resolutions(events)[0];
  assert.equal(r.result, 'caught');
  assert.equal(r.signalSeat, 0);
  assert.equal(r.signalId, mine);
  assert.ok(r.catcher === 1 || r.catcher === 3);
  assert.equal(JSON.stringify(src.getSnapshot().view!.score), score, 'las piedras no cambian');

  assert.equal(await src.send({ type: 'MUS' }), 'La mesa está resolviendo una seña', 'la mesa se pausa un instante');
  assert.equal(await src.catchSignal(), 'La mesa está resolviendo una seña');
  src.destroy();
});

