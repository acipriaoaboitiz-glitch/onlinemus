import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { juice } from '../../services/juice.ts';
import { AnimatePresence, motion } from 'framer-motion';
import { SeatBadge } from '../mus/app/components/SeatBadge.tsx';
import { TableAvatar } from '../mus/app/components/TableAvatar.tsx';
import { Button } from '../mus/app/components/ui.tsx';
import type { Bubble } from '../mus/app/game/describe.ts';
import type { SeatInfo } from '../mus/app/game/types.ts';
import { useT, botName, tr } from '../../i18n/index.ts';
import { botDelay, feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { SeriesGems, useSeries } from '../shared/series.tsx';
import { GameFrame } from '../shared/GameFrame.tsx';
import { Banner, FaceCard, PhaseCinematic, PillBar, ResultOverlay, tilt, useBanner, useCine, type PillSpec } from '../shared/kit.tsx';
import {
  ROLE_NAME, ROLE_PRIZE, TOP, applyPresAction, botMove, canPlay, newRound, power, roleOf,
  type DeckKind, type PresAction, type PresPlayer, type PresState, type Role,
} from './engine.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { gameTimeout } from '../../services/timers.ts';

const botNames = (): string[] => [1, 2, 3, 4, 5].map(botName);
const makePlayers = (n: number): PresPlayer[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i}`, name: i === 0 ? tr('g.you') : botNames()[i - 1]!, human: i === 0 }));
const info = (i: number, name: string): SeatInfo => ({ seat: (i % 4) as SeatInfo['seat'], userId: null, name, isBot: true, online: true });
/** Insignia corta junto al avatar (sin emojis). */
const MARK: Record<Role, string> = { presidente: 'Rey', vicepresidente: '2º', pueblo: '', subalterno: '3º', mendigo: '4º' };

export default function Presidente() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('presidente');
  const online = seating.online;
  const setup: { n: number; deck: DeckKind } = { n: 4, deck: 'es' };
  const [started, setStarted] = useState(false);
  const [s, setS] = useState<PresState | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [, setBubbles] = useState<Record<string, Bubble | undefined>>({});
  const { banner, show } = useBanner(1300);
  const { cine, show: showCine } = useCine();
  const lastSeq = useRef('');
  const paidRound = useRef(0);
  const me = online ? s?.players.find((p) => p.peerId === seating.myPeerId)?.id ?? 'p0' : 'p0';
  const hostLike = !online || seating.isHost;

  const start = () => { setStarted(true); setS(newRound(makePlayers(setup.n), setup.deck)); setSel([]); setBubbles({}); lastSeq.current = ''; paidRound.current = 0; };

  // Online: el anfitrión reparte con los humanos de la sala (hasta 4 jugadores) y rellena con bots si está activado.
  const hostStart = () => {
    const humans = seating.humans;
    const n = seating.fillBots ? 4 : Math.min(4, Math.max(2, humans.length));
    const players: PresPlayer[] = Array.from({ length: n }, (_, i) => i < humans.length
      ? { id: `p${i}`, name: humans[i]!.name, human: true, peerId: humans[i]!.peerId }
      : { id: `p${i}`, name: botNames()[i - humans.length] ?? botName(i), human: false });
    setStarted(true); setS(newRound(players, 'es')); setSel([]); setBubbles({}); lastSeq.current = ''; paidRound.current = 0;
  };
  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) hostStart(); }, [online, seating.isHost, noS]); // eslint-disable-line
  const { dispatch } = useReplica<PresState, PresAction>(seating, s, setS, applyPresAction, (st, peer) => st.players.find((q) => q.peerId === peer)?.id ?? null);
  const nextRound = () => { if (!s || !hostLike) return; setS(newRound(s.players, s.deck, s)); setSel([]); setBubbles({}); };

  // IA: juega con una pausa natural.
  useEffect(() => {
    if (!s || s.phase !== 'play' || !hostLike) return;
    const p = s.players[s.turn]!;
    if (p.human) return;
    const timer = gameTimeout(() => {
      setS((cur) => {
        if (!cur || cur.phase !== 'play' || cur.players[cur.turn]!.id !== p.id) return cur;
        const m = botMove(cur);
        return applyPresAction(cur, p.id, m.type === 'play' ? { k: 'play', ids: m.ids } : { k: 'pass' }) ?? applyPresAction(cur, p.id, { k: 'pass' }) ?? cur;
      });
    }, botDelay());
    return () => window.clearTimeout(timer);
  }, [s, hostLike]);

  // Sucesos: globos de bots, aviso propio y sonidos.
  useEffect(() => {
    const e = s?.event;
    const key = `${e?.seq}:${e?.by}:${e?.text}`;
    if (!s || !e || key === lastSeq.current) return;
    lastSeq.current = key;
    const who = s.players.find((p) => p.id === e.by);
    if (e.text === '¡Corta con un 2!') juice.cinematic({ title: '¡2 DE CASTIGO!', sub: `${who?.name ?? ''} limpia la mesa`, tone: 'ruby', good: who?.id === me });
    else feedback(e.kind === 'clear' ? 'trick' : e.kind === 'out' ? 'chip' : 'deal');
    if (!who) return;
    if (who.id === me) { if (e.kind !== 'info' || e.text !== 'Pasa') show(e.text); return; }
    const at = Date.now();
    const tone: Bubble['tone'] = e.kind === 'clear' ? 'ordago' : e.kind === 'out' ? 'good' : 'neutral';
    setBubbles((b) => ({ ...b, [who.id]: { text: e.kind === 'out' ? '¡Sale!' : e.text, tone, at } }));
    gameTimeout(() => setBubbles((b) => (b[who.id]?.at === at ? { ...b, [who.id]: undefined } : b)), 1500);
  }, [s, show, me]);

  // Serie de 3 rondas: cada ronda la gana quien sale primero (Rey); gana la serie quien más rondas sume.
  const series = useSeries(2, 3);
  const { record: recordRound, roundStarted } = series;
  const champion = series.champion;
  useEffect(() => { if (s && s.round === 1 && s.phase !== 'done') roundStarted(); }, [s, roundStarted]);

  // Fin de ronda: premio según el rol.
  useEffect(() => {
    if (!s || s.phase !== 'done' || paidRound.current === s.round) return;
    paidRound.current = s.round;
    recordRound(s.finished[0] ?? null);
    const r = roleOf(s, me);
    if (!r) return;
    if (ROLE_PRIZE[r] > 0) wallet.add(ROLE_PRIZE[r]);
    if (r === 'mendigo') juice.cinematic({ title: '¡COME💩!', sub: 'Entregas tus 2 mejores cartas al Rey', tone: 'ruby', good: false });
    if (r === 'presidente') { wallet.recordWin('presidente'); juice.chips('me'); showCine('¡NUEVO REY!', `+${ROLE_PRIZE[r]} fichas`); }
  }, [s, showCine, me]);

  // Primera ronda: abre quien tiene el 3 de oros, pero nada se preselecciona ni se fuerza: puede abrir con cualquier carta o grupo.
  if (!s && online) {
    return (
      <GameFrame gameId="presidente" onExit={() => { setActiveRoom(null); void exitMatch(nav); }}
        header={<p className="truncate text-center font-[var(--font-display)] text-lg font-bold text-amber-300">COME💩</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">Conectando con la mesa…</p></div>}
        bottom={null} />
    );
  }
  if (!s || (!online && !started)) {
    return (
      <GameFrame
        gameId="presidente"
        header={<p className="truncate text-center font-[var(--font-display)] text-lg font-bold text-amber-300">COME💩</p>}
        felt={
          <div className="grid h-full place-items-center p-5">
            <div className="grid w-full max-w-xs gap-3 text-center">
              <h2 className="font-[var(--font-display)] text-2xl font-bold text-amber-300">COME💩</h2>
              <p className="-mt-2 text-[13px] font-semibold text-amber-200/80">De mendigo a rey de la mesa</p>
              <Button variant="primary" block onClick={start}>Repartir</Button>
              <p className="text-xs text-stone-400">Baraja española de 40 cartas · tú y 3 jugadores. Quedarte sin cartas el primero te hace Rey; el último es COME💩. El 2 es la carta más alta y corta la mesa.</p>
            </div>
          </div>
        }
        bottom={null}
      />
    );
  }

  const myIdx = Math.max(0, s.players.findIndex((p) => p.id === me));
  const hand = s.hands[me]!;
  const exchange = s.phase === 'exchange' && s.exchange?.president === me;
  const waitingExchange = s.phase === 'exchange' && !exchange;
  const myTurn = s.phase === 'play' && s.players[s.turn]!.id === me;
  const opponents = s.players.map((_, k) => (myIdx + 1 + k) % s.players.length).filter((i) => i !== myIdx);
  const playOk = myTurn && canPlay(s, me, sel);
  // En tu turno, se atenúan las cartas que no pueden formar una jugada válida sobre la mesa.
  const usable = (c: (typeof hand)[number]): boolean => {
    if (!myTurn) return true;
    const grp = hand.filter((x) => power(x) === power(c));
    if (!s.table) return !s.mustInclude || power(c) === power(hand.find((x) => x.id === s.mustInclude)!);
    return (power(c) > s.table.power && grp.length >= s.table.cards.length) || (power(c) === TOP(s.deck) && s.table.cards.length === 1);
  };

  const toggle = (id: string) => {
    if (!myTurn && !exchange) return;
    feedback('tap');
    const c = hand.find((x) => x.id === id)!;
    setSel((cur) => {
      if (exchange) return cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 2 ? [...cur, id] : [cur[1]!, id];
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      const same = cur.length > 0 && hand.filter((x) => cur.includes(x.id)).every((x) => power(x) === power(c));
      return same && cur.length < 4 ? [...cur, id] : [id];
    });
  };
  const doPlay = () => { if (!playOk) return; feedback('play'); const ids = sel; setSel([]); dispatch(me, { k: 'play', ids }); };
  const doPass = () => { setSel([]); if (myTurn) dispatch(me, { k: 'pass' }); };
  const doGive = () => { if (sel.length !== 2) return; const ids = sel; setSel([]); dispatch(me, { k: 'give', ids }); };

  const pills: PillSpec[] = exchange
    ? [{ id: 'give', tone: 'gold', label: `Devolver ${sel.length}/2 cartas`, disabled: sel.length !== 2, onPress: doGive }]
    : myTurn
      ? [
          ...(s.table ? [{ id: 'pass', tone: 'soft' as const, label: t('a.pass'), onPress: doPass }] : []),
          { id: 'play', tone: 'gold' as const, label: sel.length ? `Tirar selección (${sel.length})` : 'Toca tus cartas', disabled: !playOk, onPress: doPlay },
        ]
      : [];
  const status = s.phase === 'done' ? '' : waitingExchange ? 'El Rey elige 2 cartas para devolver…' : exchange ? 'Elige tus 2 peores cartas para el COME💩'
    : myTurn ? (s.table ? `Te toca: ${s.table.cards.length === 1 ? 'una carta' : `${s.table.cards.length} cartas`} más altas, o pasa` : s.round === 1 && !s.roles ? 'Tienes el 3 de oros: abres tú, con la carta o grupo que quieras' : 'Te toca: abres la mesa, sin límite') : `Juega ${s.players[s.turn]!.name}…`;

  const seatOf = (i: number) => {
    const p = s.players[i]!;
    const n = s.hands[p.id]!.length;
    const place = s.finished.indexOf(p.id);
    const role = roleOf(s, p.id);
    const tag = place >= 0 ? ` · ${place + 1}º` : ` · ${n}`;
    return (
      <SeatBadge key={p.id} info={info(i, `${p.name}${tag}`)} tone="them" mano={false} turn={s.turn === i && s.phase === 'play'} deadline={null}
        cards={n} badge={role && s.phase !== 'done' ? MARK[role] || undefined : undefined} />
    );
  };

  const felt = (
    <>
      <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] gap-1 p-[clamp(6px,2vw,16px)]">
        <div className="flex flex-wrap items-start justify-center gap-x-[min(3vw,14px)] gap-y-1">{opponents.map((i) => seatOf(i))}</div>
        <div className="grid min-h-0 place-items-center">
          <AnimatePresence mode="wait">
            {s.table ? (
              <motion.div key={s.table.by + s.table.cards.map((c) => c.id).join()} className="grid justify-items-center gap-2"
                initial={{ scale: 1.25, opacity: 0, y: -10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
                <div className="flex items-end">
                  {s.table.cards.map((c, i) => (
                    <div key={c.id} style={{ marginLeft: i === 0 ? 0 : 'calc(var(--card-w) * -0.3)', zIndex: i }}><FaceCard card={c} land scale={0.8} rotate={tilt(c.id) / 2} /></div>
                  ))}
                </div>
                <span className="rounded-full bg-black/35 px-3 py-0.5 text-[11px] font-bold text-amber-200/90">{s.players.find((p) => p.id === s.table!.by)!.name}</span>
              </motion.div>
            ) : (
              <motion.span key="free" aria-label="Mesa libre" />
            )}
          </AnimatePresence>
        </div>
      </div>
      <Banner text={banner} />
    </>
  );

  const myRole = roleOf(s, me);
  const gap = hand.length > 12 ? -0.62 : me.length > 9 ? -0.5 : me.length > 6 ? -0.34 : -0.12;
  const bottom = (
    <>
      <div className="relative flex w-full items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TableAvatar name="Tú" tone="me" active={myTurn || exchange} className="size-9 text-[15px]" />
          <b className={`truncate text-[13px] ${myTurn ? 'text-amber-200' : 'text-stone-200'}`}>{myRole ? ROLE_NAME[myRole] : 'Tú'}</b>
          <span className="whitespace-nowrap rounded-full border border-white/10 bg-zinc-900/70 px-2 py-[2px] text-[10px] font-bold text-stone-300">{hand.length} {hand.length === 1 ? 'carta' : 'cartas'}</span>
        </div>
        <span className="sr-only" aria-live="polite">{status}</span>
      </div>
      <PillBar pills={pills} />
      <div className="no-scrollbar w-full overflow-x-auto overflow-y-hidden pb-1 pt-[min(2.4dvh,18px)]" role="group" aria-label="Tu mano">
        <div className="mx-auto flex w-max items-end px-2">
          {hand.map((c, i) => (
            <div key={c.id} style={{ marginLeft: i === 0 ? 0 : `calc(var(--card-w) * ${gap})`, zIndex: i }}>
              <FaceCard card={c} deal={i} scale={0.8} selected={sel.includes(c.id)} dim={myTurn && !usable(c)}
                onClick={myTurn || exchange ? () => toggle(c.id) : undefined} />
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <GameFrame
      gameId="presidente"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      timer={{
        active: myTurn, id: `${s.turn}:${hand.length}:${s.table?.by ?? ''}:${s.table?.cards.length ?? 0}`,
        onTimeout: () => { setSel([]); if (s.phase !== 'play' || s.players[s.turn]!.id !== me) return; const m = botMove(s); dispatch(me, m.type === 'play' ? { k: 'play', ids: m.ids } : { k: 'pass' }); },
      }}
      header={
        <div className="grid grid-cols-2 gap-[min(1.8vw,8px)]" role="group" aria-label="Estado">
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-teal-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.08em] text-teal-300">Turno</p>
            <b className="block truncate text-[13px]">{s.phase === 'done' ? '—' : s.players[s.turn]!.name}</b>
          </div>
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-orange-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.08em] text-orange-300">Ronda</p>
            <b className="block text-[13px] tabular-nums">{s.round}</b>
          </div>
        </div>
      }
      strip={<SeriesGems need={3} entries={s.players.map((p) => ({ key: p.id, label: p.id === me ? t('ser.you') : p.name, wins: series.wins[p.id] ?? 0 }))} />}
      felt={felt}
      bottom={bottom}
      overlays={
        <>
          <PhaseCinematic cine={cine} />
          <AnimatePresence>
            {s.phase === 'done' && (
              <ResultOverlay
                outcome={myRole === 'presidente' ? 'win' : myRole === 'mendigo' ? 'lose' : undefined}
                prize={myRole ? ROLE_PRIZE[myRole] : 0}
                taunt="Te ha tocado COME💩"
                title={myRole === 'presidente' ? '¡Eres el Rey!' : myRole === 'mendigo' ? '¡Eres COME💩!' : `Has quedado ${ROLE_NAME[myRole ?? 'pueblo']}`}
                actions={[
                  ...(hostLike ? [{ label: champion !== null ? t('ser.newSeries') : t('ser.next'), primary: true, onClick: champion !== null ? (online ? hostStart : start) : nextRound }] : []),
                  ...(online ? [] : [{ label: 'Cambiar mesa', onClick: () => { setStarted(false); setS(null); } }]),
                  { label: t('a.lobby'), onClick: () => { if (online) setActiveRoom(null); void exitMatch(nav); } },
                ]}
              >
                <ul className="grid gap-1 text-sm">
                  {s.finished.map((id, i) => {
                    const p = s.players.find((x) => x.id === id)!;
                    const r = s.roles![id]!;
                    return (
                      <li key={id} className="flex justify-between border-b border-white/10 py-1">
                        <span className={i === 0 ? 'font-bold text-amber-300' : ''}>{i + 1}º · {p.name}</span>
                        <span className="text-stone-300">{ROLE_NAME[r]}</span>
                      </li>
                    );
                  })}
                </ul>
                {myRole && ROLE_PRIZE[myRole] > 0 && <p className="mt-2 text-center text-sm font-bold text-amber-300">+{ROLE_PRIZE[myRole]} fichas</p>}
                <p className="mt-2 text-center text-[11px] text-stone-400">En la siguiente ronda COME💩 entrega sus 2 mejores cartas al Rey, que le devuelve sus 2 peores.</p>
              </ResultOverlay>
            )}
          </AnimatePresence>
        </>
      }
    />
  );
}
