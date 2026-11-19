import { useSyncExternalStore } from 'react';

/** Fichas virtuales gratuitas (nunca dinero real). Persistidas en localStorage con try/catch. */
export interface WalletState {
  chips: number;
  name: string;
  lastDailyClaim: string; // YYYY-MM-DD
  /** Días seguidos cobrando el bono diario (1–7). */
  streak: number;
  avatar: number;
  /** Partidas ganadas por juego. */
  wins: Record<string, number>;
  /** Victorias seguidas (se corta con una derrota). */
  winStreak: number;
  /** Partidas terminadas (para el perfil en la nube). */
  games: number;
}

const KEY = 'latimba.wallet.v1';
export const START_CHIPS = 1000;
/** Bono diario progresivo: el día 1 de la racha da el primero, y así hasta el séptimo (luego se mantiene). */
export const DAILY_STREAK = [200, 300, 400, 500, 650, 800, 1000] as const;
export const DAILY_CHIPS = DAILY_STREAK[0];
export const RESCUE_CHIPS = 250;
export const RESCUE_BELOW = 50;
export const AD_CHIPS = 250;

const dayKey = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = (): string => dayKey(new Date());
const yesterday = (): string => dayKey(new Date(Date.now() - 86_400_000));

function load(): WalletState {
  const fallback: WalletState = { chips: START_CHIPS, name: 'Jugador', lastDailyClaim: '', streak: 0, avatar: 0, wins: {}, winStreak: 0, games: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<WalletState>;
    return {
      chips: typeof p.chips === 'number' && p.chips >= 0 ? Math.floor(p.chips) : START_CHIPS,
      name: typeof p.name === 'string' && p.name.trim() ? p.name.slice(0, 16) : 'Jugador',
      lastDailyClaim: typeof p.lastDailyClaim === 'string' ? p.lastDailyClaim : '',
      streak: typeof p.streak === 'number' && p.streak >= 0 ? Math.min(7, Math.floor(p.streak)) : 0,
      avatar: typeof p.avatar === 'number' ? p.avatar : 0,
      wins: p.wins && typeof p.wins === 'object' ? p.wins : {},
      winStreak: typeof p.winStreak === 'number' && p.winStreak > 0 ? Math.floor(p.winStreak) : 0,
      games: typeof p.games === 'number' && p.games > 0 ? Math.floor(p.games) : 0,
    };
  } catch {
    return fallback;
  }
}

let state: WalletState = load();
const listeners = new Set<() => void>();
const winListeners = new Set<(gameId: string) => void>();
/** Avisa de cada victoria de partida (la usan las misiones diarias). */
export const onWin = (fn: (gameId: string) => void): (() => void) => { winListeners.add(fn); return () => { winListeners.delete(fn); }; };

function set(next: WalletState): void {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* modo privado / sin almacenamiento: seguimos en memoria */
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getWallet = (): WalletState => state;
/** Suscripción sin React (la usa la sincronización del perfil con la nube). */
export const subscribeWallet = subscribe;
export const totalWins = (s: WalletState = state): number => Object.values(s.wins).reduce((a, b) => a + b, 0);
export const useWallet = (): WalletState => useSyncExternalStore(subscribe, getWallet);

export const canClaimDaily = (s: WalletState = state): boolean => s.lastDailyClaim !== today();
/** Día de la racha que tocaría cobrar hoy (1–7): sigue si cobraste ayer, si no vuelve a 1. */
export const nextStreak = (s: WalletState = state): number => (s.lastDailyClaim === yesterday() ? Math.min(7, s.streak + 1) : s.lastDailyClaim === today() ? s.streak : 1);
export const dailyAmount = (s: WalletState = state): number => DAILY_STREAK[nextStreak(s) - 1]!;
export const canRescue = (s: WalletState = state): boolean => s.chips < RESCUE_BELOW;

export const wallet = {
  /** Suma (o resta, si es negativo) fichas. Nunca baja de 0. */
  add(n: number): void {
    set({ ...state, chips: Math.max(0, Math.floor(state.chips + n)) });
  },
  /** Resta si hay saldo suficiente. Devuelve false si no alcanza. */
  spend(n: number): boolean {
    if (n <= 0 || n > state.chips) return false;
    set({ ...state, chips: state.chips - n });
    return true;
  },
  /** Bono diario progresivo. Devuelve las fichas cobradas (0 si ya se cobró hoy). */
  claimDaily(): number {
    if (!canClaimDaily()) return 0;
    const streak = nextStreak();
    const amount = DAILY_STREAK[streak - 1]!;
    set({ ...state, chips: state.chips + amount, lastDailyClaim: today(), streak });
    return amount;
  },
  /** Rescate: si bajas de 50 fichas, +250. */
  claimRescue(): boolean {
    if (!canRescue()) return false;
    set({ ...state, chips: state.chips + RESCUE_CHIPS });
    return true;
  },
  /** Recompensa por ver un anuncio (el SDK real se enchufa aquí). */
  claimAd(): void {
    set({ ...state, chips: state.chips + AD_CHIPS });
  },
  setAvatar(avatar: number): void { set({ ...state, avatar }); },
  /** Fin de partida: suma o corta la racha de victorias. */
  recordResult(won: boolean): void { set({ ...state, winStreak: won ? state.winStreak + 1 : 0, games: state.games + 1 }); },
  /** Recupera saldo y estadísticas guardados en la nube al iniciar sesión en otro dispositivo (nunca baja lo ya ganado en local). */
  hydrate(cloud: { chips: number; wins: number; games: number }): void {
    const localWins = totalWins();
    const wins = cloud.wins > localWins ? { ...state.wins, club: (state.wins.club ?? 0) + (cloud.wins - localWins) } : state.wins;
    set({ ...state, chips: Math.max(0, Math.floor(cloud.chips)), wins, games: Math.max(state.games, cloud.games) });
  },
  recordWin(gameId: string): void { set({ ...state, wins: { ...state.wins, [gameId]: (state.wins[gameId] ?? 0) + 1 } }); winListeners.forEach((f) => f(gameId)); },
  setName(name: string): void {
    set({ ...state, name: name.trim().slice(0, 16) || 'Jugador' });
  },
};
