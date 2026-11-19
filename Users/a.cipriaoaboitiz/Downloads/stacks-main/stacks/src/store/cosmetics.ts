import { useSyncExternalStore } from 'react';
import { setSettings, getSettings, type ThemeId } from './settings.ts';
import { wallet } from './wallet.ts';

/** Tienda «Club VIP»: dorsos de cartas y tapetes que se compran con fichas virtuales (nunca dinero real). */
export type BackId = 'esmeralda' | 'oro' | 'rubi' | 'zafiro';
export type BackVariant = 'emerald' | 'gold' | 'crimson' | 'midnight';

export const BACKS: { id: BackId; name: string; price: number; variant: BackVariant }[] = [
  { id: 'esmeralda', name: 'Clásico Esmeralda', price: 0, variant: 'emerald' },
  { id: 'oro', name: 'Oro Imperial', price: 1500, variant: 'gold' },
  { id: 'rubi', name: 'Rubí Real', price: 1200, variant: 'crimson' },
  { id: 'zafiro', name: 'Zafiro Nocturno', price: 1200, variant: 'midnight' },
];
/** Tapetes de la tienda (los demás de Ajustes siguen siendo gratuitos). */
export const TAPETES: { id: ThemeId; name: string; price: number }[] = [
  { id: 'esmeralda', name: 'Esmeralda Club', price: 0 },
  { id: 'obsidiana', name: 'Obsidiana VIP', price: 2000 },
  { id: 'burdeos', name: 'Burdeos Casino', price: 1500 },
];
const PAID_THEMES = new Set<ThemeId>(TAPETES.filter((t) => t.price > 0).map((t) => t.id));

interface State { backs: BackId[]; back: BackId; themes: ThemeId[] }
const KEY = 'stacks.cosmetics.v1';
const DEFAULT: State = { backs: ['esmeralda'], back: 'esmeralda', themes: ['esmeralda'] };

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<State>;
      const backs = (p.backs ?? []).filter((b): b is BackId => BACKS.some((x) => x.id === b));
      const themes = (p.themes ?? []).filter((t): t is ThemeId => TAPETES.some((x) => x.id === t));
      return {
        backs: backs.includes('esmeralda') ? backs : ['esmeralda', ...backs],
        back: p.back && backs.includes(p.back) ? p.back : 'esmeralda',
        themes: themes.includes('esmeralda') ? themes : ['esmeralda', ...themes],
      };
    }
  } catch { /* valores por defecto */ }
  return DEFAULT;
}

let state: State = load();
const listeners = new Set<() => void>();
function set(next: State): void {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sin almacenamiento */ }
  listeners.forEach((l) => l());
}

/** ¿Se puede usar este tapete? Los gratuitos siempre; los de pago solo si se compraron. */
export const themeUnlocked = (id: ThemeId): boolean => !PAID_THEMES.has(id) || state.themes.includes(id);

export const cosmetics = {
  /** Compra con fichas. Devuelve false si ya lo tienes o no te alcanza. */
  buyBack(id: BackId): boolean {
    const b = BACKS.find((x) => x.id === id);
    if (!b || state.backs.includes(id) || !wallet.spend(b.price)) return false;
    set({ ...state, backs: [...state.backs, id], back: id });
    return true;
  },
  equipBack(id: BackId): void { if (state.backs.includes(id)) set({ ...state, back: id }); },
  buyTheme(id: ThemeId): boolean {
    const t = TAPETES.find((x) => x.id === id);
    if (!t || state.themes.includes(id) || !wallet.spend(t.price)) return false;
    set({ ...state, themes: [...state.themes, id] });
    setSettings({ theme: id });
    return true;
  },
  equipTheme(id: ThemeId): void { if (themeUnlocked(id)) setSettings({ theme: id }); },
  /** Al iniciar sesión en otro dispositivo: lo equipado en la nube pasa a ser tuyo (la nube solo guarda lo equipado, no la lista de compras). */
  hydrate(cardBack: string, table: string): void {
    const back = (cardBack === 'emerald' ? 'esmeralda' : cardBack) as BackId;
    const theme = (table === 'emerald' ? 'esmeralda' : table) as ThemeId;
    const backs = BACKS.some((b) => b.id === back) && !state.backs.includes(back) ? [...state.backs, back] : state.backs;
    const themes = TAPETES.some((x) => x.id === theme) && !state.themes.includes(theme) ? [...state.themes, theme] : state.themes;
    set({ backs, themes, back: backs.includes(back) ? back : state.back });
    if (themes.includes(theme)) setSettings({ theme });
  },
  reset(): void { try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } set(DEFAULT); if (!themeUnlocked(getSettings().theme)) setSettings({ theme: 'esmeralda' }); },
};

// Si un tapete de pago no está comprado (datos antiguos), se vuelve al gratuito.
if (!themeUnlocked(getSettings().theme)) setSettings({ theme: 'esmeralda' });

export const getCosmetics = (): State => state;
/** Suscripción sin React (sincronización con la nube). */
export const subscribeCosmetics = (l: () => void): (() => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
/** Datos para guardar en la nube: lo que llevas equipado. */
export const equippedForCloud = (): { card_back: string; table: string } => ({ card_back: state.back === 'esmeralda' ? 'emerald' : state.back, table: getSettings().theme === 'esmeralda' ? 'emerald' : getSettings().theme });
export const useCosmetics = (): State => useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, getCosmetics);
/** Variante de dorso equipada (los componentes de cartas la leen con este hook para actualizarse al instante). */
export function useCardBack(): BackVariant {
  const c = useCosmetics();
  return BACKS.find((b) => b.id === c.back)!.variant;
}
