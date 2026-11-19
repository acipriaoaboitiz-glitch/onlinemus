import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Eraser, Pencil, RotateCcw } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameInterval } from '../../services/timers.ts';
import { feedback } from '../../store/settings.ts';
import { submitRecord, useRecord } from '../../store/records.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { HudPills, RailButton } from '../shared/hud.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { rewardSolo, useSoloMode } from '../shared/solo.ts';
import { REWARD, generate, peersOf, type Puzzle } from './engine.ts';

const mmss = (s: number): string => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const MAX_ERR = 3;

export default function Sudoku() {
  const nav = useNavigate();
  const t = useT();
  const mode = useSoloMode('sudoku');
  const best = useRecord('sudoku', mode);
  const [pz, setPz] = useState<Puzzle>(() => generate(mode));
  const [grid, setGrid] = useState<number[]>(() => pz.puzzle.slice());
  const [notes, setNotes] = useState<number[]>(() => Array<number>(81).fill(0));
  const [wrong, setWrong] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState<number | null>(null);
  const [pencil, setPencil] = useState(false);
  const [errors, setErrors] = useState(0);
  const [secs, setSecs] = useState(0);
  const done = useRef(false);

  const solved = useMemo(() => grid.every((v, i) => v === pz.solution[i]), [grid, pz]);
  const lost = errors >= MAX_ERR;
  const over = solved || lost;

  const reset = useCallback(() => {
    const n = generate(mode);
    setPz(n); setGrid(n.puzzle.slice()); setNotes(Array<number>(81).fill(0)); setWrong(new Set()); setSel(null); setErrors(0); setSecs(0); done.current = false;
  }, [mode]);

  useEffect(() => {
    if (over) return;
    const id = gameInterval(() => setSecs((v) => v + 1), 1000);
    return () => window.clearInterval(id);
  }, [over]);
  useEffect(() => {
    if (!over || done.current) return;
    done.current = true;
    if (solved) { submitRecord('sudoku', mode, secs, 'low'); rewardSolo('sudoku', REWARD[mode] ?? 100, '¡RESUELTO!'); } else feedback('defeat');
  }, [over, solved, mode, secs]);

  const given = (i: number): boolean => pz.puzzle[i] !== 0;
  const put = (d: number): void => {
    if (sel === null || over || given(sel) || (grid[sel] === pz.solution[sel] && grid[sel] !== 0)) return;
    if (pencil) {
      if (grid[sel]) return;
      setNotes((n) => { const m = n.slice(); m[sel] = m[sel]! ^ (1 << d); return m; });
      feedback('tap');
      return;
    }
    setGrid((g) => { const m = g.slice(); m[sel] = d; return m; });
    setNotes((n) => { const m = n.slice(); m[sel] = 0; for (const p of peersOf(sel)) if (m[p]! & (1 << d)) m[p] = m[p]! & ~(1 << d); return m; });
    if (d !== pz.solution[sel]) {
      setWrong((w) => new Set(w).add(sel)); setErrors((e) => e + 1); feedback('thud');
    } else { setWrong((w) => { const n = new Set(w); n.delete(sel); return n; }); feedback('wood'); }
  };
  const erase = (): void => {
    if (sel === null || over || given(sel) || (grid[sel] === pz.solution[sel])) return;
    setGrid((g) => { const m = g.slice(); m[sel] = 0; return m; });
    setNotes((n) => { const m = n.slice(); m[sel] = 0; return m; });
    setWrong((w) => { const n = new Set(w); n.delete(sel); return n; });
    feedback('tap');
  };

  const count = (d: number): number => grid.filter((v, i) => v === d && v === pz.solution[i]).length;
  const selVal = sel !== null ? grid[sel]! : 0;
  const peerSet = useMemo(() => new Set(sel === null ? [] : peersOf(sel)), [sel]);
  const boxOf = (i: number): number => Math.floor(Math.floor(i / 9) / 3) * 3 + Math.floor((i % 9) / 3);

  return (
    <GameFrame
      gameId="sudoku" feltTone="emerald"
      header={<p className="truncate text-center font-[var(--font-display)] text-lg font-bold text-amber-300">{t('g.sudoku.name')}</p>}
      strip={<HudPills items={[{ label: t('g8.errors'), value: <span className={errors ? 'text-rose-300' : ''}>{errors}/{MAX_ERR}</span> }, { label: t('g8.time'), value: mmss(secs) }, { label: t('g8.best'), value: best === null ? '—' : mmss(best) }]} />}
      felt={(
        <div className="h-full w-full p-[clamp(6px,2vw,16px)] [container-type:size]">
          <div className="grid h-full place-items-center">
            <div className="relative grid rounded-[10px] bg-[linear-gradient(150deg,#0d1f19,#08110E_55%,#050b08)] shadow-[inset_0_1px_0_rgba(255,255,255,.12),inset_0_0_0_1.5px_rgba(212,175,55,.6),0_10px_22px_rgba(0,0,0,.5)]" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', aspectRatio: '1', gridTemplateColumns: 'repeat(9, 1fr)', gridTemplateRows: 'repeat(9, 1fr)', padding: '0.6%' }} role="grid" aria-label="Sudoku">
              {grid.map((v, i) => {
                const r = Math.floor(i / 9); const c = i % 9;
                const isSel = sel === i;
                const hl = sel !== null && (peerSet.has(i) && !isSel);
                const same = selVal !== 0 && v === selVal && !isSel;
                const bad = wrong.has(i);
                return (
                  <button key={i} type="button" role="gridcell" aria-label={`${r + 1}-${c + 1}`} onClick={() => { setSel(i); feedback('tap'); }} className="relative touch-manipulation"
                    style={{
                      background: isSel ? 'rgba(252,227,138,.30)' : same ? 'rgba(212,175,55,.26)' : hl ? 'rgba(255,255,255,.07)' : boxOf(i) % 2 ? 'rgba(255,255,255,.025)' : 'transparent',
                      borderRight: c === 8 ? 'none' : `${c % 3 === 2 ? 1.6 : 0.6}px solid ${c % 3 === 2 ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.10)'}`,
                      borderBottom: r === 8 ? 'none' : `${r % 3 === 2 ? 1.6 : 0.6}px solid ${r % 3 === 2 ? 'rgba(212,175,55,.75)' : 'rgba(255,255,255,.10)'}`,
                    }}>
                    {v ? (
                      <span className="grid h-full w-full place-items-center font-bold tabular-nums leading-none" style={{ fontSize: 'calc(min(100cqw, 100cqh, calc(740px / var(--z, 1))) / 9 * 0.56)', color: bad ? '#fb7185' : given(i) ? '#F8FAF9' : '#F0C35F' }}>{v}</span>
                    ) : notes[i] ? (
                      <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-[8%] text-white/55" style={{ fontSize: 'calc(min(100cqw, 100cqh, calc(740px / var(--z, 1))) / 9 * 0.2)' }}>
                        {Array.from({ length: 9 }, (_, k) => <span key={k} className="grid place-items-center leading-none tabular-nums">{notes[i]! & (1 << (k + 1)) ? k + 1 : ''}</span>)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
      bottom={(
        <div className="grid w-full gap-1.5" role="group" aria-label={t('g8.actions')}>
          <div className="grid grid-cols-9 gap-1">
            {Array.from({ length: 9 }, (_, k) => (
              <button key={k} type="button" disabled={count(k + 1) >= 9 || over} onClick={() => put(k + 1)}
                className="h-12 touch-manipulation rounded-xl border border-white/10 bg-white/[0.07] text-[20px] font-bold tabular-nums text-[#FCE38A] transition-opacity active:scale-90 disabled:opacity-25">{k + 1}</button>
            ))}
          </div>
          <div className="flex min-h-[48px] items-center gap-2">
            <RailButton onClick={() => { setPencil((p) => !p); feedback('tap'); }} active={pencil}><Pencil size={16} strokeWidth={1.75} aria-hidden />{t('g8.notes')}</RailButton>
            <RailButton onClick={erase}><Eraser size={16} strokeWidth={1.75} aria-hidden />{t('g8.erase')}</RailButton>
            <RailButton onClick={reset} label={t('g8.newGame')}><RotateCcw size={16} strokeWidth={1.75} aria-hidden /></RailButton>
          </div>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {over && (
            <ResultOverlay outcome={solved ? 'win' : 'lose'} prize={solved ? (REWARD[mode] ?? 100) : 0} taunt="" title={solved ? t('g8.won') : t('g8.lost')}
              actions={[{ label: t('g8.newGame'), primary: true, onClick: reset }, { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } }]}>
              <p className="text-center font-[var(--font-display)] text-2xl font-bold tabular-nums text-amber-200">{mmss(secs)}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
