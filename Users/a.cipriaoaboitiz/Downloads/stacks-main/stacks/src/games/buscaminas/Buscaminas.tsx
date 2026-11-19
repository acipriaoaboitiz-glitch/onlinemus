import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Flag, Pickaxe, RotateCcw } from 'lucide-react';
import { FlagArt, MineArt } from '../shared/art.tsx';
import { useT } from '../../i18n/index.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameInterval, gameTimeout } from '../../services/timers.ts';
import { feedback } from '../../store/settings.ts';
import { submitRecord, useRecord } from '../../store/records.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { HudPills, RailButton } from '../shared/hud.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { rewardSolo, useSoloMode } from '../shared/solo.ts';
import { MODES, chord, dig, newMines, toggleFlag, type Cell, type MState } from './engine.ts';

const NUM = ['', '#5aa8ff', '#3fe0a8', '#ff7a7a', '#b794ff', '#ffb454', '#2dd4bf', '#f1e7c6', '#9aa5a0'];
const mmss = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

interface CellProps { cell: Cell; boom: boolean; i: number; onTap: (i: number) => void; onPress: (i: number) => void; size: string }

/** Casilla biselada: cerrada = esmeralda oscuro en relieve; abierta = obsidiana hundida con número de alto contraste. */
const CellView = memo(function CellView({ cell, boom, i, onTap, onPress, size }: CellProps) {
  const timer = useRef<number | null>(null);
  const long = useRef(false);
  const down = (): void => { long.current = false; timer.current = gameTimeout(() => { long.current = true; onPress(i); }, 340); };
  const up = (): void => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; if (!long.current) onTap(i); };
  const cancel = (): void => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; long.current = true; };
  const open = cell.open;
  return (
    <button type="button" onPointerDown={down} onPointerUp={up} onPointerLeave={cancel} onPointerCancel={cancel} onContextMenu={(e) => { e.preventDefault(); onPress(i); }}
      aria-label={open ? String(cell.adj) : cell.flag ? 'flag' : '·'} className="touch-manipulation select-none p-[1px]" style={{ width: size, height: size }}>
      <span className="grid h-full w-full place-items-center rounded-[22%] font-extrabold tabular-nums"
        style={open
          ? { background: boom ? 'radial-gradient(circle, #c02626 0%, #5a0f0f 80%)' : 'linear-gradient(160deg,#0b1612,#050b08)', boxShadow: 'inset 0 3px 5px rgba(0,0,0,.75), inset 0 -1px 0 rgba(255,255,255,.05)', color: NUM[cell.adj] }
          : { background: 'linear-gradient(160deg,#21735a,#0e3f30 55%,#082a1f)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.28), inset 0 -2px 3px rgba(0,0,0,.35), 0 3px 0 #030D08, 0 4px 5px rgba(0,0,0,.5)' }}>
        {open
          ? (cell.mine ? <span className="block h-[86%] w-[86%]"><MineArt /></span> : cell.adj > 0 ? <span style={{ fontSize: `calc(${size} * .58)` }}>{cell.adj}</span> : null)
          : cell.flag ? <span className="block h-[88%] w-[88%]"><FlagArt /></span> : null}
      </span>
    </button>
  );
});

export default function Buscaminas() {
  const nav = useNavigate();
  const t = useT();
  const mode = useSoloMode('buscaminas');
  const cfg = MODES[mode]!;
  const best = useRecord('buscaminas', mode);
  const [s, setS] = useState<MState>(() => newMines(mode));
  const [flagMode, setFlagMode] = useState(false);
  const [secs, setSecs] = useState(0);
  const done = useRef(false);

  const reset = useCallback(() => { setS(newMines(mode)); setSecs(0); done.current = false; }, [mode]);

  // Cronómetro: arranca con la primera casilla y se para al terminar.
  const running = s.started && !s.over;
  useEffect(() => {
    if (!running) return;
    const id = gameInterval(() => setSecs((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!s.over || done.current) return;
    done.current = true;
    if (s.won) { submitRecord('buscaminas', mode, secs, 'low'); rewardSolo('buscaminas', cfg.reward, '¡DESPEJADO!'); } else feedback('thud');
  }, [s.over, s.won, mode, secs, cfg.reward]);

  const tap = useCallback((i: number) => {
    setS((cur) => {
      const c = cur.cells[i]!;
      const n = flagMode && !c.open ? toggleFlag(cur, i) : c.open ? chord(cur, i) : dig(cur, i);
      if (!n) return cur;
      feedback(n.over && !n.won ? 'thud' : flagMode && !c.open ? 'chip' : 'tap');
      return n;
    });
  }, [flagMode]);
  const press = useCallback((i: number) => { setS((cur) => { const n = toggleFlag(cur, i); if (n) feedback('chip'); return n ?? cur; }); }, []);

  const size = `min(calc(100cqw / ${s.w}), calc(100cqh / ${s.h}))`;
  return (
    <GameFrame
      gameId="buscaminas" feltTone="emerald"
      header={<p className="truncate text-center font-[var(--font-display)] text-lg font-bold text-amber-300">{t('g.buscaminas.name')}</p>}
      strip={<HudPills items={[{ label: t('g8.mines'), value: <><span className="inline-block size-4"><MineArt /></span>{Math.max(0, s.mines - s.flags)}</> }, { label: t('g8.time'), value: mmss(secs) }, { label: t('g8.best'), value: best === null ? '—' : mmss(best) }]} />}
      felt={(
        <div className="h-full w-full p-[clamp(6px,2vw,16px)] [container-type:size]">
          <div className="grid h-full place-items-center">
            <div className="grid rounded-[14px] bg-[#0a1210] p-[1.5%] shadow-[inset_0_0_0_1px_rgba(255,255,255,.07),inset_0_6px_14px_rgba(0,0,0,.65),0_8px_18px_rgba(0,0,0,.45)]" style={{ gridTemplateColumns: `repeat(${s.w}, ${size})`, width: 'fit-content' }}>
              {s.cells.map((c, i) => <CellView key={i} i={i} cell={c} boom={s.boom === i} onTap={tap} onPress={press} size={size} />)}
            </div>
          </div>
        </div>
      )}
      bottom={(
        <div className="flex min-h-[52px] w-full items-center gap-2" role="group" aria-label={t('g8.actions')}>
          <RailButton onClick={() => { setFlagMode(false); feedback('tap'); }} active={!flagMode}><Pickaxe size={16} strokeWidth={1.75} aria-hidden />{t('g8.dig')}</RailButton>
          <RailButton onClick={() => { setFlagMode(true); feedback('tap'); }} active={flagMode}><Flag size={16} strokeWidth={1.75} aria-hidden />{t('g8.flag')}</RailButton>
          <RailButton onClick={reset} label={t('g8.newGame')}><RotateCcw size={16} strokeWidth={1.75} aria-hidden /></RailButton>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {s.over && (
            <ResultOverlay outcome={s.won ? 'win' : 'lose'} prize={s.won ? cfg.reward : 0} taunt="" title={s.won ? t('g8.won') : t('g8.lost')}
              actions={[{ label: t('g8.newGame'), primary: true, onClick: reset }, { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } }]}>
              <p className="text-center font-[var(--font-display)] text-2xl font-bold tabular-nums text-amber-200">{mmss(secs)}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
