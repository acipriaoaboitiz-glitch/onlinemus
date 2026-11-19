import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { playersBySeat, teamTableSize, useReplica, useSeating } from '../../services/onlineGame.ts';
import { juice } from '../../services/juice.ts';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { TableAvatar } from '../mus/app/components/TableAvatar.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { Bubble } from '../mus/app/game/describe.ts';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { CardBack } from '../mus/app/components/CardFace.tsx';
import { SUIT_LABEL, type AnyCard } from '../../engine/deck.ts';
import { botDelay, aiDelay, feedback } from '../../store/settings.ts';
import { useT, botName, tr } from '../../i18n/index.ts';
import { wallet } from '../../store/wallet.ts';
import { SeriesGems, useSeries } from '../shared/series.tsx';
import { GameFrame } from '../shared/GameFrame.tsx';
import { Banner, FaceCard, briscaDeco, PhaseCinematic, PillBar, ResultOverlay, ScorePair, tilt, useBanner, useCine } from '../shared/kit.tsx';
import {
  applyBriscaAction, botChoose, evaluateBriscaTrick, getBriscaScores, initBriscaGame, playBriscaCard, resolveTrick, sidesFor, type BPlayer, type BriscaAction, type BriscaState,
} from './engine.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameTimeout } from '../../services/timers.ts';

const WIN_BONUS = 100;
const seatNames = (): string[] => [tr('g.you'), botName(1), botName(2), botName(3)];
type Slot = 'bottom' | 'right' | 'top' | 'left';

function makePlayers(count: 2 | 4): BPlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, human: i === 0, name: count === 2 ? (i === 0 ? 'Tú' : botName(1)) : seatNames()[i]!,
  }));
}
/** Sentido de juego antihorario: abajo → derecha → arriba → izquierda. */
const SLOT: Record<2 | 4, Slot[]> = { 2: ['bottom', 'top'], 4: ['bottom', 'right', 'top', 'left'] };
const DIR: Record<Slot, { x: number; y: number }> = { bottom: { x: 0, y: 1 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, left: { x: -1, y: 0 } };

/** Las cartas de la baza se agrupan y se deslizan hacia el montón del ganador. */
const trickVariants: Variants = {
  exit: (slot: Slot) => ({
    x: DIR[slot].x * 230, y: DIR[slot].y * 260, scale: 0.35, opacity: 0, rotate: 0,
    transition: { duration: 0.55, ease: [0.4, 0, 0.9, 0.4] },
  }),
};

const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });

export default function Brisca() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('brisca');
  const online = seating.online;
  // ?mode=1v1 | 2v2 arranca al instante (botón «Jugar contra la IA» del lobby).
  const [params] = useSearchParams();
  const preset = params.get('mode') === '1v1' ? 2 : params.get('mode') === '2v2' ? 4 : null;
  const [count, setCount] = useState<2 | 4 | null>(preset);
  const [s, setS] = useState<BriscaState | null>(() => (preset ? initBriscaGame(makePlayers(preset)) : null));
  const [bubbles, setBubbles] = useState<Record<string, Bubble | undefined>>({});
  const { banner, show } = useBanner();
  const { cine, show: showCine } = useCine();
  const paidRef = useRef(false);
  const me = online ? s?.players.find((p) => p.peerId === seating.myPeerId)?.id ?? 'p0' : 'p0';
  const hostLike = !online || seating.isHost;
  const lastShown = useRef('');

  // Online: el anfitrión reparte según los asientos de la sala (parejas 0+2 contra 1+3).
  const hostStart = () => {
    const n = teamTableSize(seating);
    setS(initBriscaGame(playersBySeat(seating, n, (i) => (n === 2 ? botName(1) : botName(i))) as BPlayer[])); setBubbles({}); paidRef.current = false; lastShown.current = '';
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<BriscaState, BriscaAction>(seating, s, setS, applyBriscaAction, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);

  const start = (n: 2 | 4) => { setCount(n); setS(initBriscaGame(makePlayers(n))); setBubbles({}); paidRef.current = false; };

  useEffect(() => {
    if (!s) return;
    if (s.phase === 'trickDone') {
      const ev = evaluateBriscaTrick(s.currentTrick, s.trumpSuit);
      const winner = s.players.find((p) => p.id === ev.winnerId)!;
      const key = s.currentTrick.map((c) => c.card.id).join();
      if (lastShown.current !== key) {
        lastShown.current = key;
        feedback('trick');
        const winCard = s.currentTrick.find((c) => c.playerId === ev.winnerId)?.card;
        if (winCard?.rank === 1 && ev.points > 20) juice.cinematic({ title: '¡ARRASTRE DE AS!', sub: `${winner.name} · +${ev.points} puntos`, tone: 'gold', good: true });
        else if (ev.points >= 10) { juice.points(`+${ev.points}`, 'gold'); if (winCard?.suit === s.trumpSuit) juice.slam(); if (winner.id === me) juice.chips('me'); }
        if (ev.points > 0) {
          show(`+${ev.points} PUNTOS`);
          const at = Date.now();
          setBubbles((b) => ({ ...b, [winner.id]: { text: `+${ev.points}`, tone: 'good', at } }));
          gameTimeout(() => setBubbles((b) => (b[winner.id]?.at === at ? { ...b, [winner.id]: undefined } : b)), 2200);
        }
      }
      if (!hostLike) return;
      const t = gameTimeout(() => setS((cur) => (cur ? resolveTrick(cur) : cur)), aiDelay(1100));
      return () => window.clearTimeout(t);
    }
    if (s.phase !== 'playing' || !hostLike) return;
    const p = s.players[s.turnIndex]!;
    if (p.human) return;
    const t = gameTimeout(() => {
      setS((cur) => (cur && cur.phase === 'playing' && cur.players[cur.turnIndex]!.id === p.id
        ? playBriscaCard(cur, p.id, botChoose(cur, p.id)) : cur));
    }, botDelay());
    return () => window.clearTimeout(t);
  }, [s, show, hostLike]);

  // Al mejor de 3 rondas: cada partida del motor es una ronda; gana la serie quien gane 2.
  const series = useSeries();
  const { record: recordRound, roundStarted } = series;
  useEffect(() => {
    if (s?.phase === 'playing') { paidRef.current = false; roundStarted(); }
    if (s?.phase !== 'finished' || paidRef.current) return;
    paidRef.current = true;
    const { mine, theirs } = sidesFor(s, me);
    const roundWinner = mine > theirs ? 'me' : mine < theirs ? 'them' : null;
    recordRound(roundWinner);
    if (roundWinner) juice.chips(roundWinner === 'me' ? 'me' : 'top'); // fichas en parábola al ganador de la ronda
  }, [s, me, recordRound, roundStarted]);
  const champion = series.champion;
  useEffect(() => {
    if (champion === 'me') { wallet.add(WIN_BONUS); wallet.recordWin('brisca'); juice.chips('me'); showCine('¡VICTORIA!', `+${WIN_BONUS} fichas`); }
  }, [champion, showCine]);

  const played = s?.currentTrick.length ?? 0;
  useEffect(() => { if (played > 0) feedback('deal'); }, [played]);

  // Manejador estable (lee el estado más reciente de una ref) para que las cartas memoizadas no se repinten en cada frame.
  const sRef = useRef(s);
  sRef.current = s;
  const play = useCallback((c: AnyCard) => {
    const cur = sRef.current;
    if (!cur || cur.phase !== 'playing' || cur.players[cur.turnIndex]!.id !== me) return;
    feedback('play');
    dispatch(me, { k: 'play', cardId: c.id });
  }, [me, dispatch]);

  if (!s && online) {
    return (
      <GameFrame gameId="brisca" onExit={() => { setActiveRoom(null); void exitMatch(nav); }}
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">Brisca</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">Conectando con la mesa…</p></div>}
        bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame
        gameId="brisca"
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">Brisca</p>}
        felt={
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">{t('a.format')}</h2>
              <Button variant="primary" block onClick={() => start(2)}>1 vs 1 · contra la IA</Button>
              <Button variant="secondary" block onClick={() => start(4)}>2 vs 2 · con compañero IA</Button>
              <p className="text-xs text-stone-400">Gana quien sume más de 60 de los 120 puntos. La carta de la pinta marca el triunfo.</p>
            </div>
          </div>
        }
        bottom={null}
      />
    );
  }

  const n = s.players.length;
  const slots = SLOT[n as 2 | 4];
  const myIdx = Math.max(0, s.players.findIndex((p) => p.id === me));
  const slotOf = (id: string): Slot => slots[(s.players.findIndex((p) => p.id === id) - myIdx + n) % n]!;
  const myTurn = s.phase === 'playing' && s.players[s.turnIndex]!.id === me;
  const done = s.phase === 'finished';
  const sc = getBriscaScores(s);
  const { mine, theirs } = sidesFor(s, me);
  const winnerSlot: Slot = s.lastTrickWinner ? slotOf(s.lastTrickWinner) : 'bottom';
  const decided = s.phase === 'trickDone' ? evaluateBriscaTrick(s.currentTrick, s.trumpSuit).winnerId : null;
  const seat = (slot: 'top' | 'left' | 'right') => {
    const k = slots.indexOf(slot);
    if (k === -1) return null;
    const i = (myIdx + k) % n;
    const p = s.players[i]!;
    return { p, i, hand: s.hands[p.id]!.length, active: s.turnIndex === i && s.phase === 'playing' };
  };
  const badge = (x: NonNullable<ReturnType<typeof seat>>, side: 'below' | 'left' | 'right') => (
    <SeatBadge info={info(x.i, x.p.name)} tone={n === 4 ? (x.i % 2 === myIdx % 2 ? 'us' : 'them') : 'them'} mano={false}
      turn={x.active} bubble={bubbles[x.p.id]} deadline={null} cards={x.hand} bubbleSide={side} />
  );
  const top = seat('top'), left = seat('left'), right = seat('right');
  const off = (slot: Slot) => {
    const sx = n === 4 ? 0.58 : 0;
    const sy = n === 4 ? 0.62 : 0.34;
    return { bottom: { x: 0, y: sy }, top: { x: 0, y: -sy }, right: { x: sx, y: 0 }, left: { x: -sx, y: 0 } }[slot];
  };
  const status = done ? '' : s.phase === 'trickDone' ? 'Baza completa…' : myTurn ? 'Te toca: toca una carta' : `Juega ${s.players[s.turnIndex]!.name}…`;
  const myTricks = Math.round(s.wonCards[me]!.length / s.players.length);

  const felt = (
    <>
      <div className="grid h-full grid-cols-[minmax(0,.7fr)_minmax(0,2.2fr)_minmax(0,.7fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-1 p-[clamp(6px,2vw,16px)]">
        <div className="col-start-2 row-start-1 justify-self-center">{top && badge(top, 'below')}</div>
        <div className="col-start-1 row-span-2 row-start-1 self-center justify-self-center">{left && badge(left, 'left')}</div>
        <div className="relative col-start-2 row-start-2 min-h-0" aria-label="Baza en mesa">
          <AnimatePresence custom={winnerSlot}>
            {s.currentTrick.map((t) => {
              const slot = slotOf(t.playerId);
              const o = off(slot);
              const human = t.playerId === me;
              return (
                <motion.div key={t.card.id} className="absolute left-1/2 top-1/2" custom={winnerSlot} variants={trickVariants} exit="exit"
                  style={{ marginLeft: `calc(var(--card-w) * ${-0.36 + o.x})`, marginTop: `calc(var(--card-w) * ${-0.57 + o.y})`, zIndex: 2 }}
                  initial={human ? false : { x: DIR[slot].x * 160, y: DIR[slot].y * 160, opacity: 0, scale: 1.15 }}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
                  <FaceCard card={t.card} land scale={0.72} rotate={tilt(t.card.id)} glow={decided === t.playerId} {...briscaDeco(t.card, s.trumpSuit)} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="col-start-3 row-span-2 row-start-1 self-center justify-self-center">{right && badge(right, 'right')}</div>
      </div>

      {/* Mazo y triunfo, en la esquina del tapete */}
      <div className="absolute left-[clamp(6px,2vw,14px)] top-[clamp(6px,2vw,14px)] z-10 flex items-center gap-1.5" aria-label={`Quedan ${s.deck.length} cartas; triunfo ${SUIT_LABEL[s.trumpSuit]}`}>
        {/* La muestra (triunfo) va atravesada bajo el mazo: es la última carta que se roba */}
        <div className="relative h-[calc(var(--card-w)*.4*1.583)] w-[calc(var(--card-w)*.84)]">
          <div className="absolute top-0 z-0" style={{ left: 'calc(var(--card-w) * .3165)' }}>
            <FaceCard card={s.trumpCard} flipIn={0.35} scale={0.4} rotate={90} aura />
          </div>
          <div className="absolute left-0 top-0 z-10 aspect-[12/19] w-[calc(var(--card-w)*.4)]">
            {[2, 1, 0].map((k) => (
              <span key={k} className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[0_4px_8px_rgba(0,0,0,.4)]" style={{ transform: `translate(${k * 2}px, ${-k * 2}px)` }}><CardBack /></span>
            ))}
          </div>
        </div>
        <span className="font-mono text-[10px] text-amber-200/80">{s.deck.length}</span>
      </div>
      <Banner text={banner} />
    </>
  );

  const bottom = (
    <>
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TableAvatar name="Tú" tone="me" active={myTurn} className="size-9 text-[15px]" />
          <b className={`truncate text-[13px] ${myTurn ? 'text-amber-200' : 'text-stone-200'}`}>Tú</b>
          <span className="rounded-full border border-white/10 bg-zinc-900/70 px-2 py-[2px] text-[10px] font-bold text-stone-300">{myTricks} bazas</span>
        </div>
        <span className="text-[11px] text-stone-400">Triunfo: <b className="text-amber-200">{SUIT_LABEL[s.trumpSuit]}</b></span>
      </div>
      <PillBar pills={[]} idle={status} />
      <div className="flex items-end justify-center gap-[min(2vw,12px)] pt-[min(3.4dvh,26px)]" role="group" aria-label="Tu mano">
        {s.hands[me]!.map((c, i, arr) => (
          <FaceCard key={c.id} card={c} deal={i} rotate={(i - (arr.length - 1) / 2) * 1.8} dim={!myTurn} {...briscaDeco(c, s.trumpSuit)}
            onSelect={myTurn ? play : undefined} />
        ))}
      </div>
    </>
  );

  return (
    <GameFrame
      gameId="brisca"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.currentTrick.length}:${s.deck.length}`, onTimeout: () => { const h = s.hands[me]!; const c = h[Math.floor(Math.random() * h.length)]; if (c) play(c); } }}
      header={<ScorePair labels={n === 4 ? [t('ser.us'), t('ser.them')] : [t('ser.you'), online ? t('ser.rival') : botName(1)]} values={[mine, theirs]} target={120} />}
      strip={(
          <SeriesGems entries={[{ key: 'me', label: n === 4 ? t('ser.us') : t('ser.you'), wins: series.wins.me ?? 0 }, { key: 'them', label: n === 4 ? t('ser.them') : online ? t('ser.rival') : botName(1), wins: series.wins.them ?? 0 }]} />
      )}
      felt={felt}
      bottom={bottom}
      overlays={
        <>
          <PhaseCinematic cine={cine} />
          <AnimatePresence>
            {done && (
              <ResultOverlay
                outcome={champion === null ? undefined : champion === 'me' ? 'win' : 'lose'}
                prize={champion === 'me' ? WIN_BONUS : 0}
                taunt={Math.abs(mine - theirs) < 10 ? 'Por los pelos' : 'Te arrastraron las bazas'}
                title={champion !== null ? (champion === 'me' ? t('ser.champion') : t('ser.lost')) : mine === theirs ? '60 – 60' : t('ser.roundWin', { w: mine > theirs ? (n === 4 ? t('ser.us') : t('ser.you')) : (n === 4 ? t('ser.them') : t('ser.rival')) })}
                actions={[
                  ...(online
                    ? hostLike ? [{ label: champion !== null ? t('ser.newSeries') : t('ser.next'), primary: true, onClick: hostStart }] : []
                    : [{ label: champion !== null ? t('ser.newSeries') : t('ser.next'), primary: true, onClick: () => start(count!) }, { label: 'Cambiar formato', onClick: () => { setCount(null); setS(null); } }]),
                  { label: t('a.lobby'), onClick: () => { if (online) setActiveRoom(null); void exitMatch(nav); } },
                ]}
              >
                <ScorePair labels={sc.mode === 'teams' ? [sc.teamA.label, sc.teamB.label] : ['Tú', botName(1)]} values={[mine, theirs]} target={120} />
                {champion === 'me' && <p className="mt-2 text-center text-sm font-bold text-amber-300">+{WIN_BONUS} fichas de premio</p>}
                <p className="mt-2 text-center text-[11px] text-stone-400">{t('ser.round', { n: series.played })} · {t('ser.score')}: {series.wins.me ?? 0} – {series.wins.them ?? 0}</p>
              </ResultOverlay>
            )}
          </AnimatePresence>
        </>
      }
    />
  );
}
