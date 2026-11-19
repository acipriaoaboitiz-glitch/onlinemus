import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Club, Diamond, Heart, RotateCcw, Spade, Undo2, Zap, type LucideIcon } from 'lucide-react';
import { FRENCH_ASPECT, frenchFileName, type FrenchCard } from '../../engine/deck.ts';
import { useT } from '../../i18n/index.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameInterval, gameTimeout } from '../../services/timers.ts';
import { feedback } from '../../store/settings.ts';
import { submitRecord, useRecord } from '../../store/records.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { HudPills, RailButton } from '../shared/hud.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { rewardSolo, useSoloMode } from '../shared/solo.ts';
import { SUITS, allFaceUp, autoStep, bestTarget, canFound, cardsOf, deal, drawStock, isWon, toFound, toTab, type KState, type Src } from './engine.ts';

const BASE = `${import.meta.env.BASE_URL}cards/french/`;
const mmss = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const SUIT_ICON: LucideIcon[] = [Spade, Heart, Club, Diamond];

interface Placed { card: FrenchCard; x: number; y: number; z: number; up: boolean; src: Src | 'stock' | null }

/** Carta ligera: cara SVG francesa o dorso esmeralda con filo de oro. */
const SolCard = memo(function SolCard({ card, up, w, h, selected }: { card: FrenchCard; up: boolean; w: number; h: number; selected: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[5px]" style={{ width: w, height: h, boxShadow: selected ? '0 0 0 2.5px #FCE38A, 0 0 12px rgba(252,227,138,.8)' : '0 1.5px 3px rgba(0,0,0,.5)' }}>
      {up
        ? <img src={`${BASE}${frenchFileName(card)}`} alt="" draggable={false} className="block h-full w-full" style={{ objectFit: 'fill', background: '#fdfbf7' }} />
        : <div className="h-full w-full" style={{ background: 'radial-gradient(circle at 50% 40%, #145a43, #0a2a1e)', boxShadow: 'inset 0 0 0 2px #D4AF37, inset 0 0 0 4px #0a2a1e, inset 0 0 0 5px rgba(212,175,55,.5)' }}>
          <svg viewBox="0 0 40 60" className="h-full w-full" shapeRendering="geometricPrecision" aria-hidden="true"><path d="M20 14 L30 30 L20 46 L10 30 Z" fill="none" stroke="#D4AF37" strokeOpacity=".6" strokeWidth="1.2" /><circle cx="20" cy="30" r="3" fill="#D4AF37" opacity=".7" /></svg>
        </div>}
    </div>
  );
});

export default function Solitario() {
  const nav = useNavigate();
  const t = useT();
  const mode = useSoloMode('solitario');
  const draw = mode === 'draw3' ? 3 : 1;
  const best = useRecord('solitario', mode);
  const [s, setS] = useState<KState>(() => deal(draw));
  const [sel, setSel] = useState<Src | null>(null);
  const [secs, setSecs] = useState(0);
  const [auto, setAuto] = useState(false);
  const [cascade, setCascade] = useState(false);
  const hist = useRef<KState[]>([]);
  const done = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [dim, setDim] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const fit = (): void => setDim({ w: el.clientWidth, h: el.clientHeight });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const won = isWon(s);
  const started = s.moves > 0;
  useEffect(() => {
    if (won || !started) return;
    const id = gameInterval(() => setSecs((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [won, started]);
  useEffect(() => {
    if (!won || done.current) return;
    done.current = true;
    submitRecord('solitario', mode, secs, 'low');
    rewardSolo('solitario', draw === 3 ? 160 : 100, '¡SOLITARIO!');
    gameTimeout(() => setCascade(true), 900);
  }, [won, mode, secs, draw]);

  const reset = useCallback(() => { setS(deal(draw)); setSel(null); setSecs(0); setAuto(false); setCascade(false); hist.current = []; done.current = false; }, [draw]);
  const commit = (n: KState | null, sound: 'card' | 'play' | 'tap' = 'play'): boolean => {
    if (!n) return false;
    hist.current.push(s);
    if (hist.current.length > 300) hist.current.shift();
    setS(n); setSel(null); feedback(sound);
    return true;
  };
  const undo = (): void => { const p = hist.current.pop(); if (p) { setS(p); setSel(null); setAuto(false); feedback('tap'); } };

  // Autocompletar: sube cartas a las bases una a una.
  useEffect(() => {
    if (!auto) return;
    if (isWon(s)) { setAuto(false); return; }
    const id = gameTimeout(() => {
      const n = autoStep(s);
      if (!n) { setAuto(false); return; }
      hist.current.push(s); setS(n); feedback('card');
    }, 90);
    return () => window.clearTimeout(id);
  }, [auto, s]);

  // Disposición: columnas de igual ancho, desfases que se comprimen si la columna no cabe.
  const layout = useMemo(() => {
    const { w, h } = dim;
    if (!w || !h) return null;
    const pad = Math.max(4, Math.min(w, h) * 0.02);
    // Tamaño de carta: 44 / 64 / 86 / 96 px físicos según pantalla (se divide entre el zoom de escritorio) y fila superior compacta
    const z = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
    const vw = window.innerWidth;
    const maxPhysical = vw >= 1280 ? 96 : vw >= 1024 ? 86 : vw >= 640 ? 64 : 44;
    const byWidth = (w - pad * 2) / (7 + 6 * 0.1);
    const cw = Math.min(byWidth, maxPhysical / z, (h * 0.24) / (1 / FRENCH_ASPECT));
    const ch = cw / FRENCH_ASPECT;
    // el resto del ancho se reparte entre columnas (máximo 0,3 de carta) y el conjunto se centra
    const gap = Math.max(3, Math.min((w - pad * 2 - 7 * cw) / 6, cw * 0.3));
    const left = (w - (7 * cw + 6 * gap)) / 2;
    const tabY = pad + ch + Math.max(8, ch * 0.12);
    const avail = h - tabY - pad;
    const colX = (c: number): number => left + c * (cw + gap);
    const placed: Placed[] = [];
    // mazo y descarte
    s.stock.forEach((c, i) => placed.push({ card: c, x: colX(0), y: pad, z: 1 + i * 0.01, up: false, src: i === s.stock.length - 1 ? 'stock' : null }));
    s.waste.forEach((c, i) => {
      const fromTop = s.waste.length - 1 - i;
      const vis = s.draw === 3 ? Math.max(0, 2 - fromTop) : 0;
      placed.push({ card: c, x: colX(1) + (fromTop < 3 && s.draw === 3 ? (2 - fromTop) * cw * 0.26 : 0) * (vis >= 0 ? 1 : 0), y: pad, z: 2 + i * 0.01, up: true, src: fromTop === 0 ? { kind: 'waste' } : null });
    });
    s.found.forEach((f, fi) => f.forEach((c, i) => placed.push({ card: c, x: colX(3 + fi), y: pad, z: 1 + i * 0.01, up: true, src: i === f.length - 1 ? { kind: 'found', f: fi } : null })));
    s.tab.forEach((col, c) => {
      const down = col.filter((x) => !x.up).length; const up = col.length - down;
      // separación según la carta: ~10 px boca abajo y ~26 px boca arriba (en cartas de 86 px), comprimida si la columna no cabe
      const dDown = Math.max(5, ch * 0.08); const dUp = Math.max(14, ch * 0.21);
      const need = ch + down * dDown + Math.max(0, up - 1) * dUp;
      const k = need > avail ? Math.max(0.14, (avail - ch) / (need - ch)) : 1;
      let y = tabY;
      col.forEach((slot, j) => {
        placed.push({ card: slot.card, x: colX(c), y, z: 10 + j, up: slot.up, src: slot.up ? { kind: 'tab', col: c, idx: j } : null });
        y += (slot.up ? dUp : dDown) * k;
      });
    });
    return { cw, ch, pad, gap, tabY, colX, placed };
  }, [dim, s]);

  const selIds = useMemo(() => new Set(sel ? cardsOf(s, sel).map((c) => c.id) : []), [sel, s]);

  const tapCard = (p: Placed): void => {
    if (won || auto) return;
    if (p.src === 'stock') { commit(drawStock(s), 'card'); return; }
    if (!p.src) return;
    const src = p.src;
    // 1) un toque sobre una carta que puede subir a su base: sube sola
    const cs = cardsOf(s, src);
    if (!cs.length) return;
    if (!sel) {
      if (cs.length === 1 && canFound(s, cs[0]!) && src.kind !== 'found') { commit(toFound(s, src)); return; }
      setSel(src); feedback('tap'); return;
    }
    // 2) con una selección: tocar la misma carta intenta el mejor destino; tocar otra columna mueve allí
    const same = JSON.stringify(sel) === JSON.stringify(src);
    if (same) {
      const tg = bestTarget(s, src);
      if (tg && 'found' in tg) commit(toFound(s, src)); else if (tg) commit(toTab(s, src, tg.col)); else setSel(null);
      return;
    }
    if (src.kind === 'tab' && commit(toTab(s, sel, src.col))) return;
    if (src.kind === 'found' && commit(toFound(s, sel))) return;
    if (cs.length) setSel(src);
  };
  const tapSlot = (kind: 'col' | 'found', i: number): void => {
    if (!sel || won || auto) return;
    commit(kind === 'col' ? toTab(s, sel, i) : toFound(s, sel));
  };


  return (
    <GameFrame
      gameId="solitario" feltTone="emerald"
      header={<p className="truncate text-center font-[var(--font-display)] text-lg font-bold text-amber-300">{t('g.solitario.name')}</p>}
      strip={<HudPills items={[{ label: t('g8.moves'), value: s.moves }, { label: t('g8.time'), value: mmss(secs) }, { label: t('g8.best'), value: best === null ? '—' : mmss(best) }]} />}
      felt={(
        <div ref={wrap} className="relative h-full w-full">
          {layout && (
            <>
              {/* huecos vacíos: mazo, bases y columnas */}
              <button type="button" aria-label="stock" onClick={() => commit(drawStock(s), 'card')} className="absolute rounded-[6px] border border-[#D4AF37]/40" style={{ left: layout.colX(0), top: layout.pad, width: layout.cw, height: layout.ch }} />
              {SUITS.map((_, fi) => { const Icon = SUIT_ICON[fi]!; return (
                <button key={fi} type="button" aria-label={`found-${fi}`} onClick={() => tapSlot('found', fi)} className="absolute grid place-items-center rounded-[6px] border border-[#D4AF37]/50 text-[#D4AF37]/45 shadow-[inset_0_0_0_1px_rgba(0,0,0,.5)]" style={{ left: layout.colX(3 + fi), top: layout.pad, width: layout.cw, height: layout.ch }}><Icon size={layout.cw * 0.42} strokeWidth={1.5} aria-hidden /></button>
              ); })}
              {s.tab.map((col, c) => !col.length && <button key={c} type="button" aria-label={`col-${c}`} onClick={() => tapSlot('col', c)} className="absolute rounded-[6px] border border-[#D4AF37]/35" style={{ left: layout.colX(c), top: layout.tabY, width: layout.cw, height: layout.ch }} />)}
              {layout.placed.map((p, i) => {
                const flying = cascade && p.src !== null;
                return (
                  <div key={p.card.id} className="absolute left-0 top-0" style={{ width: layout.cw, height: layout.ch, zIndex: Math.round(p.z * 100), willChange: 'transform', opacity: flying ? 0.9 : 1,
                    transform: flying ? `translate3d(${layout.cw * ((i * 37) % 11 - 5)}px, ${dim.h + layout.ch * 1.2}px, 0) rotate(${((i * 53) % 90) - 45}deg)` : `translate3d(${p.x}px, ${p.y}px, 0)`,
                    transition: flying ? `transform 1.4s ease-in ${(i % 26) * 0.045}s` : 'transform .18s ease-out' }}>
                    <button type="button" disabled={!p.src} onClick={() => tapCard(p)} aria-label={String(p.card.id)} className="block touch-manipulation" style={{ width: layout.cw, height: layout.ch }}>
                      <SolCard card={p.card} up={p.up} w={layout.cw} h={layout.ch} selected={selIds.has(p.card.id)} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
      bottom={(
        <div className="flex min-h-[52px] w-full items-center gap-2" role="group" aria-label={t('g8.actions')}>
          <RailButton onClick={undo} disabled={!hist.current.length || won || auto}><Undo2 size={16} strokeWidth={1.75} aria-hidden />{t('g8.undo')}</RailButton>
          <RailButton onClick={() => { setSel(null); setAuto(true); }} disabled={!allFaceUp(s) || won || auto} primary><Zap size={16} strokeWidth={1.9} aria-hidden />{t('g8.auto')}</RailButton>
          <RailButton onClick={reset} label={t('g8.newGame')}><RotateCcw size={16} strokeWidth={1.75} aria-hidden /></RailButton>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {cascade && (
            <ResultOverlay outcome="win" prize={draw === 3 ? 160 : 100} taunt="" title={t('g8.won')}
              actions={[{ label: t('g8.newGame'), primary: true, onClick: reset }, { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } }]}>
              <p className="text-center font-[var(--font-display)] text-2xl font-bold tabular-nums text-amber-200">{mmss(secs)}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
