import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { playersBySeat, teamTableSize, useReplica, useSeating } from '../../services/onlineGame.ts';
import { juice } from '../../services/juice.ts';
import { progression } from '../../store/progression.ts';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { CardBack } from '../mus/app/components/CardFace.tsx';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { TableAvatar } from '../mus/app/components/TableAvatar.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { Bubble } from '../mus/app/game/describe.ts';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { SUIT_LABEL, type AnyCard, type SpanishSuit } from '../../engine/deck.ts';
import { useT, botName, tr } from '../../i18n/index.ts';
import { aiDelay, botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { points as briscaPts } from '../brisca/engine.ts';
import { SeriesGems, useSeries } from '../shared/series.tsx';
import { GameFrame } from '../shared/GameFrame.tsx';
import { Banner, FaceCard, PhaseCinematic, PillBar, ResultOverlay, ScorePair, briscaDeco, tilt, useBanner, useCine, type PillSpec } from '../shared/kit.tsx';
import {
  applyTuteAction, botTute, declareTute, hasTute, legalCards, newTute, playTute, resolveTute, sing, singable, teamOf, teamPoints, winnerTeam, type TPlayer, type TuteAction, type TuteState,
} from './engine.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameTimeout } from '../../services/timers.ts';

const WIN_BONUS = 100;
const names = (): string[] => [tr('g.you'), botName(1), botName(2), botName(3)];
type Slot = 'bottom' | 'right' | 'top' | 'left';
const SLOT: Record<2 | 4, Slot[]> = { 2: ['bottom', 'top'], 4: ['bottom', 'right', 'top', 'left'] };
const DIR: Record<Slot, { x: number; y: number }> = { bottom: { x: 0, y: 1 }, right: { x: 1, y: 0 }, top: { x: 0, y: -1 }, left: { x: -1, y: 0 } };
const trickVariants: Variants = {
  exit: (slot: Slot) => ({ x: DIR[slot].x * 230, y: DIR[slot].y * 260, scale: 0.35, opacity: 0, rotate: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.9, 0.4] } }),
};
const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });
const makePlayers = (n: 2 | 4): TPlayer[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, human: i === 0, name: n === 2 ? (i === 0 ? 'Tú' : botName(1)) : names()[i]! }));

export default function Tute() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('tute');
  const online = seating.online;
  const [params] = useSearchParams();
  const preset = params.get('mode') === '1v1' ? 2 : params.get('mode') === '2v2' ? 4 : null;
  const [count, setCount] = useState<2 | 4 | null>(preset);
  const [s, setS] = useState<TuteState | null>(() => (preset ? newTute(makePlayers(preset)) : null));
  const [bubbles, setBubbles] = useState<Record<string, Bubble | undefined>>({});
  const { banner, show } = useBanner(1500);
  const { cine, show: showCine } = useCine();
  const lastSeq = useRef('');
  const paid = useRef(false);
  const me = online ? s?.players.find((p) => p.peerId === seating.myPeerId)?.id ?? 'p0' : 'p0';
  const hostLike = !online || seating.isHost;

  const start = (n: 2 | 4) => { setCount(n); setS(newTute(makePlayers(n))); setBubbles({}); paid.current = false; lastSeq.current = ''; };

  // Online: el anfitrión reparte según los asientos de la sala (parejas 0+2 contra 1+3).
  const hostStart = () => {
    const n = teamTableSize(seating);
    setS(newTute(playersBySeat(seating, n, (i) => (n === 2 ? botName(1) : botName(i))) as TPlayer[])); setBubbles({}); paid.current = false; lastSeq.current = '';
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<TuteState, TuteAction>(seating, s, setS, applyTuteAction, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);

  // IA: canta, anuncia Tute y juega con pausa natural; la baza completa se queda un momento en mesa.
  useEffect(() => {
    if (!s || !hostLike) return;
    if (s.phase === 'trickDone') {
      const timer = gameTimeout(() => { feedback('trick'); setS((cur) => (cur ? resolveTute(cur) : cur)); }, aiDelay(1100));
      return () => window.clearTimeout(timer);
    }
    if (s.phase !== 'playing') return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const timer = gameTimeout(() => {
      setS((cur) => {
        if (!cur || cur.phase !== 'playing' || cur.players[cur.turn]!.id !== p.id) return cur;
        const tute = declareTute(cur, p.id);
        if (tute) return tute;
        const su = singable(cur, p.id)[0];
        if (su) return sing(cur, p.id, su) ?? cur;
        return playTute(cur, p.id, botTute(cur, p.id)) ?? cur;
      });
    }, botDelay());
    return () => window.clearTimeout(timer);
  }, [s, hostLike]);

  useEffect(() => {
    const e = s?.event;
    const key = `${e?.seq}:${e?.by}:${e?.text}`;
    if (!s || !e || key === lastSeq.current) return;
    lastSeq.current = key;
    if (e.text === '¡TUTE!') { showCine('¡TUTE!', 'Cuatro reyes o cuatro caballos'); return; }
    if (/Canta/.test(e.text)) {
      const big = /40/.test(e.text);
      juice.cinematic({ title: big ? '¡LAS 40!' : '¡LAS 20!', sub: e.text, tone: big ? 'gold' : 'emerald', good: true });
      const who = s.players.find((p) => p.id === e.by)!;
      if (who.id === me) { progression.track('cante', 'tute'); show(e.text.replace('Canta', 'Cantas')); } else {
        const at = Date.now();
        setBubbles((b) => ({ ...b, [who.id]: { text: e.text, tone: 'bet', at } }));
        gameTimeout(() => setBubbles((b) => (b[who.id]?.at === at ? { ...b, [who.id]: undefined } : b)), 2200);
      }
    }
  }, [s, show, showCine, me]);

  // Al mejor de 3 rondas: cada partida del motor es una ronda; gana la serie quien gane 2.
  const series = useSeries();
  const { record: recordRound, roundStarted } = series;
  useEffect(() => {
    if (s?.phase === 'playing') { paid.current = false; roundStarted(); }
    if (s?.phase !== 'finished' || paid.current) return;
    paid.current = true;
    const w = winnerTeam(s);
    const roundWinner = w === null ? null : w === teamOf(s, s.players.findIndex((p) => p.id === me)) ? 'me' : 'them';
    recordRound(roundWinner);
    if (roundWinner) juice.chips(roundWinner === 'me' ? 'me' : 'top'); // fichas en parábola al ganador de la ronda
  }, [s, me, recordRound, roundStarted]);
  const champion = series.champion;
  useEffect(() => {
    if (champion === 'me') { wallet.add(WIN_BONUS); wallet.recordWin('tute'); juice.chips('me'); }
  }, [champion]);

  const played = s?.trick.length ?? 0;
  useEffect(() => { if (played > 0) feedback('deal'); }, [played]);

  const legalIds = useMemo(() => new Set(s && s.phase === 'playing' && s.players[s.turn]!.id === me ? legalCards(s, me).map((c) => c.id) : []), [s, me]);
  // Manejador estable (lee el estado más reciente de una ref) para que las cartas memoizadas no se repinten en cada frame.
  const sRef = useRef(s);
  sRef.current = s;
  const play = useCallback((c: AnyCard) => {
    const cur = sRef.current;
    if (!cur || cur.phase !== 'playing' || cur.players[cur.turn]!.id !== me) return;
    feedback('play');
    dispatch(me, { k: 'play', cardId: c.id });
  }, [me, dispatch]);

  if (!s && online) {
    return (
      <GameFrame gameId="tute" onExit={() => { setActiveRoom(null); void exitMatch(nav); }}
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.tute.name')}</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">Conectando con la mesa…</p></div>}
        bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame
        gameId="tute"
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.tute.name')}</p>}
        felt={
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">{t('a.format')}</h2>
              <Button variant="primary" block onClick={() => start(2)}>1 vs 1</Button>
              <Button variant="secondary" block onClick={() => start(4)}>2 vs 2 · {t('g.tute.pl')}</Button>
              <p className="text-xs text-stone-400">8 cartas. Asiste al palo, monta y falla con triunfo. Canta las 20 y las 40 al ganar una baza.</p>
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
  const myTeam = teamOf(s, myIdx);
  const slotOf = (id: string): Slot => slots[(s.players.findIndex((p) => p.id === id) - myIdx + n) % n]!;
  const myTurn = s.phase === 'playing' && s.players[s.turn]!.id === me;
  const rawPts = teamPoints(s);
  const pts = myTeam === 0 ? rawPts : [rawPts[1]!, rawPts[0]!];
  const myCantes = myTeam === 0 ? s.cantes : [s.cantes[1]!, s.cantes[0]!];
  const done = s.phase === 'finished';
  const wt = done ? winnerTeam(s) : null;
  const winnerSlot: Slot = s.lastWinner ? slotOf(s.lastWinner) : 'bottom';
  const seat = (slot: 'top' | 'left' | 'right') => {
    const k = slots.indexOf(slot);
    if (k === -1) return null;
    const i = (myIdx + k) % n;
    const p = s.players[i]!;
    return (
      <SeatBadge info={info(i, p.name)} tone={n === 4 ? (i % 2 === myIdx % 2 ? 'us' : 'them') : 'them'} mano={false} turn={s.turn === i && s.phase === 'playing'} deadline={null}
        cards={s.hands[p.id]!.length} bubble={bubbles[p.id]} bubbleSide={slot === 'top' ? 'below' : slot === 'left' ? 'left' : 'right'} />
    );
  };
  const off = (slot: Slot) => {
    const sx = n === 4 ? 0.58 : 0;
    const sy = n === 4 ? 0.62 : 0.34;
    return { bottom: { x: 0, y: sy }, top: { x: 0, y: -sy }, right: { x: sx, y: 0 }, left: { x: -sx, y: 0 } }[slot];
  };
  const sings = myTurn ? singable(s, me) : [];
  const pills: PillSpec[] = [
    ...(myTurn && hasTute(s, me) ? [{ id: 'tute', tone: 'gold' as const, label: '¡TUTE!', onPress: () => dispatch(me, { k: 'tute' }) }] : []),
    ...sings.map((su: SpanishSuit): PillSpec => ({
      id: `s-${su}`, tone: su === s.trumpSuit ? 'gold' : 'ok', label: `${su === s.trumpSuit ? t('a.sing40') : t('a.sing20')} · ${SUIT_LABEL[su]}`,
      onPress: () => dispatch(me, { k: 'sing', suit: su }),
    })),
  ];
  const status = done ? '' : s.phase === 'trickDone' ? 'Baza completa…' : myTurn ? (legalIds.size < s.hands[me]!.length ? 'Te toca: asiste, monta o falla' : 'Te toca: toca una carta') : `Juega ${s.players[s.turn]!.name}…`;
  const myTricks = s.tricks[myTeam] ?? 0;

  const felt = (
    <>
      <div className="grid h-full grid-cols-[minmax(0,.7fr)_minmax(0,2.2fr)_minmax(0,.7fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-1 p-[clamp(6px,2vw,16px)]">
        <div className="col-start-2 row-start-1 justify-self-center">{seat('top')}</div>
        <div className="col-start-1 row-span-2 row-start-1 self-center justify-self-center">{seat('left')}</div>
        <div className="relative col-start-2 row-start-2 min-h-0" aria-label="Baza en mesa">
          <AnimatePresence custom={winnerSlot}>
            {s.trick.map((tp) => {
              const slot = slotOf(tp.playerId);
              const o = off(slot);
              const human = tp.playerId === me;
              return (
                <motion.div key={tp.card.id} className="absolute left-1/2 top-1/2" custom={winnerSlot} variants={trickVariants} exit="exit"
                  style={{ marginLeft: `calc(var(--card-w) * ${-0.36 + o.x})`, marginTop: `calc(var(--card-w) * ${-0.57 + o.y})`, zIndex: 2 }}
                  initial={human ? false : { x: DIR[slot].x * 160, y: DIR[slot].y * 160, opacity: 0, scale: 1.15 }}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }}>
                  <FaceCard card={tp.card} land scale={0.72} rotate={tilt(tp.card.id)} {...briscaDeco(tp.card, s.trumpSuit)} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="col-start-3 row-span-2 row-start-1 self-center justify-self-center">{seat('right')}</div>
      </div>
      <div className="absolute left-[clamp(6px,2vw,14px)] top-[clamp(6px,2vw,14px)] z-10 flex items-center gap-1.5" aria-label={`Quedan ${s.deck.length} cartas; triunfo ${SUIT_LABEL[s.trumpSuit]}`}>
        <div className="relative h-[calc(var(--card-w)*.4*1.583)] w-[calc(var(--card-w)*.84)]">
          <div className="absolute top-0 z-0" style={{ left: 'calc(var(--card-w) * .3165)' }}><FaceCard card={s.trumpCard} flipIn={0.35} scale={0.4} rotate={90} aura /></div>
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
          <b className={`truncate text-[13px] ${myTurn ? 'text-amber-200' : 'text-stone-200'}`}>{t('g.you')}</b>
          <span className="rounded-full border border-white/10 bg-zinc-900/70 px-2 py-[2px] text-[10px] font-bold text-stone-300">{myTricks} bazas</span>
        </div>
        <span className="text-[11px] text-stone-400">Triunfo: <b className="text-amber-200">{SUIT_LABEL[s.trumpSuit]}</b></span>
      </div>
      <PillBar pills={pills} idle={pills.length === 0 ? status : undefined} />
      <p className="sr-only" aria-live="polite">{status}</p>
      <div className="flex items-end justify-center gap-[min(1.2vw,8px)] pt-[min(3.2dvh,24px)]" role="group" aria-label="Tu mano">
        {s.hands[me]!.map((c, i, arr) => (
          <FaceCard key={c.id} card={c} deal={i} scale={arr.length > 6 ? 0.66 : 0.8} rotate={(i - (arr.length - 1) / 2) * 1.4}
            dim={myTurn && !legalIds.has(c.id)} {...briscaDeco(c, s.trumpSuit)} onSelect={myTurn && legalIds.has(c.id) ? play : undefined} />
        ))}
      </div>
    </>
  );

  const labels: [string, string] = n === 4 ? [t('ser.us'), t('ser.them')] : [t('ser.you'), online ? t('ser.rival') : botName(1)];
  return (
    <GameFrame
      gameId="tute"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.trick.length}:${s.hands[me]!.length}`, onTimeout: () => { const l = legalCards(s, me); const c = l[Math.floor(Math.random() * l.length)]; if (c) play(c); } }}
      header={<ScorePair labels={labels} values={[pts[0]!, pts[1]!]} target={120} subs={[myCantes[0] ? `cantes +${myCantes[0]}` : null, myCantes[1] ? `cantes +${myCantes[1]}` : null]} />}
      strip={(
          <SeriesGems entries={[{ key: 'me', label: labels[0], wins: series.wins.me ?? 0 }, { key: 'them', label: labels[1], wins: series.wins.them ?? 0 }]} />
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
                taunt="Te han cantado las cuarenta"
                title={champion !== null ? (champion === 'me' ? t('ser.champion') : t('ser.lost')) : wt === null ? '=' : t('ser.roundWin', { w: wt === myTeam ? labels[0] : labels[1] })}
                actions={[
                  ...(online
                    ? hostLike ? [{ label: champion !== null ? t('ser.newSeries') : t('ser.next'), primary: true, onClick: hostStart }] : []
                    : [{ label: champion !== null ? t('ser.newSeries') : t('ser.next'), primary: true, onClick: () => start(count!) }, { label: t('a.format'), onClick: () => { setCount(null); setS(null); } }]),
                  { label: t('a.lobby'), onClick: () => { if (online) setActiveRoom(null); void exitMatch(nav); } },
                ]}
              >
                <ScorePair labels={labels} values={[pts[0]!, pts[1]!]} />
                <p className="mt-2 text-center text-[12px] text-stone-400">
                  {s.tuteTeam !== null ? '¡Tute! Gana la partida.' : `Cartas ${s.tricks.map((_, tm) => s.players.reduce((a, p, i) => (teamOf(s, i) === tm ? a + s.won[p.id]!.reduce((x, c) => x + briscaPts(c), 0) : a), 0)).join(' · ')} · cantes ${s.cantes.join(' · ')} · +10 de últimas`}
                </p>
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
