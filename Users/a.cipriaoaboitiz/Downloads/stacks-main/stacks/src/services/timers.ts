import { useEffect } from 'react';

/**
 * Registro central de temporizadores de partida. Todo `setTimeout` / `setInterval` de una mesa (turnos de bots, esperas entre bazas,
 * cuentas atrás, cinemáticas…) se crea con `gameTimeout` / `gameInterval` para poder cancelarlos TODOS de golpe al salir
 * (`cancelGameTimers`) o al desmontar la pantalla (`useGameTimers`). Los ids son los del navegador: `window.clearTimeout(id)` sigue valiendo.
 */
const ids = new Set<number>();

export function gameTimeout(fn: () => void, ms?: number): number {
  const id = window.setTimeout(() => { ids.delete(id); fn(); }, ms);
  ids.add(id);
  return id;
}

export function gameInterval(fn: () => void, ms?: number): number {
  const id = window.setInterval(fn, ms);
  ids.add(id);
  return id;
}

/** Cancela cada temporizador de partida pendiente. */
export function cancelGameTimers(): void {
  for (const id of ids) { window.clearTimeout(id); window.clearInterval(id); }
  ids.clear();
}

/** Número de temporizadores vivos (útil en pruebas). */
export const pendingGameTimers = (): number => ids.size;

/** Monta el registro en una mesa: al desmontarla se cancela todo lo pendiente (ningún bot actúa tras salir). */
export function useGameTimers(): { setTimeout: typeof gameTimeout; setInterval: typeof gameInterval; cancelAll: typeof cancelGameTimers } {
  useEffect(() => () => cancelGameTimers(), []);
  return { setTimeout: gameTimeout, setInterval: gameInterval, cancelAll: cancelGameTimers };
}
