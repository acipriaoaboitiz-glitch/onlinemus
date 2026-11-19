/** Mahjong solitario en pirámide de 4 niveles (88 fichas = 22 tipos × 4). Las partidas se reparten resolubles (se juega al revés). */
export interface Tile { id: number; x: number; y: number; z: number; type: number; gone: boolean }
export const TYPES = 22;

export const MODES: Record<string, { hints: number; shuffles: number; reward: number }> = {
  easy: { hints: 99, shuffles: 5, reward: 80 },
  normal: { hints: 5, shuffles: 3, reward: 130 },
  expert: { hints: 2, shuffles: 1, reward: 220 },
};

function positions(): { x: number; y: number; z: number }[] {
  const out: { x: number; y: number; z: number }[] = [];
  const layer = (cols: number, rows: number, ox: number, oy: number, z: number): void => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: (c + ox) * 2, y: (r + oy) * 2, z });
  };
  layer(8, 6, 0, 0, 0); layer(6, 4, 1, 1, 1); layer(4, 3, 2, 1, 2); layer(2, 2, 3, 2, 3);
  return out;
}

const covers = (a: Tile, b: Tile): boolean => a.z === b.z + 1 && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2;

/** Libre = sin ficha encima y con el lado izquierdo o el derecho despejado. */
export function isFree(tiles: Tile[], t: Tile): boolean {
  if (t.gone) return false;
  let left = false; let right = false;
  for (const o of tiles) {
    if (o.gone || o.id === t.id) continue;
    if (covers(o, t)) return false;
    if (o.z === t.z && o.y === t.y) { if (o.x === t.x - 2) left = true; if (o.x === t.x + 2) right = true; }
  }
  return !left || !right;
}

export function deal(): Tile[] {
  for (let attempt = 0; attempt < 40; attempt++) {
    const tiles: Tile[] = positions().map((p, id) => ({ id, ...p, type: -1, gone: false }));
    const kinds: number[] = [];
    for (let k = 0; k < TYPES; k++) kinds.push(k, k);
    kinds.sort(() => Math.random() - 0.5);
    const work = tiles.map((t) => ({ ...t }));
    let ok = true;
    for (const kind of kinds) {
      const free = work.filter((t) => !t.gone && isFree(work, t));
      if (free.length < 2) { ok = false; break; }
      const a = free.splice(Math.floor(Math.random() * free.length), 1)[0]!;
      const b = free.splice(Math.floor(Math.random() * free.length), 1)[0]!;
      tiles[a.id]!.type = kind; tiles[b.id]!.type = kind;
      a.gone = true; b.gone = true;
    }
    if (ok) return tiles;
  }
  return positions().map((p, id) => ({ id, ...p, type: id % TYPES, gone: false }));
}

export function pairs(tiles: Tile[]): [number, number][] {
  const free = tiles.filter((t) => isFree(tiles, t));
  const out: [number, number][] = [];
  for (let i = 0; i < free.length; i++) for (let j = i + 1; j < free.length; j++) if (free[i]!.type === free[j]!.type) out.push([free[i]!.id, free[j]!.id]);
  return out;
}

export function remove(tiles: Tile[], a: number, b: number): Tile[] {
  return tiles.map((t) => (t.id === a || t.id === b ? { ...t, gone: true } : t));
}

/** Reparte de nuevo los tipos entre las fichas que quedan (reintenta hasta que haya alguna pareja libre). */
export function shuffleTiles(tiles: Tile[]): Tile[] {
  const alive = tiles.filter((t) => !t.gone);
  const types = alive.map((t) => t.type);
  for (let n = 0; n < 60; n++) {
    types.sort(() => Math.random() - 0.5);
    const map = new Map(alive.map((t, i) => [t.id, types[i]!]));
    const next = tiles.map((t) => (t.gone ? t : { ...t, type: map.get(t.id)! }));
    if (pairs(next).length) return next;
  }
  return tiles;
}
