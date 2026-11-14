import { normalizeConfig } from '@mus/engine';
import type { RoomConfig } from '@mus/engine';
import { store } from './storage.ts';

export const NAME_KEY = 'mus.name';
export const CONFIG_KEY = 'mus.config';

/** Ajustes de partida recordados en este dispositivo (siempre válidos: pasan por normalizeConfig). */
export function loadConfig(): RoomConfig {
  try {
    return normalizeConfig(JSON.parse(store.get(CONFIG_KEY) ?? '{}'));
  } catch {
    return normalizeConfig({});
  }
}

export function saveConfig(config: RoomConfig): void {
  store.set(CONFIG_KEY, JSON.stringify(config));
}
