import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  act, autoAction, bestSeat, cardFromId, compareChica, compareGrande, compareParesInfo, createDeck,
  handTotal, hasJuego, juegoScore, legalActions, newMatch, nextRandom, opponentsAfter, orderFrom,
  paresInfo, pointValue, publicView, scoreboard, signIsTruthful, strength, tally,
} from '../src/index.ts';
import type { Action, Card, LegalAction, MusState, Seat } from '../src/index.ts';

const R8 = { eightKings: true, juegoReal: false };
const R4 = { eightKings: false, juegoReal: false };
const H = (...ids: string[]): Card[] => ids.map(cardFromId);

const MUS: Action = { type: 'MUS' };
const NO_MUS: Action = { type: 'NO_MUS' };
const PASO: Action = { type: 'PASO' };
const ORDAGO: Action = { type: 'ORDAGO' };
const QUIERO: Action = { type: 'QUIERO' };
const NO_QUIERO: Action = { type: 'NO_QUIERO' };
const CONTINUE: Action = { type: 'CONTINUE' };
const envido = (amount: number): Action => ({ type: 'ENVIDO', amount });

/** Los cuatro asientos, en orden desde el 0, hacen la misma acción. */
const round = (a: Action): [Seat, Action][] => [[0, a], [1, a], [2, a], [3, a]];

/** Ejemplo de la web de Pagat: A (mano) 7-7-2-A · B 3-3-S-2 · C R-R-S-A · D C-C-C-6 */
const PAGAT = [
  ['o7', 'c7', 'e2', 'e1'],
  ['o3', 'c3', 'e10', 'c2'],
  ['o12', 'c12', 'b10', 'c1'],
  ['o11', 'c11', 'e11', 'e6'],
];

/** Prepara una mano con las cartas indicadas y el resto en el mazo. Deja el estado listo para Mus / No hay mus. */
function rig(hands: string[][], opts: { mano?: Seat; config?: Parameters<typeof newMatch>[0] } = {}): MusState {
  const s = newMatch(opts.config ?? {}, 7, opts.mano ?? 0);
  s.hands = hands.map((h) => H(...h));
  const used = new Set(hands.flat());
  s.stock = createDeck().filter((c) => !used.has(c.id));
  s.discards = [];
  return s;
}

/** Aplica una secuencia [asiento, acción]; el test falla si alguna es ilegal. */
function play(s: MusState, steps: [Seat, Action][]): MusState {
  for (const [seat, action] of steps) {
    const r = act(s, seat, action);
    assert.ok(r.ok, `${JSON.stringify(action)} del asiento ${seat}: ${r.ok ? '' : r.error}`);
    s = r.state;
  }
  return s;
}

function assertNoLeak(s: MusState): void {
  if (s.revealed) return;
  const json = JSON.stringify(publicView(s));
  for (const c of [...s.hands.flat(), ...s.stock, ...s.discards]) {
    assert.ok(!json.includes(`"${c.id}"`), `la vista pública filtra la carta ${c.id}`);
  }
}

function checkInvariants(s: MusState): void {
  s.hands.forEach((h) => assert.equal(h.length, 4, 'cada jugador tiene 4 cartas'));
  const ids = [...s.hands.flat(), ...s.stock, ...s.discards].map((c) => c.id);
  assert.equal(ids.length, 40);
  assert.equal(new Set(ids).size, 40, 'no hay cartas repetidas ni perdidas');
  for (const t of [0, 1] as const) assert.ok(s.score.points[t] <= s.config.targetPoints, 'nadie pasa del tope');
  if (s.phase === 'lance') {
    assert.ok(s.lance, 'hay un lance en curso');
    assert.equal(s.turn, s.lance.turn);
    assert.ok(s.lance.participants.includes(s.lance.turn), 'habla un participante');
  }
  assertNoLeak(s);
}

// ───────────────────────────── Cartas y valores ─────────────────────────────

test('baraja española: 40 cartas únicas', () => {
  const deck = createDeck();
  assert.equal(deck.length, 40);
  assert.equal(new Set(deck.map((c) => c.id)).size, 40);
});

test('8 reyes: el 3 es rey y el 2 es as (cerdo); con 4 reyes cada carta vale lo suyo', () => {
  assert.equal(strength(3, R8), strength(12, R8));
  assert.equal(strength(2, R8), strength(1, R8));
  assert.equal(pointValue(3, R8), 10);
  assert.equal(pointValue(2, R8), 1);
  assert.ok(strength(3, R4) < strength(12, R4));
  assert.equal(pointValue(3, R4), 3);
  assert.equal(pointValue(2, R4), 2);
});

// ──────────────────────────────── Grande y Chica ────────────────────────────

test('Grande y Chica: R-3-4-4 gana a R-C-C-C en las dos (ejemplo de Pagat)', () => {
  const a = H('o12', 'c3', 'e4', 'b4');
  const b = H('c12', 'o11', 'c11', 'e11');
  assert.ok(compareGrande(a, b, R8) > 0);
  assert.ok(compareChica(a, b, R8) > 0);
});

test('Grande: en el ejemplo de Pagat gana B porque empata con C pero está antes en el orden', () => {
  const hands = PAGAT.map((h) => H(...h));
  assert.equal(bestSeat('grande', orderFrom(0), hands, R8), 1);
});

// ──────────────────────────────────── Pares ─────────────────────────────────

test('Pares: duples > medias > pares, y dentro de cada tipo se compara por rango', () => {
  const p = (...ids: string[]) => paresInfo(H(...ids), R8);
  assert.equal(p('o12', 'c12', 'e5', 'b4').kind, 1);
  assert.equal(p('o7', 'c7', 'e7', 'b1').kind, 2);
  assert.equal(p('o7', 'c7', 'e5', 'b5').kind, 3);
  assert.equal(p('o7', 'c7', 'e7', 'b7').kind, 3, 'cuatro iguales cuentan como duples');
  assert.equal(p('o1', 'c2', 'e5', 'b6').kind, 1, 'un 2 y un as forman pareja');
  assert.equal(p('o3', 'c12', 'e5', 'b6').kind, 1, 'un 3 y un rey forman pareja');
  assert.equal(p('o1', 'o4', 'o5', 'o6').kind, 0);

  assert.ok(compareParesInfo(p('o11', 'c11', 'o5', 'c5'), p('o10', 'c10', 'e10', 'b10')) > 0, 'C-C-5-5 gana a S-S-S-S');
  assert.ok(compareParesInfo(p('o11', 'c11', 'o5', 'c5'), p('e11', 'b11', 'o4', 'c4')) > 0, 'C-C-5-5 gana a C-C-4-4');
  assert.ok(compareParesInfo(p('o4', 'c4', 'e4', 'b1'), p('o12', 'c12', 'e11', 'b10')) > 0, 'medias de cuatros ganan a pares de reyes');
  assert.ok(compareParesInfo(p('o4', 'c4', 'e5', 'b5'), p('o12', 'c12', 'e12', 'b11')) > 0, 'duples ganan a medias');
});

// ─────────────────────────────── Juego y Punto ──────────────────────────────

test('Juego: orden 31 > 32 > 40 > 37 > 36 > 35 > 34 > 33, y 30 ya es Punto', () => {
  const hands: [number, string[]][] = [
    [31, ['o12', 'c11', 'e10', 'b1']],
    [32, ['o12', 'c11', 'e7', 'b5']],
    [40, ['o12', 'c11', 'e10', 'b3']],
    [37, ['o12', 'c12', 'c11', 'o7']],
    [36, ['o12', 'c12', 'c11', 'o6']],
    [35, ['o12', 'c12', 'c11', 'o5']],
    [34, ['o12', 'c12', 'c11', 'o4']],
    [33, ['o12', 'c12', 'o7', 'c6']],
  ];
  const scores = hands.map(([total, ids]) => {
    const h = H(...ids);
    assert.equal(handTotal(h, R8), total);
    assert.ok(hasJuego(h, R8));
    return juegoScore(h, R8);
  });
  for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1] > scores[i], `el orden falla en el ${hands[i][0]}`);

  const punto = H('o12', 'c12', 'o6', 'o4');
  assert.equal(handTotal(punto, R8), 30);
  assert.ok(!hasJuego(punto, R8));
});

test('Juego real (variante): tres sietes y una figura ganan a un 31 normal', () => {
  const real = H('o7', 'c7', 'e7', 'b12');
  const normal = H('o12', 'c11', 'e10', 'b1');
  assert.equal(juegoScore(real, R8), juegoScore(normal, R8));
  assert.ok(juegoScore(real, { eightKings: true, juegoReal: true }) > juegoScore(normal, { eightKings: true, juegoReal: true }));
});

// ─────────────────────── Ejemplos oficiales de reparto (Pagat) ──────────────

test('Pagat: pares con envite de 4 visto → A y C cobran 4 + 3 + 1; la mano acaba 9-6', () => {
  let s = rig(PAGAT);
  s = play(s, [
    [0, NO_MUS],
    ...round(PASO), // Grande
    ...round(PASO), // Chica
    [0, envido(4)], [1, QUIERO], // Pares
    [1, PASO], [2, PASO], [3, PASO], // Juego: solo B (31), C (31) y D (36) lo tienen
  ]);
  assert.equal(s.phase, 'handEnd');
  // Grande → B (equipo 1) 1 · Chica → A (equipo 0) 1 · Pares → equipo 0: 4 + 3 (duples de A) + 1 (pares de C)
  // Juego → B gana por mano (31): equipo 1 cobra 3 (31 de B) + 2 (36 de D)
  assert.deepEqual(s.score.points, [9, 6]);
  assert.ok(publicView(s).revealedHands, 'al enseñar se ven las cuatro manos');
});

test('Pagat: A y C envidan 4, B y D suben 6 y ellos no quieren → B y D cobran 4 al instante y 3 al enseñar', () => {
  let s = rig(PAGAT);
  s = play(s, [
    [0, NO_MUS],
    ...round(PASO),
    ...round(PASO),
    [0, envido(4)], [1, envido(6)], // B sube 6: total 10
    [2, NO_QUIERO], [0, NO_QUIERO], // responden C y luego A
  ]);
  assert.deepEqual(s.score.points, [0, 4], 'el deje (4) se cobra en el momento');
  assert.equal(s.lance?.lance, 'juego');
  s = play(s, [[1, PASO], [2, PASO], [3, PASO]]);
  // Grande B +1 · Chica A +1 · Pares: ganan B y D por la última subida → 1 (pares de B) + 2 (medias de D) · Juego 3 + 2
  assert.deepEqual(s.score.points, [1, 13]);
});

// ───────────────────────────────── Apuestas ─────────────────────────────────

test('Órdago: si nadie lo quiere, 1 piedra y se sigue con la Chica', () => {
  let s = rig(PAGAT);
  s = play(s, [[0, NO_MUS], [0, ORDAGO], [1, NO_QUIERO], [3, NO_QUIERO]]);
  assert.deepEqual(s.score.points, [1, 0]);
  assert.equal(s.lance?.lance, 'chica');
});

test('Órdago aceptado: gana el juego quien gane la Grande, y la mano siguiente empieza de cero', () => {
  let s = rig(PAGAT);
  s = play(s, [[0, NO_MUS], [0, ORDAGO], [1, QUIERO]]);
  assert.equal(s.phase, 'handEnd');
  assert.deepEqual(s.handResult, { gameWinner: 1, vacaWinner: null, matchWinner: null, by: 'ordago' });
  assert.deepEqual(s.score.juegos, [0, 1]);
  assert.equal(s.score.points[1], 40);
  assert.ok(publicView(s).revealedHands, 'al aceptar el órdago se enseñan las cartas');

  s = play(s, round(CONTINUE));
  assert.equal(s.phase, 'mus');
  assert.equal(s.mano, 1, 'la mano pasa al siguiente asiento');
  assert.deepEqual(s.score.points, [0, 0]);
  assert.deepEqual(s.score.juegos, [0, 1], 'los juegos de la vaca se conservan');
});

test('Un órdago aceptado en una partida a un solo juego la termina', () => {
  let s = rig(PAGAT, { config: { juegosParaVaca: 1, vacasParaPartida: 1 } });
  s = play(s, [[0, NO_MUS], [0, ORDAGO], [1, QUIERO]]);
  assert.equal(s.phase, 'matchEnd');
  assert.equal(s.handResult?.matchWinner, 1);
  assert.deepEqual(legalActions(s, 0), []);
});

test('Si el primer rival no quiere, su pareja todavía puede querer', () => {
  let s = rig(PAGAT);
  s = play(s, [[0, NO_MUS], [0, envido(2)], [1, NO_QUIERO]]);
  assert.equal(s.lance?.stage, 'respond');
  assert.equal(s.turn, 3);
  s = play(s, [[3, QUIERO]]);
  assert.equal(s.lance?.lance, 'chica');
  assert.deepEqual(s.settlements[0], { lance: 'grande', participants: [0, 1, 2, 3], outcome: 'seen', stake: 2, foldWinner: null });
});

test('El deje se cobra al instante y puede ganar el juego sin enseñar cartas', () => {
  let s = rig(PAGAT, { config: { targetPoints: 30 } });
  s.score.points = [29, 0];
  s = play(s, [[0, NO_MUS], [0, envido(2)], [1, NO_QUIERO], [3, NO_QUIERO]]);
  assert.equal(s.phase, 'handEnd');
  assert.equal(s.handResult?.gameWinner, 0);
  assert.equal(s.handResult?.by, 'points');
  assert.equal(publicView(s).revealedHands, null);
});

test('Si solo una pareja tiene pares y juego no hay apuesta y puntúa al enseñar', () => {
  const hands = [
    ['o12', 'c12', 'o11', 'o1'], // pares de reyes y 31
    ['o4', 'o5', 'o6', 'o7'],
    ['e12', 'b12', 'c11', 'c1'], // pares de reyes y 31
    ['c4', 'c5', 'c6', 'c7'],
  ];
  let s = rig(hands);
  s = play(s, [[0, NO_MUS], ...round(PASO), ...round(PASO)]);
  assert.equal(s.phase, 'handEnd');
  // Grande 1 + Chica 1 (la mano gana los empates) + Pares 1 + 1 + Juego 3 + 3
  assert.deepEqual(s.score.points, [10, 0]);
});

test('Sin pares ni juego se salta Pares y se juega el Punto', () => {
  const hands = [
    ['o1', 'o4', 'o5', 'o6'], ['c1', 'c4', 'c5', 'c6'], ['e1', 'e4', 'e5', 'e6'], ['b1', 'b4', 'b5', 'b6'],
  ];
  let s = rig(hands);
  s = play(s, [[0, NO_MUS], ...round(PASO), ...round(PASO)]);
  assert.equal(s.lance?.lance, 'punto');
  s = play(s, round(PASO));
  assert.equal(s.phase, 'handEnd');
  assert.deepEqual(s.score.points, [3, 0], 'todas las manos empatan: la mano cobra Grande, Chica y Punto');
});

test('Juegos y vacas: 2 juegos ganan una vaca y 2 vacas ganan la partida', () => {
  // El asiento 1 tiene cuatro reyes: gana cualquier órdago a la Grande, venga de quien venga la mano.
  const dominant = [
    ['o1', 'o4', 'o5', 'o6'], ['o12', 'c12', 'e12', 'b12'], ['c1', 'c4', 'c5', 'c6'], ['e1', 'e4', 'e5', 'e6'],
  ];
  const giveHands = (st: MusState): MusState => {
    const t = structuredClone(st);
    t.hands = dominant.map((h) => H(...h));
    const used = new Set(dominant.flat());
    t.stock = createDeck().filter((c) => !used.has(c.id));
    t.discards = [];
    return t;
  };
  const ordagoAccepted = (st: MusState): MusState => {
    const mano = st.mano;
    const firstRival = opponentsAfter(mano, [0, 1, 2, 3])[0];
    return play(giveHands(st), [[mano, NO_MUS], [mano, ORDAGO], [firstRival, QUIERO]]);
  };

  let s = rig(dominant, { config: { juegosParaVaca: 2, vacasParaPartida: 2 } });
  s = ordagoAccepted(s); // juego 1
  assert.deepEqual([s.score.juegos, s.score.vacas], [[0, 1], [0, 0]]);

  s = ordagoAccepted(play(s, round(CONTINUE))); // juego 2 → primera vaca
  assert.equal(s.handResult?.vacaWinner, 1);
  assert.deepEqual(s.score.vacas, [0, 1]);
  assert.equal(s.phase, 'handEnd', 'la partida sigue: faltan vacas');

  s = play(s, round(CONTINUE));
  assert.deepEqual(s.score.juegos, [0, 0], 'la vaca nueva empieza sin juegos');
  assert.deepEqual(s.score.vacas, [0, 1], 'las vacas se conservan');

  s = ordagoAccepted(s); // juego 3
  s = ordagoAccepted(play(s, round(CONTINUE))); // juego 4 → segunda vaca → fin de la partida
  assert.equal(s.phase, 'matchEnd');
  assert.equal(s.handResult?.matchWinner, 1);
  assert.deepEqual(s.score.vacas, [0, 2]);
});

// ───────────────────────────────── Mus y descarte ───────────────────────────

test('Basta un "No hay mus" para cortar y empezar la Grande', () => {
  let s = newMatch({}, 3, 0);
  s = play(s, [[0, MUS], [1, NO_MUS]]);
  assert.equal(s.phase, 'lance');
  assert.equal(s.lance?.lance, 'grande');
  assert.equal(s.turn, 0);
});

test('Descarte por turno desde la mano; las 40 cartas se conservan aunque el mazo se agote', () => {
  let s = newMatch({}, 99, 2);
  for (let r = 0; r < 6; r++) {
    for (let k = 0; k < 4; k++) s = play(s, [[((2 + k) % 4) as Seat, MUS]]);
    assert.equal(s.phase, 'discard');
    for (let k = 0; k < 4; k++) {
      const seat = ((2 + k) % 4) as Seat;
      assert.equal(s.turn, seat);
      s = play(s, [[seat, { type: 'DISCARD', cardIds: s.hands[seat].map((c) => c.id) }]]);
      checkInvariants(s);
    }
    assert.equal(s.phase, 'mus');
    assert.equal(s.turn, 2);
  }
  assert.equal(s.stock.length + s.discards.length, 24);
});

// ───────────────────────────── Validación y privacidad ──────────────────────

test('Las acciones ilegales se rechazan y no tocan el estado original', () => {
  const s = rig(PAGAT);
  const fails = (seat: Seat, a: Action, st: MusState = s) => assert.equal(act(st, seat, a).ok, false, JSON.stringify(a));
  fails(1, MUS); // no es su turno
  fails(0, PASO); // en la fase de mus no se pasa

  let t = play(s, [[0, NO_MUS], [0, envido(2)]]);
  fails(1, envido(1), t); // subida por debajo del mínimo
  fails(1, PASO, t); // ante un envite no se pasa
  t = play(t, [[1, ORDAGO]]);
  fails(2, envido(2), t); // un órdago no se sube

  const d = play(rig(PAGAT), [[0, MUS], [1, MUS], [2, MUS], [3, MUS]]);
  fails(0, { type: 'DISCARD', cardIds: ['z9'] }, d);
  fails(0, { type: 'DISCARD', cardIds: [] }, d);
  fails(0, { type: 'DISCARD', cardIds: ['o7', 'o7'] }, d);
  assert.equal(s.version, 0, 'act no muta el estado de entrada');
});

test('La vista pública no filtra cartas y legalActions funciona solo con ella', () => {
  const s = rig(PAGAT);
  const v = publicView(s);
  assert.equal(v.revealedHands, null);
  assert.deepEqual(v.handCounts, [4, 4, 4, 4]);
  assertNoLeak(s);
  assert.deepEqual(legalActions(v, 0).map((l) => l.type), ['MUS', 'NO_MUS']);
  assert.deepEqual(legalActions(v, 1), []);
});

// ───────────────────────────── Marcador, señas, PRNG ────────────────────────

test('Marcador: amarracos (5) y piedras (1), con aviso de "dentro"', () => {
  assert.deepEqual(tally(0, 40), { total: 0, amarracos: 0, piedras: 0, dentro: false });
  assert.deepEqual(tally(23, 40), { total: 23, amarracos: 4, piedras: 3, dentro: false });
  assert.deepEqual(tally(35, 40), { total: 35, amarracos: 7, piedras: 0, dentro: true });
  assert.deepEqual(tally(39, 40), { total: 39, amarracos: 7, piedras: 4, dentro: true });
  assert.deepEqual(tally(40, 40), { total: 40, amarracos: 8, piedras: 0, dentro: false });
  assert.equal(tally(25, 30).dentro, true);
  const [a, b] = scoreboard({ points: [12, 40], juegos: [1, 0], vacas: [0, 0] }, { targetPoints: 40 });
  assert.deepEqual([a.amarracos, a.piedras, b.amarracos], [2, 2, 8]);
});

test('Señas: solo son veraces si coinciden con la mano', () => {
  const blind = H('o1', 'o4', 'o5', 'o6');
  assert.ok(signIsTruthful('ciego', blind, R8));
  assert.ok(!signIsTruthful('ciego', H('o12', 'c12', 'e5', 'b6'), R8), 'con pares no se va ciego');
  assert.ok(signIsTruthful('dos_reyes', H('o12', 'c3', 'e5', 'b6'), R8), 'un 12 y un 3 son dos reyes');
  assert.ok(!signIsTruthful('tres_reyes', H('o12', 'c3', 'e5', 'b6'), R8));
  assert.ok(signIsTruthful('dos_cerdos', H('o1', 'c2', 'e7', 'b6'), R8));
  assert.ok(signIsTruthful('solomillo', H('o12', 'c3', 'e12', 'b2'), R8));
  assert.ok(signIsTruthful('duples', H('o7', 'c7', 'e5', 'b5'), R8));
  assert.ok(signIsTruthful('medias', H('o7', 'c7', 'e7', 'b5'), R8));
  assert.ok(signIsTruthful('treinta_y_una', H('o12', 'c11', 'e10', 'b1'), R8));
  assert.ok(signIsTruthful('quiero_mus', blind, R8));
});

test('Determinismo: misma semilla, misma partida', () => {
  assert.deepEqual(newMatch({}, 2024, 1), newMatch({}, 2024, 1));
  assert.notDeepEqual(newMatch({}, 2025, 1).hands, newMatch({}, 2024, 1).hands);
  const r = nextRandom(1);
  assert.ok(r.value >= 0 && r.value < 1);
});

// ────────────────────────── Simulación aleatoria (fuzz) ─────────────────────

function randomStep(s: MusState, rand: () => number): [Seat, Action] {
  const actors = ([0, 1, 2, 3] as Seat[]).filter((x) => legalActions(s, x).length > 0);
  assert.ok(actors.length > 0, 'siempre hay alguien que pueda actuar');
  const seat = actors[Math.floor(rand() * actors.length)];

  if (rand() < 0.2) {
    const auto = autoAction(s, seat);
    if (auto) return [seat, auto];
  }

  const legal: LegalAction[] = legalActions(s, seat);
  const weights = legal.map((l) => (l.type === 'ORDAGO' ? 0.15 : l.type === 'MUS' ? 0.6 : 1));
  let x = rand() * weights.reduce((a, b) => a + b, 0);
  let pick = legal[legal.length - 1];
  for (let i = 0; i < legal.length; i++) {
    x -= weights[i];
    if (x <= 0) { pick = legal[i]; break; }
  }
  switch (pick.type) {
    case 'DISCARD': {
      const n = pick.min + Math.floor(rand() * (pick.max - pick.min + 1));
      return [seat, { type: 'DISCARD', cardIds: s.hands[seat].slice(0, n).map((c) => c.id) }];
    }
    case 'ENVIDO': {
      const span = Math.min(6, pick.max - pick.min + 1);
      return [seat, { type: 'ENVIDO', amount: pick.min + Math.floor(rand() * span) }];
    }
    default:
      return [seat, { type: pick.type }];
  }
}

test('Simulación: 150 partidas aleatorias terminan sin romper ninguna invariante', () => {
  let rng = 20260101;
  const rand = () => { const r = nextRandom(rng); rng = r.state; return r.value; };
  let handEndSteps = 0;
  for (let g = 0; g < 150; g++) {
    let s = newMatch(
      { targetPoints: 30, juegosParaVaca: 2, vacasParaPartida: 1, eightKings: g % 5 !== 0 },
      g + 1,
      (g % 4) as Seat,
    );
    for (let steps = 0; s.phase !== 'matchEnd'; steps++) {
      assert.ok(steps < 20000, `la partida ${g} no termina`);
      if (s.phase === 'handEnd') handEndSteps++;
      const [seat, action] = randomStep(s, rand);
      const r = act(s, seat, action);
      assert.ok(r.ok, `partida ${g}: ${JSON.stringify(action)} del asiento ${seat} (${s.phase}): ${r.ok ? '' : r.error}`);
      s = r.state;
      checkInvariants(s);
    }
    assert.notEqual(s.handResult?.matchWinner, null);
  }
  assert.ok(handEndSteps > 150);
});
