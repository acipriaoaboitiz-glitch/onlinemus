import { useEffect } from 'react';
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
import { applyTTT, botCell, newTTT, nextTTT, type Mark, type TAction, type TState } from './engine.ts';

const WIN_BONUS = 80;
const info = (i: number, name: string, human: boolean): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: !human, online: true });
const center = (i: number): [number, number] => [50 + (i % 3) * 100, 50 + Math.floor(i / 3) * 100];

/** X de oro cepillado con relieve: dos trazos que se dibujan (pathLength 0 → 1) con sombra y filo de luz. */
function MarkX({ i }: { i: number }) {
  const [cx, cy] = center(i);
  const a = { x1: cx - 26, y1: cy - 26, x2: cx + 26, y2: cy + 26 };
  const b = { x1: cx + 26, y1: cy - 26, x2: cx - 26, y2: cy + 26 };
  const draw = (g: typeof a, delay: number) => (
    <>
      <motion.line {...g} stroke="#000" strokeOpacity=".4" strokeWidth="14" strokeLinecap="round" transform="translate(2.5 3.5)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22, delay, ease: 'easeOut' }} />
      <motion.line {...g} stroke="url(#tr-gold)" strokeWidth="13" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22, delay, ease: 'easeOut' }} />
      <motion.line {...g} stroke="#fff" strokeOpacity=".5" strokeWidth="2.6" strokeLinecap="round" transform="translate(-2 -2.2)" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.22, delay, ease: 'easeOut' }} />
    </>
  );
  return <g>{draw(a, 0)}{draw(b, 0.16)}</g>;
}

/** O de marfil satinado: aro que se dibuja desde arriba. */
function MarkO({ i }: { i: number }) {
  const [cx, cy] = center(i);
  const ring = (props: React.SVGProps<SVGCircleElement>) => (
    <motion.circle cx={cx} cy={cy} r="27" fill="none" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.34, ease: 'easeOut' }} {...(props as object)} />
  );
  return (
    <g transform={`rotate(-90 ${cx} ${cy})`}>
      <g transform="translate(3.5 -2.5)">{ring({ stroke: '#000', strokeOpacity: 0.4, strokeWidth: 13 })}</g>
      {ring({ stroke: 'url(#tr-ivory)', strokeWidth: 12 })}
      <g transform="translate(-1.6 1.8)">{ring({ stroke: '#fff', strokeOpacity: 0.65, strokeWidth: 2.4, r: 30 })}</g>
    </g>
  );
}

function Board({ s, canPlay, onCell }: { s: TState; canPlay: boolean; onCell: (i: number) => void }) {
  const win = s.line;
  const [x1, y1] = win ? center(win[0]!) : [0, 0];
  const [x2, y2] = win ? center(win[2]!) : [0, 0];
  const dx = x2 - x1; const dy = y2 - y1; const len = Math.hypot(dx, dy) || 1;
  const ext = 34;
  return (
    <div className="relative aspect-square" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))' }}>
      <svg viewBox="0 0 300 300" className="absolute inset-0 h-full w-full" shapeRendering="geometricPrecision" aria-hidden="true">
        <defs>
          <linearGradient id="tr-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a2e1a" /><stop offset=".5" stopColor="#32200f" /><stop offset="1" stopColor="#21140a" /></linearGradient>
          <linearGradient id="tr-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF0B0" /><stop offset=".45" stopColor="#D4AF37" /><stop offset="1" stopColor="#8a6410" /></linearGradient>
          <linearGradient id="tr-ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFEF4" /><stop offset=".6" stopColor="#EFE3BF" /><stop offset="1" stopColor="#C9B98A" /></linearGradient>
          <linearGradient id="tr-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FCE38A" /><stop offset="1" stopColor="#B8860B" /></linearGradient>
        </defs>
        {/* tablero de nogal oscuro con borde de latón */}
        <rect x="3" y="3" width="294" height="294" rx="22" fill="url(#tr-wood)" />
        {[16, 40, 70, 112, 160, 214, 262].map((y, k) => <path key={y} d={`M10 ${y} Q150 ${y + (k % 2 ? 5 : -5)} 290 ${y}`} stroke="#000" strokeOpacity=".16" strokeWidth="1.2" fill="none" />)}
        <rect x="3" y="3" width="294" height="294" rx="22" fill="none" stroke="url(#tr-brass)" strokeWidth="1.4" />
        <rect x="9" y="9" width="282" height="282" rx="17" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="2" />
        <rect x="11" y="11" width="278" height="278" rx="15" fill="none" stroke="url(#tr-brass)" strokeWidth="1" opacity=".75" />
        {/* incrustaciones de latón (1px) */}
        {[100, 200].map((p) => (
          <g key={p}>
            <line x1={p} y1="26" x2={p} y2="274" stroke="url(#tr-brass)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="26" y1={p} x2="274" y2={p} stroke="url(#tr-brass)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1={p + 1.4} y1="26" x2={p + 1.4} y2="274" stroke="#000" strokeOpacity=".35" strokeWidth=".8" />
            <line x1="26" y1={p + 1.4} x2="274" y2={p + 1.4} stroke="#000" strokeOpacity=".35" strokeWidth=".8" />
          </g>
        ))}
        {s.board.map((m, i) => (m === null ? null : <g key={i}>{m === 0 ? <MarkX i={i} /> : <MarkO i={i} />}</g>))}
        {win && (
          <g>
            <motion.line x1={x1 - (dx / len) * ext} y1={y1 - (dy / len) * ext} x2={x2 + (dx / len) * ext} y2={y2 + (dy / len) * ext} stroke="#FCE38A" strokeOpacity=".28" strokeWidth="22" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
            <motion.line x1={x1 - (dx / len) * ext} y1={y1 - (dy / len) * ext} x2={x2 + (dx / len) * ext} y2={y2 + (dy / len) * ext} stroke="#FFF6C6" strokeWidth="6" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4, ease: 'easeOut' }} />
          </g>
        )}
      </svg>
      <div className="absolute inset-[3%] grid grid-cols-3 grid-rows-3" role="grid" aria-label="3 en Raya">
        {s.board.map((m, i) => (
          <button key={i} type="button" role="gridcell" aria-label={`${Math.floor(i / 3) + 1}-${(i % 3) + 1}`} disabled={!canPlay || m !== null} onClick={() => onCell(i)} className="touch-manipulation rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Mini marca para el HUD: la X de oro o la O de marfil que juegas tú. */
function MarkChip({ mark }: { mark: Mark }) {
  return (
    <svg viewBox="0 0 40 40" className="size-7" shapeRendering="geometricPrecision" aria-hidden="true">
      <defs>
        <linearGradient id="trc-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF0B0" /><stop offset="1" stopColor="#B8860B" /></linearGradient>
        <linearGradient id="trc-ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#C9B98A" /></linearGradient>
      </defs>
      {mark === 0
        ? <g stroke="url(#trc-gold)" strokeWidth="5" strokeLinecap="round"><line x1="10" y1="10" x2="30" y2="30" /><line x1="30" y1="10" x2="10" y2="30" /></g>
        : <circle cx="20" cy="20" r="11" fill="none" stroke="url(#trc-ivory)" strokeWidth="5" />}
    </svg>
  );
}

export default function TresEnRaya() {
  const nav = useNavigate();
  const t = useT();
  const d = useDuel<TState, TAction>('tres', (p) => newTTT(p), applyTTT);
  const { s, setS, me, myIdx, hostLike, dispatch, online } = d;
  const winner = s?.winner ?? null;
  const { series, champion, newSeries } = useDuelSeries({
    gameId: 'tres', round: s?.round ?? 1, winner, myIdx, hostLike, bonus: WIN_BONUS, cine: '¡VICTORIA!',
    next: () => setS((cur) => (cur && cur.winner !== null ? nextTTT(cur) : cur)),
  });

  // IA con una pausa natural (750–900 ms).
  useEffect(() => {
    if (!s || s.winner !== null || !hostLike) return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const id = gameTimeout(() => setS((cur) => {
      if (!cur || cur.winner !== null || cur.players[cur.turn]!.id !== p.id) return cur;
      return applyTTT(cur, p.id, { k: 'place', i: botCell(cur) }) ?? cur;
    }), botDelay());
    return () => window.clearTimeout(id);
  }, [s, hostLike, setS]);

  // Sonido de cada ficha y del cierre de ronda.
  const seq = s?.seq ?? 0;
  useEffect(() => { if (seq > 0) feedback('clack'); }, [seq]);
  useEffect(() => { if (winner !== null && winner !== 'draw') feedback(winner === myIdx ? 'chip' : 'thud'); }, [winner, myIdx]);

  if (!s) {
    return (
      <GameFrame gameId="tres" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.tres.name')}</p>}
        felt={<div className="grid h-full place-items-center"><span className="size-6 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" aria-hidden /></div>} bottom={null} />
    );
  }
  const oppIdx = (1 - myIdx) as Mark;
  const myTurn = winner === null && s.turn === myIdx;
  const opp = s.players[oppIdx]!;
  const mine = s.players[myIdx]!;
  const place = (i: number) => { if (myTurn) dispatch(me, { k: 'place', i }); };
  const labels: [string, string] = [t('ser.you'), opp.human ? opp.name : botName(1)];

  return (
    <GameFrame
      gameId="tres" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.round}:${s.seq}`, onTimeout: () => { if (!myTurn) return; dispatch(me, { k: 'place', i: botCell(s) }); } }}
      header={(
        <div className="grid grid-cols-2 gap-[min(1.8vw,8px)]" role="group">
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-teal-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-teal-300">{t('ser.round', { n: s.round })}</p>
            <b className="block text-[13px] tabular-nums">{series.wins.me ?? 0} – {series.wins.them ?? 0}</b>
          </div>
          <div className="flex min-w-0 items-center justify-between rounded-[13px] border border-white/10 bg-gradient-to-br from-orange-400/10 to-black/30 px-3 py-1">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">{t('ser.you')}</p>
            <MarkChip mark={myIdx} />
          </div>
        </div>
      )}
      strip={<SeriesGems entries={[{ key: 'me', label: labels[0], wins: series.wins.me ?? 0 }, { key: 'them', label: labels[1], wins: series.wins.them ?? 0 }]} />}
      felt={(
        <div className="flex h-full min-h-0 flex-col items-center gap-2 p-[clamp(8px,2.4vw,18px)]">
          <div className="lg:absolute lg:left-5 lg:top-4 lg:z-10"><SeatBadge info={info(oppIdx, opp.name, opp.human)} tone="them" mano={false} turn={winner === null && s.turn === oppIdx} deadline={null} cards={0} /></div>
          <div className="min-h-0 w-full flex-1 [container-type:size]"><div className="mx-auto" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', height: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))' }}><Board s={s} canPlay={myTurn} onCell={place} /></div></div>
        </div>
      )}
      bottom={(
        <div className="flex w-full min-h-[64px] items-center justify-center">
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
