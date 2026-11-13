import { PREFS, prefOn, sound } from './feedback.ts';

export type SoundType = 'card_deal' | 'card_play' | 'chips' | 'alert_caught' | 'alert_fail' | 'click';

const FILES: Record<SoundType, string> = {
  card_deal: 'card_deal.mp3',
  card_play: 'card_play.mp3',
  chips: 'chips.mp3',
  alert_caught: 'alert_caught.mp3',
  alert_fail: 'alert_fail.mp3',
  click: 'click.mp3',
};

const VOLUME: Record<SoundType, number> = {
  card_deal: 0.7, card_play: 0.7, chips: 0.6, alert_caught: 0.85, alert_fail: 0.7, click: 0.35,
};

const base = (): string => {
  try { return `${import.meta.env.BASE_URL}sounds/`; } catch { return './sounds/'; }
};

/** Tipos cuyo MP3 no se ha podido cargar o reproducir: a partir de ahí suena el sustituto sintetizado. */
const missing = new Set<SoundType>();
const players = new Map<SoundType, HTMLAudioElement>();

/**
 * Reproduce un efecto de `/sounds/<tipo>.mp3`. Si el archivo no existe (o el navegador no lo puede
 * reproducir) suena un sustituto sintetizado, así el juego nunca se queda mudo por un MP3 que falte.
 * Respeta el silencio global (`isMuted` de los ajustes).
 */
export function playSound(type: SoundType): void {
  if (!prefOn(PREFS.sound)) return;
  if (typeof Audio === 'undefined' || missing.has(type)) {
    sound(type);
    return;
  }
  try {
    let el = players.get(type);
    if (!el) {
      el = new Audio(`${base()}${FILES[type]}`);
      el.preload = 'auto';
      el.volume = VOLUME[type];
      el.addEventListener('error', () => { missing.add(type); }, { once: true });
      players.set(type, el);
    }
    // Un clon permite que el mismo efecto se solape consigo mismo (repartir 4 cartas seguidas, por ejemplo).
    const shot = el.paused ? el : (el.cloneNode(true) as HTMLAudioElement);
    shot.volume = VOLUME[type];
    shot.currentTime = 0;
    void shot.play().catch(() => {
      missing.add(type);
      sound(type);
    });
  } catch {
    missing.add(type);
    sound(type);
  }
}
