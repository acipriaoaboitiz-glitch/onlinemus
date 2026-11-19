import { Trophy } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { TableAvatar } from '../mus/app/components/TableAvatar.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { Bubble } from '../mus/app/game/describe.ts';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { SPANISH_SUITS, SUIT_LABEL, type AnyCard, type SpanishCard, type SpanishSuit } from '../../engine/deck.ts';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { juice } from '../../services/juice.ts';
import { useT, botName, tr } from '../../i18n/index.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { Banner, FaceCard, PhaseCinematic, PillBar, ResultOverlay, ScoreStrip, useBanner, useCine, type PillSpec } from '../shared/kit.tsx';
import {
  LADDER, OPENER, SEISES_LIMIT, SIX_INDEX, WIN_ROUND, applySeisesAction, botMove, canPass, isPlayable, ladderIndex, newSeises,
  type SPlayer, type SeisesAction, type SeisesState,
} from './engine.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameTimeout } from '../../services/timers.ts';

const WIN_BONUS = 100;
const names = (): string[] => [tr('g.you'), botName(1), botName(2), botName(3)];
const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });
const makePlayers = (n: number): SPlayer[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: n === 2 && i === 1 ? botName(1) : names()[i]!, human: i === 0 }));

/** Altura visible de cada escalón del carril: solo asoma la parte alta de cada carta. */
const STEP = 0.3;
const CARD_SCALE = 0.62;

/** Un carril por palo: el 6 va en el centro, hacia arriba 7 → Rey y hacia abajo 5 → As. */
function Lane({ suit, lane, last }: { suit: SpanishSuit; lane: SeisesState['board'][SpanishSuit]; last: SpanishCard | null }) {
  const slots = LADDER.length;
  return (
    <div className="grid justify-items-center gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-[.08em] text-amber-200/80">{SUIT_LABEL[suit]}</span>
      <div className="relative" style={{ width: `calc(var(--card-w) * ${CARD_SCALE})`, height: `calc(var(--card-w) * ${CARD_SCALE} * 1.583 * (1 + ${STEP} * ${slots - 1}))` }}>
        {LADDER.map((rank, idx) => {
          const placed = lane !== null && idx >= lane.lo && idx <= lane.hi;
          const top = `calc(var(--card-w) * ${CARD_SCALE} * 1.583 * ${STEP} * ${slots - 1 - idx})`;
          if (!placed) {
            return (
              <span key={rank} aria-hidden className="absolute left-0 right-0 rounded-[4px] border border-dashed border-white/15"
                style={{ top, height: `calc(var(--card-w) * ${CARD_SCALE} * 1.583 * ${STEP} - 2px)`, display: idx === SIX_INDEX || idx === 0 || idx === slots - 1 ? 'grid' : 'block', placeItems: 'center' }}>
                {(idx === SIX_INDEX || idx === 0 || idx === slots - 1) && <span className="text-[9px] font-bold text-white/25">{rank}</span>}
              </span>
            );
          }
          const card: SpanishCard = { deck: 'es', id: `${suit[0]}${rank}`, suit, rank };
          const fresh = last?.id === card.id;
          return (
            <motion.div key={card.id} className="absolute left-0 will-change-transform" style={{ top, zIndex: slots - idx, width: '100%' }}
              initial={fresh ? { y: 60, opacity: 0, scale: 1.12 } : false} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
              <FaceCard card={card} scale={CARD_SCALE} badge={String(rank)} glow={fresh} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default function Seises() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('seises');
  const online = seating.online;
  const [count, setCount] = useState<2 | 3 | 4 | null>(null);
  const [s, setS] = useState<SeisesState | null>(null);
  const [bubbles, setBubbles] = useState<Record<number, Bubble | undefined>>({});
  const { banner } = useBanner(1300);
  const { cine, show: showCine } = useCine();
  const lastEv = useRef('');
  const paid = useRef(false);
  const myIdx = online ? Math.max(0, s?.players.findIndex((p) => p.peerId === seating.myPeerId) ?? 0) : 0;
  const me = s?.players[myIdx]?.id ?? 'p0';
  const hostLike = !online || seating.isHost;
  const nm = (i: number): string => s?.players[i]?.name ?? names()[i] ?? `J${i + 1}`;

  const reset = () => { setBubbles({}); lastEv.current = ''; paid.current = false; };
  const start = (n: 2 | 3 | 4) => { reset(); setCount(n); setS(newSeises(makePlayers(n))); };

  // Online: el anfitrión reparte con los humanos de la sala (2–4) y rellena con bots si está activado.
  const hostStart = () => {
    const humans = seating.humans;
    const n = Math.min(4, Math.max(2, seating.fillBots ? 4 : humans.length));
    const players: SPlayer[] = Array.from({ length: n }, (_, i) => i < humans.length
      ? { id: `p${i}`, name: humans[i]!.name, human: true, peerId: humans[i]!.peerId }
      : { id: `p${i}`, name: names()[i - humans.length + 1] ?? botName(i), human: false });
    reset();
    setS(newSeises(players));
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<SeisesState, SeisesAction>(seating, s, setS, applySeisesAction, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);

  // IA: el que abre con el 6 de oros lo tira automáticamente a los ~400 ms; el resto, con su pausa natural.
  useEffect(() => {
    if (!s || s.phase !== 'playing' || !hostLike || s.players[s.turn]!.human) return;
    const timer = gameTimeout(() => {
      setS((cur) => {
        if (!cur || cur.phase !== 'playing' || cur.players[cur.turn]!.human) return cur;
        const m = botMove(cur);
        const id = cur.players[cur.turn]!.id;
        return applySeisesAction(cur, id, m.type === 'play' ? { k: 'play', cardId: m.cardId } : { k: 'pass' }) ?? cur;
      });
    }, s.board.oros === null ? 400 : botDelay());
    return () => window.clearTimeout(timer);
  }, [s, hostLike]);

  // Avisos y sonidos (en todas las pantallas).
  const lastCardId = s?.last?.card.id;
  useEffect(() => { if (lastCardId) feedback('deal'); }, [lastCardId]);
  useEffect(() => {
    const e = s?.event;
    const key = `${e?.seq}:${e?.by}`;
    if (!s || !e || key === lastEv.current) return;
    lastEv.current = key;
    if (e.kind === 'out') juice.impact(e.by === myIdx ? '¡SIN CARTAS! −10' : `${nm(e.by)} · −10`, e.by === myIdx ? 'gold' : 'neon');
    if (e.by === myIdx) return;
    const at = Date.now();
    setBubbles((b) => ({ ...b, [e.by]: { text: e.kind === 'out' ? '¡Sin cartas!' : e.text, tone: e.kind === 'out' ? 'good' : 'neutral', at } }));
    gameTimeout(() => setBubbles((b) => (b[e.by]?.at === at ? { ...b, [e.by]: undefined } : b)), 1500);
  }, [s, myIdx]);
  useEffect(() => {
    if (s && s.phase === 'playing') paid.current = false;
    if (!s || s.phase !== 'gameOver' || paid.current) return;
    paid.current = true;
    if (s.winner === myIdx) { wallet.add(WIN_BONUS); wallet.recordWin('seises'); juice.chips('me'); showCine('¡VICTORIA!', `+${WIN_BONUS} fichas`); }
  }, [s, myIdx, showCine]);

  // Un solo toque en una carta jugable la lanza a la mesa.
  const throwCard = useCallback((c: SpanishCard) => {
    feedback('play');
    dispatch(me, { k: 'play', cardId: c.id });
  }, [dispatch, me]);

  const pick = useCallback((c: AnyCard) => throwCard(c as SpanishCard), [throwCard]);
  const exit = () => { if (online) setActiveRoom(null); void exitMatch(nav); };

  if (!s && online) {
    return (
      <GameFrame gameId="seises" onExit={exit}
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">Los Seises</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">Conectando con la mesa…</p></div>}
        bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame
        gameId="seises"
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">Los Seises</p>}
        felt={
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">Escaleras al corte por palos</h2>
              <Button variant="primary" block onClick={() => start(4)}>4 jugadores · tú + 3 IA</Button>
              <Button variant="secondary" block onClick={() => start(3)}>3 jugadores · tú + 2 IA</Button>
              <Button variant="secondary" block onClick={() => start(2)}>1 vs 1 · contra la IA</Button>
              <p className="text-xs text-stone-400">Abre el 6 de oros. Coloca otro 6 o la carta de arriba o de abajo de un palo abierto. Quien se queda sin cartas resta 10; partida a {SEISES_LIMIT}.</p>
            </div>
          </div>
        }
        bottom={null}
      />
    );
  }

  const n = s.players.length;
  const myTurn = s.phase === 'playing' && s.turn === myIdx;
  const hand = s.hands[myIdx]!;
  const mustOpen = s.board.oros === null;
  const mayPass = canPass(s, myIdx);
  const opponents = Array.from({ length: n - 1 }, (_, k) => (myIdx + 1 + k) % n);
  const best = Math.min(...s.scores);
  const pills: PillSpec[] = myTurn ? [{ id: 'pass', tone: 'soft', label: t('a.pass'), disabled: !mayPass, onPress: () => dispatch(me, { k: 'pass' }) }] : [];
  const status = s.phase !== 'playing' ? '' : myTurn
    ? (mustOpen ? (hand.some((c) => c.id === OPENER) ? 'Te toca: abre con el 6 de oros' : '') : mayPass ? 'No tienes jugada: pasa' : 'Te toca: toca una carta dorada')
    : `Juega ${nm(s.turn)}…`;

  const felt = (
    <>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-1 p-[clamp(6px,2vw,16px)]">
        <div className="flex flex-wrap items-start justify-center gap-x-[min(4vw,18px)]">
          {opponents.map((i) => (
            <SeatBadge key={i} info={info(i, `${nm(i)} · ${s.hands[i]!.length}`)} tone="them" mano={false} turn={s.turn === i && s.phase === 'playing'} deadline={null}
              cards={s.hands[i]!.length} bubble={bubbles[i]} bubbleSide="below" />
          ))}
        </div>
        <div className="grid min-h-0 place-items-center" aria-label="Mesa: un carril por palo">
          <div className="flex items-start justify-center gap-[min(3vw,14px)]">
            {SPANISH_SUITS.map((suit) => <Lane key={suit} suit={suit} lane={s.board[suit]} last={s.last?.card ?? null} />)}
          </div>
        </div>
      </div>
      <Banner text={banner} />
    </>
  );

  const gap = hand.length > 13 ? -0.58 : hand.length > 9 ? -0.46 : hand.length > 6 ? -0.3 : -0.1;
  const bottom = (
    <>
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TableAvatar name={nm(myIdx)} tone="me" active={myTurn} className="size-9 text-[15px]" />
          <b className={`truncate text-[13px] ${myTurn ? 'text-amber-200' : 'text-stone-200'}`}>{online ? nm(myIdx) : t('g.you')}</b>
          <span className="whitespace-nowrap rounded-full border border-white/10 bg-zinc-900/70 px-2 py-[2px] text-[10px] font-bold text-stone-300">{hand.length} {hand.length === 1 ? 'carta' : 'cartas'}</span>
        </div>
        <span className="sr-only" aria-live="polite">{status}</span>
      </div>
      <PillBar pills={pills} />
      <div className="no-scrollbar w-full overflow-x-auto overflow-y-hidden pb-1 pt-[min(2.2dvh,16px)]" role="group" aria-label="Tu mano">
        <div className="mx-auto flex w-max items-end px-2">
          {hand.map((c, i) => {
            const ok = myTurn && isPlayable(s, c);
            return (
              <div key={c.id} style={{ marginLeft: i === 0 ? 0 : `calc(var(--card-w) * ${gap})`, zIndex: i }}>
                <FaceCard card={c} deal={i} scale={0.8} glow={ok} dim={myTurn && !ok} badge={ladderIndex(c) >= 0 ? String(c.rank) : undefined} onSelect={ok ? pick : undefined} />
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

  const over = s.phase === 'gameOver';
  return (
    <GameFrame
      gameId="seises"
      onExit={online ? exit : undefined}
      timer={{
        active: myTurn, id: `${s.turn}:${hand.length}:${s.roundNo}`,
        onTimeout: () => { const m = botMove(s); dispatch(me, m.type === 'play' ? { k: 'play', cardId: m.cardId } : { k: 'pass' }); },
      }}
      header={<ScoreStrip items={s.scores.map((v, i) => ({ name: nm(i), value: v, us: i === myIdx }))} target={SEISES_LIMIT} />}
      felt={felt}
      bottom={bottom}
      overlays={
        <>
          <PhaseCinematic cine={cine} />
          <AnimatePresence>
            {(s.phase === 'roundOver' || over) && s.lines && (
              <ResultOverlay
                outcome={over ? (s.winner === myIdx ? 'win' : 'lose') : undefined}
                prize={WIN_BONUS}
                taunt="Se te fueron los puntos"
                title={over ? (s.winner === myIdx ? t('g.win') : `Gana ${nm(s.winner ?? 0)}`) : s.roundWinner === myIdx ? '¡Ganas la ronda!' : `Gana la ronda ${nm(s.roundWinner ?? 0)}`}
                actions={[
                  ...(over
                    ? online ? (hostLike ? [{ label: t('a.rematch'), primary: true, onClick: hostStart }] : []) : [{ label: t('a.rematch'), primary: true, onClick: () => start(count!) }]
                    : hostLike ? [{ label: t('a.next'), primary: true, onClick: () => dispatch(me, { k: 'next' }) }] : []),
                  { label: t('a.lobby'), onClick: exit },
                ]}
              >
                <ul className="grid gap-1.5 text-sm" aria-label="Puntos de la ronda">
                  {s.lines.map((l, i) => (
                    <li key={i} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-1.5 ${i === s.roundWinner ? 'border-emerald-400/40 bg-emerald-900/25' : 'border-white/10 bg-white/5'}`}>
                      <span className={`min-w-0 truncate ${i === s.roundWinner ? 'font-bold text-amber-300' : ''}`}>{nm(i)}{over && i === s.winner ? <Trophy size={13} strokeWidth={1.75} className="ml-1 inline text-amber-300" aria-hidden /> : null}</span>
                      <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                        <b className={`rounded-full px-2 py-[1px] text-[12px] ${l.delta < 0 ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/10 text-stone-200'}`}>{l.delta > 0 ? '+' : ''}{l.delta} pts</b>
                        <span className="text-[12px] text-stone-300"><b className={i === s.scores.indexOf(best) ? 'text-amber-300' : 'text-stone-50'}>{s.scores[i]}</b> / {SEISES_LIMIT}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-center text-[11px] text-stone-400">Quien se queda sin cartas resta {Math.abs(WIN_ROUND)}; los demás suman las que les quedan.</p>
                {over && s.winner === myIdx && <p className="mt-2 text-center text-sm font-bold text-amber-300">+{WIN_BONUS} fichas de premio</p>}
              </ResultOverlay>
            )}
          </AnimatePresence>
        </>
      }
    />
  );
}
