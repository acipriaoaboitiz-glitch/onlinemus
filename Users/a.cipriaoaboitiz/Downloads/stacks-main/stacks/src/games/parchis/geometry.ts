import { GOAL, TRACK_LAST, loopIndex } from './engine.ts';

/** Cuadrícula de 19×19. Brazos: 0 sur · 1 oeste · 2 norte · 3 este. Cada uno tiene 17 casillas del recorrido. */
export const GRID = 19;
export type XY = [number, number];

function buildLoop(): XY[] {
  const p: XY[] = [];
  // sur: columna derecha hacia abajo, punta, columna izquierda hacia arriba
  for (let y = 11; y <= 18; y++) p.push([10, y]); p.push([9, 18]); for (let y = 18; y >= 11; y--) p.push([8, y]);
  // oeste
  for (let x = 7; x >= 0; x--) p.push([x, 10]); p.push([0, 9]); for (let x = 0; x <= 7; x++) p.push([x, 8]);
  // norte
  for (let y = 7; y >= 0; y--) p.push([8, y]); p.push([9, 0]); for (let y = 0; y <= 7; y++) p.push([10, y]);
  // este
  for (let x = 11; x <= 18; x++) p.push([x, 8]); p.push([18, 9]); for (let x = 18; x >= 11; x--) p.push([x, 10]);
  return p;
}
export const LOOP_XY: XY[] = buildLoop();

/** Pasillo hacia la meta (7 casillas) de cada color, partiendo de la punta de su brazo. */
export const LANE_XY: XY[][] = [
  Array.from({ length: 7 }, (_, i): XY => [9, 17 - i]),
  Array.from({ length: 7 }, (_, i): XY => [1 + i, 9]),
  Array.from({ length: 7 }, (_, i): XY => [9, 1 + i]),
  Array.from({ length: 7 }, (_, i): XY => [17 - i, 9]),
];
export const GOAL_XY: XY[] = [[9, 10], [8, 9], [9, 8], [10, 9]];
/** Esquina de la casa (bloque 8×8) de cada color: sur-oeste, noroeste, noreste, sureste. */
export const NEST_ORIGIN: XY[] = [[0, 11], [0, 0], [11, 0], [11, 11]];
export const NEST_SLOTS: XY[][] = NEST_ORIGIN.map(([ox, oy]) => [[ox + 2, oy + 2], [ox + 5, oy + 2], [ox + 2, oy + 5], [ox + 5, oy + 5]]);

export const COLORS = [
  { name: 'ruby', main: '#C3162C', light: '#FF8A9A', dark: '#5c0a14' },
  { name: 'sapphire', main: '#1D4FBF', light: '#8DB4FF', dark: '#0b2260' },
  { name: 'emerald', main: '#0a8a5c', light: '#7ff0c0', dark: '#04382a' },
  { name: 'amber', main: '#E0A21A', light: '#FFE08A', dark: '#6b4a05' },
] as const;

/** Coordenadas (en casillas, esquina superior izquierda) de una ficha. */
export function pieceXY(color: number, pos: number, slot: number): XY {
  if (pos === -1) return NEST_SLOTS[color]![slot]!;
  if (pos === GOAL) return GOAL_XY[color]!;
  if (pos > TRACK_LAST) return LANE_XY[color]![pos - 64]!;
  return LOOP_XY[loopIndex(color, pos)]!;
}
