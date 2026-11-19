import { useSyncExternalStore } from 'react';
import { wallet } from './wallet.ts';

/** Perfil del jugador (localStorage `stacks_player_profile`). Si no existe, se muestra la pantalla de bienvenida. */
export interface Profile { name: string; title: string; avatar: number; photo: string | null }

export const TITLES = ['Socio Fundador', 'Rey del Órdago', 'Tiburón de Mesa', 'Jugador VIP', 'Maestro de Naipes', 'Novato con Suerte'] as const;
/** Nivel necesario para cada título (el nivel es el rango del jugador: Novato 1 … Leyenda 5). */
export const TITLE_LEVEL: Record<(typeof TITLES)[number], number> = {
  'Novato con Suerte': 1, 'Jugador VIP': 1, 'Maestro de Naipes': 2, 'Tiburón de Mesa': 3, 'Rey del Órdago': 4, 'Socio Fundador': 5,
};
export const titleLevel = (t: string): number => TITLE_LEVEL[t as keyof typeof TITLE_LEVEL] ?? 1;
const KEY = 'stacks_player_profile';

function load(): Profile | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    if (typeof p.name !== 'string' || !p.name.trim()) return null;
    return { name: p.name.slice(0, 16), title: typeof p.title === 'string' ? p.title : TITLES[3], avatar: typeof p.avatar === 'number' ? p.avatar : 0, photo: typeof p.photo === 'string' ? p.photo : null };
  } catch { return null; }
}

let state: Profile | null = load();
const listeners = new Set<() => void>();

export function saveProfile(p: Profile): void {
  state = { ...p, name: p.name.trim().slice(0, 16) || 'Jugador' };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
  wallet.setName(state.name);
  wallet.setAvatar(state.avatar);
  listeners.forEach((l) => l());
}
export const getProfile = (): Profile | null => state;
export const subscribeProfile = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const useProfile = (): Profile | null =>
  useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getProfile);

/** Reduce una foto subida a 160 px (cuadrada, JPEG) para guardarla en localStorage. */
export function photoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(img.width, img.height);
      const c = document.createElement('canvas');
      c.width = c.height = 160;
      c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 160, 160);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen no válida')); };
    img.src = url;
  });
}
