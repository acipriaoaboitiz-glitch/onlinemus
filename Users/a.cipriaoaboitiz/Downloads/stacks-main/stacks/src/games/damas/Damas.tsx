import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useT } from '../../i18n/index.ts';
import { juice } from '../../services/juice.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { gameTimeout } from '../../services/timers.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { CrownArt } from '../shared/art.tsx';
import { HudPills } from '../shared/hud.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { useDuel } from '../shared/duel.ts';
import { applyDamas, botMove, legalMoves, newDamas, type DAction, type DState, type Piece, type Side } from './engine.ts';

const WIN_BONUS = 100;
/** Duración de cada salto (vuelo + pausa para ver la captura). */
const HOP = 300;
const info = (i: number, name: string, human: boolean): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: !human, online: true });

const LOOK: Record<Side, { bg: string; ring: string; crown: string }> = {
  0: { bg: 'radial-gradient(circle at 34% 28%, #FFF6C4 0%, #F1CD5B 30%, #D4AF37 58%, #8a6410 100%)', ring: 'inset 0 -4px 6px rgba(90,58,4,.55), inset 0 2px 3px rgba(255,255,255,.6), 0 4px 6px rgba(0,0,0,.55)', crown: '#4a3204' },
  1: { bg: 'radial-gradient(circle at 34% 28%, #FFFFFF 0%, #F6EFD8 32%, #D9CBA3 62%, #9c8d62 100%)', ring: 'inset 0 -4px 6px rgba(80,66,30,.5), inset 0 2px 3px rgba(255,255,255,.8), 0 4px 6px rgba(0,0,0,.55)', crown: '#6b5316' },
};

/** Casillas: madera noble clara y mármol oscuro veteado. */
const Squares = memo(function Squares() {
  return (
    <svg viewBox="0 0 800 800" className="absolute inset-0 h-full w-full" shapeRendering="geometricPrecision" aria-hidden="true">
      <defs>
        <linearGradient id="dm-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d9b484" /><stop offset="1" stopColor="#b68850" /></linearGradient>
        <linearGradient id="dm-marble" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#26302d" /><stop offset=".6" stopColor="#141b19" /><stop offset="1" stopColor="#0c1210" /></linearGradient>
      </defs>
      {Array.from({ length: 64 }, (_, i) => {
        const r = Math.floor(i / 8); const c = i % 8; const dark = (r + c) % 2 === 1;
        return (
          <g key={i}>
            <rect x={c * 100} y={r * 100} width="100" height="100" fill={dark ? 'url(#dm-marble)' : 'url(#dm-wood)'} />
            {dark && <path d={`M${c * 100 + 8} ${r * 100 + 70} Q${c * 100 + 45} ${r * 100 + 40} ${c * 100 + 92} ${r * 100 + 22}`} stroke="#fff" strokeOpacity=".07" strokeWidth="2" fill="none" />}
          </g>
        );
      })}
    </svg>
  );
});

function Disc({ p }: { p: Piece }) {
  const l = LOOK[p.side];
  return (
    <div className="absolute inset-[11%] grid place-items-center rounded-full" style={{ background: l.bg, boxShadow: l.ring }}>
      <span className="absolute inset-[12%] rounded-full" style={{ boxShadow: 'inset 0 1.5px 2px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.4)' }} />
      <span className="absolute inset-[26%] rounded-full" style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,.3), 0 1px 0 rgba(255,255,255,.35)' }} />
      {p.king && <span className="absolute inset-[24%] block"><CrownArt dark={l.crown} /></span>}
    </div>
  );
}

export default function Damas() {
  const nav = useNavigate();
  const t = useT();
  const d = useDuel<DState, DAction>('damas', (p) => newDamas(p), applyDamas);
  const { s, setS, me, myIdx, hostLike, dispatch, online } = d;
  const [sel, setSel] = useState<number | null>(null);
  const paid = useRef(false);
  const [doneSeq, setDoneSeq] = useState(0);

  // IA con una pausa natural (750–900 ms).
  useEffect(() => {
    if (!s || s.winner !== null || !hostLike) return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const id = gameTimeout(() => setS((cur) => {
      if (!cur || cur.winner !== null || cur.players[cur.turn]!.id !== p.id) return cur;
      const m = botMove(cur);
      return m ? applyDamas(cur, p.id, { k: 'move', from: m.from, to: m.to }) ?? cur : cur;
    }), botDelay());
    return () => window.clearTimeout(id);
  }, [s, hostLike, setS]);

  const seq = s?.seq ?? 0;
  const lastMove = s?.last ?? null;
  useEffect(() => {
    if (!seq || !lastMove) return;
    // un sonido por salto (300 ms cada uno) y, al aterrizar el último, el golpe final
    const hops = lastMove.path.length;
    const ids = lastMove.path.map((_, k) => gameTimeout(() => feedback(lastMove.captured[k] !== undefined ? 'capture' : 'wood'), HOP * k + HOP * 0.72));
    ids.push(gameTimeout(() => setDoneSeq(seq), HOP * hops + 120));
    setSel(null);
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const winner = s?.winner ?? null;
  useEffect(() => {
    if (winner === null || paid.current) return;
    paid.current = true;
    if (winner === 'draw') return;
    juice.chips(winner === myIdx ? 'me' : 'top');
    if (winner === myIdx) { wallet.add(WIN_BONUS); wallet.recordWin('damas'); juice.cinematic({ title: '¡VICTORIA!', sub: `+${WIN_BONUS}`, tone: 'gold', good: true }); }
    else juice.cinematic({ title: '¡DERROTA!', tone: 'ruby', good: false });
  }, [winner, myIdx]);

  if (!s) {
    return (
      <GameFrame gameId="damas" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.damas.name')}</p>}
        felt={<div className="grid h-full place-items-center"><span className="size-6 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" aria-hidden /></div>} bottom={null} />
    );
  }
  const oppIdx = (1 - myIdx) as Side;
  const myTurn = s.winner === null && s.turn === myIdx;
  const moves = myTurn ? legalMoves(s) : [];
  const movable = new Set(moves.map((m) => m.from));
  const targets = sel !== null ? moves.filter((m) => m.from === sel) : [];
  const flip = myIdx === 1;
  // En pantalla el jugador siempre ve sus fichas abajo.
  const view = (i: number): { r: number; c: number } => { const r = Math.floor(i / 8); const c = i % 8; return flip ? { r: 7 - r, c: 7 - c } : { r, c }; };
  const count = (side: Side): number => s.board.filter((p) => p?.side === side).length;
  const tap = (i: number): void => {
    if (!myTurn) return;
    const tg = targets.find((m) => m.to === i);
    if (sel !== null && tg) { setSel(null); dispatch(me, { k: 'move', from: sel, to: i }); return; }
    if (movable.has(i)) { setSel(i === sel ? null : i); feedback('tap'); } else setSel(null);
  };

  return (
    <GameFrame
      gameId="damas" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.seq}`, onTimeout: () => { if (!myTurn) return; const m = botMove(s); if (m) dispatch(me, { k: 'move', from: m.from, to: m.to }); } }}
      header={<HudPills items={[{ label: t('dm8.mine'), value: count(myIdx) }, { label: t('dm8.rival'), value: count(oppIdx) }]} />}
      felt={(
        <div className="flex h-full min-h-0 flex-col items-center gap-2 p-[clamp(8px,2.4vw,18px)]">
          <div className="lg:absolute lg:left-5 lg:top-4 lg:z-10"><SeatBadge info={info(oppIdx, s.players[oppIdx]!.name, s.players[oppIdx]!.human)} tone="them" mano={false} turn={s.winner === null && s.turn === oppIdx} deadline={null} cards={0} /></div>
          <div className="min-h-0 w-full flex-1 [container-type:size]">
            <div className="grid h-full place-items-center">
              <div className="rounded-[14px] p-[1.8%]" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', background: 'linear-gradient(145deg,#4a2e1a,#2b1a0d)', boxShadow: 'inset 0 0 0 2px #B8860B, inset 0 0 0 3.5px rgba(252,227,138,.45), inset 0 5px 8px rgba(0,0,0,.5), 0 10px 22px rgba(0,0,0,.55)' }}>
                <div className="relative aspect-square overflow-hidden rounded-[6px]">
                  <Squares />
                  {/* destinos válidos */}
                  {targets.map((m) => { const v = view(m.to); return <span key={m.to} className="pointer-events-none absolute grid place-items-center" style={{ left: `${v.c * 12.5}%`, top: `${v.r * 12.5}%`, width: '12.5%', height: '12.5%' }}><span className="size-[34%] rounded-full bg-[#FCE38A]/85 shadow-[0_0_8px_rgba(252,227,138,.8)]" /></span>; })}
                  {lastMove && doneSeq !== s.seq && lastMove.captured.map((ci, k) => {
                    const v = view(ci);
                    const foe: Piece = { side: (1 - s.board[lastMove.to]!.side) as Side, king: false };
                    return (
                      <motion.div key={`cap-${s.seq}-${ci}`} className="pointer-events-none absolute left-0 top-0" style={{ width: '12.5%', height: '12.5%', transform: `translate(${v.c * 100}%, ${v.r * 100}%)`, zIndex: 2 }}
                        initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: 0.4 }} transition={{ delay: (HOP * k + HOP * 0.72) / 1000, duration: 0.16 }}>
                        <Disc p={foe} />
                      </motion.div>
                    );
                  })}
                  {s.board.map((p, i) => {
                    if (!p) return null;
                    const v = view(i);
                    const fresh = lastMove !== null && lastMove.to === i && doneSeq !== s.seq;
                    const pts = fresh ? [lastMove.from, ...lastMove.path].map(view) : [v];
                    const n = pts.length - 1;
                    // fotogramas: despegue, vuelo parabólico (escala) y aterrizaje con pausa antes del siguiente salto
                    const xs: string[] = [`${pts[0]!.c * 100}%`]; const ys: string[] = [`${pts[0]!.r * 100}%`]; const tm: number[] = [0];
                    const sc: number[] = [1]; const tsc: number[] = [0];
                    for (let k = 1; k <= n; k++) {
                      xs.push(`${pts[k]!.c * 100}%`, `${pts[k]!.c * 100}%`); ys.push(`${pts[k]!.r * 100}%`, `${pts[k]!.r * 100}%`);
                      tm.push((k - 1 + 0.72) / Math.max(1, n), k / Math.max(1, n));
                      sc.push(1.32, 1, 1); tsc.push((k - 1 + 0.36) / Math.max(1, n), (k - 1 + 0.72) / Math.max(1, n), k / Math.max(1, n));
                    }
                    return (
                      <motion.div key={`${i}-${p.side}-${p.king}`} className="absolute left-0 top-0" style={{ width: '12.5%', height: '12.5%', willChange: 'transform', zIndex: fresh ? 3 : 1 }}
                        initial={{ x: `${pts[0]!.c * 100}%`, y: `${pts[0]!.r * 100}%` }}
                        animate={fresh && n > 0 ? { x: xs, y: ys, scale: sc } : { x: `${v.c * 100}%`, y: `${v.r * 100}%`, scale: 1 }}
                        transition={fresh && n > 0
                          ? { x: { duration: (HOP * n) / 1000, times: tm, ease: 'easeInOut' }, y: { duration: (HOP * n) / 1000, times: tm, ease: 'easeInOut' }, scale: { duration: (HOP * n) / 1000, times: tsc, ease: 'easeInOut' } }
                          : { duration: 0.01 }}>
                        <button type="button" disabled={!movable.has(i)} onClick={() => tap(i)} aria-label={`${v.r + 1}-${v.c + 1}`} className="relative block h-full w-full touch-manipulation">
                          <Disc p={p} />
                          {sel === i && <span className="absolute inset-[7%] rounded-full ring-[3px] ring-[#FCE38A] shadow-[0_0_12px_rgba(252,227,138,.9)]" />}
                          {myTurn && movable.has(i) && sel !== i && <span className="absolute inset-[9%] rounded-full ring-1 ring-[#FCE38A]/60" />}
                        </button>
                      </motion.div>
                    );
                  })}
                  {/* capas táctiles sobre casillas libres (destinos) */}
                  <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                    {Array.from({ length: 64 }, (_, k) => {
                      const r = Math.floor(k / 8); const c = k % 8;
                      const idx = flip ? (7 - r) * 8 + (7 - c) : k;
                      return <button key={k} type="button" tabIndex={-1} aria-hidden onClick={() => tap(idx)} className="touch-manipulation" style={{ pointerEvents: targets.some((m) => m.to === idx) ? 'auto' : 'none' }} />;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      bottom={(
        <div className="flex min-h-[64px] w-full items-center justify-center">
          <SeatBadge info={info(myIdx, s.players[myIdx]!.name, true)} tone="me" mano={false} turn={myTurn} deadline={null} cards={0} />
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {s.winner !== null && (
            <ResultOverlay outcome={s.winner === 'draw' ? undefined : s.winner === myIdx ? 'win' : 'lose'} prize={s.winner === myIdx ? WIN_BONUS : 0} taunt="" title={s.winner === 'draw' ? t('g8.draw') : s.winner === myIdx ? t('ser.champion') : t('ser.lost')}
              actions={[
                ...(hostLike ? [{ label: t('g8.newGame'), primary: true, onClick: () => { paid.current = false; setSel(null); d.restart(); } }] : []),
                { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } },
              ]}>
              <p className="text-center text-sm tabular-nums text-stone-300">{count(myIdx)} – {count(oppIdx)}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
