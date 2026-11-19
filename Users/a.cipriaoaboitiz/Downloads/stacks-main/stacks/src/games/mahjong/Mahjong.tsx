import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, RotateCcw, Shuffle } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameInterval, gameTimeout } from '../../services/timers.ts';
import { feedback } from '../../store/settings.ts';
import { submitRecord, useRecord } from '../../store/records.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { HudPills, RailButton } from '../shared/hud.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { rewardSolo, useSoloMode } from '../shared/solo.ts';
import { Face } from './Faces.tsx';
import { MODES, deal, isFree, pairs, remove, shuffleTiles, type Tile } from './engine.ts';

const mmss = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const RATIO = 1.28;

interface TileProps { tile: Tile; w: number; free: boolean; selected: boolean; hint: boolean; onTap: (id: number) => void }

/** Ficha de marfil gruesa: cara con bisel inferior-derecho (canto), dibujo vectorial y, si está bloqueada, un velo oscuro. */
const TileView = memo(function TileView({ tile, w, free, selected, hint, onTap }: TileProps) {
  const h = w * RATIO;
  const edge = Math.max(2, w * 0.09);
  return (
    <motion.div className="absolute left-0 top-0" style={{ width: w, height: h, zIndex: tile.z * 100 + tile.y, willChange: 'transform' }}
      initial={false}
      animate={{ x: (tile.x / 2) * w - tile.z * edge * 0.9, y: (tile.y / 2) * h - tile.z * edge * 0.9, scale: tile.gone ? 0.6 : 1, opacity: tile.gone ? 0 : 1 }}
      transition={{ duration: tile.gone ? 0.2 : 0.01 }}>
      <button type="button" disabled={tile.gone || !free} onClick={() => onTap(tile.id)} aria-label={String(tile.type)} className="relative block touch-manipulation"
        style={{
          width: w, height: h, borderRadius: w * 0.13,
          background: 'linear-gradient(150deg,#FDFAF0,#F3EAD0 55%,#E2D6B4)',
          borderBottom: `${edge * 1.4}px solid #13422E`, borderRight: `${edge * 0.8}px solid #13422E`, boxSizing: 'content-box',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,.9), ${edge * 0.9}px ${edge * 1.9}px ${edge * 1.4}px rgba(0,0,0,.5)${selected ? ', 0 0 0 3px #FCE38A, 0 0 14px rgba(252,227,138,.9)' : hint ? ', 0 0 0 3px #34d399, 0 0 12px rgba(52,211,153,.9)' : ''}`,
        }}>
        <svg viewBox="0 0 60 80" className="absolute inset-[6%] h-[88%] w-[88%]" shapeRendering="geometricPrecision" aria-hidden="true"><Face type={tile.type} /></svg>
        {!free && <span aria-hidden className="absolute inset-0 rounded-[inherit] bg-black/38" />}
      </button>
    </motion.div>
  );
});

export default function Mahjong() {
  const nav = useNavigate();
  const t = useT();
  const mode = useSoloMode('mahjong');
  const cfg = MODES[mode]!;
  const best = useRecord('mahjong', mode);
  const [tiles, setTiles] = useState<Tile[]>(() => deal());
  const [sel, setSel] = useState<number | null>(null);
  const [hint, setHint] = useState<[number, number] | null>(null);
  const [hints, setHints] = useState(cfg.hints);
  const [shuffles, setShuffles] = useState(cfg.shuffles);
  const [secs, setSecs] = useState(0);
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

  const alive = tiles.filter((x) => !x.gone).length;
  const won = alive === 0;
  const moves = useMemo(() => pairs(tiles), [tiles]);
  const stuck = !won && moves.length === 0;
  const lost = stuck && shuffles <= 0;
  const over = won || lost;

  useEffect(() => {
    if (over) return;
    const id = gameInterval(() => setSecs((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [over]);
  useEffect(() => {
    if (!won || done.current) return;
    done.current = true;
    submitRecord('mahjong', mode, secs, 'low');
    rewardSolo('mahjong', cfg.reward, '¡PIRÁMIDE DESPEJADA!');
  }, [won, mode, secs, cfg.reward]);
  useEffect(() => { if (lost && !done.current) { done.current = true; feedback('defeat'); } }, [lost]);

  const reset = useCallback(() => { setTiles(deal()); setSel(null); setHint(null); setHints(cfg.hints); setShuffles(cfg.shuffles); setSecs(0); done.current = false; }, [cfg.hints, cfg.shuffles]);

  const tap = useCallback((id: number): void => {
    setHint(null);
    setSel((cur) => {
      if (cur === null) { feedback('tap'); return id; }
      if (cur === id) return null;
      const a = tiles[cur]!; const b = tiles[id]!;
      if (a.type === b.type) {
        feedback('clack');
        gameTimeout(() => feedback('clack'), 90);
        setTiles((ts) => remove(ts, cur, id));
        return null;
      }
      feedback('tap');
      return id;
    });
  }, [tiles]);

  const showHint = (): void => {
    if (hints <= 0 || !moves.length) return;
    setHint(moves[Math.floor(Math.random() * moves.length)]!); setHints((n) => n - 1); setSel(null); feedback('chip');
  };
  const doShuffle = (): void => { if (shuffles <= 0) return; setTiles((ts) => shuffleTiles(ts)); setShuffles((n) => n - 1); setSel(null); setHint(null); feedback('deal'); };

  // Medidas: 8 columnas de ficha y 6 filas, más el desfase de los niveles.
  const w = dim.w ? Math.min((dim.w - 20) / 8.3, (dim.h - 24) / (6 * RATIO + 0.4)) : 0;
  const bw = w * 8; const bh = w * RATIO * 6;
  const hintSet = new Set(hint ?? []);

  return (
    <GameFrame
      gameId="mahjong" feltTone="emerald"
      header={<p className="truncate text-center font-[var(--font-display)] text-lg font-bold text-amber-300">{t('g.mahjong.name')}</p>}
      strip={<HudPills items={[{ label: t('g8.tiles'), value: alive }, { label: t('g8.time'), value: mmss(secs) }, { label: t('g8.best'), value: best === null ? '—' : mmss(best) }]} />}
      felt={(
        <div ref={wrap} className="relative grid h-full w-full place-items-center overflow-hidden">
          {w > 0 && (
            <div className="relative" style={{ width: bw, height: bh }}>
              {tiles.map((tile) => <TileView key={tile.id} tile={tile} w={w} free={isFree(tiles, tile)} selected={sel === tile.id} hint={hintSet.has(tile.id)} onTap={tap} />)}
            </div>
          )}
        </div>
      )}
      bottom={(
        <div className="flex min-h-[52px] w-full items-center gap-2" role="group" aria-label={t('g8.actions')}>
          <RailButton onClick={showHint} disabled={hints <= 0 || over || !moves.length}><Lightbulb size={16} strokeWidth={1.75} aria-hidden />{t('g8.hint')}{hints < 90 ? ` · ${hints}` : ''}</RailButton>
          <RailButton onClick={doShuffle} disabled={shuffles <= 0 || over} primary={stuck}><Shuffle size={16} strokeWidth={1.75} aria-hidden />{t('g8.shuffle')} · {shuffles}</RailButton>
          <RailButton onClick={reset} label={t('g8.newGame')}><RotateCcw size={16} strokeWidth={1.75} aria-hidden /></RailButton>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {over && (
            <ResultOverlay outcome={won ? 'win' : 'lose'} prize={won ? cfg.reward : 0} taunt="" title={won ? t('g8.won') : t('g8.lost')}
              actions={[{ label: t('g8.newGame'), primary: true, onClick: reset }, { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } }]}>
              <p className="text-center font-[var(--font-display)] text-2xl font-bold tabular-nums text-amber-200">{mmss(secs)}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
