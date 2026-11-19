import type { ComponentType } from 'react';

/**
 * Punto de enchufe del motor `@mus/engine` / Mus Online.
 * No se importa `@mus/engine` aquí (no es dependencia de este repo). Cuando lo añadas
 * (`npm i ../onlinemus/packages/engine` o workspace), crea un módulo que cumpla `MusModule` y
 * regístralo en `src/main.tsx` con `registerMusModule(...)`.
 *
 * Los tipos de carta de `src/engine/deck.ts` (ids "o7", "c12", palos y rangos) coinciden con los del motor de Mus.
 */
export interface MusTableProps {
  /** Código de sala si se entra en modo online; undefined = partida local contra bots. */
  roomCode?: string;
  playerName: string;
  onExit: () => void;
}

export interface MusModule {
  Table: ComponentType<MusTableProps>;
}

let mod: MusModule | null = null;
export const registerMusModule = (m: MusModule): void => { mod = m; };
export const getMusModule = (): MusModule | null => mod;
