import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { legalActions, teamOf } from '@mus/engine';
import type { Action, Seat, SignId } from '@mus/engine';
import { ActionBar } from '../components/ActionBar.tsx';
import { LanceTrack, TableCenter } from '../components/Center.tsx';
import { Hand } from '../components/Hand.tsx';
import { IconBook, IconExit, IconGear, IconMenu, IconVibrate } from '../components/icons.tsx';
import { MatchEndOverlay } from '../components/Overlays.tsx';
import { PhaseCinematic } from '../components/PhaseCinematic.tsx';
import { RoundRecap } from '../components/RoundRecap.tsx';
import { RulesSheet } from '../components/RulesSheet.tsx';
import { Scoreboard } from '../components/Scoreboard.tsx';
import { SeatBadge } from '../components/SeatBadge.tsx';
import { SettingsModal } from '../components/SettingsModal.tsx';
import { CatchEyeButton, FalseAlarmToast, SignRadialMenu, SignToast, SignTrigger, SignalCaughtOverlay } from '../components/Signs.tsx';
import type { Anchor } from '../components/Signs.tsx';
import { Sheet } from '../components/ui.tsx';
import { sortHand } from '../game/describe.ts';
import type { GameSource, IncomingSign } from '../game/types.ts';
import { useFeed, useSnapshot } from '../game/useGame.ts';
import { useSignalingSystem } from '../game/useSignalingSystem.ts';
import { useTableDirector } from '../game/useTableDirector.ts';
import { PREFS, haptic, prefOn, setPref, sound } from '../lib/feedback.ts';
import { useGameSettings } from '../lib/settings.tsx';
import { toast } from '../lib/toast.ts';
import { useWakeLock } from '../lib/wakeLock.ts';

interface TableProps {
  source: GameSource;
  /** Acción principal al acabar la partida (revancha, otra partida…); null = no hay. */
  endAction: { label: string; run: () => void } | null;
  endNote?: string;
  onExit: () => void;
}

const ICON_BTN =
  'grid size-10 place-items-center rounded-full border border-white/10 bg-zinc-900/70 text-stone-200 backdrop-blur transition active:scale-95';

const FELT_BG =
  'radial-gradient(ellipse at 50% 52%, var(--tapete-glow), transparent 52%), radial-gradient(ellipse at center, var(--tapete-a), var(--tapete-b) 72%, var(--tapete-c) 100%)';

/**
 * La mesa. Misma pantalla para bots (local) y sala online.
 *
 * Layout «one-screen»: el contenedor es `h-[100dvh] w-full overflow-hidden` y por dentro un grid de 4 filas
 * (marcador · estado · tapete `minmax(0,1fr)` · tu zona). El tapete absorbe lo que sobra y todo lo demás se
 * dimensiona con min(vw, dvh) —cartas con `--card-w`, avatares, tipografías—, así nada se sale ni hace scroll.
 */
export function Table({ source, endAction, endNote, onExit }: TableProps) {
  const snap = useSnapshot(source);
  const { view, mySeat } = snap;
  const signaling = useSignalingSystem(source, mySeat);
  const { playSound } = useGameSettings();
  const names = snap.seats.map((x) => x.name ?? '');
  const feed = useFeed(source, mySeat, names);
  const director = useTableDirector(source, names, mySeat);
  const { frozen } = director;

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [history, setHistory] = useState(false);
  const [rules, setRules] = useState(false);
  const [radial, setRadial] = useState<Anchor | null>(null);
  const [settings, setSettings] = useState(false);
  const [finalSeen, setFinalSeen] = useState(false);
  const [incoming, setIncoming] = useState<IncomingSign | null>(null);
  const [hapticOn, setHapticOn] = useState(() => prefOn(PREFS.haptic));
  /** Marcador al empezar la mano: el recuento cuenta «de X a Y» desde ahí. */
  const startPoints = useRef<[number, number] | null>(null);

  useWakeLock(true);

  // Cero scroll: mientras la mesa está montada, el documento no se desplaza.
  useEffect(() => {
    document.documentElement.classList.add('table-lock');
    return () => document.documentElement.classList.remove('table-lock');
  }, []);

  useEffect(() => {
    if (view && (view.phase === 'mus' || view.phase === 'discard')) startPoints.current = [view.score.points[0], view.score.points[1]];
  }, [view]);

  const legal = view ? legalActions(view, mySeat) : [];
  const discarding = legal.some((l) => l.type === 'DISCARD');
  const myTurn = legal.length > 0 && view?.phase !== 'handEnd';
  const handKey = snap.hand.map((c) => c.id).join();
  const sortedHand = view ? sortHand(snap.hand, view.config) : [];
  const canSign = Boolean(view) && !frozen && (view?.phase === 'mus' || view?.phase === 'discard' || view?.phase === 'lance');

  // La selección de descarte no sobrevive a un cambio de fase ni de mano.
  useEffect(() => { setSelected(new Set()); }, [view?.phase, handKey]);

  // Una cinemática o un recuento cierra el menú de señas: nada se envía a medias.
  useEffect(() => { if (frozen || !canSign) setRadial(null); }, [frozen, canSign]);

  // Aviso (vibración + sonido) cuando te llega la palabra: no antes de que acabe el cartel de fase.
  const turnKey = myTurn && view && !frozen ? view.version : -1;
  useEffect(() => {
    if (turnKey >= 0) { haptic([14, 40, 14]); sound('turn'); }
  }, [turnKey]);

  // Señas que llegan de tu pareja.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = source.onSign((s) => {
      setIncoming(s);
      haptic([10, 50, 10]);
      sound('sign');
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setIncoming(null), 4800);
    });
    return () => { off(); if (timer) clearTimeout(timer); };
  }, [source]);

  // Sonidos de la mano (repartir, descartar, envites), puntos, juegos, partida y sospecha de señas.
  useEffect(() => source.onEvents((events) => {
    for (const e of events) {
      if (e.t === 'handStart') playSound('card_deal');
      if (e.t === 'discard') playSound('card_play');
      if (e.t === 'envido' || e.t === 'ordago' || e.t === 'quiero') playSound('chips');
      if (e.t === 'award' && e.kind === 'deje') sound('point');
      if (e.t === 'gameWon') sound('point');
      if (e.t === 'matchWon') sound(e.team === teamOf(mySeat) ? 'win' : 'lose');
      if (e.t === 'signal_resolution') {
        if (e.result === 'caught') { playSound('alert_caught'); haptic([30, 40, 30]); } // la alerta la ve toda la mesa
        else if (e.catcher === mySeat) playSound('alert_fail'); // falsa alarma: solo suena a quien sospechó
      }
    }
  }), [source, mySeat, playSound]);

  // Turno caducado: cualquier cliente avisa al servidor, que decide con su reloj (y no se puede adelantar).
  // Con la mesa congelada no se avisa: el cartel de fase o la seña cazada no deben costarte el turno.
  useEffect(() => {
    const deadline = snap.deadline;
    if (deadline === null || frozen) return;
    const jitter = mySeat * 350;
    const id = setInterval(() => { if (Date.now() > deadline + jitter) source.tick(); }, 800);
    return () => clearInterval(id);
  }, [snap.deadline, mySeat, source, frozen]);

  const send = useCallback(async (a: Action) => {
    setBusy(true);
    const err = await source.send(a);
    setBusy(false);
    if (err) toast(err, 'error');
    else if (a.type === 'DISCARD') setSelected(new Set());
  }, [source]);

  const setCard = useCallback((id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const sendSign = async (id: SignId) => {
    const error = await signaling.sendSignal(id);
    if (error) toast(error, 'error');
    else toast('Seña enviada a tu pareja', 'ok', 1600);
  };

  // Atajos de teclado (escritorio): M mus · N no hay mus · P paso · Q quiero · X no quiero · 1-4 marcar carta · Enter confirmar · S señas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || busy || frozen || !view) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (menu || history || rules || radial || settings) return;
      const has = (t: string) => legal.some((l) => l.type === t);
      const k = e.key.toLowerCase();
      if (k === 'm' && has('MUS')) void send({ type: 'MUS' });
      else if (k === 'n' && has('NO_MUS')) void send({ type: 'NO_MUS' });
      else if (k === 'p' && has('PASO')) void send({ type: 'PASO' });
      else if (k === 'q' && has('QUIERO')) void send({ type: 'QUIERO' });
      else if (k === 'x' && has('NO_QUIERO')) void send({ type: 'NO_QUIERO' });
      else if (k === 's' && canSign) setRadial({ x: window.innerWidth / 2, y: window.innerHeight * 0.72 });
      else if (discarding && ['1', '2', '3', '4'].includes(k)) {
        const card = sortedHand[Number(k) - 1];
        if (card) setCard(card.id, !selected.has(card.id));
      } else if (k === 'enter') {
        if (discarding && selected.size > 0) void send({ type: 'DISCARD', cardIds: [...selected] });
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, canSign, discarding, frozen, history, legal, menu, radial, rules, selected, send, setCard, settings, sortedHand, view]);

  if (!view) {
    return (
      <main className="grid h-[100dvh] w-full place-items-center overflow-hidden text-stone-400"><p>Conectando con la mesa…</p></main>
    );
  }

  const partner = ((mySeat + 2) % 4) as Seat;
  const left = ((mySeat + 3) % 4) as Seat;
  const right = ((mySeat + 1) % 4) as Seat;
  const turnSeat = view.turn;
  const badge = (seat: Seat, tone: 'us' | 'them', bubbleSide: 'below' | 'left' | 'right') => (
    <SeatBadge
      info={snap.seats[seat]} tone={tone} mano={view.mano === seat} turn={turnSeat === seat && !frozen}
      bubble={feed.bubbles[seat]} deadline={snap.deadline} cards={view.handCounts[seat]}
      signalPulseAt={signaling.pulseAt(seat)} bubbleSide={bubbleSide}
    />
  );
  const secs = view.config.turnSeconds;
  const waiting = !frozen && (view.phase === 'lance' || view.phase === 'mus' || view.phase === 'discard')
    ? `Esperando a ${turnSeat !== null ? names[turnSeat] : '…'}`
    : '';
  const myBubble = feed.bubbles[mySeat];
  const myName = names[mySeat] || 'Tú';
  const showRecap = (view.phase === 'handEnd' || (view.phase === 'matchEnd' && !finalSeen)) && !frozen;
  const falseAlarm = signaling.resolution?.result === 'false_alarm' ? signaling.resolution : null;

  return (
    <main
      className="relative h-[100dvh] w-full select-none overflow-hidden text-stone-100"
      style={{ '--card-w': 'min(19vw,10.2dvh,118px)' } as CSSProperties}
    >
      <div className="mx-auto grid h-full w-full max-w-[1100px] grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-[min(1.1dvh,8px)] px-[clamp(8px,2.6vw,24px)] pb-[max(env(safe-area-inset-bottom),8px)] pt-[max(env(safe-area-inset-top),8px)]">
        {/* 1 · Marcador */}
        <header className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
          <button type="button" className={ICON_BTN} aria-label="Ajustes" onClick={() => setSettings(true)}><IconGear /></button>
          <Scoreboard view={view} mySeat={mySeat} />
          <button type="button" className={ICON_BTN} aria-label="Menú" onClick={() => setMenu(true)}><IconMenu /></button>
        </header>

        {/* 2 · Estado de la mano */}
        <section aria-label="Estado de la mano">
          <LanceTrack view={view} mySeat={mySeat} names={names} />
        </section>

        {/* 3 · Tapete: ocupa todo lo que sobra (minmax(0,1fr)) y nunca desborda */}
        <section
          className="relative min-h-0 overflow-hidden rounded-[clamp(22px,5vw,38px)] border border-amber-200/10 shadow-[inset_0_0_60px_rgba(0,0,0,.4),0_10px_30px_rgba(0,0,0,.3)]"
          style={{ background: FELT_BG }}
          aria-label="Mesa de juego"
        >
          <div className="grid h-full grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)] gap-x-1 p-[clamp(6px,2vw,16px)]">
            <div className="col-start-2 row-start-1 justify-self-center">{badge(partner, 'us', 'below')}</div>
            <div className="col-start-1 row-span-2 row-start-1 self-center justify-self-center">{badge(left, 'them', 'left')}</div>
            <div className="col-start-2 row-start-2 min-h-0"><TableCenter view={view} mySeat={mySeat} names={names} banner={feed.banner} /></div>
            <div className="col-start-3 row-span-2 row-start-1 self-center justify-self-center">{badge(right, 'them', 'right')}</div>
          </div>
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-20 flex justify-center">
            <SignToast sign={incoming} partner={names[partner] || 'Tu pareja'} />
          </div>
        </section>

        {/* 4 · Tu zona */}
        <section className="flex min-h-0 flex-col items-center gap-[min(.8dvh,6px)]" aria-label="Tu zona de juego">
          <div className="relative flex w-full items-center justify-between gap-2">
            <div className="relative flex min-w-0 items-center gap-2">
              <SignTrigger
                name={myName}
                disabled={!canSign}
                pulseAt={signaling.pulseAt(mySeat)}
                onOpen={(a) => { if (canSign) setRadial(a); }}
              />
              <b className={`truncate text-[13px] ${turnSeat === mySeat && !frozen ? 'text-amber-200' : 'text-stone-200'}`}>{myName}</b>
              {view.mano === mySeat && (
                <span className="rounded-full bg-amber-300 px-2 py-[2px] text-[9px] font-extrabold uppercase tracking-wider text-amber-950">Mano</span>
              )}
              <AnimatePresence>
                {myBubble && (
                  <motion.span
                    key={myBubble.at}
                    className="rounded-xl bg-stone-100 px-2.5 py-1 text-[11px] font-extrabold leading-tight text-zinc-900 shadow-[0_4px_14px_rgba(0,0,0,.45)]"
                    initial={{ opacity: 0, scale: 0.6, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, transition: { duration: 0.25 } }}
                    transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                  >
                    {myBubble.text}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <CatchEyeButton
              cooldownMs={signaling.catchCooldown}
              disabled={!snap.connected || !canSign || signaling.catching}
              windowOpen={signaling.windowOpen}
              onClick={() => void signaling.catchSignal().then((error) => { if (error) toast(error, 'error'); })}
            />
            {myTurn && !frozen && snap.deadline !== null && secs > 0 && (
              <motion.i
                key={snap.deadline}
                aria-hidden="true"
                className="absolute -bottom-[3px] left-0 h-[3px] w-full origin-left rounded-full bg-amber-300/80"
                initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: Math.max(0, snap.deadline - Date.now()) / 1000, ease: 'linear' }}
              />
            )}
          </div>

          {discarding && !frozen ? (
            <div className="flex min-h-[50px] w-full max-w-[520px] items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/75 px-3 py-1.5 backdrop-blur-md">
              <p className="text-[12px] leading-tight text-stone-300">
                {selected.size === 0 ? 'Desliza hacia arriba las cartas que quieres cambiar' : `Cambiar ${selected.size} ${selected.size === 1 ? 'carta' : 'cartas'}`}
              </p>
              <button
                type="button"
                disabled={busy || selected.size === 0}
                onClick={() => void send({ type: 'DISCARD', cardIds: [...selected] })}
                className="h-10 shrink-0 rounded-full border border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 px-5 text-[14px] font-bold text-amber-950 transition enabled:active:scale-95 disabled:opacity-40"
              >
                Descartar{selected.size > 0 ? ` (${selected.size})` : ''}
              </button>
            </div>
          ) : (
            <ActionBar view={view} legal={frozen || view.phase === 'handEnd' ? [] : legal} busy={busy} waiting={waiting} onSend={(a) => void send(a)} />
          )}

          <Hand cards={sortedHand} interactive={discarding && !busy && !frozen} selected={selected} onSet={setCard} eightKings={view.config.eightKings} />
        </section>
      </div>

      {!snap.connected && (
        <div className="absolute left-1/2 top-[calc(env(safe-area-inset-top)+64px)] z-20 -translate-x-1/2 rounded-full bg-[#7a1e2b] px-3.5 py-[5px] text-[13px] font-bold">Reconectando…</div>
      )}

      {/* Capas, de menos a más importante */}
      <PhaseCinematic cine={director.phase} />
      <FalseAlarmToast event={falseAlarm} names={names} mySeat={mySeat} />
      <AnimatePresence>
        {showRecap && (
          <RoundRecap
            key="recap"
            view={view}
            mySeat={mySeat}
            seats={snap.seats}
            startPoints={startPoints.current}
            busy={view.phase === 'matchEnd' ? false : busy}
            final={view.phase === 'matchEnd'}
            continueLabel={view.phase === 'matchEnd' ? 'Ver resultado' : 'Continuar'}
            onContinue={() => (view.phase === 'matchEnd' ? setFinalSeen(true) : void send({ type: 'CONTINUE' }))}
          />
        )}
      </AnimatePresence>
      {view.phase === 'matchEnd' && finalSeen && (
        <MatchEndOverlay view={view} mySeat={mySeat} primaryLabel={endAction?.label ?? null} onPrimary={() => endAction?.run()} onExit={onExit} note={endNote} />
      )}
      <SignalCaughtOverlay caught={director.caught} names={names} mySeat={mySeat} />

      <SignRadialMenu
        open={radial !== null}
        anchor={radial ?? { x: 0, y: 0 }}
        onClose={() => setRadial(null)}
        hand={snap.hand}
        config={view.config}
        onSend={sendSign}
      />
      <SettingsModal open={settings} onClose={() => setSettings(false)} />
      <RulesSheet open={rules} onClose={() => setRules(false)} eightKings={view.config.eightKings} />
      <Sheet open={history} onClose={() => setHistory(false)} title="Registro de la mano">
        <ol className="log w-full">
          {feed.log.length === 0 && <li className="log__neutral">La partida acaba de empezar</li>}
          {[...feed.log].reverse().slice(0, 16).map((l) => (<li key={l.id} className={`log__${l.tone}`}>{l.text}</li>))}
        </ol>
        <p className="side__keys">
          <b>Atajos de escritorio</b>
          <span><kbd>M</kbd> mus · <kbd>N</kbd> no hay mus · <kbd>P</kbd> paso</span>
          <span><kbd>Q</kbd> quiero · <kbd>X</kbd> no quiero</span>
          <span><kbd>1</kbd>–<kbd>4</kbd> marcar carta · <kbd>Enter</kbd> descartar</span>
          <span><kbd>S</kbd> señas (o mantén pulsado tu avatar)</span>
        </p>
      </Sheet>
      <Sheet open={menu} onClose={() => setMenu(false)} title="Menú">
        <div className="menu">
          <button type="button" className="menu__item" onClick={() => { setMenu(false); setHistory(true); }}><IconBook /> Registro y atajos</button>
          <button type="button" className="menu__item" onClick={() => { setMenu(false); setRules(true); }}><IconBook /> Cómo se puntúa</button>
          <button type="button" className="menu__item" onClick={() => { setMenu(false); setSettings(true); }}><IconGear /> Ajustes (sonido y tapete)</button>
          <button type="button" className="menu__item" role="switch" aria-checked={hapticOn} onClick={() => { setPref(PREFS.haptic, !hapticOn); setHapticOn(!hapticOn); }}>
            <IconVibrate /> Vibración <i className={`switch${hapticOn ? ' on' : ''}`} />
          </button>
          <button type="button" className="menu__item menu__item--danger" onClick={() => { setMenu(false); onExit(); }}><IconExit /> Salir de la partida</button>
        </div>
      </Sheet>
    </main>
  );
}
