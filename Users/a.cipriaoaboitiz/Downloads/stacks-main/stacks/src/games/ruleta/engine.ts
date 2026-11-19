/**
 * Ruleta VIP europea (0–36, un solo cero). Mesa compartida: cualquiera puede girar y el anfitrión sortea el número;
 * cada jugador apuesta con sus propias fichas y cobra por su cuenta al caer la bola.
 * Pagos (devuelven la apuesta): pleno ×36 (35 a 1), docena ×3 (2 a 1), rojo/negro/par/impar ×2 (1 a 1). El 0 solo paga al pleno.
 */
export const CHIPS = [10, 50, 100, 500] as const;
/** Orden real de los números en la rueda europea, en el sentido de las agujas del reloj. */
export const WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26] as const;
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export type Color = 'red' | 'black' | 'green';
export const colorOf = (n: number): Color => (n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black');

/** Clave de apuesta: `n:17` (pleno), `red`, `black`, `even`, `odd`, `d1`, `d2`, `d3`. */
export type BetKey = string;
export type Bets = Record<BetKey, number>;

export function wins(key: BetKey, n: number): boolean {
  if (key.startsWith('n:')) return Number(key.slice(2)) === n;
  if (n === 0) return false;
  switch (key) {
    case 'red': return colorOf(n) === 'red';
    case 'black': return colorOf(n) === 'black';
    case 'even': return n % 2 === 0;
    case 'odd': return n % 2 === 1;
    case 'd1': return n <= 12;
    case 'd2': return n > 12 && n <= 24;
    case 'd3': return n > 24;
    default: return false;
  }
}
/** Multiplicador que se cobra (incluye la apuesta devuelta). */
export const multiplier = (key: BetKey): number => (key.startsWith('n:') ? 36 : key.startsWith('d') ? 3 : 2);

export interface Settlement { stake: number; payout: number; net: number; straight: boolean }
export function settle(bets: Bets, n: number): Settlement {
  let stake = 0; let payout = 0; let straight = false;
  for (const [k, amt] of Object.entries(bets)) {
    stake += amt;
    if (wins(k, n)) { payout += amt * multiplier(k); if (k.startsWith('n:')) straight = true; }
  }
  return { stake, payout, net: payout - stake, straight };
}

export interface RouletteState { phase: 'bet' | 'spin'; result: number | null; /** Cambia en cada giro (para disparar la animación una vez). */ spin: number; history: number[] }
export const newTable = (): RouletteState => ({ phase: 'bet', result: null, spin: 0, history: [] });

export type RouletteAction = { k: 'spin' } | { k: 'next' };

export function applyRouletteAction(s: RouletteState, _pid: string, a: RouletteAction): RouletteState | null {
  if (a.k === 'spin') {
    if (s.phase !== 'bet') return null;
    return { ...s, phase: 'spin', result: Math.floor(Math.random() * 37), spin: s.spin + 1 };
  }
  if (s.phase !== 'spin' || s.result === null) return null;
  return { ...s, phase: 'bet', result: null, history: [s.result, ...s.history].slice(0, 12) };
}

/** Ángulo (grados, en sentido horario desde arriba) del centro de la casilla del número `n`. */
export const pocketAngle = (n: number): number => WHEEL.indexOf(n as (typeof WHEEL)[number]) * (360 / WHEEL.length);
