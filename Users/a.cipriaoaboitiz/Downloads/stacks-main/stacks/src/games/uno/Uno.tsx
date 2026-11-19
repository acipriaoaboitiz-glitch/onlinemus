import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { juice } from '../../services/juice.ts';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, RotateCw } from 'lucide-react';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { TableAvatar } from '../mus/app/components/TableAvatar.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { CARD_EASE, botDelay, feedback } from '../../store/settings.ts';
import { useT, botName, tr } from '../../i18n/index.ts';
import { wallet } from '../../store/wallet.ts';
import { SeriesGems, useSeries } from '../shared/series.tsx';
import { GameFrame } from '../shared/GameFrame.tsx';
import { Banner, PhaseCinematic, PillBar, ResultOverlay, useBanner, useCine, type PillSpec } from '../shared/kit.tsx';
import {
  COLORS, COLOR_NAME, UNO_WINDOW, applyUnoAction, botMove, callUno, catchUno, expireUno, handPoints, isPlayable, newGame, playableCards,
  type Color, type UnoAction, type UnoCard, type UnoPlayer, type UnoState,
} from './engine.ts';
import { UNO_HEX, UnoBack, UnoCard as UnoCardView } from './UnoCard.tsx';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameTimeout } from '../../services/timers.ts';

const cap = (t: string): string => t.charAt(0).toUpperCase() + t.slice(1);

const WIN_BONUS = 100;
type Slot = 'bottom' | 'right' | 'top' | 'left';
const SLOT: Record<2 | 3 | 4, Slot[]> = { 2: ['bottom', 'top'], 3: ['bottom', 'right', 'left'], 4: ['bottom', 'right', 'top', 'left'] };
const botNames = (): string[] => [botName(1), botName(2), botName(3)];

const makePlayers = (n: 2 | 3 | 4): UnoPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: i === 0 ? tr('g.you') : botNames()[i - 1]!, human: i === 0 }));

const colorOrder = (c: UnoCard['color']): number => (c === 'wild' ? 9 : COLORS.indexOf(c));
const sortHand = (h: UnoCard[]): UnoCard[] =>
  [...h].sort((a, b) => colorOrder(a.color) - colorOrder(b.color) || (a.kind === 'num' ? a.n : 20) - (b.kind === 'num' ? b.n : 20));

/** Lado de la mesa donde se sienta `id` visto desde `me`. */
const slotOfPlayer = (st: UnoState, me: string, id: string): Slot => {
  const n = st.players.length;
  const myI = Math.max(0, st.players.findIndex((p) => p.id === me));
  return SLOT[n as 2 | 3 | 4][(st.players.findIndex((p) => p.id === id) - myI + n) % n]!;
};
/** Desde dónde sale (en px respecto al descarte) la carta que tira cada lado, y hacia dónde vuela una carta robada. */
const reach = (slot: Slot, k: number): { x: number; y: number } => {
  const W = typeof window === 'undefined' ? 360 : window.innerWidth;
  const H = typeof window === 'undefined' ? 640 : window.innerHeight;
  return slot === 'top' ? { x: 0, y: -H * 0.26 * k } : slot === 'left' ? { x: -W * 0.33 * k, y: -H * 0.03 * k } : slot === 'right' ? { x: W * 0.33 * k, y: -H * 0.03 * k } : { x: 0, y: H * 0.32 * k };
};
const SPRING = { type: 'spring', stiffness: 420, damping: 26 } as const;

/**
 * Anillo orbital: aro luminoso del color activo y tres cometas con flecha que giran en el sentido real del turno.
 * En la mesa los jugadores se sientan abajo → derecha → arriba → izquierda, es decir, sentido ANTIHORARIO con dir = 1.
 * Al invertirse el sentido: destello dorado, el giro viejo se desvanece y el nuevo toma el relevo en dirección contraria.
 */
function OrbitRing({ color, ccw }: { color: string; ccw: boolean }) {
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: 'calc(var(--card-w) * 2.5)', aspectRatio: '1' }}>
      <svg shapeRendering="geometricPrecision" viewBox="-100 -100 200 200" className="absolute inset-0 size-full" style={{ overflow: 'visible' }}>
        <circle r="92" fill="none" stroke={color} strokeWidth="9" opacity=".12" style={{ transition: 'stroke .3s' }} />
        <circle r="92" fill="none" stroke={color} strokeWidth="1.6" opacity=".5" style={{ transition: 'stroke .3s' }} />
      </svg>
      <AnimatePresence initial={false}>
        <motion.div key={ccw ? 'ccw' : 'cw'} className="absolute inset-0" initial={{ opacity: 0, scale: 0.82, rotate: ccw ? 40 : -40 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, transition: { duration: 0.12 } }} transition={{ type: 'spring', stiffness: 240, damping: 10 }}>
          <div className={`orbit-spin size-full ${ccw ? 'ccw' : ''}`}>
            <svg shapeRendering="geometricPrecision" viewBox="-100 -100 200 200" className="size-full" style={{ overflow: 'visible', transform: ccw ? 'scaleX(-1)' : undefined }}>
              <circle r="92" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round" pathLength="360" strokeDasharray="38 82" style={{ transition: 'stroke .3s' }} />
              {[40, 160, 280].map((a) => (
                <polygon key={a} points="-9,-8 4,0 -9,8" fill="#FFF8DC" transform={`rotate(${a}) translate(92 0) rotate(90)`} />
              ))}
            </svg>
          </div>
        </motion.div>
      </AnimatePresence>
      {mounted.current && (
        <motion.svg key={ccw ? 'f1' : 'f0'} viewBox="-100 -100 200 200" className="absolute inset-0 size-full" style={{ overflow: 'visible' }} initial={{ opacity: 1, scale: 0.92 }} animate={{ opacity: 0, scale: 1.18 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
          <circle r="92" fill="none" stroke="#FFF3B0" strokeWidth="7" />
        </motion.svg>
      )}
    </div>
  );
}

const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });

export default function Uno() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('uno');
  const online = seating.online;
  const [count, setCount] = useState<2 | 3 | 4 | null>(null);
  const [s, setS] = useState<UnoState | null>(null);
  const [pickFor, setPickFor] = useState<UnoCard | null>(null);
  const [marks, setMarks] = useState<Record<string, { text: string; at: number } | undefined>>({});
  const [flights, setFlights] = useState<{ id: number; slot: Slot; delay: number }[]>([]);
  const [penalty, setPenalty] = useState<{ id: number; text: string; toMe: boolean } | null>(null);
  const flightId = useRef(0);
  const penaltyId = useRef(0);
  const prevS = useRef<UnoState | null>(null);
  const seenHand = useRef<Set<string>>(new Set());
  /** Cartas boca abajo que salen del mazo hacia un asiento (reparto de 7 cartas, 40 ms entre carta y carta). */
  const flyCards = useCallback((slot: Slot, count: number, base: number, silent: boolean): void => {
    for (let i = 0; i < count; i++) {
      const id = ++flightId.current;
      const delay = base + i * 0.085;
      setFlights((f) => [...f, { id, slot, delay }]);
      if (!silent) gameTimeout(() => feedback('draw'), delay * 1000);
      gameTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 700 + delay * 1000);
    }
  }, []);
  const { banner, show } = useBanner(1500);
  const { cine, show: showCine } = useCine();
  const paid = useRef(false);
  const lastSeq = useRef('');
  // Quién soy: en una sala, el jugador con mi peerId; en local, siempre p0.
  const me = online ? s?.players.find((p) => p.peerId === seating.myPeerId)?.id ?? 'p0' : 'p0';

  const start = (n: 2 | 3 | 4) => { setCount(n); setS(newGame(makePlayers(n))); setMarks({}); setPickFor(null); paid.current = false; lastSeq.current = ''; };

  // Online: el anfitrión reparte con los humanos de la sala y, si está activado, rellena con bots.
  const hostStart = () => {
    const humans = seating.humans;
    const n = Math.min(4, Math.max(2, seating.fillBots ? 4 : humans.length)) as 2 | 3 | 4;
    const players: UnoPlayer[] = Array.from({ length: n }, (_, i) => i < humans.length
      ? { id: `p${i}`, name: humans[i]!.name, human: true, peerId: humans[i]!.peerId }
      : { id: `p${i}`, name: botNames()[i - humans.length] ?? botName(i), human: false });
    setS(newGame(players)); setMarks({}); setPickFor(null); paid.current = false; lastSeq.current = '';
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<UnoState, UnoAction>(seating, s, setS, applyUnoAction, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);
  const hostLike = !online || seating.isHost;

  // IA: juega con una pausa natural.
  useEffect(() => {
    if (!s || s.winner || !hostLike) return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const t = gameTimeout(() => {
      setS((cur) => {
        if (!cur || cur.winner || cur.players[cur.turn]!.id !== p.id) return cur;
        const m = botMove(cur);
        return applyUnoAction(cur, p.id, m.type === 'play' ? { k: 'play', cardId: m.cardId, color: m.color } : { k: m.type }) ?? applyUnoAction(cur, p.id, { k: 'pass' }) ?? cur;
      });
    }, botDelay());
    return () => window.clearTimeout(t);
  }, [s]);

  // «¡UNO!»: los bots lo cantan casi siempre (a veces se olvidan: puedes cazarlos con +2) y también te cazan a ti.
  const unoPid = s?.uno?.pid;
  const unoAt = s?.uno?.at;
  useEffect(() => {
    if (!unoPid || !unoAt || !hostLike) return;
    const timers: number[] = [];
    const left = Math.max(0, UNO_WINDOW - (Date.now() - unoAt));
    timers.push(gameTimeout(() => setS((cur) => (cur?.uno?.at === unoAt ? expireUno(cur) ?? cur : cur)), left));
    const bots = s!.players.filter((p) => !p.human && p.id !== unoPid);
    if (!s!.players.find((p) => p.id === unoPid)!.human) {
      // Un bot se queda con 1 carta: 70 % lo canta; si no, tienes el margen para cazarlo.
      if (Math.random() < 0.7) timers.push(gameTimeout(() => setS((cur) => (cur?.uno?.at === unoAt ? callUno(cur, unoPid) ?? cur : cur)), 700 + Math.random() * 700));
    } else if (bots.length && Math.random() < 0.6) {
      // Tú te has quedado con 1 carta: si tardas, un bot te caza.
      const by = bots[Math.floor(Math.random() * bots.length)]!;
      timers.push(gameTimeout(() => setS((cur) => (cur?.uno?.at === unoAt ? catchUno(cur, by.id) ?? cur : cur)), 1500 + Math.random() * 800));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unoPid, unoAt, hostLike]);

  // Aterrizaje de una carta: sonido de vuelo para los rivales, golpe de fieltro con el comodín. Se detecta por
  // transición de estado (no por el temporizador del anfitrión) para que también lo vean los invitados de la sala.
  useEffect(() => {
    const prev = prevS.current;
    prevS.current = s;
    if (!s || !prev || s.discard.length <= prev.discard.length) return;
    const by = prev.players[prev.turn];
    const card = s.discard[s.discard.length - 1]!;
    if (by && by.id !== me) { feedback('whoosh'); gameTimeout(() => feedback('play'), 170); }
    if (card.kind === 'wild') gameTimeout(() => juice.slam(), 200);
  }, [s, me]);

  // Sucesos: globos de los bots, avisos pegados al avatar, vuelo escalonado de cartas, sonidos.
  useEffect(() => {
    const e = s?.event;
    const key = `${e?.seq}:${e?.by}:${e?.text}`;
    if (!s || !e || key === lastSeq.current) return;
    lastSeq.current = key;
    const who = s.players.find((p) => p.id === e.by)!;
    if (e.kind === 'draw' && who.id !== me && e.text.includes('+4') && e.text.endsWith(s.players.find((p) => p.id === me)?.name ?? '#')) show(`${who.name} te echa un +4 · Color ${cap(COLOR_NAME[s.color])}`);
    if (e.kind !== 'draw' && e.text !== 'Roba una carta') feedback(e.kind === 'uno' ? 'trick' : 'deal'); // robar suena carta a carta
    const n = s.players.length;
    const slotOfId = (id: string): Slot => slotOfPlayer(s, me, id);
    // N cartas boca abajo salen del mazo de una en una (85 ms) hacia quien las roba.
    const fly = (slot: Slot, count = 1): void => {
      for (let i = 0; i < count; i++) {
        const id = ++flightId.current;
        setFlights((f) => [...f, { id, slot, delay: i * 0.085 }]);
        gameTimeout(() => feedback('draw'), i * 85);
        gameTimeout(() => setFlights((f) => f.filter((x) => x.id !== id)), 700 + i * 85);
      }
    };
    const markPlayer = (id: string, text: string): void => {
      const at = Date.now();
      setMarks((m) => ({ ...m, [id]: { text, at } }));
      gameTimeout(() => setMarks((m) => (m[id]?.at === at ? { ...m, [id]: undefined } : m)), 1700);
    };
    if (e.text === 'Roba una carta') fly(slotOfId(e.by));
    else if (e.kind === 'draw') {
      const caught = /caza a (.+): \+2$/.exec(e.text);
      const victim = caught ? s.players.find((p) => p.name === caught[1]) : s.players.find((p) => e.text.endsWith(p.name));
      if (victim) {
        const cnt = e.text.includes('+4') ? 4 : 2;
        markPlayer(victim.id, `+${cnt}`); fly(slotOfId(victim.id), cnt);
        const pid = ++penaltyId.current;
        setPenalty({ id: pid, text: `+${cnt}`, toMe: victim.id === me });
        gameTimeout(() => setPenalty((cur) => (cur?.id === pid ? null : cur)), 1700);
        if (!caught) juice.cinematic({ title: cnt === 4 ? '¡+4!' : '¡+2!', sub: `${who.name} → ${victim.name}`, tone: 'ruby', good: who.id === me });
      }
    } else if (e.text === 'Salta turno') {
      const idx = s.players.findIndex((p) => p.id === e.by);
      const skipped = s.players[(idx + s.dir + n) % n];
      if (skipped) { markPlayer(skipped.id, 'Ø'); juice.cinematic({ title: '¡SALTO DE TURNO!', sub: `${skipped.name} pierde el turno`, tone: 'electric', good: who.id === me }); }
    }
    const colorTone = ({ red: 'ruby', green: 'emerald', blue: 'electric', yellow: 'gold' } as const)[s.color];
    if (e.text.startsWith('Color ')) juice.cinematic({ title: '¡CAMBIO DE COLOR!', sub: `${who.name} · ${e.text}`, tone: colorTone, good: who.id === me });
    if (e.text === 'Cambio de sentido') juice.cinematic({ title: '¡CAMBIO DE SENTIDO!', sub: who.name, tone: colorTone, good: who.id === me });
    if (e.kind === 'uno') {
      if (who.id !== me) markPlayer(who.id, '¡UNO!'); // destello junto al avatar del bot que lo canta
      juice.cinematic({ title: '¡ÚLTIMA CARTA · UNO!', sub: who.name, tone: colorTone, good: who.id === me });
    }
    if (who.id === me) show(e.text);
  }, [s, show, me]);

  // Al mejor de 3 rondas: gana la ronda quien se queda sin cartas; la serie, quien llegue a 2 estrellas.
  const series = useSeries();
  const { record: recordRound, roundStarted } = series;
  useEffect(() => {
    if (s && !s.winner) { paid.current = false; roundStarted(); }
    if (!s?.winner || paid.current) return;
    paid.current = true;
    juice.chips(slotOfPlayer(s, me, s.winner) === 'bottom' ? 'me' : (slotOfPlayer(s, me, s.winner) as 'top' | 'left' | 'right'));
    recordRound(s.winner);
  }, [s, me, recordRound, roundStarted]);
  const champion = series.champion;
  useEffect(() => {
    if (champion === me) { wallet.add(WIN_BONUS); wallet.recordWin('uno'); showCine('¡VICTORIA!', `+${WIN_BONUS} fichas`); }
  }, [champion, me, showCine]);

  const myHand = s?.hands[me] ?? [];
  const sorted = useMemo(() => sortHand(myHand), [myHand]);
  // Cartas nuevas en tu mano (robo, +2/+4): las jugables hacen un giro 3D real al aparecer. En el reparto (7 nuevas) no.
  const fresh = new Set(sorted.filter((c) => !seenHand.current.has(c.id)).map((c) => c.id));
  const flipOk = seenHand.current.size > 0 && fresh.size > 0 && fresh.size <= 4;
  useEffect(() => { seenHand.current = new Set(sorted.map((c) => c.id)); });

  // Reparto: al empezar cada ronda, las 7 cartas de cada rival salen del mazo una a una, en arco (40 ms).
  const dealKey = s ? `${s.discard[0]?.id}:${s.hands[me]?.[0]?.id}:${s.players.length}` : '';
  useEffect(() => {
    if (!s || !dealKey || s.discard.length !== 1) return;
    const n = s.players.length;
    for (let c = 0; c < 7; c++) for (let k = 0; k < n; k++) {
      const p = s.players[k]!;
      if (p.id !== me) flyCards(slotOfPlayer(s, me, p.id), 1, (c * n + k) * 0.04, (c * n + k) % 3 !== 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealKey]);

  // Abanico interactivo: un único manejador en el contenedor (en táctil el primer objetivo captura el puntero, así que
  // se averigua la carta con elementFromPoint) y solo se re-renderiza cuando cambia la carta señalada.
  const [hot, setHot] = useState(-1);
  const hotRef = useRef(-1);
  const handRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const handLen = myHand.length;
  useLayoutEffect(() => { const el = handRef.current; if (el) setScrollable(el.scrollWidth > el.clientWidth + 2); }, [handLen]);
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    const el = t instanceof Element ? t.closest<HTMLElement>('[data-hi]') : null;
    const i = el ? Number(el.dataset.hi) : -1;
    if (i !== hotRef.current) { hotRef.current = i; setHot(i); if (i >= 0) feedback('tick'); }
  };
  const unscrub = () => { if (hotRef.current !== -1) { hotRef.current = -1; setHot(-1); } };

  // Jugadas propias: solo en tu turno; «¡UNO!» se puede pulsar siempre.
  const act = (a: UnoAction) => { if (s && !s.winner && s.players[s.turn]!.id === me) dispatch(me, a); };

  if (!s && online) {
    return (
      <GameFrame gameId="uno" onExit={() => { setActiveRoom(null); void exitMatch(nav); }}
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">Uno</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">Conectando con la mesa…</p></div>}
        bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame
        gameId="uno"
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">Uno</p>}
        felt={
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">¿Cuántos jugadores?</h2>
              <Button variant="primary" block onClick={() => start(4)}>4 jugadores · tú + 3 IA</Button>
              <Button variant="secondary" block onClick={() => start(3)}>3 jugadores · tú + 2 IA</Button>
              <Button variant="secondary" block onClick={() => start(2)}>1 vs 1 · contra la IA</Button>
              <p className="text-xs text-stone-400">Vacía tu mano primero. Juega por color o por número; el +4 solo si no tienes el color en juego.</p>
            </div>
          </div>
        }
        bottom={null}
      />
    );
  }

  const nPlayers = s.players.length as 2 | 3 | 4;
  const slots = SLOT[nPlayers];
  const myIdx = Math.max(0, s.players.findIndex((p) => p.id === me));
  const myTurn = !s.winner && s.players[s.turn]!.id === me;
  const playable = myTurn ? new Set(playableCards(s, me).map((c) => c.id)) : new Set<string>();
  const canDraw = myTurn && !s.drawn && playable.size === 0;
  const topCard = s.discard[s.discard.length - 1]!;
  // Quién tiró la carta que acaba de caer (el estado anterior sigue en la referencia durante este render).
  const pv = prevS.current;
  const byPrev = pv && s.discard.length > pv.discard.length ? pv.players[pv.turn] : undefined;
  const fromSlot: Slot | null = byPrev ? slotOfPlayer(s, me, byPrev.id) : null;
  const from = reach(fromSlot ?? 'bottom', 1);
  const wobble = ((Number(topCard.id.slice(1)) % 5) - 2) * 14;
  const bigCard = topCard.kind !== 'num';
  const seat = (slot: 'top' | 'left' | 'right') => {
    const k = slots.indexOf(slot);
    if (k === -1) return null;
    const i = (myIdx + k) % nPlayers;
    const p = s.players[i]!;
    const n = s.hands[p.id]!.length;
    return (
      <SeatBadge info={info(i, `${p.name} · ${n}`)} tone="them" mano={false} turn={s.turn === i && !s.winner} deadline={null}
        cards={n} badge={marks[p.id]?.text} alert={marks[p.id]?.text?.startsWith('+') ?? false} aura={n === 1} />
    );
  };

  const choose = (color: Color) => {
    const card = pickFor;
    setPickFor(null);
    if (card) act({ k: 'play', cardId: card.id, color });
  };
  // Un toque lanza la carta a la mesa (los comodines abren antes el selector de color).
  const onCard = (c: UnoCard) => {
    if (!myTurn || !isPlayable(s, c, myHand)) return;
    feedback('play');
    if (c.color === 'wild') { setPickFor(c); return; }
    act({ k: 'play', cardId: c.id });
  };
  const pressUno = () => {
    feedback('win');
    if (!s.winner) dispatch(me, { k: 'uno' });
  };

  const pills: PillSpec[] = pickFor ? [] : myTurn && s.drawn
    ? [{ id: 'pass', tone: 'soft', label: t('a.pass'), onPress: () => act({ k: 'pass' }) }]
    : [];
  const unoPending = !pickFor && !s.winner && s.uno ? s.uno : null;
  const status = s.winner ? '' : myTurn ? (s.drawn ? 'Puedes jugar la carta robada o pasar' : canDraw ? 'No tienes jugada: toca el mazo' : 'Te toca: elige una carta') : `Juega ${s.players[s.turn]!.name}…`;

  const felt = (
    <>
      <div className="grid h-full grid-cols-[minmax(0,.7fr)_minmax(0,2.2fr)_minmax(0,.7fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-1 p-[clamp(6px,2vw,16px)]">
        <div className="col-start-2 row-start-1 justify-self-center">{seat('top')}</div>
        <div className="col-start-1 row-span-2 row-start-1 self-center justify-self-center">{seat('left')}</div>
        <div className="col-start-2 row-start-2 grid min-h-0 place-items-center">
          <div className="grid justify-items-center gap-3">
            <div className="relative flex items-center gap-[min(4vw,18px)]">
              <OrbitRing color={UNO_HEX[s.color]} ccw={s.dir === 1} />
              {/* halo del color activo */}
              <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-[background] duration-300"
                style={{ background: `radial-gradient(circle, ${UNO_HEX[s.color]}55 0%, ${UNO_HEX[s.color]}00 68%)` }} />
              <div className="relative grid justify-items-center gap-1">
                <div role="button" tabIndex={canDraw ? 0 : -1} aria-label="Mazo: robar carta" aria-disabled={!canDraw}
                  onClick={canDraw ? () => { feedback('draw'); act({ k: 'draw' }); } : undefined}
                  onKeyDown={canDraw ? (e) => { if (e.key === 'Enter' || e.key === ' ') { feedback('draw'); act({ k: 'draw' }); } } : undefined}
                  className={`relative touch-manipulation rounded-xl ${canDraw ? 'cursor-pointer active:scale-95' : ''}`}
                  style={{ width: 'calc(var(--card-w) * 0.86)', aspectRatio: '2 / 3', marginRight: 8, marginTop: 8 }}>
                  {[4, 3, 2, 1, 0].map((k) => (
                    <span key={k} className="pointer-events-none absolute inset-0 block overflow-hidden rounded-xl" style={{ transform: `translate(${k * 1.6}px, ${-k * 1.6}px)`, boxShadow: k === 0 ? '0 3px 8px rgba(0,0,0,.5)' : undefined }}>
                      <UnoBack />
                    </span>
                  ))}
                  {flights.map((f) => {
                    const d = reach(f.slot, 1);
                    return (
                      <motion.div key={f.id} aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-xl"
                        initial={{ x: 0, y: 0, scale: 1, opacity: 0, rotate: 0 }}
                        animate={{ x: [0, d.x * 0.5 + (f.slot === 'left' ? -10 : 10), d.x], y: [0, d.y * 0.5 - 38, d.y], scale: [1, 0.85, 0.55], opacity: [0, 1, 1, 0], rotate: f.slot === 'left' ? [0, -14, -25] : [0, 14, 25] }}
                        transition={{ duration: 0.5, delay: f.delay, ease: 'easeOut', opacity: { duration: 0.5, delay: f.delay, times: [0, 0.1, 0.75, 1] } }}>
                        <UnoBack />
                      </motion.div>
                    );
                  })}
                  {canDraw && <span aria-hidden className="pointer-events-none absolute -inset-1 animate-pulse rounded-2xl" style={{ boxShadow: '0 0 0 2px #F5D061, 0 0 16px 2px rgba(245,208,97,.55)' }} />}
                </div>
                <span className="font-mono text-[10px] text-amber-200/80">{s.drawPile.length}</span>
              </div>
              <div className="relative" style={{ width: 'calc(var(--card-w) * 1.05)', height: 'calc(var(--card-w) * 0.9 * 1.5)' }}>
                {s.discard.length > 1 && (
                  <div className="absolute inset-0" style={{ transform: 'rotate(-6deg)' }}><UnoCardView card={s.discard[s.discard.length - 2]!} scale={1.05} dim /></div>
                )}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div key={topCard.id} className="absolute inset-0"
                    initial={fromSlot
                      ? { x: from.x + wobble, y: from.y, scale: bigCard ? 1.35 : 0.9, rotate: (fromSlot === 'left' ? -1 : 1) * 38 + wobble / 2, opacity: 1 }
                      : { scale: 1.25, opacity: 0, rotate: 14, y: -20, x: 0 }}
                    animate={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: (Number(topCard.id.slice(1)) % 9) - 4 }}
                    transition={{ x: { duration: 0.3, ease: 'easeOut' }, y: SPRING, scale: SPRING, rotate: SPRING, opacity: { duration: 0.1 } }}>
                    <UnoCardView card={topCard} scale={1.05} glow />
                  </motion.div>
                </AnimatePresence>
                {/* onda de impacto del color de la carta */}
                <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
                  <motion.span key={`r${topCard.id}`} className="block aspect-square w-[135%] rounded-full border-[3px]" style={{ borderColor: UNO_HEX[topCard.color === 'wild' ? s.color : topCard.color] }}
                    initial={{ opacity: 0, scale: 0.5 }} animate={{ scale: [0.5, 1.6], opacity: [0.75, 0] }} transition={{ duration: 0.55, delay: fromSlot ? 0.16 : 0, ease: 'easeOut' }} />
                </div>
                {/* castigo flotante (+2 / +4) sobre el descarte */}
                <AnimatePresence>
                  {penalty && (
                    <motion.div key={penalty.id} aria-hidden className="pointer-events-none absolute -left-4 -top-5 z-30 grid size-11 place-items-center rounded-full border-2 border-white/80 font-[var(--font-display)] text-[17px] font-black text-white"
                      style={{ background: 'radial-gradient(circle at 35% 30%, #F87171, #B91C1C)', boxShadow: '0 4px 12px rgba(0,0,0,.55)' }}
                      initial={{ scale: 0.3, opacity: 0, y: 10 }} animate={{ scale: [0.3, 1.25, 1], opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14, scale: 0.9 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                      {penalty.text}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-1.5" role="img" aria-label={`Color actual: ${COLOR_NAME[s.color]}. ${s.dir === 1 ? 'Sentido antihorario' : 'Sentido horario'}`}>
              <span className="size-3.5 rounded-full border border-white/60" style={{ background: UNO_HEX[s.color], boxShadow: `0 0 10px ${UNO_HEX[s.color]}` }} />
              {s.dir === 1 ? <RotateCcw size={14} className="text-stone-300" /> : <RotateCw size={14} className="text-stone-300" />}
            </div>
          </div>
        </div>
        <div className="col-start-3 row-span-2 row-start-1 self-center justify-self-center">{seat('right')}</div>
      </div>
      {penalty?.toMe && <div key={penalty.id} aria-hidden className="edge-pulse pointer-events-none fixed inset-0 z-[35]" />}
      <Banner text={banner} />
    </>
  );

  const bottom = (
    <>
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative grid shrink-0 place-items-center">
            {myHand.length === 1 && !s.winner && (
              <>
                <span aria-hidden className="aura-fire pointer-events-none absolute inset-[-7px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,214,90,0) 50%, rgba(255,196,60,.9) 63%, rgba(255,120,20,0) 76%)' }} />
                <span aria-hidden className="aura-fire pointer-events-none absolute inset-[-11px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,160,40,0) 55%, rgba(255,140,30,.65) 66%, rgba(255,80,10,0) 78%)', animationDelay: '.45s' }} />
              </>
            )}
            <TableAvatar name="Tú" tone="me" active={myTurn} className="size-9 text-[15px]" />
          </span>
          <b className={`truncate text-[13px] ${myTurn ? 'text-amber-200' : 'text-stone-200'}`}>Tú</b>
          <span className="whitespace-nowrap rounded-full border border-white/10 bg-zinc-900/70 px-2 py-[2px] text-[10px] font-bold text-stone-300">{myHand.length} {myHand.length === 1 ? "carta" : "cartas"}</span>
        </div>
        <span className="sr-only" aria-live="polite">{status}</span>
      </div>
      <AnimatePresence>
        {pickFor && (
          <motion.div role="group" aria-label="Elige un color" className="flex items-center gap-3 rounded-full border border-white/10 bg-zinc-900/95 px-3 py-2"
            initial={{ opacity: 0, y: 12, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8 }} transition={CARD_EASE}>
            {COLORS.map((c) => (
              <button key={c} type="button" aria-label={cap(COLOR_NAME[c])} onClick={() => choose(c)}
                className="size-12 touch-manipulation rounded-full border-2 border-white/80 transition active:scale-90"
                style={{ background: UNO_HEX[c], boxShadow: `0 0 14px 1px ${UNO_HEX[c]}aa` }} />
            ))}
            <button type="button" className="px-1 text-[12px] font-bold text-stone-400" onClick={() => setPickFor(null)}>Cancelar</button>
          </motion.div>
        )}
      </AnimatePresence>
      {unoPending && (
        <button type="button" onClick={pressUno} aria-label={unoPending.pid === me ? 'Cantar UNO' : 'Cazar: no ha cantado UNO'}
          className="uno-heart min-h-12 touch-manipulation rounded-full border-2 border-amber-100/80 px-7 text-[17px] font-black tracking-wide text-white"
          style={{ background: 'linear-gradient(180deg,#F87171,#B91C1C)', boxShadow: '0 4px 14px rgba(0,0,0,.5), 0 0 22px rgba(245,208,97,.55)' }}>
          {unoPending.pid === me ? '¡CANTAR UNO!' : '¡CAZAR! +2'}
        </button>
      )}
      <PillBar pills={pills} />
      <div ref={handRef} onPointerMove={scrub} onPointerDown={scrub} onPointerUp={unscrub} onPointerCancel={unscrub} onPointerLeave={unscrub}
        className="no-scrollbar w-full overflow-x-auto overflow-y-hidden pb-1 pt-[min(2.4dvh,18px)]" style={{ touchAction: scrollable ? 'pan-x' : 'none' }} role="group" aria-label="Tu mano">
        <div className="mx-auto flex w-max items-end px-2">
          {sorted.map((c, i) => (
            <div key={c.id} data-hi={i} style={{ marginLeft: i === 0 ? 0 : `calc(var(--card-w) * ${sorted.length > 9 ? -0.46 : sorted.length > 6 ? -0.34 : -0.12})`, zIndex: hot === i ? 60 : i }}>
              <UnoCardView card={c} deal={i} flip={flipOk && fresh.has(c.id) && playable.has(c.id)} scale={0.86} rotate={(i - (sorted.length - 1) / 2) * Math.min(3, 28 / sorted.length)} playable={playable.has(c.id)} lifted={hot === i} dim={myTurn && !playable.has(c.id)} onClick={myTurn && playable.has(c.id) ? () => onCard(c) : undefined} />
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const winner = s.winner ? s.players.find((p) => p.id === s.winner)! : null;
  return (
    <GameFrame
      gameId="uno" feltTone="emerald"
      timer={{ active: myTurn, id: `${s.turn}:${myHand.length}:${s.drawn?.id ?? ''}:${s.drawPile.length}`, onTimeout: () => { setPickFor(null); const m = botMove(s); act(m.type === 'play' ? { k: 'play', cardId: m.cardId, color: m.color } : { k: m.type }); } }}
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      strip={<SeriesGems entries={s.players.map((p) => ({ key: p.id, label: p.id === me ? t('ser.you') : p.name, wins: series.wins[p.id] ?? 0 }))} />}
      header={
        <div className="grid grid-cols-2 gap-[min(1.8vw,8px)]" role="group" aria-label="Estado">
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-teal-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-teal-300">Turno</p>
            <b className="block truncate text-[13px]">{s.winner ? '—' : s.players[s.turn]!.name}</b>
          </div>
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-orange-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">Mazo</p>
            <b className="block text-[13px] tabular-nums">{s.drawPile.length} cartas</b>
          </div>
        </div>
      }
      felt={felt}
      bottom={bottom}
      overlays={
        <>
          <PhaseCinematic cine={cine} />
          <AnimatePresence>
            {winner && (
              <ResultOverlay
                outcome={champion === null ? undefined : champion === me ? 'win' : 'lose'}
                prize={champion === me ? WIN_BONUS : 0}
                taunt={myHand.length <= 2 ? 'Por los pelos' : 'Te comiste el +4'}
                title={champion !== null ? (champion === me ? t('ser.champion') : t('ser.lost')) : t('ser.roundWin', { w: winner.id === me ? t('ser.you') : winner.name })}
                actions={[
                  ...(online
                    ? seating.isHost ? [{ label: champion !== null ? t('ser.newSeries') : t('ser.next'), primary: true, onClick: hostStart }] : []
                    : [{ label: champion !== null ? t('ser.newSeries') : t('ser.next'), primary: true, onClick: () => start(count!) }, { label: 'Cambiar jugadores', onClick: () => { setCount(null); setS(null); } }]),
                  { label: t('a.lobby'), onClick: () => { if (online) setActiveRoom(null); void exitMatch(nav); } },
                ]}
              >
                <ul className="grid gap-1 text-sm">
                  {s.players.map((p) => (
                    <li key={p.id} className="flex justify-between border-b border-white/10 py-1">
                      <span className={p.id === s.winner ? 'font-bold text-amber-300' : ''}>{p.name}</span>
                      <span className="tabular-nums text-stone-300">{s.hands[p.id]!.length} cartas · {handPoints(s.hands[p.id]!)} pts</span>
                    </li>
                  ))}
                </ul>
                {champion === me && <p className="mt-2 text-center text-sm font-bold text-amber-300">+{WIN_BONUS} fichas de premio</p>}
                <p className="mt-2 text-center text-[11px] text-stone-400">{t('ser.round', { n: series.played })}</p>
              </ResultOverlay>
            )}
          </AnimatePresence>
        </>
      }
    />
  );
}
