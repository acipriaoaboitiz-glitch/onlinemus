import { useSyncExternalStore } from 'react';
import { testAs } from '../services/env.ts';
import { getProfile, useProfile } from './profile.ts';

/**
 * Identidad de jugador: `uid` estable (UUID, nunca se muestra) y `#TAG` de 4 dígitos que se enseña junto al apodo (`Aimar#4829`).
 * Se crea sola al primer arranque (también para perfiles guardados antes de existir esta pantalla) y vive en localStorage.
 * El apodo no es único: lo es la pareja apodo + TAG (el esquema SQL lo impone con `unique(name, tag)`).
 */
interface Ident { uid: string; tag: string }
const KEY = 'stacks_player_id';

const randomTag = (): string => String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0]! % 9000));
const hashTag = (s: string): string => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 9000; return String(1000 + h); };

function load(): Ident {
  if (testAs) return { uid: `test-${testAs.toLowerCase()}`, tag: hashTag(testAs) };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Ident>;
      if (typeof p.uid === 'string' && /^\d{4}$/.test(p.tag ?? '')) return { uid: p.uid, tag: p.tag! };
    }
  } catch { /* se crea uno nuevo */ }
  const fresh: Ident = { uid: crypto.randomUUID(), tag: randomTag() };
  try { localStorage.setItem(KEY, JSON.stringify(fresh)); } catch { /* sin almacenamiento */ }
  return fresh;
}

let state: Ident = load();
const listeners = new Set<() => void>();

export const getIdent = (): Ident => state;
/** Al iniciar sesión en otro dispositivo se adopta la identidad (uid y TAG) de la cuenta en la nube. */
export function adoptIdentity(uid: string, tag: string): void {
  if (testAs) return;
  state = { uid, tag: tag.replace('#', '') };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
  listeners.forEach((l) => l());
}
export const subscribeIdent = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Si el servidor rechaza el TAG por estar repetido con ese apodo, se sortea otro. */
export function rerollTag(): string {
  if (testAs) return state.tag;
  state = { ...state, tag: randomTag() };
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
  listeners.forEach((l) => l());
  return state.tag;
}

/** Apodo visible (en pruebas con `?as=`, el de la pestaña). */
export const displayName = (): string => testAs ?? getProfile()?.name ?? 'Jugador';
export const handleOf = (name: string, tag: string): string => `${name}#${tag}`;

export function useIdent(): { uid: string; tag: string; name: string; handle: string } {
  const ident = useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getIdent);
  const prof = useProfile();
  const name = testAs ?? prof?.name ?? 'Jugador';
  return { uid: ident.uid, tag: ident.tag, name, handle: handleOf(name, ident.tag) };
}
