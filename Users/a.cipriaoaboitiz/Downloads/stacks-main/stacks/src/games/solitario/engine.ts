import { frenchDeck, shuffle, type FrenchCard, type FrenchSuit } from '../../engine/deck.ts';

/** Klondike: 7 columnas, mazo de robo (1 o 3 cartas), descarte y 4 bases por palo de As a Rey. */
export const SUITS: FrenchSuit[] = ['picas', 'corazones', 'treboles', 'diamantes'];
export const isRed = (c: FrenchCard): boolean => c.suit === 'corazones' || c.suit === 'diamantes';

export interface Slot { card: FrenchCard; up: boolean }
export interface KState {
  draw: 1 | 3;
  stock: FrenchCard[];
  waste: FrenchCard[];
  found: FrenchCard[][];
  tab: Slot[][];
  moves: number;
}
export type Src = { kind: 'waste' } | { kind: 'tab'; col: number; idx: number } | { kind: 'found'; f: number };

export function deal(draw: 1 | 3): KState {
  const deck = shuffle(frenchDeck());
  const tab: Slot[][] = [];
  let k = 0;
  for (let c = 0; c < 7; c++) { tab.push(Array.from({ length: c + 1 }, (_, i) => ({ card: deck[k++]!, up: i === c }))); }
  return { draw, stock: deck.slice(k), waste: [], found: [[], [], [], []], tab, moves: 0 };
}

const clone = (s: KState): KState => ({ ...s, stock: s.stock.slice(), waste: s.waste.slice(), found: s.found.map((f) => f.slice()), tab: s.tab.map((c) => c.map((x) => ({ ...x }))) });

export const canFound = (s: KState, c: FrenchCard): boolean => {
  const f = s.found[SUITS.indexOf(c.suit)]!;
  return f.length === c.rank - 1;
};
export const canTab = (s: KState, c: FrenchCard, col: number): boolean => {
  const column = s.tab[col]!;
  if (!column.length) return c.rank === 13;
  const top = column[column.length - 1]!;
  return top.up && top.card.rank === c.rank + 1 && isRed(top.card) !== isRed(c);
};

/** Cartas que se mueven al tomar `src`. */
export function cardsOf(s: KState, src: Src): FrenchCard[] {
  if (src.kind === 'waste') { const c = s.waste[s.waste.length - 1]; return c ? [c] : []; }
  if (src.kind === 'found') { const c = s.found[src.f]![s.found[src.f]!.length - 1]; return c ? [c] : []; }
  const col = s.tab[src.col]!;
  const run = col.slice(src.idx);
  return run.length && run.every((x) => x.up) ? run.map((x) => x.card) : [];
}

function take(s: KState, src: Src): void {
  if (src.kind === 'waste') s.waste.pop();
  else if (src.kind === 'found') s.found[src.f]!.pop();
  else { s.tab[src.col]!.splice(src.idx); const col = s.tab[src.col]!; if (col.length && !col[col.length - 1]!.up) col[col.length - 1]!.up = true; }
}

export function toFound(prev: KState, src: Src): KState | null {
  const cs = cardsOf(prev, src);
  if (cs.length !== 1 || !canFound(prev, cs[0]!)) return null;
  const s = clone(prev);
  take(s, src);
  s.found[SUITS.indexOf(cs[0]!.suit)]!.push(cs[0]!);
  s.moves++;
  return s;
}

export function toTab(prev: KState, src: Src, col: number): KState | null {
  const cs = cardsOf(prev, src);
  if (!cs.length || !canTab(prev, cs[0]!, col)) return null;
  if (src.kind === 'tab' && src.col === col) return null;
  const s = clone(prev);
  take(s, src);
  cs.forEach((c) => s.tab[col]!.push({ card: c, up: true }));
  s.moves++;
  return s;
}

/** Robar del mazo (o devolver el descarte al mazo cuando se acaba). */
export function drawStock(prev: KState): KState | null {
  const s = clone(prev);
  if (s.stock.length) { for (let i = 0; i < s.draw && s.stock.length; i++) s.waste.push(s.stock.shift()!); }
  else if (s.waste.length) { s.stock = s.waste.reverse(); s.waste = []; }
  else return null;
  s.moves++;
  return s;
}

export const isWon = (s: KState): boolean => s.found.every((f) => f.length === 13);
export const allFaceUp = (s: KState): boolean => s.tab.every((c) => c.every((x) => x.up));

/** Siguiente movimiento a una base (para «Autocompletar»): descarte, columnas o, si no hay, robar. */
export function autoStep(s: KState): KState | null {
  const w = toFound(s, { kind: 'waste' });
  if (w) return w;
  for (let c = 0; c < 7; c++) { const col = s.tab[c]!; if (col.length) { const n = toFound(s, { kind: 'tab', col: c, idx: col.length - 1 }); if (n) return n; } }
  return drawStock(s);
}

/** Primer destino válido para un grupo de cartas (base primero, luego columna). */
export function bestTarget(s: KState, src: Src): { found: true } | { col: number } | null {
  const cs = cardsOf(s, src);
  if (!cs.length) return null;
  if (cs.length === 1 && canFound(s, cs[0]!)) return { found: true };
  for (let c = 0; c < 7; c++) { if (!(src.kind === 'tab' && src.col === c) && canTab(s, cs[0]!, c)) { if (cs[0]!.rank === 13 && src.kind === 'tab' && src.idx === 0) continue; return { col: c }; } }
  return null;
}
