import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eraser, Repeat, Undo2 } from 'lucide-react';
import { useT } from '../../i18n/index.ts';
import { juice } from '../../services/juice.ts';
import { exitMatch } from '../../services/exitMatch.ts';
import { setActiveRoom } from '../../services/multiplayer.ts';
import { useReplica, useSeating } from '../../services/onlineGame.ts';
import { gameTimeout } from '../../services/timers.ts';
import { feedback, playRouletteRoll } from '../../store/settings.ts';
import { progression } from '../../store/progression.ts';
import { useWallet, wallet } from '../../store/wallet.ts';
import { GameFrame } from '../shared/GameFrame.tsx';
import {
  CHIPS, applyRouletteAction, colorOf, newTable, settle, wins,
  type BetKey, type Bets, type RouletteAction, type RouletteState,
} from './engine.ts';
import { Wheel } from './Wheel.tsx';

const SPIN_SECONDS = 6.5;
const CELL = { red: 'bg-[#8E1020]', black: 'bg-[#0A0A0C]', green: 'bg-[#0A6B45]' } as const;
const short = (n: number): string => (n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(n));
/** Filas del tablero: arriba 3-6-…-36, en medio 2-5-…-35, abajo 1-4-…-34. */
const ROWS = [0, 1, 2].map((r) => Array.from({ length: 12 }, (_, c) => c * 3 + 3 - r));

function ChipMark({ amt }: { amt: number }) {
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-amber-100/70 bg-gradient-to-br from-amber-200 to-amber-600 font-extrabold tabular-nums text-amber-950 shadow-[0_2px_4px_rgba(0,0,0,.6)]"
      style={{ width: 'clamp(16px,4.6vw,26px)', height: 'clamp(16px,4.6vw,26px)', fontSize: 'clamp(7px,2vw,11px)' }}>{short(amt)}</span>
  );
}

function Spot({ id, bets, label, cls, win, locked, onBet, style }: { id: BetKey; bets: Bets; label: string; cls: string; win: boolean; locked: boolean; onBet: (k: BetKey) => void; style?: React.CSSProperties }) {
  const amt = bets[id];
  return (
    <button type="button" disabled={locked} onClick={() => onBet(id)} aria-label={label} style={style}
      className={`relative grid min-h-0 touch-manipulation place-items-center border border-amber-500/35 font-bold tabular-nums text-[#F1E7C6] transition-colors active:brightness-125 ${cls} ${win ? 'z-[1] ring-2 ring-inset ring-[#FCE38A] brightness-125' : ''}`}>
      <span className="text-[clamp(9px,2.5vw,16px)] leading-none">{label}</span>
      {amt ? <ChipMark amt={amt} /> : null}
    </button>
  );
}

export default function Ruleta() {
  const nav = useNavigate();
  const t = useT();
  const seating = useSeating('ruleta');
  const online = seating.online;
  const w = useWallet();
  const [s, setS] = useState<RouletteState | null>(online ? null : newTable());
  const [chip, setChip] = useState<number>(10);
  const [bets, setBets] = useState<Bets>({});
  const [lastBets, setLastBets] = useState<Bets>({});
  const [done, setDone] = useState(0); // número de giro ya liquidado
  const [net, setNet] = useState<number | null>(null);
  const stack = useRef<{ key: BetKey; amt: number }[]>([]);
  const betsRef = useRef<Bets>({});
  betsRef.current = bets;
  const me = seating.myPeerId ?? 'me';
  const hostLike = !online || seating.isHost;

  const noS = s === null;
  useEffect(() => { if (online && seating.isHost && noS) setS(newTable()); }, [online, seating.isHost, noS]);
  // En línea solo el anfitrión sortea el número (si no, cada cliente sacaría uno distinto).
  const { dispatch } = useReplica<RouletteState, RouletteAction>(
    seating, s, setS,
    (st, pid, a) => (online && !seating.isHost && a.k === 'spin' ? null : applyRouletteAction(st, pid, a)),
    (_st, peer) => peer,
  );

  const spinNo = s?.spin ?? 0;
  const result = s?.result ?? null;
  const phase = s?.phase ?? 'bet';

  // Giro: sonido de bola, cobro al caer y vuelta a la mesa de apuestas.
  useEffect(() => {
    if (!spinNo || result === null) return;
    setNet(null);
    playRouletteRoll(SPIN_SECONDS);
    const ids: number[] = [];
    ids.push(gameTimeout(() => {
      const placed = betsRef.current;
      const r = settle(placed, result);
      setDone(spinNo);
      if (r.stake === 0) return;
      setLastBets(placed);
      setBets({}); stack.current = [];
      setNet(r.net);
      progression.track('hand', 'ruleta');
      wallet.add(r.payout);
      wallet.recordResult(r.net > 0);
      if (r.net > 0) wallet.recordWin('ruleta');
      if (r.straight) { juice.cinematic({ title: '¡PLENO x36!', sub: `+${r.payout}`, tone: 'gold', good: true }); juice.chips('me', 12); }
      else if (r.net >= 500) { juice.cinematic({ title: '¡GRAN PREMIO!', sub: `+${r.net}`, tone: 'emerald', good: true }); juice.chips('me', 12); }
      else if (r.net > 0) { juice.points(`+${r.net}`); juice.chips('me', 6); }
      else if (r.net < 0) feedback('defeat');
    }, SPIN_SECONDS * 1000 + 450));
    if (hostLike) ids.push(gameTimeout(() => setS((cur) => (cur && cur.phase === 'spin' ? applyRouletteAction(cur, 'host', { k: 'next' }) ?? cur : cur)), SPIN_SECONDS * 1000 + 3200));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [spinNo]); // eslint-disable-line

  if (!s) {
    return (
      <GameFrame gameId="ruleta" onExit={() => { void exitMatch(nav); }} header={<p className="text-center font-[var(--font-display)] text-xl font-bold text-amber-300">{t('g.ruleta.name')}</p>}
        felt={<div className="grid h-full place-items-center p-6 text-center"><p className="text-sm font-bold text-stone-300">…</p></div>} bottom={null} />
    );
  }

  const locked = phase !== 'bet';
  const total = Object.values(bets).reduce((a, b) => a + b, 0);
  const settled = done === spinNo; // la rueda ya paró y se cobró
  const shownResult = result !== null && settled ? result : null;
  const lastTotal = Object.values(lastBets).reduce((a, b) => a + b, 0);

  const place = (key: BetKey) => {
    if (locked) return;
    if (!wallet.spend(chip)) { feedback('defeat'); return; }
    stack.current.push({ key, amt: chip });
    setBets((b) => ({ ...b, [key]: (b[key] ?? 0) + chip }));
    setNet(null);
    feedback('chip');
  };
  const undo = () => {
    const top = stack.current.pop();
    if (!top || locked) return;
    wallet.add(top.amt);
    setBets((b) => { const left = (b[top.key] ?? 0) - top.amt; const n = { ...b }; if (left > 0) n[top.key] = left; else delete n[top.key]; return n; });
    feedback('tap');
  };
  const clear = () => { if (locked || total === 0) return; wallet.add(total); setBets({}); stack.current = []; feedback('tap'); };
  const repeat = () => {
    if (locked || total > 0 || lastTotal === 0 || lastTotal > w.chips) { feedback('defeat'); return; }
    wallet.spend(lastTotal);
    stack.current = Object.entries(lastBets).map(([key, amt]) => ({ key, amt }));
    setBets(lastBets); setNet(null); feedback('chip');
  };
  const spin = () => { if (locked || total === 0) return; dispatch(me, { k: 'spin' }); };

  const isWin = (key: BetKey): boolean => shownResult !== null && wins(key, shownResult);
  const resColor = shownResult === null ? null : colorOf(shownResult);

  const felt = (
    <div className="flex h-full min-h-0 flex-col items-center gap-[clamp(4px,1.4vw,12px)] p-[clamp(6px,2vw,16px)] lg:flex-row lg:justify-center lg:gap-8">
      <div className="min-h-0 w-full [container-type:size] lg:h-full lg:w-[44%]" style={{ flex: '0 1 44%' }}>
        <div className="relative mx-auto" style={{ width: 'min(100cqw, 100cqh)', height: 'min(100cqw, 100cqh)' }}>
          <Wheel spin={spinNo} result={result} duration={SPIN_SECONDS} className="h-full w-full" />
          {shownResult !== null && (
            <span className={`pointer-events-none absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-amber-200 font-[var(--font-display)] font-extrabold tabular-nums text-white shadow-lg ${CELL[resColor!]}`}
              style={{ width: '19%', height: '19%', fontSize: 'min(6cqw, 6cqh)' }}>{shownResult}</span>
          )}
        </div>
      </div>
      <div className="mb-[clamp(34px,10vw,46px)] grid max-h-[420px] min-h-0 w-full max-w-[640px] flex-1 lg:mb-0 lg:h-[calc(100%-100px)] lg:max-h-[540px] lg:max-w-[560px]"
        style={{ gridTemplateColumns: '1.1fr repeat(12, 1fr)', gridTemplateRows: 'repeat(3, minmax(0,1fr)) minmax(0,.8fr) minmax(0,.8fr)' }}>
        <Spot id="n:0" bets={bets} label="0" cls={CELL.green} win={isWin('n:0')} locked={locked} onBet={place} style={{ gridRow: '1 / span 3', gridColumn: 1 }} />
        {ROWS.map((row, r) => row.map((n, c) => (
          <Spot key={n} id={`n:${n}`} bets={bets} label={String(n)} cls={CELL[colorOf(n)]} win={isWin(`n:${n}`)} locked={locked} onBet={place} style={{ gridRow: r + 1, gridColumn: c + 2 }} />
        )))}
        {(['d1', 'd2', 'd3'] as const).map((d, i) => (
          <Spot key={d} id={d} bets={bets} label={['1–12', '13–24', '25–36'][i]!} cls="bg-emerald-950/60" win={isWin(d)} locked={locked} onBet={place} style={{ gridRow: 4, gridColumn: `${2 + i * 4} / span 4` }} />
        ))}
        {([['even', t('rl.even'), 'bg-emerald-950/60'], ['red', '', CELL.red], ['black', '', CELL.black], ['odd', t('rl.odd'), 'bg-emerald-950/60']] as const).map(([k, label, cls], i) => (
          <Spot key={k} id={k} bets={bets} label={label || (k === 'red' ? '◆' : '◆')} cls={`${cls} ${k === 'red' ? 'text-[#ff6b7a]' : k === 'black' ? 'text-stone-300' : ''}`} win={isWin(k)} locked={locked} onBet={place} style={{ gridRow: 5, gridColumn: `${2 + i * 3} / span 3` }} />
        ))}
      </div>
    </div>
  );

  const bottom = (
    <>
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-[clamp(4px,1.6vw,10px)]" role="group" aria-label={t('rl.chips')}>
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => { setChip(c); feedback('tap'); }} aria-label={String(c)} aria-pressed={chip === c}
              className={`grid touch-manipulation place-items-center rounded-full border-2 border-dashed font-extrabold tabular-nums transition-transform ${chip === c ? '-translate-y-1 scale-110 border-amber-100 bg-gradient-to-br from-amber-200 to-amber-600 text-amber-950' : 'border-amber-400/60 bg-gradient-to-br from-stone-700 to-stone-900 text-amber-200'}`}
              style={{ width: 'clamp(38px,11vw,54px)', height: 'clamp(38px,11vw,54px)', fontSize: 'clamp(11px,3vw,15px)' }}>{c}</button>
          ))}
        </div>
        <div className="min-w-0 text-right text-[11px] text-stone-400">
          <p>{t('rl.bet')}: <b className="tabular-nums text-amber-200">{total}</b></p>
          {net !== null && <p className={`font-extrabold tabular-nums ${net > 0 ? 'text-emerald-300' : net < 0 ? 'text-rose-300' : 'text-stone-300'}`}>{net > 0 ? '+' : ''}{net}</p>}
        </div>
      </div>
      {/* Action Rail: altura fija reservada para que la mesa nunca se mueva */}
      <div className="flex min-h-[48px] w-full items-center justify-center gap-2" role="group" aria-label={t('rl.actions')}>
        <button type="button" disabled={locked || total === 0} onClick={undo} aria-label={t('rl.undo')} className="btn touch-manipulation"><Undo2 size={17} aria-hidden /></button>
        <button type="button" disabled={locked || total === 0} onClick={clear} aria-label={t('rl.clear')} className="btn touch-manipulation"><Eraser size={17} aria-hidden /></button>
        <button type="button" disabled={locked || total > 0 || lastTotal === 0} onClick={repeat} aria-label={t('rl.repeat')} className="btn touch-manipulation"><Repeat size={17} aria-hidden /></button>
        <button type="button" disabled={locked || total === 0} onClick={spin} className="btn btn--gold min-w-[9.5rem] touch-manipulation font-extrabold">{locked ? '…' : t('rl.spin')}</button>
      </div>
    </>
  );

  return (
    <GameFrame
      gameId="ruleta" feltTone="emerald"
      onExit={online ? () => { setActiveRoom(null); void exitMatch(nav); } : undefined}
      header={(
        <div className="grid grid-cols-2 gap-[min(1.8vw,8px)]" role="group" aria-label={t('rl.hud')}>
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-amber-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-amber-300">{t('rl.balance')}</p>
            <b className="block truncate text-[13px] tabular-nums">{w.chips}</b>
          </div>
          <div className="min-w-0 rounded-[13px] border border-white/10 bg-gradient-to-br from-orange-400/10 to-black/30 px-3 py-1.5">
            <p className="text-[9px] font-extrabold uppercase tracking-[.14em] text-orange-300">{t('rl.last')}</p>
            <span className="flex gap-0.5 overflow-hidden">
              {s.history.slice(0, 4).map((n, i) => (
                <b key={`${i}-${n}`} className={`grid h-[17px] min-w-[17px] place-items-center rounded-full px-0.5 text-[10px] tabular-nums text-white ${CELL[colorOf(n)]}`}>{n}</b>
              ))}
              {s.history.length === 0 && <b className="text-[13px]">—</b>}
            </span>
          </div>
        </div>
      )}
      felt={felt}
      bottom={bottom}
    />
  );
}
