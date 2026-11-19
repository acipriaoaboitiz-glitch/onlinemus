import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, Undo2 } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { juice } from '../../services/juice.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { feedback } from '../../store/settings.ts';
import { submitRecord, useRecord } from '../../store/records.ts';
import { wallet } from '../../store/wallet.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { HudPills, RailButton } from '../shared/hud.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { rewardSolo, useSoloMode } from '../shared/solo.ts';
import { MODES, maxTile, move, newGame, type Dir, type G2048 } from './engine.ts';

/** Acabado metálico por valor: marfil, bronce, esmeralda, zafiro, rubí y oro imperial. */
function look(v: number): { bg: string; fg: string; glow?: string } {
  if (v <= 4) return { bg: 'linear-gradient(145deg,#FFFBEA,#E9DDB5)', fg: '#4a3d1a' };
  if (v <= 16) return { bg: 'linear-gradient(145deg,#E3A66B,#9a5a22)', fg: '#2d1503' };
  if (v <= 64) return { bg: 'linear-gradient(145deg,#2fd197,#0a6b4a)', fg: '#eafff6' };
  if (v <= 512) return { bg: 'linear-gradient(145deg,#5aa0ff,#1d4fbf)', fg: '#eef5ff' };
  if (v <= 1024) return { bg: 'linear-gradient(145deg,#ff6a85,#a8102c)', fg: '#fff0f3' };
  return { bg: 'linear-gradient(145deg,#FFF3B0,#FCE38A 35%,#D4AF37 70%,#9a6f0e)', fg: '#3a2603', glow: '0 0 16px rgba(252,227,138,.75)' };
}

const DELTA: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };

export default function Game2048() {
  const nav = useNavigate();
  const t = useT();
  const mode = useSoloMode('game2048');
  const cfg = MODES[mode]!;
  const best = useRecord('game2048', mode);
  const [g, setG] = useState<G2048>(() => newGame(cfg.size));
  const [undo, setUndo] = useState<G2048[]>([]);
  const [undosLeft, setUndosLeft] = useState(cfg.undos);
  const rewarded = useRef(false);
  const wonShown = useRef(false);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const reset = useCallback(() => { setG(newGame(cfg.size)); setUndo([]); setUndosLeft(cfg.undos); rewarded.current = false; wonShown.current = false; }, [cfg.size, cfg.undos]);
  const go = useCallback((d: Dir) => {
    setG((cur) => {
      const n = move(cur, d);
      if (!n) return cur;
      setUndo((u) => [...u.slice(-9), cur]);
      feedback(n.score > cur.score ? 'clack' : 'tap');
      return n;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => { const d = DELTA[e.key]; if (d) { e.preventDefault(); go(d); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // 2048 alcanzado: cinemática y premio; fin de partida: récord y fichas según la puntuación.
  useEffect(() => {
    if (g.won && !wonShown.current) { wonShown.current = true; rewardSolo('game2048', 150, '¡2048!'); }
  }, [g.won]);
  useEffect(() => {
    if (!g.over || rewarded.current) return;
    rewarded.current = true;
    submitRecord('game2048', mode, g.score, 'high');
    const chips = Math.min(120, Math.floor(g.score / 150));
    if (chips > 0) { wallet.add(chips); wallet.recordResult(chips > 20); juice.chips('me', 6); }
    feedback(maxTile(g) >= 512 ? 'win' : 'defeat');
  }, [g, mode]);

  const doUndo = (): void => {
    if (!undo.length || undosLeft <= 0) return;
    setG(undo[undo.length - 1]!);
    setUndo((u) => u.slice(0, -1));
    setUndosLeft((n) => n - 1);
    feedback('tap');
  };

  const onDown = (e: React.PointerEvent): void => { touch.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent): void => {
    const s = touch.current; touch.current = null;
    if (!s) return;
    const dx = e.clientX - s.x; const dy = e.clientY - s.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const N = g.size;
  return (
    <GameFrame
      gameId="game2048" feltTone="emerald"
      header={<HudPills items={[{ label: t('g8.score'), value: g.score.toLocaleString('es-ES') }, { label: t('g8.best'), value: Math.max(best ?? 0, g.score).toLocaleString('es-ES') }]} />}
      felt={(
        <div className="grid h-full place-items-center p-[clamp(8px,3vw,22px)]">
          <div className="h-full w-full [container-type:size]">
            <div className="mx-auto grid h-full place-items-center">
              <div className="relative touch-none select-none rounded-[18px] p-[2.2%]" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { touch.current = null; }}
                style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', aspectRatio: '1', background: 'linear-gradient(160deg,rgba(255,255,255,.07),rgba(255,255,255,0) 30%), linear-gradient(145deg,#10201a,#08110E)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), inset 0 0 0 1px rgba(255,255,255,.07), inset 0 8px 16px rgba(0,0,0,.65), 0 10px 22px rgba(0,0,0,.5)' }}>
                <div className="relative h-full w-full">
                  {Array.from({ length: N * N }, (_, i) => (
                    <div key={i} aria-hidden className="absolute" style={{ left: `${((i % N) / N) * 100}%`, top: `${(Math.floor(i / N) / N) * 100}%`, width: `${100 / N}%`, height: `${100 / N}%`, padding: '1.1%' }}>
                      <div className="h-full w-full rounded-[12%] bg-white/[0.045]" style={{ boxShadow: 'inset 0 2px 4px rgba(0,0,0,.45)' }} />
                    </div>
                  ))}
                  {g.tiles.map((tile) => {
                    const l = look(tile.v);
                    return (
                      <motion.div key={tile.id} className="absolute left-0 top-0" style={{ width: `${100 / N}%`, height: `${100 / N}%`, padding: '1.1%', willChange: 'transform' }}
                        initial={{ x: `${tile.c * 100}%`, y: `${tile.r * 100}%`, scale: tile.fresh ? 0.3 : 1, opacity: tile.fresh ? 0 : 1 }}
                        animate={{ x: `${tile.c * 100}%`, y: `${tile.r * 100}%`, scale: tile.merged ? [1, 1.16, 1] : 1, opacity: 1 }}
                        transition={{ x: { type: 'spring', stiffness: 620, damping: 38 }, y: { type: 'spring', stiffness: 620, damping: 38 }, scale: { duration: 0.2 }, opacity: { duration: 0.12 } }}>
                        <div className="grid h-full w-full place-items-center rounded-[12%] font-extrabold tabular-nums" style={{ background: l.bg, color: l.fg, boxShadow: `inset 0 2px 1px rgba(255,255,255,.65), inset 0 -3px 5px rgba(0,0,0,.32), 0 3px 6px rgba(0,0,0,.5)${l.glow ? `, ${l.glow}` : ''}`}}>
                          <span className="leading-none" style={{ fontSize: `calc(min(100cqw, 100cqh, calc(740px / var(--z, 1))) / ${N} * ${tile.v >= 1000 ? 0.27 : tile.v >= 100 ? 0.33 : 0.42})` }}>{tile.v}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      bottom={(
        <div className="flex min-h-[52px] w-full items-center gap-2" role="group" aria-label={t('g8.actions')}>
          <RailButton onClick={doUndo} disabled={!undo.length || undosLeft <= 0}><Undo2 size={16} strokeWidth={1.75} aria-hidden />{t('g8.undo')} · {undosLeft}</RailButton>
          <RailButton onClick={reset}><RotateCcw size={16} strokeWidth={1.75} aria-hidden />{t('g8.newGame')}</RailButton>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {g.over && (
            <ResultOverlay outcome={maxTile(g) >= 1024 ? 'win' : 'lose'} prize={Math.min(120, Math.floor(g.score / 150))} taunt="" title={t('g8.over')}
              actions={[{ label: t('g8.newGame'), primary: true, onClick: reset }, { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } }]}>
              <p className="text-center font-[var(--font-display)] text-2xl font-bold tabular-nums text-amber-200">{g.score.toLocaleString('es-ES')}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
