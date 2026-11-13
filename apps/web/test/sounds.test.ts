import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playSound } from '../src/lib/sounds.ts';

const g = globalThis as Record<string, unknown>;

test('playSound: en silencio no reproduce nada', () => {
  let created = 0;
  g.localStorage = { getItem: (k: string) => (k === 'mus.sound' ? '0' : null), setItem() { /* no-op */ } };
  g.Audio = class { constructor() { created++; } };
  playSound('click');
  assert.equal(created, 0);
  delete g.Audio;
  delete g.localStorage;
});

test('playSound: pide /sounds/<tipo>.mp3 y, si no se puede reproducir, no vuelve a intentarlo', async () => {
  const srcs: string[] = [];
  g.localStorage = { getItem: () => null, setItem() { /* no-op */ } }; // sonido activo por defecto
  g.Audio = class {
    paused = true;
    volume = 1;
    currentTime = 0;
    preload = '';
    constructor(src: string) { srcs.push(src); }
    addEventListener() { /* sin eventos en la prueba */ }
    cloneNode() { return this; }
    play() { return Promise.reject(new Error('archivo no disponible')); }
  };
  playSound('chips');
  await new Promise((r) => setTimeout(r, 5));
  playSound('chips');
  assert.equal(srcs.length, 1, 'tras fallar usa el sustituto sintetizado sin crear otro Audio');
  assert.match(srcs[0], /sounds\/chips\.mp3$/);
  delete g.Audio;
  delete g.localStorage;
});

test('playSound: sin Audio (entornos sin navegador) no lanza errores', () => {
  delete g.Audio;
  delete g.localStorage;
  for (const t of ['card_deal', 'card_play', 'chips', 'alert_caught', 'alert_fail', 'click'] as const) {
    assert.doesNotThrow(() => playSound(t));
  }
});
