import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { legalActions, teamOf } from '@mus/engine';
import type { Action, Seat, SignId } from '@mus/engine';
import { ActionBar } from '../components/ActionBar.tsx';
import { Center } from '../components/Center.tsx';
import { Hand } from '../components/Hand.tsx';
import { IconBook, IconExit, IconGear, IconMenu, IconVibrate } from '../components/icons.tsx';
import { HandEndOverlay, MatchEndOverlay } from '../components/Overlays.tsx';
import { RulesSheet } from '../components/RulesSheet.tsx';
import { Scoreboard } from '../components/Scoreboard.tsx';
import { SeatBadge } from '../components/SeatBadge.tsx';
import { SettingsModal } from '../components/SettingsModal.tsx';
import { CatchSignalButton, SignalResolutionOverlay, SignButton, SignSheet, SignToast } from '../components/Signs.tsx';
import { Avatar, Button, Sheet } from '../components/ui.tsx';
import { sortHand } from '../game/describe.ts';
import type { GameSource, IncomingSign } from '../game/types.ts';
import { useFeed, useSnapshot } from '../game/useGame.ts';
import { useSignalingSystem } from '../game/useSignalingSystem.ts';
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

/** La mesa: la misma pantalla sirve para jugar contra bots (local) y para una sala online. */
export function Table({ source, endAction, endNote, onExit }: TableProps) {
  const snap = useSnapshot(source);
  const { view, mySeat } = snap;
  const signaling = useSignalingSystem(source, mySeat);
  const { playSound } = useGameSettings();
  const names = snap.seats.map((x) => x.name ?? '');
  const feed = useFeed(source, mySeat, names);

  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [history, setHistory] = useState(false);
  const [rules, setRules] = useState(false);
  const [signs, setSigns] = useState(false);
  const [settings, setSettings] = useState(false);
  const [finalSeen, setFinalSeen] = useState(false);
  const [incoming, setIncoming] = useState<IncomingSign | null>(null);
  const [hapticOn, setHapticOn] = useState(() => prefOn(PREFS.haptic));
  const signHoldTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useWakeLock(true);

  useEffect(() => () => {
    if (signHoldTimer.current !== null) clearTimeout(signHoldTimer.current);
  }, []);

  const startSignHold = () => {
    if (view?.phase === 'matchEnd') return;
    signHoldTimer.current = setTimeout(() => { signHoldTimer.current = null; setSigns(true); }, 450);
  };
  const cancelSignHold = () => {
    if (signHoldTimer.current !== null) clearTimeout(signHoldTimer.current);
    signHoldTimer.current = null;
  };

  const legal = view ? legalActions(view, mySeat) : [];
  const discarding = legal.some((l) => l.type === 'DISCARD');
  const myTurn = legal.length > 0 && view?.phase !== 'handEnd';
  const handKey = snap.hand.map((c) => c.id).join();
  const sortedHand = view ? sortHand(snap.hand, view.config) : [];

  // La selección de descarte no sobrevive a un cambio de fase ni de mano.
  useEffect(() => { setSelected(new Set()); }, [view?.phase, handKey]);

  // Aviso (vibración + sonido) cuando te llega la palabra.
  const turnKey = myTurn && view ? view.version : -1;
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
  useEffect(() => {
    const deadline = snap.deadline;
    if (deadline === null) return;
    const jitter = mySeat * 350;
    const id = setInterval(() => { if (Date.now() > deadline + jitter) source.tick(); }, 800);
    return () => clearInterval(id);
  }, [snap.deadline, mySeat, source]);

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
      if (e.metaKey || e.ctrlKey || e.altKey || busy || !view) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (menu || history || rules || signs || settings) return;
      const has = (t: string) => legal.some((l) => l.type === t);
      const k = e.key.toLowerCase();
      if (k === 'm' && has('MUS')) void send({ type: 'MUS' });
      else if (k === 'n' && has('NO_MUS')) void send({ type: 'NO_MUS' });
      else if (k === 'p' && has('PASO')) void send({ type: 'PASO' });
      else if (k === 'q' && has('QUIERO')) void send({ type: 'QUIERO' });
      else if (k === 'x' && has('NO_QUIERO')) void send({ type: 'NO_QUIERO' });
      else if (k === 's' && view.phase !== 'matchEnd') setSigns(true);
      else if (discarding && ['1', '2', '3', '4'].includes(k)) {
        const card = sortedHand[Number(k) - 1];
        if (card) setCard(card.id, !selected.has(card.id));
      } else if (k === 'enter') {
        if (discarding && selected.size > 0) void send({ type: 'DISCARD', cardIds: [...selected] });
        else if (view.phase === 'handEnd' && has('CONTINUE')) void send({ type: 'CONTINUE' });
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, discarding, history, legal, menu, rules, selected, send, setCard, settings, signs, sortedHand, view]);

  if (!view) {
    return (<main className="table table--loading"><p>Conectando con la mesa…</p></main>);
  }

  const partner = ((mySeat + 2) % 4) as Seat;
  const left = ((mySeat + 3) % 4) as Seat;
  const right = ((mySeat + 1) % 4) as Seat;
  const turnSeat = view.turn;
  const badge = (seat: Seat, tone: 'us' | 'them') => (
    <SeatBadge
      info={snap.seats[seat]} tone={tone} mano={view.mano === seat} turn={turnSeat === seat}
      bubble={feed.bubbles[seat]} deadline={snap.deadline} cards={view.handCounts[seat]}
      signalPulseAt={signaling.pulseAt(seat)}
    />
  );
  const secs = view.config.turnSeconds;
  const waiting = view.phase === 'lance' || view.phase === 'mus' || view.phase === 'discard'
    ? `Esperando a ${turnSeat !== null ? names[turnSeat] : '…'}`
    : '';
  const myBubble = feed.bubbles[mySeat];

  return (
    <main className="table">
      <header className="table__top">
        <button type="button" className="icon-btn icon-btn--gear" aria-label="Ajustes" onClick={() => setSettings(true)}><IconGear /></button>
        <div className="table__score-island">
          <span className="table__eyebrow">Partida en curso</span>
          <Scoreboard view={view} mySeat={mySeat} />
        </div>
        <button type="button" className="icon-btn" aria-label="Menú" onClick={() => setMenu(true)}><IconMenu /></button>
      </header>

      {!snap.connected && <div className="reconnect">Reconectando…</div>}

      <section className="table__status" aria-label="Estado de la mano">
        <Center view={view} mySeat={mySeat} names={names} banner={feed.banner} />
      </section>
      <SignalResolutionOverlay resolution={signaling.resolution} names={names} />

      <section className="table__felt" aria-label="Mesa de juego">
        <div className="opponents">
          <div className="table__seat table__seat--left">{badge(left, 'them')}</div>
          <div className="table__seat table__seat--partner">{badge(partner, 'us')}</div>
          <div className="table__seat table__seat--right">{badge(right, 'them')}</div>
        </div>
      </section>

      <section className="table__me" aria-label="Tu zona de juego">
        <SignToast sign={incoming} partner={names[partner] || 'Tu pareja'} />
        <div className="me-row">
          <div className={`me${turnSeat === mySeat ? ' me--turn' : ''}`}>
            <motion.div
              className="me__avatar"
              key={signaling.pulseAt(mySeat) ?? 'idle'}
              animate={signaling.pulseAt(mySeat)
                ? { boxShadow: ['0 0 0 rgba(234,179,8,0)', '0 0 18px rgba(234,179,8,.75)', '0 0 0 rgba(234,179,8,0)'] }
                : undefined}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              role="button"
              tabIndex={view.phase === 'matchEnd' ? -1 : 0}
              aria-label="Mantén pulsado para pasar una seña"
              onPointerDown={startSignHold}
              onPointerUp={cancelSignHold}
              onPointerLeave={cancelSignHold}
              onPointerCancel={cancelSignHold}
              onKeyDown={(event) => {
                if ((event.key === 'Enter' || event.key === ' ') && view.phase !== 'matchEnd') {
                  event.preventDefault();
                  setSigns(true);
                }
              }}
            >
              <Avatar name={names[mySeat] || 'Tú'} tone="me" size={30} />
            </motion.div>
            <b>{names[mySeat] || 'Tú'}</b>
            {view.mano === mySeat && <span className="chip-mano">Mano</span>}
            {myBubble && <span key={myBubble.at} className={`bubble bubble--${myBubble.tone} bubble--me`}>{myBubble.text}</span>}
          </div>
          <SignButton onClick={() => setSigns(true)} disabled={view.phase === 'matchEnd'} />
          {snap.room && (
            <CatchSignalButton
              cooldownMs={signaling.catchCooldown}
              disabled={!snap.connected || view.phase === 'matchEnd' || signaling.catching}
              windowOpen={signaling.windowOpen}
              onClick={() => void signaling.catchSignal().then((error) => { if (error) toast(error, 'error'); })}
            />
          )}
        </div>
        {myTurn && snap.deadline !== null && secs > 0 && (
          <div className="turnbar" key={snap.deadline}><i style={{ animationDuration: `${Math.max(0, snap.deadline - Date.now())}ms` }} /></div>
        )}

        {!discarding && (
          <ActionBar view={view} legal={view.phase === 'handEnd' ? [] : legal} busy={busy} waiting={waiting} onSend={(a) => void send(a)} />
        )}

        <Hand cards={sortedHand} interactive={discarding && !busy} selected={selected} onSet={setCard} eightKings={view.config.eightKings} />

        {discarding && (
          <div className="actions actions--discard">
            <p>{selected.size === 0 ? 'Desliza hacia arriba las cartas que quieres cambiar' : `Cambiar ${selected.size} ${selected.size === 1 ? 'carta' : 'cartas'}`}</p>
            <Button variant="primary" disabled={busy || selected.size === 0} onClick={() => void send({ type: 'DISCARD', cardIds: [...selected] })}>
              Descartar{selected.size > 0 ? ` (${selected.size})` : ''}
            </Button>
          </div>
        )}
      </section>

      {view.phase === 'handEnd' && (
        <HandEndOverlay view={view} mySeat={mySeat} seats={snap.seats} busy={busy} onContinue={() => void send({ type: 'CONTINUE' })} />
      )}
      {view.phase === 'matchEnd' && !finalSeen && (
        <HandEndOverlay view={view} mySeat={mySeat} seats={snap.seats} busy={false} final continueLabel="Ver resultado" onContinue={() => setFinalSeen(true)} />
      )}
      {view.phase === 'matchEnd' && finalSeen && (
        <MatchEndOverlay view={view} mySeat={mySeat} primaryLabel={endAction?.label ?? null} onPrimary={() => endAction?.run()} onExit={onExit} note={endNote} />
      )}

      <SettingsModal open={settings} onClose={() => setSettings(false)} />
      <SignSheet open={signs} onClose={() => setSigns(false)} hand={snap.hand} config={view.config} onSend={sendSign} />
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
          <span><kbd>S</kbd> señas</span>
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
