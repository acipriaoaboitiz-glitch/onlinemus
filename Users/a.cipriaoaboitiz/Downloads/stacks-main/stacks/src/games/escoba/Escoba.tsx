import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { CardBack } from '../mus/app/components/CardFace.tsx';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { TableAvatar } from '../mus/app/components/TableAvatar.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { useT, botName, tr } from '../../i18n/index.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { juice } from '../../services/juice.ts';
import { progression } from '../../store/progression.ts';
import { SeriesGems } from '../shared/series.tsx';
import { Banner, FaceCard, PhaseCinematic, PillBar, ResultOverlay, ScorePair, ScoreStrip, escobaDeco, tilt, useBanner, useCine, type PillSpec } from '../shared/kit.tsx';
import {
  TARGET_SCORE, applyEscobaAction, botMove, escobaValue, findCaptures, isValidCapture, newMatch, play, type EscobaAction, type EscobaState,
} from './engine.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameTimeout } from '../../services/timers.ts';

const WIN_BONUS = 100;
const names = (): string[] => [tr('g.you'), botName(1), botName(2), botName(3)];
type Slot = 'bottom' | 'right' | 'top' | 'left';
const SLOT: Record<2 | 3 | 4, Slot[]> = { 2: ['bottom', 'top'], 3: ['bottom', 'right', 'left'], 4: ['bottom', 'right', 'top', 'left'] };

/** Las cartas capturadas se agrupan y se deslizan al montón de quien las gana. */
const takeVariants: Variants = {
  exit: (dy: number) => ({ y: dy, scale: 0.35, opacity: 0, transition: { duration: 0.55, ease: [0.4, 0, 0.9, 0.4] } }),
};

const nameOf = (_n: number, i: number): string => names()[i]!;
const makePlayers = (n: number): NonNullable<EscobaState['players']> => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: nameOf(n, i), human: i === 0 }));
const fresh = (n: number, bo3 = false): EscobaState => ({ ...newMatch(n, bo3), players: makePlayers(n) });
const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });

export default function Escoba() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('escoba');
  const online = seating.online;
  const [params] = useSearchParams();
  const preset = Number(params.get('players'));
  const [count, setCount] = useState<2 | 3 | 4 | null>(preset >= 2 && preset <= 4 ? (preset as 2 | 3 | 4) : null);
  const [s, setS] = useState<EscobaState | null>(() => (preset >= 2 && preset <= 4 ? fresh(preset) : null));
  const [bo3, setBo3] = useState(false); // formato: meta de 15 puntos o al mejor de 3 rondas
  const [selCard, setSelCard] = useState<string | null>(null);
  const [selTable, setSelTable] = useState<number[]>([]);
  const { banner, show } = useBanner();
  const { cine, show: showCine } = useCine();
  const prevRef = useRef<EscobaState | null>(null);
  const paid = useRef(false);
  const roundChips = useRef('');
  const myIdx = online ? Math.max(0, s?.players?.findIndex((p) => p.peerId === seating.myPeerId) ?? 0) : 0;
  const me = s?.players?.[myIdx]?.id ?? 'p0';
  const hostLike = !online || seating.isHost;
  const nm = (i: number): string => s?.players?.[i]?.name ?? nameOf(s?.n ?? 2, i);

  const resetLocal = () => { prevRef.current = null; paid.current = false; setSelCard(null); setSelTable([]); };
  const start = (n: 2 | 3 | 4) => { resetLocal(); setCount(n); setS(fresh(n, bo3)); };

  // Online: el anfitrión reparte con los humanos de la sala (2–4) y rellena con bots si está activado.
  const hostStart = () => {
    const humans = seating.humans;
    const n = Math.min(4, Math.max(2, seating.fillBots ? 4 : humans.length));
    const players = Array.from({ length: n }, (_, i) => i < humans.length
      ? { id: `p${i}`, name: humans[i]!.name, human: true, peerId: humans[i]!.peerId }
      : { id: `p${i}`, name: names()[i - humans.length + 1] ?? botName(i), human: false });
    resetLocal();
    setS({ ...newMatch(n, bo3), players });
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<EscobaState, EscobaAction>(seating, s, setS, applyEscobaAction, (st, peer) => st.players?.find((q) => q.peerId === peer)?.id ?? null);

  // Avisos y sonidos a partir de la última jugada (en todas las pantallas).
  useEffect(() => {
    if (!s) return;
    const prev = prevRef.current;
    prevRef.current = s;
    const lp = s.lastPlay;
    if (lp && lp !== prev?.lastPlay && JSON.stringify(lp) !== JSON.stringify(prev?.lastPlay)) {
      feedback(lp.taken.length ? 'trick' : 'deal');
      if (lp.taken.length) show(`${lp.by === myIdx ? 'Te llevas' : `${nm(lp.by)} se lleva`} ${lp.taken.length + 1} cartas`);
      if (lp.escoba) {
        if (lp.by === myIdx) progression.track('escoba', 'escoba');
        const real = lp.card.suit === 'oros' && lp.card.rank === 7;
        showCine(real ? '¡ESCOBA REAL!' : '¡ESCOBA!', real ? `${lp.by === myIdx ? 'Barres' : `${nm(lp.by)} barre`} con el 7 de oros` : `${lp.by === myIdx ? 'Barres' : `${nm(lp.by)} barre`} la mesa · +1 punto`);
      }
    }
    if (s.phase === 'playing') paid.current = false;
    if (s.phase !== 'playing' && s.summary && roundChips.current !== `${s.roundNo}:${s.phase}`) {
      roundChips.current = `${s.roundNo}:${s.phase}`;
      const pts = s.scores.map((_, i) => s.summary!.reduce((a, l) => a + l.points[i]!, 0));
      const top = Math.max(...pts);
      if (pts.filter((v) => v === top).length === 1) juice.chips(pts[myIdx] === top ? 'me' : 'top');
    }
    if (s.phase === 'matchOver' && !paid.current) {
      paid.current = true;
      if ((s.bo3 ? s.roundWins![myIdx] : s.scores[myIdx]) === Math.max(...(s.bo3 ? s.roundWins! : s.scores))) { wallet.add(WIN_BONUS); wallet.recordWin('escoba'); juice.chips('me'); }
    }
    // eslint-disable-next-line
  }, [s]);

  useEffect(() => {
    if (!s || s.phase !== 'playing' || !hostLike) return;
    if (s.players?.[s.turn]?.human ?? s.turn === 0) return;
    const timer = gameTimeout(() => {
      setS((cur) => {
        if (!cur || cur.phase !== 'playing') return cur;
        const m = botMove(cur);
        return play(cur, m.cardId, m.take) ?? cur;
      });
    }, botDelay());
    return () => window.clearTimeout(timer);
  }, [s, hostLike]);

  if (!s && online) {
    return (
      <GameFrame gameId="escoba" onExit={() => { setActiveRoom(null); void exitMatch(nav); }}
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.escoba.name')}</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">Conectando con la mesa…</p></div>}
        bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame
        gameId="escoba"
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.escoba.name')}</p>}
        felt={
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">{t('a.format')}</h2>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('sc.format')}>
                <Button variant={bo3 ? 'secondary' : 'primary'} onClick={() => setBo3(false)}>{t('sc.goal15')}</Button>
                <Button variant={bo3 ? 'primary' : 'secondary'} onClick={() => setBo3(true)}>{t('ser.bo3')}</Button>
              </div>
              <Button variant="primary" block onClick={() => start(2)}>1 vs 1</Button>
              <Button variant="secondary" block onClick={() => start(3)}>3 · tú + 2 IA</Button>
              <Button variant="secondary" block onClick={() => start(4)}>4 · tú + 3 IA</Button>
              <p className="text-xs text-stone-400">Suma 15 con las cartas de la mesa. Sota 8, Caballo 9, Rey 10. Gana quien llegue a {TARGET_SCORE} puntos.</p>
            </div>
          </div>
        }
        bottom={null}
      />
    );
  }

  const n = s.n;
  const slots = SLOT[n as 2 | 3 | 4];
  const myTurn = s.phase === 'playing' && s.turn === myIdx;
  const card = myTurn && selCard ? s.hands[myIdx]!.find((c) => c.id === selCard) ?? null : null;
  const caps = card ? findCaptures(s.table, card) : [];
  const sum = card ? selTable.reduce((acc, i) => acc + escobaValue(s.table[i]!), escobaValue(card)) : 0;
  const valid = card ? (caps.length === 0 ? selTable.length === 0 : isValidCapture(s.table, card, selTable)) : false;

  const pickCard = (id: string) => {
    if (!myTurn) return;
    if (selCard === id) { setSelCard(null); setSelTable([]); return; }
    setSelCard(id);
    const c = s.hands[myIdx]!.find((x) => x.id === id)!;
    const options = findCaptures(s.table, c);
    // Sin captura posible, o con una sola, un toque basta: la carta vuela a la mesa.
    if (options.length <= 1) { clear(); feedback('play'); dispatch(me, { k: 'play', cardId: id, take: options[0] ?? [] }); return; }
    setSelTable([]);
  };
  const toggleTable = (i: number) => {
    if (!card || caps.length === 0) return;
    setSelTable((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]));
  };
  const clear = () => { setSelCard(null); setSelTable([]); };
  const confirm = () => {
    if (!card || !valid) return;
    const take = selTable;
    clear();
    dispatch(me, { k: 'play', cardId: card.id, take });
  };

  const over = s.phase !== 'playing';
  const standing = s.bo3 ? s.roundWins! : s.scores;
  const best = Math.max(...standing);
  const iWon = s.phase === 'matchOver' && standing[myIdx] === best;
  const roundPts = s.summary ? s.scores.map((_, i) => s.summary!.reduce((a, l) => a + l.points[i]!, 0)) : [];
  const lp = s.lastPlay;
  const status = over ? '' : !myTurn ? `Juega ${nm(s.turn)}…` : card
    ? (caps.length ? `Suma ${sum}/15 · elige las cartas de la mesa` : 'Sin captura: tírala a la mesa')
    : lp ? (lp.taken.length ? `${lp.by === myIdx ? 'Te llevas' : `${nm(lp.by)} se lleva`} ${lp.taken.length + 1} cartas` : `${lp.by === myIdx ? 'Tiras' : `${nm(lp.by)} tira`} una carta`) : t('g.yourTurn');

  const pills: PillSpec[] = card ? [
    { id: 'ok', tone: 'gold', disabled: !valid, onPress: confirm, label: caps.length === 0 ? t('a.throw') : valid ? `${t('a.take')} ${selTable.length + 1}` : `Suma ${sum}` },
    { id: 'clear', tone: 'soft', onPress: clear, label: t('a.clear') },
  ] : [];

  const seat = (slot: 'top' | 'left' | 'right') => {
    const k = slots.indexOf(slot);
    if (k === -1) return null;
    const i = (myIdx + k) % n;
    return (
      <SeatBadge info={info(i, nm(i))} tone="them" mano={false} turn={s.phase === 'playing' && s.turn === i} deadline={null} cards={s.hands[i]!.length} />
    );
  };
  const exitDy = (by: number): number => (by === myIdx ? 300 : -300);

  const felt = (
    <>
      <div className="grid h-full grid-cols-[minmax(0,.7fr)_minmax(0,2.2fr)_minmax(0,.7fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-1 p-[clamp(6px,2vw,16px)]">
        <div className="col-start-2 row-start-1 justify-self-center">{seat('top')}</div>
        <div className="col-start-1 row-span-2 row-start-1 self-center justify-self-center">{seat('left')}</div>
        <div className="col-start-2 row-start-2 grid min-h-0 place-items-center" aria-label="Mesa">
          <div className="flex max-w-[560px] flex-wrap items-center justify-center gap-[min(2vw,10px)]">
            <AnimatePresence custom={exitDy(s.lastPlay?.by ?? 0)}>
              {s.table.map((c, i) => (
                <motion.div key={c.id} custom={exitDy(s.lastPlay?.by ?? 0)} variants={takeVariants} exit="exit"
                  initial={s.lastPlay && s.lastPlay.by !== myIdx && s.lastPlay.card.id === c.id ? { y: -160, opacity: 0, scale: 1.1, rotate: 20 } : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}>
                  <FaceCard card={c} land scale={0.7} rotate={tilt(c.id)} selected={selTable.includes(i)} {...escobaDeco(c)}
                    dim={!!card && caps.length > 0 && !caps.some((cap) => cap.includes(i))}
                    onClick={card && caps.length > 0 ? () => toggleTable(i) : undefined} />
                </motion.div>
              ))}
            </AnimatePresence>
            {s.table.length === 0 && !over && <span className="text-sm font-bold text-white/30">Mesa limpia</span>}
          </div>
        </div>
        <div className="col-start-3 row-span-2 row-start-1 self-center justify-self-center">{seat('right')}</div>
      </div>
      <div className="absolute left-[clamp(6px,2vw,14px)] top-[clamp(6px,2vw,14px)] z-10 flex items-center gap-1.5" aria-label={`${s.deck.length} cartas en el mazo`}>
        <div className="relative aspect-[12/19] w-[calc(var(--card-w)*.4)]">
          {[2, 1, 0].map((k) => (
            <span key={k} className="absolute inset-0 overflow-hidden rounded-[6px] shadow-[0_4px_8px_rgba(0,0,0,.4)]" style={{ transform: `translate(${k * 2}px, ${-k * 2}px)` }}><CardBack /></span>
          ))}
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
          <span className="rounded-full border border-white/10 bg-zinc-900/70 px-2 py-[2px] text-[10px] font-bold text-stone-300">{s.captured[myIdx]!.length} cartas</span>
        </div>
        <span className="text-[11px] text-stone-400">Ronda {s.roundNo} · escobas <b className="text-amber-200">{s.escobas[myIdx]}</b></span>
      </div>
      <p className="sr-only" aria-live="polite">{status}</p>
      <PillBar pills={pills} idle={status} />
      <div className="flex items-end justify-center gap-[min(2vw,12px)] pt-[min(3.4dvh,26px)]" role="group" aria-label="Tu mano">
        {s.hands[myIdx]!.map((c, i, arr) => (
          <FaceCard key={c.id} card={c} deal={i} rotate={(i - (arr.length - 1) / 2) * 1.8} selected={selCard === c.id} dim={!myTurn} {...escobaDeco(c)}
            onClick={myTurn ? () => pickCard(c.id) : undefined} />
        ))}
      </div>
    </>
  );

  return (
    <GameFrame
      gameId="escoba"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.turn}:${s.hands[myIdx]!.length}:${s.deck.length}`, onTimeout: () => { const m = botMove(s); clear(); dispatch(me, { k: 'play', cardId: m.cardId, take: m.take }); } }}
      header={n === 2
        ? <ScorePair labels={[t('ser.you'), online ? nm(1 - myIdx) : botName(1)]} values={[s.scores[myIdx]!, s.scores[1 - myIdx]!]} target={s.bo3 ? undefined : TARGET_SCORE} />
        : <ScoreStrip items={s.scores.map((v, i) => ({ name: nm(i), value: v, us: i === myIdx }))} target={s.bo3 ? undefined : TARGET_SCORE} />}
      strip={s.bo3 ? <SeriesGems entries={s.scores.map((_, i) => ({ key: String(i), label: i === myIdx ? t('ser.you') : nm(i), wins: s.roundWins![i]! }))} /> : undefined}
      felt={felt}
      bottom={bottom}
      overlays={
        <>
          <PhaseCinematic cine={cine} />
          <AnimatePresence>
            {over && s.summary && (
              <ResultOverlay
                outcome={s.phase === 'matchOver' ? (iWon ? 'win' : 'lose') : undefined}
                prize={WIN_BONUS}
                taunt="La escoba barrió contigo"
                title={s.phase === 'matchOver' ? (iWon ? t('ser.champion') : t('ser.lost')) : t('ser.summary')}
                actions={s.phase === 'matchOver'
                  ? [...(online ? (hostLike ? [{ label: t('a.rematch'), primary: true, onClick: hostStart }] : []) : [{ label: t('a.rematch'), primary: true, onClick: () => start(count!) }]), { label: t('a.lobby'), onClick: () => { if (online) setActiveRoom(null); void exitMatch(nav); } }]
                  : hostLike ? [{ label: t('a.next'), primary: true, onClick: () => { clear(); setS((cur) => (cur ? applyEscobaAction(cur, me, { k: 'next' }) ?? cur : cur)); } }] : []}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-stone-400">
                      <th className="text-left font-bold" />
                      {s.scores.map((_, i) => <th key={i} className="w-12 text-right font-bold">{nm(i)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {s.summary.map((l) => (
                      <tr key={l.label} className="border-b border-white/10">
                        <td className="py-1.5 text-[12px]">{l.key ? t(`sc.${l.key}`) : l.label}{l.detail ? <span className="text-stone-400"> ({l.detail})</span> : null}</td>
                        {l.points.map((p, i) => <td key={i} className="text-right font-bold tabular-nums">{p}</td>)}
                      </tr>
                    ))}
                    <tr>
                      <td className="py-2 font-extrabold">{s.bo3 ? `${t('ser.round', { n: s.roundNo })} · ${t('sc.total')}` : `${t('sc.total')} (${TARGET_SCORE})`}</td>
                      {(s.bo3 ? roundPts : s.scores).map((v, i) => <td key={i} className={`text-right font-[var(--font-display)] text-lg font-bold tabular-nums ${(s.bo3 ? roundPts[i] === Math.max(...roundPts) : v === best) ? 'text-amber-300' : ''}`}>{v}</td>)}
                    </tr>
                    <tr className={s.bo3 ? '' : 'hidden'}>
                      <td className="py-1 text-[12px] font-bold text-stone-300">{t('ser.score')}</td>
                      {(s.roundWins ?? []).map((v, i) => <td key={i} className="text-right font-bold tabular-nums">{v}</td>)}
                    </tr>
                  </tbody>
                </table>
                {iWon && <p className="mt-2 text-center text-sm font-bold text-amber-300">+{WIN_BONUS} fichas de premio</p>}
              </ResultOverlay>
            )}
          </AnimatePresence>
        </>
      }
    />
  );
}
