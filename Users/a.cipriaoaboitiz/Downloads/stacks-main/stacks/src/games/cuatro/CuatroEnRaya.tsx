import { memo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { botName, useT } from '../../i18n/index.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { gameTimeout } from '../../services/timers.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { ResultOverlay } from '../shared/kit.tsx';
import { SeriesGems } from '../shared/series.tsx';
import { useDuel } from '../shared/duel.ts';
import { useDuelSeries } from '../shared/duelSeries.ts';
import { COLS, ROWS, applyC4, botColumn, dropRow, newC4, nextC4, type CAction, type CState, type Disc } from './engine.ts';

const WIN_BONUS = 80;
const info = (i: number, name: string, human: boolean): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: !human, online: true });

/** Ficha de oro metálico (p0) o rubí (p1) con biselado. */
const DISC: Record<Disc, { bg: string; ring: string }> = {
  0: { bg: 'radial-gradient(circle at 34% 28%, #FFF6C4 0%, #F1CD5B 28%, #D4AF37 55%, #8a6410 100%)', ring: 'inset 0 -3px 5px rgba(90,58,4,.55), inset 0 2px 3px rgba(255,255,255,.55)' },
  1: { bg: 'radial-gradient(circle at 34% 28%, #FFB0BB 0%, #E23A52 30%, #B0122A 58%, #4d0711 100%)', ring: 'inset 0 -3px 5px rgba(50,0,8,.6), inset 0 2px 3px rgba(255,190,200,.5)' },
};

/** Cara frontal del tablero: obsidiana con 42 ranuras circulares biseladas (las fichas caen por detrás y se ven por los huecos). */
const Face = memo(function Face() {
  const holes: string[] = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) { const cx = c * 100 + 50; const cy = r * 100 + 50; holes.push(`M${cx + 41} ${cy}a41 41 0 1 0 -82 0a41 41 0 1 0 82 0Z`); }
  return (
    <svg viewBox={`0 0 ${COLS * 100} ${ROWS * 100}`} className="absolute inset-0 h-full w-full" shapeRendering="geometricPrecision" aria-hidden="true">
      <defs>
        <linearGradient id="c4-obs" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b2420" /><stop offset=".5" stopColor="#0c1210" /><stop offset="1" stopColor="#060a08" /></linearGradient>
        <linearGradient id="c4-bevel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#000" stopOpacity=".7" /><stop offset="1" stopColor="#6c7a72" stopOpacity=".55" /></linearGradient>
      </defs>
      <path fillRule="evenodd" d={`M0 0H${COLS * 100}V${ROWS * 100}H0Z ${holes.join(' ')}`} fill="url(#c4-obs)" />
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const cx = (i % COLS) * 100 + 50; const cy = Math.floor(i / COLS) * 100 + 50;
        return <g key={i}><circle cx={cx} cy={cy} r="41" fill="none" stroke="url(#c4-bevel)" strokeWidth="4" /><circle cx={cx} cy={cy} r="45.5" fill="none" stroke="#D4AF37" strokeOpacity=".22" strokeWidth="1.2" /></g>;
      })}
    </svg>
  );
});

function Board({ s, canPlay, onCol, mine }: { s: CState; canPlay: boolean; onCol: (c: number) => void; mine: Disc }) {
  // ficha fantasma (solo con ratón): marca arriba y en la casilla donde caerá
  const [hover, setHover] = useState<number | null>(null);
  const landing = hover !== null && canPlay ? dropRow(s.board, hover) : -1;
  return (
    <div className="rounded-[18px] p-[2.4%]" style={{ background: 'linear-gradient(145deg,#4a2e1a,#2b1a0d 60%,#1c1008)', boxShadow: 'inset 0 1.5px 0 rgba(252,227,138,.35), inset 0 -3px 6px rgba(0,0,0,.6), 0 10px 20px rgba(0,0,0,.5)', width: 'min(100cqw, calc(100cqh * 7 / 6), calc(740px / var(--z, 1)))' }}>
      <div className="relative" style={{ aspectRatio: `${COLS} / ${ROWS}` }}>
        {/* fondo del tablero (se ve por los huecos) y fichas que caen por detrás */}
        <div className="absolute inset-0 overflow-hidden rounded-[10px] bg-[#04110b]">
          {s.board.map((m, i) => {
            if (m === null) return null;
            const r = Math.floor(i / COLS); const c = i % COLS;
            const fresh = s.last === i;
            return (
              <motion.div key={`${i}-${m}`} className="absolute" style={{ left: `${(c / COLS) * 100}%`, top: `${(r / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%`, willChange: 'transform' }}
                initial={fresh ? { y: `${-(r + 1) * 100}%` } : false} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12, mass: 0.9 }}>
                <div className="absolute inset-[7%] rounded-full" style={{ background: DISC[m].bg, boxShadow: DISC[m].ring }} />
              </motion.div>
            );
          })}
        </div>
        {landing >= 0 && hover !== null && (
          <span aria-hidden className="pointer-events-none absolute" style={{ left: `${(hover / COLS) * 100}%`, top: `${(landing / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%`, zIndex: 0 }}>
            <span className="absolute inset-[7%] rounded-full" style={{ background: DISC[mine].bg, opacity: 0.32 }} />
          </span>
        )}
        <Face />
        {landing >= 0 && hover !== null && (
          <span aria-hidden className="pointer-events-none absolute" style={{ left: `${(hover / COLS) * 100}%`, top: `${-(100 / ROWS) * 0.95}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }}>
            <span className="absolute inset-[10%] rounded-full" style={{ background: DISC[mine].bg, boxShadow: DISC[mine].ring, opacity: 0.85 }} />
          </span>
        )}
        {/* halo dorado sobre las 4 fichas conectadas */}
        {s.line && (
          <svg viewBox={`0 0 ${COLS * 100} ${ROWS * 100}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
            {s.line.map((i, k) => (
              <motion.circle key={i} cx={(i % COLS) * 100 + 50} cy={Math.floor(i / COLS) * 100 + 50} r="43" fill="none" stroke="#FCE38A" strokeWidth="7" strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 1, 0.85, 1] }} transition={{ duration: 0.45, delay: 0.35 + k * 0.08 }} />
            ))}
          </svg>
        )}
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }} role="group" aria-label="4 en Raya">
          {Array.from({ length: COLS }, (_, c) => (
            <button key={c} type="button" aria-label={String(c + 1)} disabled={!canPlay || dropRow(s.board, c) < 0} onClick={() => onCol(c)} onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(c); }} onPointerLeave={() => setHover(null)} className="touch-manipulation" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CuatroEnRaya() {
  const nav = useNavigate();
  const t = useT();
  const d = useDuel<CState, CAction>('cuatro', (p) => newC4(p), applyC4);
  const { s, setS, me, myIdx, hostLike, dispatch, online } = d;
  const winner = s?.winner ?? null;
  const { series, champion, newSeries } = useDuelSeries({
    gameId: 'cuatro', round: s?.round ?? 1, winner, myIdx, hostLike, bonus: WIN_BONUS, cine: '¡VICTORIA!', delay: 2300,
    next: () => setS((cur) => (cur && cur.winner !== null ? nextC4(cur) : cur)),
  });

  // IA con una pausa natural (750–900 ms).
  useEffect(() => {
    if (!s || s.winner !== null || !hostLike) return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const id = gameTimeout(() => setS((cur) => {
      if (!cur || cur.winner !== null || cur.players[cur.turn]!.id !== p.id) return cur;
      return applyC4(cur, p.id, { k: 'drop', c: botColumn(cur) }) ?? cur;
    }), botDelay());
    return () => window.clearTimeout(id);
  }, [s, hostLike, setS]);

  // La ficha encaja contra el fondo cuando acaba de caer.
  const seq = s?.seq ?? 0;
  useEffect(() => {
    if (!seq) return;
    const id = gameTimeout(() => feedback('clack'), 330);
    return () => window.clearTimeout(id);
  }, [seq]);
  useEffect(() => { if (winner !== null && winner !== 'draw') feedback(winner === myIdx ? 'chip' : 'thud'); }, [winner, myIdx]);

  if (!s) {
    return (
      <GameFrame gameId="cuatro" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.cuatro.name')}</p>}
        felt={<div className="grid h-full place-items-center"><span className="size-6 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" aria-hidden /></div>} bottom={null} />
    );
  }
  const oppIdx = (1 - myIdx) as Disc;
  const myTurn = winner === null && s.turn === myIdx;
  const opp = s.players[oppIdx]!;
  const mine = s.players[myIdx]!;
  const drop = (c: number) => { if (myTurn) dispatch(me, { k: 'drop', c }); };
  const labels: [string, string] = [t('ser.you'), opp.human ? opp.name : botName(1)];

  return (
    <GameFrame
      gameId="cuatro" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.round}:${s.seq}`, onTimeout: () => { if (myTurn) dispatch(me, { k: 'drop', c: botColumn(s) }); } }}
      header={(
        <div className="grid grid-cols-2 gap-[min(1.8vw,8px)]" role="group">
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-teal-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-teal-300">{t('ser.round', { n: s.round })}</p>
            <b className="block text-[13px] tabular-nums">{series.wins.me ?? 0} – {series.wins.them ?? 0}</b>
          </div>
          <div className="flex min-w-0 items-center justify-between rounded-[13px] border border-white/10 bg-gradient-to-br from-orange-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">{t('ser.you')}</p>
            <span className="size-5 rounded-full" style={{ background: DISC[myIdx].bg, boxShadow: DISC[myIdx].ring }} aria-hidden />
          </div>
        </div>
      )}
      strip={<SeriesGems entries={[{ key: 'me', label: labels[0], wins: series.wins.me ?? 0 }, { key: 'them', label: labels[1], wins: series.wins.them ?? 0 }]} />}
      felt={(
        <div className="flex h-full min-h-0 flex-col items-center gap-2 p-[clamp(8px,2.4vw,18px)]">
          <div className="lg:absolute lg:left-5 lg:top-4 lg:z-10"><SeatBadge info={info(oppIdx, opp.name, opp.human)} tone="them" mano={false} turn={winner === null && s.turn === oppIdx} deadline={null} cards={0} /></div>
          <div className="min-h-0 w-full flex-1 [container-type:size]"><div className="grid h-full place-items-center"><Board s={s} canPlay={myTurn} onCol={drop} mine={myIdx} /></div></div>
        </div>
      )}
      bottom={(
        <div className="flex min-h-[64px] w-full items-center justify-center">
          <SeatBadge info={info(myIdx, mine.name, true)} tone="me" mano={false} turn={myTurn} deadline={null} cards={0} />
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {champion !== null && (
            <ResultOverlay
              outcome={champion === 'me' ? 'win' : 'lose'} prize={champion === 'me' ? WIN_BONUS : 0} taunt=""
              title={champion === 'me' ? t('ser.champion') : t('ser.lost')}
              actions={[
                ...(hostLike ? [{ label: t('ser.newSeries'), primary: true, onClick: () => newSeries(d.restart) }] : []),
                { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } },
              ]}
            >
              <p className="text-center text-sm tabular-nums text-stone-300">{series.wins.me ?? 0} – {series.wins.them ?? 0}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
