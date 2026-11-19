/** Buscaminas: el primer toque nunca es mina; las casillas sin minas alrededor se abren en cascada. */
export interface Cell { mine: boolean; adj: number; open: boolean; flag: boolean }
export interface MState { w: number; h: number; mines: number; cells: Cell[]; started: boolean; over: boolean; won: boolean; flags: number; opened: number; boom: number | null }

export const MODES: Record<string, { w: number; h: number; mines: number; reward: number }> = {
  easy: { w: 8, h: 8, mines: 10, reward: 40 },
  normal: { w: 10, h: 12, mines: 24, reward: 90 },
  expert: { w: 12, h: 16, mines: 44, reward: 170 },
};

export function newMines(mode: string): MState {
  const m = MODES[mode]!;
  return { w: m.w, h: m.h, mines: m.mines, cells: Array.from({ length: m.w * m.h }, () => ({ mine: false, adj: 0, open: false, flag: false })), started: false, over: false, won: false, flags: 0, opened: 0, boom: null };
}

const around = (s: MState, i: number): number[] => {
  const r = Math.floor(i / s.w); const c = i % s.w; const out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr; const cc = c + dc;
    if (rr >= 0 && rr < s.h && cc >= 0 && cc < s.w) out.push(rr * s.w + cc);
  }
  return out;
};

function seed(s: MState, safe: number): void {
  const banned = new Set([safe, ...around(s, safe)]);
  const pool = s.cells.map((_, i) => i).filter((i) => !banned.has(i));
  for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [pool[k], pool[j]] = [pool[j]!, pool[k]!]; }
  pool.slice(0, s.mines).forEach((i) => { s.cells[i]!.mine = true; });
  s.cells.forEach((c, i) => { c.adj = around(s, i).filter((j) => s.cells[j]!.mine).length; });
  s.started = true;
}

/** Abre una casilla (con cascada). Devuelve el estado nuevo o null si no hay cambio. */
export function dig(prev: MState, i: number): MState | null {
  if (prev.over) return null;
  const s: MState = { ...prev, cells: prev.cells.map((c) => ({ ...c })) };
  if (!s.started) seed(s, i);
  const cell = s.cells[i]!;
  if (cell.open || cell.flag) return null;
  if (cell.mine) {
    s.over = true; s.boom = i;
    s.cells.forEach((c) => { if (c.mine) c.open = true; });
    return s;
  }
  const stack = [i];
  while (stack.length) {
    const k = stack.pop()!;
    const c = s.cells[k]!;
    if (c.open || c.flag) continue;
    c.open = true; s.opened++;
    if (c.adj === 0) stack.push(...around(s, k));
  }
  if (s.opened === s.w * s.h - s.mines) { s.over = true; s.won = true; s.cells.forEach((c) => { if (c.mine) c.flag = true; }); s.flags = s.mines; }
  return s;
}

export function toggleFlag(prev: MState, i: number): MState | null {
  if (prev.over || prev.cells[i]!.open) return null;
  const cells = prev.cells.map((c, k) => (k === i ? { ...c, flag: !c.flag } : c));
  return { ...prev, cells, flags: prev.flags + (prev.cells[i]!.flag ? -1 : 1) };
}

/** Pulsar un número ya abierto con tantas banderas como minas: abre el resto de sus vecinas. */
export function chord(prev: MState, i: number): MState | null {
  const c = prev.cells[i]!;
  if (prev.over || !c.open || c.adj === 0) return null;
  const nb = around(prev, i);
  if (nb.filter((j) => prev.cells[j]!.flag).length !== c.adj) return null;
  let s: MState = prev;
  for (const j of nb) { if (!s.cells[j]!.open && !s.cells[j]!.flag) { const n = dig(s, j); if (n) s = n; } }
  return s === prev ? null : s;
}
