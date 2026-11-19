/** Sudoku: generador con solución única (se quitan casillas mientras el solucionador cuente una sola solución). */
export const GIVENS: Record<string, number> = { easy: 40, normal: 32, expert: 26 };
export const REWARD: Record<string, number> = { easy: 50, normal: 110, expert: 200 };

const peers: number[][] = Array.from({ length: 81 }, (_, i) => {
  const r = Math.floor(i / 9); const c = i % 9; const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
  const out: number[] = [];
  for (let j = 0; j < 81; j++) {
    if (j === i) continue;
    const rr = Math.floor(j / 9); const cc = j % 9;
    if (rr === r || cc === c || Math.floor(rr / 3) * 3 + Math.floor(cc / 3) === b) out.push(j);
  }
  return out;
});
export const peersOf = (i: number): readonly number[] => peers[i]!;

/** Cuenta soluciones (hasta `limit`) con la casilla de menos candidatos primero. */
function solve(grid: number[], limit: number, collect?: number[][]): number {
  let best = -1; let bestMask = 0; let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (grid[i]) continue;
    let used = 0;
    for (const p of peers[i]!) if (grid[p]) used |= 1 << grid[p]!;
    const mask = ~used & 0x3fe;
    let n = 0; for (let m = mask; m; m &= m - 1) n++;
    if (n < bestCount) { best = i; bestMask = mask; bestCount = n; if (n <= 1) break; }
  }
  if (best === -1) { collect?.push(grid.slice()); return 1; }
  if (bestCount === 0) return 0;
  let found = 0;
  const digits: number[] = [];
  for (let d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
  if (collect) digits.sort(() => Math.random() - 0.5);
  for (const d of digits) {
    grid[best] = d;
    found += solve(grid, limit - found, collect);
    grid[best] = 0;
    if (found >= limit) break;
  }
  return found;
}

export interface Puzzle { puzzle: number[]; solution: number[] }

export function generate(mode: string): Puzzle {
  const sol: number[][] = [];
  solve(Array<number>(81).fill(0), 1, sol);
  const solution = sol[0]!;
  const puzzle = solution.slice();
  const order = Array.from({ length: 81 }, (_, i) => i).sort(() => Math.random() - 0.5);
  let left = 81;
  const target = GIVENS[mode] ?? 32;
  for (const i of order) {
    if (left <= target) break;
    const keep = puzzle[i]!;
    puzzle[i] = 0;
    if (solve(puzzle.slice(), 2) !== 1) puzzle[i] = keep; else left--;
  }
  return { puzzle, solution };
}
