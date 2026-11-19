import { memo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Shuffle } from 'lucide-react';
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
import { MetalDefs, ShipArt } from '../shared/art.tsx';
import { N, SHIPS, applyFlota, botFire, isSunk, newFlota, shipsLeft, type FAction, type FState, type Ship, type Shot, type Side } from './engine.ts';

const WIN_BONUS = 100;
const info = (i: number, name: string, human: boolean): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: !human, online: true });
const VB = N * 100;
const cx = (c: number): number => (c % N) * 100 + 50;
const cy = (c: number): number => Math.floor(c / N) * 100 + 50;

interface RadarProps {
  fleet: Ship[];
  shots: Record<number, Shot>;
  /** Mostrar todos los barcos (tu flota) o solo los hundidos (la del rival). */
  reveal: boolean;
  onCell?: (c: number) => void;
  /** Última casilla disparada sobre este tablero, para la onda de radar. */
  pulse: { cell: number; res: 'water' | 'hit' | 'sunk'; key: number } | null;
  dim?: boolean;
  /** Barrido de radar (solo en el tablero rival durante el combate). */
  sweep?: boolean;
}

/** Radar naval esmeralda y oro: anillos concéntricos, retícula fina y casillas con agua, impactos y barcos hundidos. */
const Radar = memo(function Radar({ fleet, shots, reveal, onCell, pulse, dim, sweep }: RadarProps) {
  return (
    <div className="relative aspect-square h-full w-full" style={{ opacity: dim ? 0.55 : 1, transition: 'opacity .2s' }}>
      <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 h-full w-full" shapeRendering="geometricPrecision" aria-hidden="true">
        <MetalDefs />
        <defs>
          <radialGradient id="fl-bg" cx=".5" cy=".5" r=".75"><stop offset="0" stopColor="#0d4a36" /><stop offset=".6" stopColor="#07261c" /><stop offset="1" stopColor="#03120d" /></radialGradient>
          <linearGradient id="fl-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FCE38A" /><stop offset="1" stopColor="#B8860B" /></linearGradient>
          <linearGradient id="fl-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E9D9A6" /><stop offset=".55" stopColor="#B79A55" /><stop offset="1" stopColor="#6a5224" /></linearGradient>
        </defs>
        <rect x="2" y="2" width={VB - 4} height={VB - 4} rx="26" fill="url(#fl-bg)" stroke="url(#fl-gold)" strokeWidth="3" />
        {[330, 240, 150, 60].map((r) => <circle key={r} cx={VB / 2} cy={VB / 2} r={r} fill="none" stroke="#D4AF37" strokeOpacity=".16" strokeWidth="1.5" />)}
        <path d={`M${VB / 2} 12V${VB - 12}M12 ${VB / 2}H${VB - 12}`} stroke="#D4AF37" strokeOpacity=".16" strokeWidth="1.5" />
        {Array.from({ length: N - 1 }, (_, i) => (
          <g key={i}><line x1={(i + 1) * 100} y1="14" x2={(i + 1) * 100} y2={VB - 14} stroke="#3fe0a8" strokeOpacity=".2" strokeWidth="1.2" /><line x1="14" y1={(i + 1) * 100} x2={VB - 14} y2={(i + 1) * 100} stroke="#3fe0a8" strokeOpacity=".2" strokeWidth="1.2" /></g>
        ))}
        {/* barcos propios, o ajenos ya hundidos */}
        {fleet.map((sh, k) => {
          const sunk = isSunk(sh, shots);
          if (!reveal && !sunk) return null;
          const first = sh.cells[0]!;
          const horiz = sh.cells.length > 1 ? sh.cells[1]! - first === 1 : true;
          return <ShipArt key={k} len={sh.cells.length} x={cx(first) - 50} y={cy(first) - 50} vertical={!horiz} sunk={sunk} />;
        })}
        {/* resultados de los disparos */}
        {Object.entries(shots).map(([k, res]) => {
          const c = Number(k);
          return res === 'hit'
            ? (
              <g key={k}>
                <circle cx={cx(c)} cy={cy(c)} r="30" fill="#ef4444" opacity=".25" /><circle cx={cx(c)} cy={cy(c)} r="25" fill="#991b1b" /><circle cx={cx(c)} cy={cy(c)} r="25" fill="none" stroke="#FCE38A" strokeWidth="5" /><circle cx={cx(c) - 7} cy={cy(c) - 8} r="6" fill="#fff" opacity=".35" />
                <path d={`M${cx(c) - 12} ${cy(c) - 12}L${cx(c) + 12} ${cy(c) + 12}M${cx(c) + 12} ${cy(c) - 12}L${cx(c) - 12} ${cy(c) + 12}`} stroke="#FFF0B0" strokeWidth="6" strokeLinecap="round" />
              </g>
            )
            : <g key={k}><circle cx={cx(c)} cy={cy(c)} r="22" fill="none" stroke="#38bdf8" strokeOpacity=".7" strokeWidth="5" /><circle cx={cx(c)} cy={cy(c)} r="8" fill="#38bdf8" opacity=".6" /></g>;
        })}
        {/* pulso de radar: onda azul/esmeralda en el agua, destello oro/carmesí en un impacto */}
        {pulse && (
          <g key={pulse.key}>
            <motion.circle cx={cx(pulse.cell)} cy={cy(pulse.cell)} r="40" fill="none" stroke={pulse.res === 'water' ? '#34d399' : '#FCE38A'} strokeWidth="6" initial={{ scale: 0.3, opacity: 0.95 }} animate={{ scale: 2.6, opacity: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} style={{ transformOrigin: `${cx(pulse.cell)}px ${cy(pulse.cell)}px` }} />
            <motion.circle cx={cx(pulse.cell)} cy={cy(pulse.cell)} r="40" fill={pulse.res === 'water' ? '#38bdf8' : '#ef4444'} initial={{ scale: 0.2, opacity: 0.7 }} animate={{ scale: 1.5, opacity: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} style={{ transformOrigin: `${cx(pulse.cell)}px ${cy(pulse.cell)}px` }} />
          </g>
        )}
      </svg>
      {sweep && (
        <motion.div aria-hidden className="pointer-events-none absolute inset-[3%] rounded-full" style={{ background: 'conic-gradient(from 0deg, rgba(63,224,168,0) 0deg, rgba(63,224,168,.20) 38deg, rgba(63,224,168,0) 40deg)', willChange: 'transform' }} animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: 'linear' }} />
      )}
      {onCell && (
        <div className="absolute inset-[1%] grid" style={{ gridTemplateColumns: `repeat(${N}, 1fr)`, gridTemplateRows: `repeat(${N}, 1fr)` }} role="grid" aria-label="Radar">
          {Array.from({ length: N * N }, (_, c) => (
            <button key={c} type="button" role="gridcell" aria-label={`${Math.floor(c / N) + 1}-${(c % N) + 1}`} disabled={Boolean(shots[c])} onClick={() => onCell(c)} className="touch-manipulation" />
          ))}
        </div>
      )}
    </div>
  );
});

/** Barcos del rival que quedan a flote, como bloques (sin texto). */
function FleetPips({ fleet, shots }: { fleet: Ship[]; shots: Record<number, Shot> }) {
  return (
    <div className="flex items-center gap-2" aria-label={String(shipsLeft(fleet, shots))}>
      {SHIPS.map((len, k) => {
        const sh = fleet[k]!;
        const sunk = isSunk(sh, shots);
        return <span key={k} className="flex gap-[2px]">{Array.from({ length: len }, (_, i) => <span key={i} className={`h-2.5 w-2.5 rounded-[3px] ${sunk ? 'bg-red-700/70' : 'bg-gradient-to-b from-amber-200 to-amber-600'}`} />)}</span>;
      })}
    </div>
  );
}

export default function Flota() {
  const nav = useNavigate();
  const t = useT();
  const d = useDuel<FState, FAction>('flota', (p) => newFlota(p), applyFlota);
  const { s, setS, me, myIdx, hostLike, dispatch, online } = d;
  const paid = useRef(false);

  // La IA coloca su flota (ya viene aleatoria) y, en cuanto empieza el combate, dispara con pausa natural.
  useEffect(() => {
    if (!s || !hostLike || s.phase !== 'battle') return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const id = gameTimeout(() => setS((cur) => {
      if (!cur || cur.phase !== 'battle' || cur.players[cur.turn]!.id !== p.id) return cur;
      return applyFlota(cur, p.id, { k: 'fire', cell: botFire(cur, cur.turn) }) ?? cur;
    }), botDelay());
    return () => window.clearTimeout(id);
  }, [s, hostLike, setS]);

  // Sonido y vibración de cada disparo.
  const seq = s?.seq ?? 0;
  const last = s?.last ?? null;
  useEffect(() => {
    if (!seq || !last) return;
    feedback(last.res === 'water' ? 'whoosh' : last.res === 'sunk' ? 'thud' : 'impact');
  }, [seq]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fin de partida: premio, victoria y cinemática ¡FLOTA HUNDIDA!.
  const winner = s?.winner ?? null;
  useEffect(() => {
    if (winner === null || paid.current) return;
    paid.current = true;
    juice.chips(winner === myIdx ? 'me' : 'top');
    if (winner === myIdx) { wallet.add(WIN_BONUS); wallet.recordWin('flota'); juice.cinematic({ title: '¡FLOTA HUNDIDA!', sub: `+${WIN_BONUS}`, tone: 'gold', good: true }); }
    else juice.cinematic({ title: '¡FLOTA HUNDIDA!', tone: 'ruby', good: false });
  }, [winner, myIdx]);

  if (!s) {
    return (
      <GameFrame gameId="flota" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.flota.name')}</p>}
        felt={<div className="grid h-full place-items-center"><span className="size-6 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" aria-hidden /></div>} bottom={null} />
    );
  }
  const foeIdx = (1 - myIdx) as Side;
  const foe = s.players[foeIdx]!;
  const mine = s.players[myIdx]!;
  const placing = s.phase === 'place';
  const myTurn = s.phase === 'battle' && s.turn === myIdx;
  const iAmReady = s.ready[myIdx];
  const fire = (cell: number) => { if (myTurn) dispatch(me, { k: 'fire', cell }); };
  // La onda aparece en el tablero que recibió el disparo.
  const pulseOn = (board: Side) => (last && s.phase !== 'place' && last.by !== board ? { cell: last.cell, res: last.res, key: s.seq } : null);

  return (
    <GameFrame
      gameId="flota" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.seq}`, onTimeout: () => { if (myTurn) dispatch(me, { k: 'fire', cell: botFire(s, myIdx) }); } }}
      header={(
        <div className="grid grid-cols-2 gap-[min(1.8vw,8px)]" role="group">
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-teal-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-teal-300">{t('fl.shots')}</p>
            <b className="block text-[13px] tabular-nums">{Object.keys(s.shots[foeIdx]).length}</b>
          </div>
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-orange-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">{t('fl.ships')}</p>
            <b className="block text-[13px] tabular-nums">{shipsLeft(s.fleets[foeIdx], s.shots[foeIdx])} · {shipsLeft(s.fleets[myIdx], s.shots[myIdx])}</b>
          </div>
        </div>
      )}
      felt={(
        <div className="flex h-full min-h-0 flex-col items-center gap-2 p-[clamp(8px,2.4vw,18px)]">
          <div className="lg:absolute lg:left-5 lg:top-4 lg:z-10"><SeatBadge info={info(foeIdx, foe.name, foe.human)} tone="them" mano={false} turn={s.phase === 'battle' && s.turn === foeIdx} deadline={null} cards={0} /></div>
          {placing ? (
            <div className="min-h-0 w-full flex-1 [container-type:size]"><div className="mx-auto" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', height: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))' }}><Radar fleet={s.fleets[myIdx]} shots={s.shots[myIdx]} reveal pulse={null} dim={iAmReady} /></div></div>
          ) : (
            <>
              <div className="min-h-0 w-full flex-[1.5] [container-type:size]"><div className="mx-auto" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', height: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))' }}>
                <Radar fleet={s.fleets[foeIdx]} shots={s.shots[foeIdx]} reveal={s.phase === 'over'} sweep={s.phase === 'battle'} onCell={myTurn ? fire : undefined} pulse={pulseOn(foeIdx)} />
              </div></div>
              <div className="min-h-0 w-full flex-1 [container-type:size]"><div className="mx-auto" style={{ width: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))', height: 'min(100cqw, 100cqh, calc(740px / var(--z, 1)))' }}>
                <Radar fleet={s.fleets[myIdx]} shots={s.shots[myIdx]} reveal pulse={pulseOn(myIdx)} />
              </div></div>
            </>
          )}
        </div>
      )}
      bottom={(
        <div className="grid w-full justify-items-center gap-1.5">
          <SeatBadge info={info(myIdx, mine.name, true)} tone="me" mano={false} turn={myTurn || (placing && !iAmReady)} deadline={null} cards={0} />
          {/* Action Rail de altura fija */}
          <div className="flex min-h-[52px] w-full items-center justify-center gap-2" role="group" aria-label={t('fl.actions')}>
            {placing ? (
              iAmReady
                ? <span className="size-5 animate-spin rounded-full border-2 border-amber-300/30 border-t-amber-300" aria-label="…" />
                : (
                  <>
                    <button type="button" onClick={() => { feedback('tap'); dispatch(me, { k: 'random' }); }} className="flex h-12 touch-manipulation items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-5 text-[14px] font-bold text-white active:scale-95"><Shuffle size={16} strokeWidth={1.75} aria-hidden />{t('fl.random')}</button>
                    <button type="button" onClick={() => { feedback('chip'); dispatch(me, { k: 'ready' }); }} className="flex h-12 touch-manipulation items-center gap-2 rounded-2xl bg-gradient-to-b from-[#FCE38A] to-[#D4AF37] px-6 text-[14px] font-extrabold text-[#2a1d02] active:scale-95"><Check size={17} strokeWidth={2} aria-hidden />{t('fl.ready')}</button>
                  </>
                )
            ) : <FleetPips fleet={s.fleets[foeIdx]} shots={s.shots[foeIdx]} />}
          </div>
        </div>
      )}
      overlays={(
        <AnimatePresence>
          {s.phase === 'over' && (
            <ResultOverlay
              outcome={winner === myIdx ? 'win' : 'lose'} prize={winner === myIdx ? WIN_BONUS : 0} taunt=""
              title={winner === myIdx ? t('ser.champion') : t('ser.lost')}
              actions={[
                ...(hostLike ? [{ label: t('ser.newSeries'), primary: true, onClick: () => { paid.current = false; d.restart(); } }] : []),
                { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } },
              ]}
            >
              <p className="text-center text-sm tabular-nums text-stone-300">{Object.keys(s.shots[foeIdx]).length}</p>
            </ResultOverlay>
          )}
        </AnimatePresence>
      )}
    />
  );
}
