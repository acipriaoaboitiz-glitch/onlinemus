import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Dices } from 'lucide-react';
import { botName, tr, useT } from '../../i18n/index.ts';
import { juice } from '../../services/juice.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { gameInterval, gameTimeout } from '../../services/timers.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { Die } from '../mentiroso/Dice.tsx';
import { GameFrame } from '../shared/GameFrame.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { GOAL, SAFE, applyParchis, botPick, movesFor, newParchis, type PAction, type PPlayer, type PState } from './engine.ts';
import { COLORS, GRID, LANE_XY, LOOP_XY, NEST_ORIGIN, NEST_SLOTS, pieceXY, type XY } from './geometry.ts';

const WIN_BONUS = 120;
/** Cada casilla del salto dura 90 ms. */
const STEP_S = 0.09;
const info = (i: number, name: string, human: boolean): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: !human, online: true });
const CELL = 100 / GRID;
const COLOR_SETS: Record<number, number[]> = { 2: [0, 2], 3: [0, 1, 2], 4: [0, 1, 2, 3] };
const makePlayers = (n: number): PPlayer[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: i === 0 ? tr('g.you') : botName(i), human: i === 0, color: COLOR_SETS[n]![i]! }));

function star(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`); }
  return pts.join(' ');
}

/** Tablero clásico estilizado: madera oscura, casillas de marfil, 4 casas en tonos joya, seguros con estrella dorada y meta central. */
const BoardArt = memo(function BoardArt() {
  return (
    <svg viewBox={`0 0 ${GRID * 10} ${GRID * 10}`} className="absolute inset-0 h-full w-full" shapeRendering="geometricPrecision" aria-hidden="true">
      <defs>
        <linearGradient id="pc-ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6eed6" /><stop offset="1" stopColor="#dfd0a8" /></linearGradient>
        <linearGradient id="pc-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF0B0" /><stop offset="1" stopColor="#B8860B" /></linearGradient>
        {COLORS.map((c, k) => <linearGradient key={k} id={`pc-c${k}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={c.light} /><stop offset="1" stopColor={c.main} /></linearGradient>)}
      </defs>
      <rect x="0" y="0" width={GRID * 10} height={GRID * 10} fill="#1c120a" />
      {NEST_ORIGIN.map(([ox, oy], k) => (
        <g key={k}>
          <rect x={ox * 10 + 3} y={oy * 10 + 3} width="74" height="74" rx="10" fill={`url(#pc-c${k})`} stroke="#000" strokeOpacity=".35" strokeWidth="1" />
          <rect x={ox * 10 + 11} y={oy * 10 + 11} width="58" height="58" rx="8" fill="#000" opacity=".22" />
          {NEST_SLOTS[k]!.map(([sx, sy], j) => <circle key={j} cx={sx * 10 + 5} cy={sy * 10 + 5} r="6" fill="#000" opacity=".3" />)}
        </g>
      ))}
      {LOOP_XY.map(([x, y], i) => {
        const k = Math.floor(i / 17);
        const isStart = i === 17 * k + 13;
        return (
          <g key={i}>
            <rect x={x * 10 + 0.6} y={y * 10 + 0.6} width="8.8" height="8.8" rx="1.6" fill={isStart ? `url(#pc-c${k})` : 'url(#pc-ivory)'} stroke="#8a7a55" strokeOpacity=".7" strokeWidth=".4" />
            {SAFE.has(i) && <polygon points={star(x * 10 + 5, y * 10 + 5, 3.3)} fill="url(#pc-gold)" stroke="#6b4a08" strokeWidth=".25" />}
          </g>
        );
      })}
      {LANE_XY.map((lane, k) => lane.map(([x, y], i) => <rect key={`${k}-${i}`} x={x * 10 + 0.6} y={y * 10 + 0.6} width="8.8" height="8.8" rx="1.6" fill={`url(#pc-c${k})`} stroke="#000" strokeOpacity=".3" strokeWidth=".4" opacity=".85" />))}
      {/* meta central: cuatro triángulos hacia cada brazo */}
      {[0, 1, 2, 3].map((k) => (
        <polygon key={k} points={['80,110 110,110 95,95', '80,80 80,110 95,95', '80,80 110,80 95,95', '110,80 110,110 95,95'][k]} fill={`url(#pc-c${k})`} stroke="#000" strokeOpacity=".35" strokeWidth=".6" />
      ))}
      <polygon points={star(95, 95, 6)} fill="url(#pc-gold)" stroke="#6b4a08" strokeWidth=".4" />
    </svg>
  );
});

const PIECE_BG = COLORS.map((c) => `radial-gradient(circle at 34% 28%, ${c.light} 0%, ${c.main} 55%, ${c.dark} 100%)`);

export default function Parchis() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('parchis');
  const online = seating.online;
  const [count, setCount] = useState<2 | 3 | 4 | null>(null);
  const [s, setS] = useState<PState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [face, setFace] = useState(1);
  const [doneSeq, setDoneSeq] = useState(0);
  const [burst, setBurst] = useState<{ x: number; y: number; key: number } | null>(null);
  const lastEvent = useRef(0);
  const paid = useRef(false);
  const me = online ? s?.players.find((p) => p.peerId === seating.myPeerId)?.id ?? 'p0' : 'p0';
  const hostLike = !online || seating.isHost;

  const start = (n: 2 | 3 | 4) => { setCount(n); setS(newParchis(makePlayers(n))); lastEvent.current = 0; paid.current = false; };
  const hostStart = () => {
    const humans = seating.humans;
    const n = Math.max(2, seating.fillBots ? 4 : humans.length);
    const cs = COLOR_SETS[Math.min(4, n)]!;
    setS(newParchis(Array.from({ length: n }, (_, i) => i < humans.length
      ? { id: `p${i}`, name: humans[i]!.name, human: true, peerId: humans[i]!.peerId, color: cs[i]! }
      : { id: `p${i}`, name: botName(i - humans.length + 1), human: false, color: cs[i]! })));
    lastEvent.current = 0; paid.current = false;
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<PState, PAction>(seating, s, setS, applyParchis, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);

  const myIdx = Math.max(0, s?.players.findIndex((p) => p.id === me) ?? 0);
  const myTurn = Boolean(s && s.phase !== 'over' && s.turn === myIdx);

  // IA: tira el dado y mueve con una pausa natural (750–900 ms).
  useEffect(() => {
    if (!s || !hostLike || s.phase === 'over') return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const id = gameTimeout(() => setS((cur) => {
      if (!cur || cur.phase === 'over' || cur.players[cur.turn]!.id !== p.id) return cur;
      if (cur.phase === 'roll') { feedback('dice'); return applyParchis(cur, p.id, { k: 'roll', v: 1 + Math.floor(Math.random() * 6) }) ?? cur; }
      return applyParchis(cur, p.id, { k: 'move', piece: botPick(cur) }) ?? cur;
    }), botDelay());
    return () => window.clearTimeout(id);
  }, [s, hostLike]);

  // Mi tirada: el dado rueda 0,65 s con su traqueteo y luego se lanza.
  useEffect(() => {
    if (!rolling) return;
    const iv = gameInterval(() => setFace(1 + Math.floor(Math.random() * 6)), 90);
    const id = gameTimeout(() => { setRolling(false); dispatch(me, { k: 'roll', v: 1 + Math.floor(Math.random() * 6) }); }, 650);
    return () => { window.clearInterval(iv); window.clearTimeout(id); };
  }, [rolling, dispatch, me]);
  const roll = (): void => { if (!myTurn || s!.phase !== 'roll' || rolling) return; feedback('dice'); setRolling(true); };

  // Sonidos y vuelo de fichas por suceso.
  const seq = s?.seq ?? 0;
  const last = s?.last ?? null;
  useEffect(() => {
    if (!s) return;
    const e = s.event;
    if (e && e.seq !== lastEvent.current) {
      lastEvent.current = e.seq;
      if (e.kind === 'capture') { feedback('capture'); if (s.last) { const pl = s.players[s.last.player]!; const [bx, by] = pieceXY(pl.color, s.last.path[s.last.path.length - 1]!, 0); setBurst({ x: bx, y: by, key: e.seq }); } } else if (e.kind === 'goal') feedback('chip'); else if (e.kind === 'exit') feedback('wood');
    }
    if (last) { const id = gameTimeout(() => setDoneSeq(seq), 1000 * STEP_S * last.path.length + 140); return () => window.clearTimeout(id); }
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (s?.dice != null && s.phase === 'move') feedback('drop'); }, [s?.rollSeq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ganador.
  const winner = s?.winner ?? null;
  useEffect(() => {
    if (winner === null || paid.current || !s) return;
    paid.current = true;
    juice.chips(winner === myIdx ? 'me' : 'top');
    if (winner === myIdx) { wallet.add(WIN_BONUS); wallet.recordWin('parchis'); juice.cinematic({ title: '¡VICTORIA!', sub: `+${WIN_BONUS}`, tone: 'gold', good: true }); }
    else juice.cinematic({ title: `¡${s.players[winner]!.name}!`, tone: 'ruby', good: false });
  }, [winner]); // eslint-disable-line react-hooks/exhaustive-deps

  // Movimientos que puedo hacer ahora; si solo hay uno, se juega solo.
  const steps = s ? (s.bonus > 0 ? s.bonus : s.dice ?? 0) : 0;
  const moves = s && myTurn && s.phase === 'move' ? movesFor(s, myIdx, steps, s.bonus === 0) : [];
  const movable = new Set(moves.map((m) => m.piece));
  useEffect(() => {
    if (moves.length !== 1 || !s) return;
    const piece = moves[0]!.piece;
    const id = gameTimeout(() => dispatch(me, { k: 'move', piece }), 520);
    return () => window.clearTimeout(id);
  }, [s?.seq, moves.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!s && online) {
    return (
      <GameFrame gameId="parchis" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.parchis.name')}</p>}
        felt={<div className="grid h-full place-items-center"><span className="size-6 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" aria-hidden /></div>} bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame gameId="parchis" header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.parchis.name')}</p>}
        felt={(
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">{t('a.format')}</h2>
              <Button variant="primary" block onClick={() => start(2)}>{t('mt.f2')}</Button>
              <Button variant="secondary" block onClick={() => start(3)}>{t('mt.f3')}</Button>
              <Button variant="secondary" block onClick={() => start(4)}>{t('mt.f4')}</Button>
            </div>
          </div>
        )} bottom={null} />
    );
  }

  const me$ = s.players[myIdx]!;
  const rot = -90 * me$.color;
  const others = s.players.map((p, i) => ({ p, i })).filter((x) => x.i !== myIdx);
  const showFace = rolling ? face : (s.dice ?? 1);
  const atGoal = (pi: number): number => s.pieces[pi]!.filter((x) => x === GOAL).length;
  const fresh = (pi: number, k: number): boolean => Boolean(last) && last!.player === pi && last!.piece === k && doneSeq !== s.seq;

  // Posición visible de cada ficha (con desplazamiento si comparte casilla).
  const cellCount = new Map<string, number>();
  const placed = s.players.flatMap((pl, pi) => s.pieces[pi]!.map((pos, k) => {
    const [x, y] = pieceXY(pl.color, pos, k);
    const key = `${x},${y}`;
    const n = cellCount.get(key) ?? 0; cellCount.set(key, n + 1);
    return { pi, k, pos, x, y, n, color: pl.color };
  }));

  return (
    <GameFrame
      gameId="parchis" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn && !rolling, id: `${s.seq}`, onTimeout: () => { if (!myTurn) return; if (s.phase === 'roll') dispatch(me, { k: 'roll', v: 1 + Math.floor(Math.random() * 6) }); else dispatch(me, { k: 'move', piece: botPick(s) }); } }}
      header={<p className="truncate text-center font-[var(--font-display)] text-lg font-bold text-amber-300">{t('g.parchis.name')}</p>}
      strip={(
        <div className="flex items-center justify-center gap-2" role="group" aria-label={t('pc.goal')}>
          {s.players.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[12px] font-bold tabular-nums">
              <span className="size-3 rounded-full" style={{ background: PIECE_BG[p.color] }} aria-hidden />{atGoal(i)}/4
            </span>
          ))}
        </div>
      )}
      felt={(
        <div className="flex h-full min-h-0 flex-col items-center gap-2 p-[clamp(8px,2.4vw,18px)]">
          <div className="flex w-full items-start justify-around">
            {others.map(({ p, i }) => <SeatBadge key={p.id} info={info(i, p.name, p.human)} tone="them" mano={false} turn={s.phase !== 'over' && s.turn === i} deadline={null} cards={0} />)}
          </div>
          <div className="min-h-0 w-full flex-1 [container-type:size]">
            <div className="grid h-full place-items-center">
              <div className="rounded-[14px] p-[1.6%]" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', background: 'linear-gradient(145deg,#4a2e1a,#2b1a0d)', boxShadow: 'inset 0 0 0 2px #B8860B, inset 0 0 0 3.5px rgba(252,227,138,.45), inset 0 5px 8px rgba(0,0,0,.5), 0 10px 22px rgba(0,0,0,.55)' }}>
                <div className="relative aspect-square overflow-hidden rounded-[6px]" style={{ transform: `rotate(${rot}deg)` }}>
                  <BoardArt />
                  {/* barreras: dos fichas en una casilla del recorrido llevan un aro dorado */}
                  {[...cellCount.entries()].filter(([, c]) => c >= 2).map(([key]) => {
                    const [bx, by] = key.split(',').map(Number) as [number, number];
                    return <span key={`bar-${key}`} aria-hidden className="pointer-events-none absolute rounded-full ring-2 ring-[#FCE38A]/85 shadow-[0_0_8px_rgba(252,227,138,.7)]" style={{ left: `${(bx - 0.08) * CELL}%`, top: `${(by - 0.08) * CELL}%`, width: `${CELL * 1.16}%`, height: `${CELL * 1.16}%`, zIndex: 2 }} />;
                  })}
                  {burst && (
                    <motion.span key={burst.key} aria-hidden className="pointer-events-none absolute rounded-full" style={{ left: `${(burst.x - 0.5) * CELL}%`, top: `${(burst.y - 0.5) * CELL}%`, width: `${CELL * 2}%`, height: `${CELL * 2}%`, zIndex: 8, background: 'radial-gradient(circle, rgba(255,246,196,.95) 0%, rgba(252,227,138,.8) 30%, rgba(212,175,55,.35) 55%, transparent 72%)', willChange: 'transform' }}
                      initial={{ scale: 0.2, opacity: 1 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ delay: 0.05, duration: 0.65, ease: 'easeOut' }} />
                  )}
                  {placed.map(({ pi, k, pos, x, y, n, color }) => {
                    const isFresh = fresh(pi, k);
                    const path: XY[] = isFresh && last ? [pieceXY(color, last.path[0]! === 0 && s.pieces[pi]![k] === 0 ? -1 : last.path[0]! - 1, k), ...last.path.map((p) => pieceXY(color, p, k))] : [];
                    const off = n ? (n === 1 ? 0.2 : -0.2) : 0;
                    const can = pi === myIdx && movable.has(k);
                    return (
                      <motion.div key={`${pi}-${k}`} className="absolute left-0 top-0" style={{ width: `${CELL}%`, height: `${CELL}%`, willChange: 'transform', zIndex: isFresh ? 6 : pos === GOAL ? 1 : 3 }}
                        initial={false}
                        animate={isFresh && path.length > 1
                          ? { x: path.map((q) => `${q[0] * 100 + off * 100}%`), y: path.map((q) => `${q[1] * 100}%`), scale: path.map((_, j) => (j === path.length - 1 ? 1 : 1.22)) }
                          : { x: `${(x + off) * 100}%`, y: `${y * 100}%`, scale: 1 }}
                        transition={{ duration: isFresh && path.length > 1 ? Math.min(2.4, STEP_S * (path.length - 1)) : 0.35, ease: 'linear' }}>
                        <button type="button" disabled={!can} onClick={() => dispatch(me, { k: 'move', piece: k })} aria-label={`${pi + 1}-${k + 1}`} className="relative block h-full w-full touch-manipulation" style={{ transform: `rotate(${-rot}deg)` }}>
                          <span className="absolute inset-[12%] rounded-full" style={{ background: PIECE_BG[color], boxShadow: 'inset 0 -2px 3px rgba(0,0,0,.45), inset 0 1.5px 2px rgba(255,255,255,.6), 0 2px 3px rgba(0,0,0,.6)' }} />
                          {can && <span className="absolute inset-[4%] rounded-full ring-[2.5px] ring-[#FCE38A] shadow-[0_0_8px_rgba(252,227,138,.9)]" />}
                        </button>
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
        <div className="grid w-full justify-items-center gap-1.5">
          <SeatBadge info={info(myIdx, me$.name, true)} tone="me" mano={false} turn={myTurn} deadline={null} cards={0} />
          {/* Action Rail de altura fija: dado y botón de tirar */}
          <div className="flex min-h-[56px] w-full items-center justify-center gap-4" role="group" aria-label={t('g8.actions')}>
            <motion.div key={rolling ? 'r' : s.rollSeq} animate={rolling || s.rollSeq ? { rotate: [0, 200, 400, 360], y: [0, -14, 0, -5, 0], scale: [1, 1.12, 1] } : undefined} transition={{ duration: 0.55, ease: 'easeOut' }} style={{ willChange: 'transform' }}>
              <Die face={showFace} size="46px" />
            </motion.div>
            <button type="button" disabled={!myTurn || s.phase !== 'roll' || rolling} onClick={roll}
              className="flex h-12 min-w-[9rem] touch-manipulation items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] px-6 text-[15px] font-extrabold text-[#2a1d02] transition-opacity active:scale-95 disabled:opacity-35">
              <Dices size={18} strokeWidth={1.9} aria-hidden />{t('pc.roll')}
            </button>
          </div>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {s.phase === 'over' && (
            <ResultOverlay outcome={s.winner === myIdx ? 'win' : 'lose'} prize={s.winner === myIdx ? WIN_BONUS : 0} taunt="" title={s.winner === myIdx ? t('ser.champion') : t('ser.lost')}
              actions={[
                ...(hostLike ? [{ label: t('g8.newGame'), primary: true, onClick: () => { if (online) hostStart(); else start(count!); } }] : []),
                { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } },
              ]}>
              <p className="text-center text-sm text-stone-300">{s.winner !== null ? s.players[s.winner]!.name : ''}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}

