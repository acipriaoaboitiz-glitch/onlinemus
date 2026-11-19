import { useSyncExternalStore } from 'react';

/**
 * Récords de los juegos individuales (2048, Sudoku, Buscaminas…), guardados en este dispositivo.
 * Clave `juego:modo`. `better = 'high'` guarda la mayor puntuación y `'low'` el menor tiempo/valor.
 */
const KEY = 'stacks.records.v1';
type Store = Record<string, number>;

function load(): Store {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Store; } catch { /* sin almacenamiento */ }
  return {};
}
let state: Store = load();
const listeners = new Set<() => void>();
const emit = (): void => listeners.forEach((l) => l());

export const recordKey = (game: string, mode: string): string => `${game}:${mode}`;
export const getRecord = (game: string, mode: string): number | null => state[recordKey(game, mode)] ?? null;

/** Anota un resultado; devuelve true si es récord nuevo. */
export function submitRecord(game: string, mode: string, value: number, better: 'high' | 'low'): boolean {
  const k = recordKey(game, mode);
  const cur = state[k];
  const isBest = cur === undefined || (better === 'high' ? value > cur : value < cur);
  if (!isBest) return false;
  state = { ...state, [k]: value };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
  emit();
  return true;
}

export function useRecord(game: string, mode: string): number | null {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state[recordKey(game, mode)] ?? null);
}
