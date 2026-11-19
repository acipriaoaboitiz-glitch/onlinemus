import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dices, Minus, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { botName, tr, useT } from '../../i18n/index.ts';
import { juice } from '../../services/juice.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { gameTimeout } from '../../services/timers.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { PhaseCinematic, ResultOverlay, useCine } from '../shared/kit.tsx';
import { Cup, Die } from './Dice.tsx';
import {
  applyLiarAction, botMove, minBid, newGame, nextRound, totalDice, validBid,
  type LPlayer, type LiarAction, type LiarState,
} from './engine.ts';

const WIN_BONUS = 100;
type Slot = 'bottom' | 'right' | 'top' | 'left';
const SLOT: Record<2 | 3 | 4, Slot[]> = { 2: ['bottom', 'top'], 3: ['bottom', 'left', 'right'], 4: ['bottom', 'left', 'top', 'right'] };
const CHIP_TARGET: Record<Slot, 'me' | 'top' | 'left' | 'right'> = { bottom: 'me', top: 'top', left: 'left', right: 'right' };
const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });
const makePlayers = (n: number): LPlayer[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: i === 0 ? tr('g.you') : botName(i), human: i === 0 }));
const TOP_UNIT = 'calc(var(--card-w) * 0.36)';
const SIDE_UNIT = 'calc(var(--card-w) * 0.24)';
const ME_UNIT = 'calc(var(--card-w) * 0.46)';
const RAIL = 'min-w-0 flex-1 touch-manipulation whitespace-nowrap rounded-[14px] px-2 py-2.5 text-[13px] font-extrabold transition-opacity disabled:opacity-40';

interface Rev { step: number; counted: number; done: boolean }
const REV0: Rev = { step: 0, counted: 0, done: false };

/** Cubilete sobre sus dados: tapado, o levantado a un lado (los dados quedan a la vista). El temblor del reparto va en el contenedor. */
function CupBox({ dice, covered, hits, unit, shakeKey, onTap, label, dir = 1 }: { dice: number[]; covered: boolean; hits?: boolean[]; unit: string; shakeKey: number; onTap?: () => void; label: string; dir?: 1 | -1 }) {
  if (dice.length === 0) return <div aria-hidden style={{ width: `calc(${unit} * 3.9)`, height: `calc(${unit} * 3)`, opacity: 0.18 }}><Cup /></div>;
  return (
    <motion.div key={shakeKey} initial={{ x: 0, y: 0, rotate: 0 }} animate={{ x: [0, -7, 7, -6, 6, -3, 0], y: [0, -4, 2, -3, 1, 0, 0], rotate: [0, -6, 6, -5, 5, -2, 0] }} transition={{ duration: shakeKey ? 0.7 : 0 }}
      className="relative" style={{ width: `calc(${unit} * 3.9)`, height: `calc(${unit} * 3)`, willChange: 'transform' }}>
      <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center" style={{ gap: `calc(${unit} * 0.14)`, padding: `calc(${unit} * 0.3) calc(${unit} * 0.2) 0` }}>
        {dice.map((d, i) => <Die key={i} face={d} size={covered ? `calc(${unit} * 0.5)` : unit} hit={hits?.[i]} dim={hits !== undefined && !hits[i]} />)}
      </div>
      <motion.button type="button" aria-label={label} onClick={onTap} disabled={!onTap}
        initial={false} animate={covered ? { x: 0, y: 0, rotate: 0, scale: 1 } : { x: `${78 * dir}%`, y: '-58%', rotate: 28 * dir, scale: 0.55 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}
        className="absolute inset-0 touch-manipulation" style={{ willChange: 'transform', zIndex: 2, pointerEvents: onTap ? 'auto' : 'none' }}>
        <Cup />
      </motion.button>
    </motion.div>
  );
}

export default function Mentiroso() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('mentiroso');
  const online = seating.online;
  const [count, setCount] = useState<2 | 3 | 4 | null>(null);
  const [s, setS] = useState<LiarState | null>(null);
  const { cine, show: showCine } = useCine();
  const [qty, setQty] = useState(1);
  const [face, setFace] = useState(2);
  const [lifted, setLifted] = useState(false);
  const [shake, setShake] = useState(0);
  const [rev, setRev] = useState<Rev>(REV0);
  const lastSeq = useRef('');
  const paid = useRef(false);
  const me = online ? s?.players.find((p) => p.peerId === seating.myPeerId)?.id ?? 'p0' : 'p0';
  const hostLike = !online || seating.isHost;

  const start = (n: 2 | 3 | 4) => { setCount(n); setS(newGame(makePlayers(n))); lastSeq.current = ''; paid.current = false; setRev(REV0); };
  const hostStart = () => {
    const humans = seating.humans;
    const n = Math.max(2, seating.fillBots ? 4 : humans.length);
    const players: LPlayer[] = Array.from({ length: n }, (_, i) => i < humans.length
      ? { id: `p${i}`, name: humans[i]!.name, human: true, peerId: humans[i]!.peerId }
      : { id: `p${i}`, name: botName(i - humans.length + 1), human: false });
    setS(newGame(players)); lastSeq.current = ''; paid.current = false; setRev(REV0);
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<LiarState, LiarAction>(seating, s, setS, applyLiarAction, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);

  // Ronda nueva: cubiletes tapados, temblor con traqueteo de dados y apuesta mínima preparada.
  const round = s?.round ?? 0;
  const biddingNow = s?.phase === 'bid';
  useEffect(() => {
    if (!biddingNow) return;
    setLifted(false);
    setShake((k) => k + 1);
    feedback('dice');
  }, [round, biddingNow]);
  const bidKey = s?.bid ? `${s.bid.qty}x${s.bid.face}` : '';
  useEffect(() => {
    if (!s) return;
    const m = minBid(s);
    setQty(m.qty); setFace(m.face);
  }, [bidKey, round]); // eslint-disable-line

  // IA con una pausa natural (750–900 ms).
  useEffect(() => {
    if (!s || s.phase !== 'bid' || !hostLike) return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const id = gameTimeout(() => {
      setS((cur) => {
        if (!cur || cur.phase !== 'bid' || cur.players[cur.turn]!.id !== p.id) return cur;
        return applyLiarAction(cur, p.id, botMove(cur)) ?? applyLiarAction(cur, p.id, { k: 'liar' }) ?? cur;
      });
    }, botDelay());
    return () => window.clearTimeout(id);
  }, [s, hostLike]);

  // Sucesos: apuesta, ¡MENTIROSO! y ¡EXACTO! (cinemática de 1 s).
  useEffect(() => {
    const e = s?.event;
    const key = `${e?.seq}:${e?.by}:${e?.text}`;
    if (!s || !e || key === lastSeq.current) return;
    lastSeq.current = key;
    const who = s.players.find((p) => p.id === e.by);
    if (e.kind === 'bid') feedback('tap');
    if (e.kind === 'liar') juice.cinematic({ title: '¡MENTIROSO!', sub: who?.name, tone: 'ruby', good: who?.id === me });
    if (e.kind === 'exact') juice.cinematic({ title: '¡EXACTO!', sub: who?.name, tone: 'gold', good: who?.id === me });
  }, [s, me]);

  // Destape sincronizado: los cubiletes se levantan uno a uno y se cuentan los dados que coinciden con la apuesta.
  const revealKey = s?.phase === 'reveal' && s.reveal ? `${s.round}` : '';
  useEffect(() => {
    setRev(REV0);
    if (!revealKey) return;
    const st = s!;
    const r = st.reveal!;
    const order = st.players.filter((p) => r.dice[p.id]!.length > 0);
    const ids: number[] = [];
    let at = 1000;
    order.forEach((_, k) => { ids.push(gameTimeout(() => { setRev((v) => ({ ...v, step: k + 1 })); feedback('drop'); }, at)); at += 430; });
    for (let c = 1; c <= r.count; c++) { at += 360; ids.push(gameTimeout(() => { setRev((v) => ({ ...v, counted: c })); feedback('clack'); }, at)); }
    at += 900;
    ids.push(gameTimeout(() => { setRev((v) => ({ ...v, done: true })); feedback(r.loser === me ? 'defeat' : 'chip'); }, at));
    if (hostLike) ids.push(gameTimeout(() => setS((cur) => (cur && cur.phase === 'reveal' ? nextRound(cur) ?? cur : cur)), at + 1500));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [revealKey]); // eslint-disable-line

  // Fin de partida: fichas doradas al ganador y premio.
  const slots = s ? SLOT[s.players.length as 2 | 3 | 4] : SLOT[2];
  const myIdx = Math.max(0, s?.players.findIndex((p) => p.id === me) ?? 0);
  const winnerId = s?.phase === 'over' ? s.winner : null;
  useEffect(() => {
    if (!s || !winnerId || paid.current) return;
    paid.current = true;
    const wIdx = s.players.findIndex((p) => p.id === winnerId);
    const slot = slots[(wIdx - myIdx + s.players.length) % s.players.length]!;
    juice.chips(CHIP_TARGET[slot]);
    if (winnerId === me) { wallet.add(WIN_BONUS); wallet.recordWin('mentiroso'); showCine('¡VICTORIA!', `+${WIN_BONUS}`); }
  }, [winnerId]); // eslint-disable-line

  const dispatchMine = (a: LiarAction) => { if (s && s.phase === 'bid' && s.players[s.turn]!.id === me) dispatch(me, a); };

  if (!s && online) {
    return (
      <GameFrame gameId="mentiroso" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.mentiroso.name')}</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">…</p></div>} bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame gameId="mentiroso" header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.mentiroso.name')}</p>}
        felt={(
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">{t('a.format')}</h2>
              <Button variant="primary" block onClick={() => start(2)}>{t('mt.f2')}</Button>
              <Button variant="secondary" block onClick={() => start(3)}>{t('mt.f3')}</Button>
              <Button variant="secondary" block onClick={() => start(4)}>{t('mt.f4')}</Button>
              <p className="text-xs text-stone-400">{t('mt.intro')}</p>
            </div>
          </div>
        )} bottom={null} />
    );
  }

  const n = s.players.length as 2 | 3 | 4;
  const myTurn = s.phase === 'bid' && s.players[s.turn]!.id === me;
  const r = s.reveal;
  const revealing = s.phase === 'reveal' && r !== null;
  // Durante el destape se muestran los dados previos al duelo; al terminar, los nuevos.
  const diceOf = (id: string): number[] => (revealing && !rev.done ? r!.dice[id]! : s.dice[id]!);
  const order = revealing ? s.players.filter((p) => r!.dice[p.id]!.length > 0).map((p) => p.id) : [];
  const shown = (id: string): boolean => revealing && order.indexOf(id) < rev.step && order.indexOf(id) !== -1;
  // Marca los dados que coinciden con la apuesta a medida que avanza el recuento.
  const hitsOf = (id: string): boolean[] | undefined => {
    if (!revealing || !shown(id)) return undefined;
    let ord = 0;
    for (const p of s.players) {
      const flags = r!.dice[p.id]!.map((d) => (d === r!.bid.face ? ++ord <= rev.counted : false));
      if (p.id === id) return flags;
    }
    return undefined;
  };

  const seat = (slot: 'top' | 'left' | 'right') => {
    const k = slots.indexOf(slot);
    if (k === -1) return null;
    const i = (myIdx + k) % n;
    const p = s.players[i]!;
    const d = diceOf(p.id);
    return (
      <div className="flex flex-col items-center gap-1">
        <SeatBadge info={info(i, p.name)} tone="them" mano={false} turn={s.turn === i && s.phase === 'bid'} deadline={null} cards={0} badge={String(d.length)} />
        <CupBox dice={d} covered={!shown(p.id)} hits={hitsOf(p.id)} unit={slot === 'top' ? TOP_UNIT : SIDE_UNIT} shakeKey={shake} label={p.name} dir={slot === 'right' ? -1 : 1} />
      </div>
    );
  };

  const total = totalDice(s);
  const bidValid = validBid(s, qty, face);
  const autoQty = (f: number): number => (!s.bid ? 1 : f > s.bid.face ? s.bid.qty : s.bid.qty + 1);
  const pickFace = (f: number) => { setFace(f); setQty((q) => (validBid(s, q, f) ? q : Math.min(total, autoQty(f)))); feedback('tap'); };
  const shownBid = r ? r.bid : s.bid;
  const myDice = diceOf(me);
  const myCovered = revealing ? !shown(me) : !lifted;

  const felt = (
    <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-1 p-[clamp(6px,2vw,16px)]">
      <div className="col-start-2 row-start-1 justify-self-center">{seat('top')}</div>
      <div className="col-start-1 row-span-2 row-start-1 self-center justify-self-center">{seat('left')}</div>
      <div className="col-start-2 row-start-2 grid min-h-0 place-items-center">
        <div className="grid justify-items-center gap-2 text-center">
          {shownBid ? (
            <motion.div key={`${shownBid.qty}x${shownBid.face}`} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className="flex items-center gap-2 rounded-full border border-amber-300/40 bg-black/35 px-3 py-1.5" style={{ willChange: 'transform' }}>
              <b className="font-[var(--font-display)] text-2xl tabular-nums text-amber-200">{shownBid.qty}×</b>
              <Die face={shownBid.face} size="calc(var(--card-w) * 0.4)" hit={revealing} />
            </motion.div>
          ) : <Dices size={30} strokeWidth={1.5} className="text-amber-200/25" aria-hidden />}
          {/* recuento: solo números, sin textos sobre la mesa */}
          {revealing && <p className="font-[var(--font-display)] text-xl font-extrabold tabular-nums text-amber-200" aria-live="polite">{rev.counted}<span className="text-amber-200/50"> / {r!.bid.qty}</span></p>}
        </div>
      </div>
      <div className="col-start-3 row-span-2 row-start-1 self-center justify-self-center">{seat('right')}</div>
    </div>
  );

  const bottom = (
    <>
      <div className="flex items-end justify-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <CupBox dice={myDice} covered={myCovered} hits={hitsOf(me)} unit={ME_UNIT} shakeKey={shake} label={t('mt.tapCup')} onTap={!revealing && myDice.length > 0 ? () => { setLifted((v) => !v); feedback('tap'); } : undefined} />
          <p className="text-[10px] text-stone-400">{myDice.length === 0 ? t('mt.out') : revealing ? '' : t('mt.tapCup')}</p>
        </div>
      </div>
      {/* Action Rail: altura fija reservada para que la mesa nunca se mueva */}
      <div className={`mx-auto grid w-full max-w-[560px] gap-1.5 ${myTurn ? '' : 'opacity-45'}`} style={{ minHeight: 96 }} role="group" aria-label={t('mt.raise')}>
        <div className="flex items-center justify-center gap-1">
          <button type="button" disabled={!myTurn || qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="−" className="grid size-9 touch-manipulation place-items-center rounded-full bg-white/10 disabled:opacity-40"><Minus size={16} aria-hidden /></button>
          <b className="min-w-[2.2ch] text-center font-[var(--font-display)] text-xl tabular-nums text-amber-200">{qty}</b>
          <button type="button" disabled={!myTurn || qty >= total} onClick={() => setQty((q) => Math.min(total, q + 1))} aria-label="+" className="grid size-9 touch-manipulation place-items-center rounded-full bg-white/10 disabled:opacity-40"><Plus size={16} aria-hidden /></button>
          <span className="mx-0.5 text-stone-500" aria-hidden>×</span>
          {[1, 2, 3, 4, 5, 6].map((f) => (
            <button key={f} type="button" disabled={!myTurn} onClick={() => pickFace(f)} aria-label={String(f)} aria-pressed={face === f}
              className={`touch-manipulation rounded-lg p-[3px] ${face === f ? 'bg-amber-300/25 ring-2 ring-amber-300' : ''}`}><Die face={f} size="clamp(22px, 6.4vw, 38px)" /></button>
          ))}
        </div>
        <div className="flex items-stretch justify-center gap-1.5">
          <button type="button" disabled={!myTurn || !bidValid} onClick={() => dispatchMine({ k: 'raise', qty, face })} className={`${RAIL} bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950`}>{t('mt.raise')} {qty}×{face}</button>
          <button type="button" disabled={!myTurn || !s.bid} onClick={() => dispatchMine({ k: 'liar' })} className={`${RAIL} bg-rose-700 text-white`}>{t('mt.liar')}</button>
          <button type="button" disabled={!myTurn || !s.bid} onClick={() => dispatchMine({ k: 'exact' })} className={`${RAIL} bg-white/10 text-stone-100`}>{t('mt.exact')}</button>
        </div>
      </div>
    </>
  );

  return (
    <GameFrame
      gameId="mentiroso" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{
        active: myTurn, id: `${s.turn}:${s.round}:${bidKey}`,
        onTimeout: () => { if (s.phase !== 'bid' || s.players[s.turn]!.id !== me) return; dispatch(me, botMove(s)); },
      }}
      header={(
        <div className="grid grid-cols-2 gap-[min(1.8vw,8px)]" role="group" aria-label={t('mt.dice')}>
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-teal-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-teal-300">{t('ser.round', { n: s.round })}</p>
            <b className="block truncate text-[13px]">{s.phase === 'over' ? '—' : s.players[s.turn]!.id === me ? t('g.you') : s.players[s.turn]!.name}</b>
          </div>
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-orange-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">{t('mt.dice')}</p>
            <b className="flex items-center gap-1 text-[13px] tabular-nums"><Dices size={14} strokeWidth={1.75} aria-hidden />{s.players.reduce((n, p) => n + diceOf(p.id).length, 0)}</b>
          </div>
        </div>
      )}
      felt={felt}
      bottom={bottom}
      overlays={(
        <>
          <PhaseCinematic cine={cine} />
          <AnimatePresence>
            {s.phase === 'over' && (
              <ResultOverlay
                outcome={s.winner === me ? 'win' : 'lose'}
                prize={s.winner === me ? WIN_BONUS : 0}
                taunt={t('mt.taunt')}
                title={s.winner === me ? t('ser.champion') : t('ser.lost')}
                actions={[
                  ...(hostLike ? [{ label: t('ser.newSeries'), primary: true, onClick: online ? hostStart : () => start(count!) }] : []),
                  { label: t('a.lobby'), onClick: () => { void exitMatch(nav); } },
                ]}
              >
                <p className="text-center text-sm text-stone-300">{t('mt.winner', { n: s.players.find((p) => p.id === s.winner)?.name ?? '' })}</p>
                {s.winner === me && <p className="mt-2 text-center text-sm font-bold text-amber-300">+{WIN_BONUS} fichas</p>}
              </ResultOverlay>
            )}
          </AnimatePresence>
        </>
      )}
    />
  );
}
