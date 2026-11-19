import { memo, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ResultOverlay } from '../shared/kit.tsx';
import { useDuel } from '../shared/duel.ts';
import { ChessPiece } from './Pieces.tsx';
import { applyChess, botMove, kindOf, legalMoves, newChess, sideOf, type CAction, type CState, type Kind, type Side } from './engine.ts';

const WIN_BONUS = 150;
const info = (i: number, name: string, human: boolean): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: !human, online: true });
const KIND_NAMES: Kind[] = ['p', 'n', 'b', 'r', 'q', 'k'];
const FILES = 'abcdefgh';

/** Casillas: marfil satinado y nogal oscuro. */
const Squares = memo(function Squares() {
  return (
    <svg viewBox="0 0 800 800" className="absolute inset-0 h-full w-full" shapeRendering="geometricPrecision" aria-hidden="true">
      <defs>
        <linearGradient id="ch-ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#F2EADB" /><stop offset="1" stopColor="#EAE2D3" /></linearGradient>
        <linearGradient id="ch-walnut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#32201a" /><stop offset="1" stopColor="#261912" /></linearGradient>
      </defs>
      {Array.from({ length: 64 }, (_, i) => <rect key={i} x={(i % 8) * 100} y={Math.floor(i / 8) * 100} width="100" height="100" fill={((Math.floor(i / 8) + i) % 2) ? 'url(#ch-walnut)' : 'url(#ch-ivory)'} />)}
    </svg>
  );
});

const Captured = memo(function Captured({ list, side }: { list: number[]; side: Side }) {
  const sorted = list.slice().sort((a, b) => b - a);
  return (
    <span className="flex min-h-[18px] min-w-0 flex-wrap items-center gap-[1px]">
      {sorted.map((k, i) => <span key={i} className="block size-[17px]"><ChessPiece kind={KIND_NAMES[k - 1]!} side={side} /></span>)}
    </span>
  );
});

export default function Ajedrez() {
  const nav = useNavigate();
  const t = useT();
  const [params] = useSearchParams();
  const level = ['easy', 'normal', 'expert'].includes(params.get('mode') ?? '') ? params.get('mode')! : 'normal';
  const d = useDuel<CState, CAction>('ajedrez', (p) => newChess(p), applyChess);
  const { s, setS, me, myIdx, hostLike, dispatch, online } = d;
  const [sel, setSel] = useState<number | null>(null);
  const [promo, setPromo] = useState<{ from: number; to: number } | null>(null);
  const [doneSeq, setDoneSeq] = useState(0);
  const paid = useRef(false);

  // IA (la búsqueda va tras una pausa natural de 750–900 ms).
  useEffect(() => {
    if (!s || s.winner !== null || !hostLike) return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const id = gameTimeout(() => setS((cur) => {
      if (!cur || cur.winner !== null || cur.players[cur.turn]!.id !== p.id) return cur;
      const m = botMove(cur, level);
      return m ? applyChess(cur, p.id, m) ?? cur : cur;
    }), botDelay());
    return () => window.clearTimeout(id);
  }, [s, hostLike, setS, level]);

  const seq = s?.seq ?? 0;
  const last = s?.last ?? null;
  const capCount = s ? s.captured[0].length + s.captured[1].length : 0;
  const prevCap = useRef(0);
  useEffect(() => {
    if (!seq || !last) return;
    const captured = capCount > prevCap.current;
    prevCap.current = capCount;
    const id = gameTimeout(() => feedback(s?.inCheck ? 'impact' : captured ? 'capture' : 'wood'), 220);
    const id2 = gameTimeout(() => setDoneSeq(seq), 420);
    setSel(null); setPromo(null);
    return () => { window.clearTimeout(id); window.clearTimeout(id2); };
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  const winner = s?.winner ?? null;
  useEffect(() => {
    if (winner === null || paid.current) return;
    paid.current = true;
    if (winner === 'draw') return;
    juice.chips(winner === myIdx ? 'me' : 'top');
    if (winner === myIdx) { wallet.add(WIN_BONUS); wallet.recordWin('ajedrez'); juice.cinematic({ title: '¡JAQUE MATE!', sub: `+${WIN_BONUS}`, tone: 'gold', good: true }); }
    else juice.cinematic({ title: '¡JAQUE MATE!', tone: 'ruby', good: false });
  }, [winner, myIdx]);

  if (!s) {
    return (
      <GameFrame gameId="ajedrez" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.ajedrez.name')}</p>}
        felt={<div className="grid h-full place-items-center"><span className="size-6 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" aria-hidden /></div>} bottom={null} />
    );
  }
  const oppIdx = (1 - myIdx) as Side;
  const myTurn = s.winner === null && s.turn === myIdx;
  const flip = myIdx === 1;
  const view = (i: number): { r: number; c: number } => { const r = Math.floor(i / 8); const c = i % 8; return flip ? { r: 7 - r, c: 7 - c } : { r, c }; };
  const legal = sel !== null && myTurn ? legalMoves(s, sel) : [];
  const targets = new Set(legal.map((m) => m.to));
  const kingIdx = s.inCheck ? s.board.indexOf(s.turn === 0 ? 6 : -6) : -1;

  const tap = (i: number): void => {
    if (!myTurn) return;
    if (sel !== null && targets.has(i)) {
      const needs = legal.some((m) => m.to === i && m.promo);
      if (needs) { setPromo({ from: sel, to: i }); return; }
      setSel(null); dispatch(me, { k: 'move', from: sel, to: i }); return;
    }
    const v = s.board[i]!;
    if (v && sideOf(v) === myIdx) { setSel(i === sel ? null : i); setPromo(null); feedback('tap'); } else { setSel(null); setPromo(null); }
  };

  return (
    <GameFrame
      gameId="ajedrez" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.seq}`, onTimeout: () => { if (!myTurn) return; const m = botMove(s, 'easy'); if (m) dispatch(me, m); } }}
      header={<div className="flex items-center justify-center"><span className="text-[11px] font-extrabold uppercase tracking-[.14em] text-amber-300">{t('g.ajedrez.name')} · {t(`mode.${level}`)}</span></div>}
      strip={(
        <div className="flex items-center justify-between gap-3 px-1" aria-label={t('g8.captured')}>
          <Captured list={s.captured[myIdx]} side={oppIdx} />
          <Captured list={s.captured[oppIdx]} side={myIdx} />
        </div>
      )}
      felt={(
        <div className="flex h-full min-h-0 flex-col items-center gap-2 p-[clamp(8px,2.4vw,18px)]">
          <div className="lg:absolute lg:left-5 lg:top-4 lg:z-10"><SeatBadge info={info(oppIdx, s.players[oppIdx]!.name, s.players[oppIdx]!.human)} tone="them" mano={false} turn={s.winner === null && s.turn === oppIdx} deadline={null} cards={0} /></div>
          <div className="min-h-0 w-full flex-1 [container-type:size]">
            <div className="grid h-full place-items-center">
              <div className="relative rounded-[14px]" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', padding: '4.6%', background: 'linear-gradient(145deg,#4a2e1a,#2b1a0d)', boxShadow: 'inset 0 0 0 2px #B8860B, inset 0 0 0 3.5px rgba(252,227,138,.45), inset 0 5px 8px rgba(0,0,0,.5), 0 10px 22px rgba(0,0,0,.55)' }}>
                {/* coordenadas discretas en el marco */}
                {Array.from({ length: 8 }, (_, k) => {
                  const file = flip ? 7 - k : k; const rank = flip ? k + 1 : 8 - k;
                  return (
                    <span key={k}>
                      <span aria-hidden className="pointer-events-none absolute text-[8px] font-bold text-amber-200/45" style={{ left: `${4.6 + (k + 0.5) * 10.35 - 0.8}%`, bottom: '0.8%' }}>{FILES[file]}</span>
                      <span aria-hidden className="pointer-events-none absolute text-[8px] font-bold text-amber-200/45" style={{ top: `${4.6 + (k + 0.5) * 10.35 - 1.8}%`, left: '1.4%' }}>{rank}</span>
                    </span>
                  );
                })}
                <div className="relative aspect-square overflow-hidden rounded-[4px]">
                  <Squares />
                  {last && [last.from, last.to].map((q) => { const v = view(q); return <span key={q} className="pointer-events-none absolute bg-[#FCE38A]/25" style={{ left: `${v.c * 12.5}%`, top: `${v.r * 12.5}%`, width: '12.5%', height: '12.5%' }} />; })}
                  {kingIdx >= 0 && (() => { const v = view(kingIdx); return <motion.span className="pointer-events-none absolute" animate={{ opacity: [0.55, 1, 0.55] }} transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} style={{ left: `${v.c * 12.5}%`, top: `${v.r * 12.5}%`, width: '12.5%', height: '12.5%', background: 'radial-gradient(circle, rgba(220,38,38,.8) 0%, rgba(220,38,38,.3) 55%, transparent 72%)' }} />; })()}
                  {sel !== null && (() => { const v = view(sel); return <span className="pointer-events-none absolute ring-[3px] ring-inset ring-[#FCE38A]" style={{ left: `${v.c * 12.5}%`, top: `${v.r * 12.5}%`, width: '12.5%', height: '12.5%' }} />; })()}
                  {s.board.map((p, i) => {
                    if (!p) return null;
                    const v = view(i);
                    const fresh = last !== null && last.to === i && doneSeq !== s.seq;
                    const from = fresh ? view(last.from) : v;
                    return (
                      <motion.div key={`${i}-${p}`} className="pointer-events-none absolute left-0 top-0" style={{ width: '12.5%', height: '12.5%', willChange: 'transform', zIndex: fresh ? 3 : 1 }}
                        initial={{ x: `${from.c * 100}%`, y: `${from.r * 100}%` }} animate={{ x: `${v.c * 100}%`, y: `${v.r * 100}%`, scale: fresh ? [1, 1.12, 1] : sel === i ? 1.12 : 1 }}
                        transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, y: { type: 'spring', stiffness: 300, damping: 30 }, scale: { duration: fresh ? 0.28 : 0.14 } }}>
                        <span className="absolute inset-[4%] block"><ChessPiece kind={kindOf(p)} side={sideOf(p)} /></span>
                      </motion.div>
                    );
                  })}
                  {/* destinos válidos */}
                  {[...targets].map((q) => { const v = view(q); const cap = Boolean(s.board[q]) || (s.ep === q && kindOf(s.board[sel!]!) === 'p'); return <span key={q} className="pointer-events-none absolute grid place-items-center" style={{ left: `${v.c * 12.5}%`, top: `${v.r * 12.5}%`, width: '12.5%', height: '12.5%', zIndex: 4 }}>{cap ? <span className="size-[86%] rounded-full ring-[3px] ring-[#FCE38A]/85" /> : <span className="size-[30%] rounded-full bg-[#FCE38A]/85 shadow-[0_0_8px_rgba(252,227,138,.8)]" />}</span>; })}
                  <div className="absolute inset-0 z-[5] grid grid-cols-8 grid-rows-8" role="grid" aria-label="Ajedrez">
                    {Array.from({ length: 64 }, (_, k) => {
                      const r = Math.floor(k / 8); const c = k % 8;
                      const idx = flip ? (7 - r) * 8 + (7 - c) : k;
                      return <button key={k} type="button" role="gridcell" aria-label={`${FILES[flip ? 7 - c : c]}${flip ? r + 1 : 8 - r}`} onClick={() => tap(idx)} className="touch-manipulation" />;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      bottom={(
        <div className="grid w-full justify-items-center gap-1.5">
          <SeatBadge info={info(myIdx, s.players[myIdx]!.name, true)} tone="me" mano={false} turn={myTurn} deadline={null} cards={0} />
          {/* Action Rail de altura fija: selector de coronación */}
          <div className="flex min-h-[52px] w-full items-center justify-center gap-2" role="group" aria-label={t('g8.promote')}>
            {promo && (['q', 'r', 'b', 'n'] as Kind[]).map((k) => (
              <button key={k} type="button" onClick={() => { const pr = promo; setPromo(null); setSel(null); dispatch(me, { k: 'move', from: pr.from, to: pr.to, promo: k }); }}
                className="grid size-12 touch-manipulation place-items-center rounded-2xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-1.5 active:scale-90" aria-label={k}><ChessPiece kind={k} side={myIdx} /></button>
            ))}
          </div>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {s.winner !== null && (
            <ResultOverlay outcome={s.winner === 'draw' ? undefined : s.winner === myIdx ? 'win' : 'lose'} prize={s.winner === myIdx ? WIN_BONUS : 0} taunt="" title={s.winner === 'draw' ? t('g8.draw') : s.winner === myIdx ? t('ser.champion') : t('ser.lost')}
              actions={[
                ...(hostLike ? [{ label: t('g8.newGame'), primary: true, onClick: () => { paid.current = false; prevCap.current = 0; setSel(null); d.restart(); } }] : []),
                { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } },
              ]} />
          )}
        </AnimatePresence>
      )}
    />
  );
}
