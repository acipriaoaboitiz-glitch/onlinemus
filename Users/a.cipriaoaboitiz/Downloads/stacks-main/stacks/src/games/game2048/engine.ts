/** 2048: fichas con id propio (para animar su deslizamiento), fusión única por ficha y movimiento por filas/columnas. */
export interface Tile { id: number; v: number; r: number; c: number; merged?: boolean; fresh?: boolean }
export interface G2048 { size: number; tiles: Tile[]; score: number; nextId: number; over: boolean; won: boolean; moves: number }
export type Dir = 'up' | 'down' | 'left' | 'right';

export const MODES: Record<string, { size: number; undos: number }> = { easy: { size: 5, undos: 8 }, normal: { size: 4, undos: 3 }, expert: { size: 4, undos: 1 } };

function spawn(g: G2048): G2048 {
  const used = new Set(g.tiles.map((t) => t.r * g.size + t.c));
  const free: number[] = [];
  for (let i = 0; i < g.size * g.size; i++) if (!used.has(i)) free.push(i);
  if (!free.length) return g;
  const cell = free[Math.floor(Math.random() * free.length)]!;
  const t: Tile = { id: g.nextId, v: Math.random() < 0.9 ? 2 : 4, r: Math.floor(cell / g.size), c: cell % g.size, fresh: true };
  return { ...g, tiles: [...g.tiles, t], nextId: g.nextId + 1 };
}

export function newGame(size: number): G2048 {
  return spawn(spawn({ size, tiles: [], score: 0, nextId: 1, over: false, won: false, moves: 0 }));
}

/** Casilla nueva tras deslizar `n` posiciones en la dirección dada (índice de línea `i`, posición `k` desde el borde de llegada). */
function place(dir: Dir, size: number, line: number, k: number): { r: number; c: number } {
  switch (dir) {
    case 'left': return { r: line, c: k };
    case 'right': return { r: line, c: size - 1 - k };
    case 'up': return { r: k, c: line };
    case 'down': return { r: size - 1 - k, c: line };
  }
}

export function move(g: G2048, dir: Dir): G2048 | null {
  if (g.over) return null;
  const size = g.size;
  let gained = 0;
  let changed = false;
  const out: Tile[] = [];
  for (let line = 0; line < size; line++) {
    const ts = g.tiles
      .filter((t) => (dir === 'left' || dir === 'right' ? t.r === line : t.c === line))
      .sort((a, b) => (dir === 'left' ? a.c - b.c : dir === 'right' ? b.c - a.c : dir === 'up' ? a.r - b.r : b.r - a.r));
    let k = 0;
    let last: Tile | null = null;
    for (const t of ts) {
      if (last && !last.merged && last.v === t.v) {
        last.v *= 2; last.merged = true; gained += last.v; changed = true;
        continue; // la ficha t desaparece fundida en `last`
      }
      const p = place(dir, size, line, k++);
      const nt: Tile = { id: t.id, v: t.v, r: p.r, c: p.c };
      if (nt.r !== t.r || nt.c !== t.c) changed = true;
      out.push(nt);
      last = nt;
    }
  }
  if (!changed) return null;
  let n: G2048 = { ...g, tiles: out, score: g.score + gained, moves: g.moves + 1 };
  n = spawn(n);
  const max = Math.max(...n.tiles.map((t) => t.v));
  n.won = g.won || max >= 2048;
  n.over = !canMove(n);
  return n;
}

export function canMove(g: G2048): boolean {
  if (g.tiles.length < g.size * g.size) return true;
  const at = (r: number, c: number): number => g.tiles.find((t) => t.r === r && t.c === c)?.v ?? 0;
  for (let r = 0; r < g.size; r++) for (let c = 0; c < g.size; c++) {
    const v = at(r, c);
    if ((c + 1 < g.size && at(r, c + 1) === v) || (r + 1 < g.size && at(r + 1, c) === v)) return true;
  }
  return false;
}

export const maxTile = (g: G2048): number => Math.max(0, ...g.tiles.map((t) => t.v));
