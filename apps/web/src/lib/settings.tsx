import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { PREFS, getVolume, prefOn, setPref, setVolumeLevel } from './feedback.ts';
import { playSound } from './sounds.ts';
import type { SoundType } from './sounds.ts';
import { store } from './storage.ts';

export type TableColor = 'verde' | 'rojo' | 'oscuro';

export const TABLE_COLORS: { id: TableColor; label: string; swatch: string }[] = [
  { id: 'verde', label: 'Verde', swatch: 'radial-gradient(circle at 35% 30%, #2f8a6c, #0d3126 75%)' },
  { id: 'rojo', label: 'Rojo', swatch: 'radial-gradient(circle at 35% 30%, #b8433f, #4a1418 75%)' },
  { id: 'oscuro', label: 'Oscuro', swatch: 'radial-gradient(circle at 35% 30%, #4a5560, #171c20 75%)' },
];

export const TABLE_KEY = 'mus.table';

const isTableColor = (v: unknown): v is TableColor => v === 'verde' || v === 'rojo' || v === 'oscuro';

export interface GameSettings {
  /** Silencio global: apaga todos los efectos (MP3 y sintetizados). */
  isMuted: boolean;
  setMuted: (muted: boolean) => void;
  toggleMute: () => void;
  /** Volumen general del juego, entre 0 y 1. */
  volume: number;
  setVolume: (level: number) => void;
  /** Color del tapete de la mesa. */
  tableColor: TableColor;
  setTableColor: (color: TableColor) => void;
  /** Reproduce un efecto de /sounds/ (con sustituto sintetizado si falta el MP3); no suena si está en silencio. */
  playSound: (type: SoundType) => void;
}

const Ctx = createContext<GameSettings | null>(null);

/** Estado global de ajustes: se guarda en el dispositivo y el color se aplica a toda la app (atributo data-table). */
export function GameSettingsProvider({ children }: { children: ReactNode }) {
  // El silencio comparte clave con el interruptor de sonido de siempre (mus.sound), así no hay dos ajustes distintos.
  const [isMuted, setMutedState] = useState(() => !prefOn(PREFS.sound));
  const [volume, setVolumeState] = useState<number>(() => getVolume());
  const [tableColor, setColorState] = useState<TableColor>(() => {
    const saved = store.get(TABLE_KEY);
    return isTableColor(saved) ? saved : 'verde';
  });

  useEffect(() => {
    document.documentElement.dataset.table = tableColor;
  }, [tableColor]);

  const setMuted = useCallback((muted: boolean) => {
    setPref(PREFS.sound, !muted);
    setMutedState(muted);
  }, []);
  const toggleMute = useCallback(() => setMuted(prefOn(PREFS.sound)), [setMuted]); // sonando → silenciar, y al revés
  const setVolume = useCallback((level: number) => {
    const next = Math.min(1, Math.max(0, Number(level) || 0));
    setVolumeLevel(next);
    setVolumeState(next);
  }, []);
  const setTableColor = useCallback((color: TableColor) => {
    store.set(TABLE_KEY, color);
    setColorState(color);
  }, []);

  const value = useMemo<GameSettings>(
    () => ({ isMuted, setMuted, toggleMute, volume, setVolume, tableColor, setTableColor, playSound }),
    [isMuted, setMuted, toggleMute, volume, setVolume, tableColor, setTableColor],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGameSettings(): GameSettings {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGameSettings necesita <GameSettingsProvider>');
  return ctx;
}
