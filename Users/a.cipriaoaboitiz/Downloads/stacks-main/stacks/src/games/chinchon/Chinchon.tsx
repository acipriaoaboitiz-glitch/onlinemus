import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { juice } from '../../services/juice.ts';
import { AnimatePresence, motion } from 'framer-motion';
import { CardBack } from '../mus/app/components/CardFace.tsx';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { TableAvatar } from '../mus/app/components/TableAvatar.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { SeatInfo } from '../mus/app/game/types.ts';
import type { SpanishCard } from '../../engine/deck.ts';
import { useT, botName, tr } from '../../i18n/index.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import { Banner, FaceCard, PhaseCinematic, PillBar, ResultOverlay, ScoreStrip, useBanner, useCine, type PillSpec } from '../shared/kit.tsx';
import {
  CLOSE_LIMIT, OUT_AT, applyChAction, arrange, botMove, canClose, looseValue, newGame, type ChAction, type ChPlayer, type ChState,
} from './engine.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameTimeout } from '../../services/timers.ts';

const WIN_BONUS = 100;
const names = (): string[] => [tr('g.you'), botName(1), botName(2), botName(3)];
type Slot = 'bottom' | 'right' | 'top' | 'left';
const SLOT: Record<2 | 3 | 4, Slot[]> = { 2: ['bottom', 'top'], 3: ['bottom', 'right', 'left'], 4: ['bottom', 'right', 'top', 'left'] };
const nameOf = (_n: number, i: number): string => names()[i]!;
const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });
const makePlayers = (n: number): ChPlayer[] => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: nameOf(n, i), human: i === 0 }));

export default function Chinchon() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('chinchon');
  const online = seating.online;
  const [params] = useSearchParams();
  const preset = Number(params.get('players'));
  const [count, setCount] = useState<2 | 3 | 4 | null>(preset >= 2 && preset <= 4 ? (preset as 2 | 3 | 4) : null);
  const [s, setS] = useState<ChState | null>(() => (preset >= 2 && preset <= 4 ? newGame(makePlayers(preset)) : null));
  const [sel, setSel] = useState<string | null>(null);
  const { banner, show } = useBanner(1400);
  const { cine, show: showCine } = useCine();
  const lastSeq = useRef('');
  const paid = useRef(false);
  const myIdx = online ? Math.max(0, s?.players.findIndex((p) => p.peerId === seating.myPeerId) ?? 0) : 0;
  const me = s?.players[myIdx]?.id ?? 'p0';
  const hostLike = !online || seating.isHost;
  const nm = (i: number): string => s?.players[i]?.name ?? nameOf(s?.players.length ?? 2, i);

  const start = (n: 2 | 3 | 4) => { setCount(n); setS(newGame(makePlayers(n))); setSel(null); paid.current = false; };

  // Online: el anfitrión reparte con los humanos de la sala (2–4) y rellena con bots si está activado.
  const hostStart = () => {
    const humans = seating.humans;
    const n = Math.min(4, Math.max(2, seating.fillBots ? 4 : humans.length));
    const players: ChPlayer[] = Array.from({ length: n }, (_, i) => i < humans.length
      ? { id: `p${i}`, name: humans[i]!.name, human: true, peerId: humans[i]!.peerId }
      : { id: `p${i}`, name: names()[i - humans.length + 1] ?? botName(i), human: false });
    setS(newGame(players)); setSel(null); paid.current = false; lastSeq.current = '';
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<ChState, ChAction>(seating, s, setS, applyChAction, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);

  useEffect(() => {
    if (!s || (s.phase !== 'draw' && s.phase !== 'discard') || !hostLike || s.players[s.turn]!.human) return;
    const timer = gameTimeout(() => {
      setS((cur) => {
        if (!cur || cur.players[cur.turn]!.human || (cur.phase !== 'draw' && cur.phase !== 'discard')) return cur;
        const m = botMove(cur);
        const act: ChAction = m.type === 'draw' ? { k: 'draw', source: m.source } : m.type === 'discard' ? { k: 'discard', cardId: m.cardId } : { k: 'close', cardId: m.cardId };
        return applyChAction(cur, cur.players[cur.turn]!.id, act) ?? cur;
      });
    }, botDelay());
    return () => window.clearTimeout(timer);
  }, [s, hostLike]);

  useEffect(() => {
    const e = s?.event;
    const key = `${e?.seq}:${e?.text}`;
    if (!s || !e || key === lastSeq.current) return;
    lastSeq.current = key;
    if (/CHINCH/.test(e.text)) { showCine('¡CHINCHÓN!', `${s.closer === myIdx ? 'Cierras' : `${nm(s.closer ?? 0)} cierra`} · −25 puntos`); }
    else if (/anulada/.test(e.text)) show(e.text);
    else if (/Cierra/.test(e.text)) { if ((s.rows?.[s.closer ?? 0]?.unmatched ?? 9) < 5) showCine('¡CERRAR RONDA!', `${nm(s.closer ?? 0)} · −10 puntos`); else juice.impact(); show(`${s.closer === myIdx ? 'Cierras' : `${nm(s.closer ?? 0)} cierra`} la ronda`); }
    else feedback('deal');
  }, [s, show, showCine, myIdx]);

  useEffect(() => {
    if (s && s.phase !== 'gameOver') paid.current = false;
    if (s?.phase !== 'gameOver' || paid.current) return;
    paid.current = true;
    if (s.winner === myIdx) { wallet.add(WIN_BONUS); wallet.recordWin('chinchon'); juice.chips('me'); }
  }, [s, myIdx]);

  const hand = s?.hands[myIdx] ?? [];
  const arr = useMemo(() => (hand.length === 7 ? arrange(hand) : null), [hand]);
  const ordered = useMemo<{ card: SpanishCard; grouped: boolean; gap: boolean }[]>(() => {
    if (hand.length === 0) return [];
    if (!arr) return [...hand].sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank).map((card) => ({ card, grouped: false, gap: false }));
    const out: { card: SpanishCard; grouped: boolean; gap: boolean }[] = [];
    arr.groups.forEach((g) => g.forEach((card, i) => out.push({ card, grouped: true, gap: i === 0 && out.length > 0 })));
    [...arr.loose].sort((a, b) => a.suit.localeCompare(b.suit) || a.rank - b.rank).forEach((card, i) => out.push({ card, grouped: false, gap: i === 0 && out.length > 0 }));
    return out;
  }, [hand, arr]);

  if (!s && online) {
    return (
      <GameFrame gameId="chinchon" onExit={() => { setActiveRoom(null); void exitMatch(nav); }}
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.chinchon.name')}</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">Conectando con la mesa…</p></div>}
        bottom={null} />
    );
  }
  if (!s || (!online && !count)) {
    return (
      <GameFrame
        gameId="chinchon"
        header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.chinchon.name')}</p>}
        felt={
          <div className="grid h-full place-items-center p-6">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">{t('a.format')}</h2>
              <Button variant="primary" block onClick={() => start(2)}>1 vs 1</Button>
              <Button variant="secondary" block onClick={() => start(3)}>3 · tú + 2 IA</Button>
              <Button variant="secondary" block onClick={() => start(4)}>4 · tú + 3 IA</Button>
              <p className="text-xs text-stone-400">Liga tríos y escaleras del mismo palo. Cierra con {CLOSE_LIMIT} puntos sueltos o menos. A {OUT_AT} puntos, eliminado.</p>
            </div>
          </div>
        }
        bottom={null}
      />
    );
  }

  const n = s.players.length;
  const slots = SLOT[n as 2 | 3 | 4];
  const myTurn = (s.phase === 'draw' || s.phase === 'discard') && s.turn === myIdx;
  const looseNow = s.phase === 'discard' && hand.length === 8
    ? Math.min(...hand.map((c) => arrange(hand.filter((x) => x.id !== c.id)).unmatched))
    : arr?.unmatched ?? 0;
  const selCard = sel ? hand.find((c) => c.id === sel) ?? null : null;
  const closable = !!selCard && canClose(s, selCard.id);
  const top = s.discard[s.discard.length - 1] ?? null;
  const status = s.phase === 'gameOver' || s.phase === 'roundOver' ? ''
    : !myTurn ? `Juega ${nm(s.turn)}…`
    : s.phase === 'draw' ? 'Roba del mazo o del descarte' : selCard ? (closable ? 'Puedes cerrar con esta carta' : 'Elige qué hacer con la carta') : 'Elige una carta para descartar';

  const draw = (source: 'stock' | 'discard') => { if (!(myTurn && s.phase === 'draw')) return; feedback('draw'); setSel(null); dispatch(me, { k: 'draw', source }); };
  const pills: PillSpec[] = myTurn && s.phase === 'discard' && selCard ? [
    { id: 'disc', tone: 'gold', label: 'Tirar selección', onPress: () => { setSel(null); dispatch(me, { k: 'discard', cardId: selCard.id }); } },
    { id: 'close', tone: 'ok', label: t('a.close'), disabled: !closable, onPress: () => { setSel(null); dispatch(me, { k: 'close', cardId: selCard.id }); } },
    { id: 'clr', tone: 'soft', label: t('a.clear'), onPress: () => setSel(null) },
  ] : [];

  const seat = (slot: 'top' | 'left' | 'right') => {
    const k = slots.indexOf(slot);
    if (k === -1) return null;
    const i = (myIdx + k) % n;
    return <div className={s.out[i] ? 'opacity-40' : ''}><SeatBadge info={info(i, `${nm(i)}${s.out[i] ? ' ✕' : ''}`)} tone="them" mano={s.dealer === i} turn={s.turn === i && !s.out[i] && (s.phase === 'draw' || s.phase === 'discard')} deadline={null} cards={s.hands[i]!.length} /></div>;
  };

  const pileW = 'calc(var(--card-w) * 0.8)';
  const felt = (
    <>
      <div className="grid h-full grid-cols-[minmax(0,.7fr)_minmax(0,2.2fr)_minmax(0,.7fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-1 p-[clamp(6px,2vw,16px)]">
        <div className="col-start-2 row-start-1 justify-self-center">{seat('top')}</div>
        <div className="col-start-1 row-span-2 row-start-1 self-center justify-self-center">{seat('left')}</div>
        <div className="col-start-2 row-start-2 grid min-h-0 place-items-center">
          <div className="flex items-center gap-[min(4vw,16px)]">
            <div className="grid justify-items-center gap-1">
              <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => draw('stock')}
                disabled={!(myTurn && s.phase === 'draw')} aria-label={t('a.deck')}
                className="relative aspect-[12/19] overflow-hidden rounded-[8px] shadow-[0_8px_16px_rgba(0,0,0,.45)]"
                style={{ width: pileW, outline: myTurn && s.phase === 'draw' ? '2px solid #f0c35f' : undefined }}><CardBack /></motion.button>
              <span className="font-mono text-[10px] text-amber-200/80">{s.stock.length}</span>
            </div>
            <div className="grid justify-items-center gap-1">
              <AnimatePresence mode="popLayout">
                {top ? <motion.div key={top.id} initial={{ scale: 1.2, opacity: 0, rotate: 12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
                  <FaceCard card={top} scale={0.8} glow={myTurn && s.phase === 'draw'} onClick={myTurn && s.phase === 'draw' ? () => draw('discard') : undefined} />
                </motion.div> : <span key="empty" className="block aspect-[12/19] rounded-[8px] border border-dashed border-white/20" style={{ width: pileW }} />}
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="col-start-3 row-span-2 row-start-1 self-center justify-self-center">{seat('right')}</div>
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
          <span className={`rounded-full border px-2 py-[2px] text-[10px] font-bold ${looseNow <= CLOSE_LIMIT ? 'border-emerald-400/50 bg-emerald-900/60 text-emerald-100' : 'border-white/10 bg-zinc-900/70 text-stone-300'}`}>
            Sueltas: {looseNow}
          </span>
        </div>
        <span className="sr-only" aria-live="polite">{status}</span>
      </div>
      <PillBar pills={pills} />
      <div className="no-scrollbar w-full overflow-x-auto overflow-y-hidden pb-1 pt-[min(2.6dvh,20px)]" role="group" aria-label="Tu mano">
        <div className="mx-auto flex w-max items-end px-2">
          {ordered.map(({ card, grouped, gap }, i) => (
            <div key={card.id} style={{ marginLeft: i === 0 ? 0 : gap ? 'calc(var(--card-w) * 0.12)' : 'calc(var(--card-w) * -0.3)', zIndex: i }} className="relative">
              {grouped && <span aria-hidden className="absolute -bottom-1 left-1 right-1 h-[3px] rounded-full bg-emerald-400/80" />}
              <FaceCard card={card} deal={i} scale={0.82} selected={sel === card.id} glow={s.drawn === card.id} badge={grouped ? undefined : String(looseValue(card))}
                onClick={myTurn && s.phase === 'discard' ? () => setSel((cur) => (cur === card.id ? null : card.id)) : undefined} />
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const over = s.phase === 'gameOver';
  return (
    <GameFrame
      gameId="chinchon"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{ active: myTurn, id: `${s.turn}:${s.phase}:${s.stock.length}`, onTimeout: () => { setSel(null); dispatch(me, s.phase === 'draw' ? { k: 'draw', source: 'stock' } : { k: 'discard', cardId: s.drawn ?? hand[0]!.id }); } }}
      header={<ScoreStrip items={s.scores.map((v, i) => ({ name: nm(i), value: v, us: i === myIdx }))} target={OUT_AT} />}
      felt={felt}
      bottom={bottom}
      overlays={
        <>
          <PhaseCinematic cine={cine} />
          <AnimatePresence>
            {(s.phase === 'roundOver' || over) && s.rows && (
              <ResultOverlay
                outcome={over ? (s.winner === myIdx ? 'win' : 'lose') : undefined}
                prize={WIN_BONUS}
                taunt="Por los pelos"
                title={over ? (s.winner === myIdx ? t('g.win') : `Gana ${nm(s.winner ?? 0)}`) : s.closer === null ? 'Ronda anulada' : `Fin de la ronda · cierra ${nm(s.closer)}`}
                actions={over
                  ? [...(online ? (hostLike ? [{ label: t('a.rematch'), primary: true, onClick: hostStart }] : []) : [{ label: t('a.rematch'), primary: true, onClick: () => start(count!) }]), { label: t('a.lobby'), onClick: () => { if (online) setActiveRoom(null); void exitMatch(nav); } }]
                  : hostLike ? [{ label: t('a.next'), primary: true, onClick: () => { setSel(null); setS((cur) => (cur ? applyChAction(cur, me, { k: 'next' }) ?? cur : cur)); } }] : []}
              >
                <ul className="grid gap-1.5 text-sm" aria-label="Puntos de la ronda">
                  {s.rows.map((r, i) => (
                    <li key={i} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-1.5 ${i === s.closer ? 'border-emerald-400/40 bg-emerald-900/25' : 'border-white/10 bg-white/5'} ${s.out[i] ? 'opacity-60' : ''}`}>
                      <span className={`min-w-0 truncate ${i === s.closer ? 'font-bold text-amber-300' : ''}`}>{nm(i)}{s.out[i] ? ' ✕' : ''}{r.chinchon ? ' · Chinchón' : ''}</span>
                      <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                        <b className={`rounded-full px-2 py-[1px] text-[12px] ${r.delta < 0 ? 'bg-emerald-500/25 text-emerald-300' : 'bg-white/10 text-stone-200'}`}>{r.delta > 0 ? '+' : ''}{r.delta} pts</b>
                        <span className="text-[12px] text-stone-300"><b className="text-stone-50">{s.scores[i]}</b> / {OUT_AT}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {over && s.winner === myIdx && <p className="mt-2 text-center text-sm font-bold text-amber-300">+{WIN_BONUS} fichas de premio</p>}
              </ResultOverlay>
            )}
          </AnimatePresence>
        </>
      }
    />
  );
}
