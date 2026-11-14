import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { teamOf } from '@mus/engine';
import type { PublicState, Seat, Team } from '@mus/engine';
import { LANCE_LABEL, awardRows, describeHand, teamLabel } from '../game/describe.ts';
import type { SeatInfo } from '../game/types.ts';
import { useGameSettings } from '../lib/settings.tsx';
import { AnimatedNumber } from './AnimatedNumber.tsx';
import { CardFace } from './CardFace.tsx';

interface RoundRecapProps {
  view: PublicState;
  mySeat: Seat;
  seats: SeatInfo[];
  /** Marcador al empezar la mano (para contar «de X a Y»). null = se deduce de los puntos ganados. */
  startPoints: [number, number] | null;
  busy: boolean;
  /** Última mano de la partida: el botón solo pasa al resultado final. */
  final?: boolean;
  continueLabel?: string;
  onContinue: () => void;
}

type Stage = 'reveal' | 'tally' | 'fly' | 'done';

interface Line {
  key: string;
  lance: string;
  label: string;
  team: Team;
  points: number;
  /** Texto en lugar de «+N» (órdago aceptado). */
  special?: string;
}

// Tiempos del recuento (ms). Lentos a propósito: hay que poder seguirlo.
const REVEAL_MS = 3400; // se enseñan las cuatro manos
const FIRST_LINE_MS = 700; // pausa antes del primer concepto
const LINE_MS = 1300; // entre un concepto y el siguiente
const BEFORE_FLY_MS = 1100; // pausa antes de que las piedras salten al marcador
const FLY_MS = 2300; // vuelo de las piedras + cuenta del total

const MAX_STONES = 14;

/**
 * Recuento de fin de mano. Congela la partida (a la espera de que los cuatro pulsen continuar) y desglosa los puntos
 * despacio sobre el tapete: primero se enseñan las manos, luego «Grande +2», «Pares +3»… uno a uno, y al final las
 * piedras vuelan al marcador total, que cuenta de X a Y.
 */
export function RoundRecap({ view, mySeat, seats, startPoints, busy, final = false, continueLabel = 'Continuar', onContinue }: RoundRecapProps) {
  const { playSound } = useGameSettings();
  const res = view.handResult;
  const mine = teamOf(mySeat);
  const teams: [Team, Team] = [mine, (1 - mine) as Team];
  const revealed = view.revealedHands;

  const lines = useMemo<Line[]>(() => {
    const out: Line[] = awardRows(view.awards, mySeat).map((r) => ({
      key: r.key, lance: LANCE_LABEL[r.lance], label: r.label, team: r.team, points: r.points,
    }));
    if (res?.by === 'ordago' && res.gameWinner !== null) {
      out.push({ key: 'ordago', lance: 'Órdago', label: 'aceptado: gana quien gane el lance', team: res.gameWinner, points: 0, special: '¡JUEGO!' });
    }
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // se fija al montar: el recuento no se reinicia si llegan cambios de «listos»

  const gained: Record<Team, number> = { 0: 0, 1: 0 };
  lines.forEach((l) => { gained[l.team] += l.points; });
  const after = view.score.points;
  const before: [number, number] = startPoints ?? [Math.max(0, after[0] - gained[0]), Math.max(0, after[1] - gained[1])];

  const [stage, setStage] = useState<Stage>(revealed ? 'reveal' : 'tally');
  const [shown, setShown] = useState(0);
  const [fly, setFly] = useState<{ dx: number; dy: number }[] | null>(null);
  const stoneBox = useRef<(HTMLDivElement | null)[]>([null, null]);
  const totalBox = useRef<(HTMLDivElement | null)[]>([null, null]);

  // Guion del recuento: cada paso programa el siguiente.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (stage === 'reveal') {
      t = setTimeout(() => setStage('tally'), REVEAL_MS);
    } else if (stage === 'tally') {
      if (shown < lines.length) {
        t = setTimeout(() => { setShown((n) => n + 1); playSound('chips'); }, shown === 0 ? FIRST_LINE_MS : LINE_MS);
      } else {
        t = setTimeout(() => setStage('fly'), shown === 0 ? FIRST_LINE_MS + 600 : BEFORE_FLY_MS);
      }
    } else if (stage === 'fly') {
      t = setTimeout(() => setStage('done'), FLY_MS);
    }
    return () => clearTimeout(t);
  }, [stage, shown, lines.length, playSound]);

  // Al empezar el vuelo se mide de dónde a dónde va cada piedra.
  useEffect(() => {
    if (stage !== 'fly') return;
    setFly([0, 1].map((i) => {
      const a = stoneBox.current[i]?.getBoundingClientRect();
      const b = totalBox.current[i]?.getBoundingClientRect();
      if (!a || !b) return { dx: 0, dy: -60 };
      return { dx: b.left + b.width / 2 - (a.left + a.width / 2), dy: b.top + b.height / 2 - (a.top + a.height / 2) };
    }));
  }, [stage]);

  const skip = () => { setShown(lines.length); setFly(null); setStage('done'); };
  const flown = stage === 'fly' || stage === 'done';
  const done = stage === 'done';

  const cum: Record<Team, number> = { 0: 0, 1: 0 };
  lines.slice(0, shown).forEach((l) => { cum[l.team] += l.points; });

  const waiting = seats.filter((s) => !s.isBot && !view.ready[s.seat]).map((s) => s.name ?? '');
  const iAmReady = !final && view.ready[mySeat];
  const winner = res?.gameWinner ?? null;
  const order = [0, 1, 2, 3].map((k) => ((mySeat + k) % 4) as Seat);

  return (
    <motion.div
      className="absolute inset-0 z-40 flex flex-col bg-black/55 px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-[max(env(safe-area-inset-top),14px)] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Recuento de la mano"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.5 } }}
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-[560px] flex-1 flex-col gap-[min(1.8dvh,14px)]">
        {/* Cabecera */}
        <header className="grid justify-items-center gap-1 text-center">
          <span className="text-[10px] font-extrabold uppercase tracking-[.28em] text-amber-200/70">{final ? 'Última mano' : 'Fin de la mano'}</span>
          <h2 className="font-[var(--font-display)] text-[clamp(24px,7.5vw,38px)] font-bold leading-none text-amber-50">Recuento</h2>
          <div className="h-[22px]">
            <AnimatePresence>
              {done && winner !== null && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-[clamp(15px,4.6vw,20px)] font-extrabold uppercase tracking-[.12em] text-transparent"
                >
                  ¡Juego para {teamLabel(winner, mySeat).toLowerCase()}!
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Marcador grande: total que cuenta y piedras de esta mano */}
        <section className="grid grid-cols-2 gap-[min(2.5vw,12px)]" aria-label="Marcador de la partida">
          {teams.map((team, pos) => {
            const us = team === mine;
            return (
              <div
                key={team}
                className={`min-w-0 rounded-2xl border p-[min(3vw,14px)] ${us ? 'border-teal-300/30 bg-teal-400/10' : 'border-orange-300/30 bg-orange-400/10'}`}
              >
                <p className={`text-[11px] font-extrabold uppercase tracking-[.18em] ${us ? 'text-teal-300' : 'text-orange-300'}`}>{teamLabel(team, mySeat)}</p>
                <motion.div
                  ref={(el) => { totalBox.current[pos] = el; }}
                  className="mt-1 flex items-baseline gap-1"
                  animate={flown ? { scale: [1, 1.14, 1] } : { scale: 1 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                >
                  <AnimatedNumber
                    className="font-[var(--font-display)] text-[clamp(40px,13vw,66px)] font-bold leading-none tabular-nums text-stone-50"
                    value={flown ? after[team] : before[team]}
                    from={before[team]}
                    duration={1.1}
                    delay={0.9}
                  />
                  <span className="text-[13px] font-bold text-stone-400">/{view.config.targetPoints}</span>
                </motion.div>
                <div className="mt-2 flex min-h-[26px] items-center gap-2">
                  <span className={`shrink-0 text-[clamp(15px,4.6vw,20px)] font-extrabold tabular-nums ${us ? 'text-teal-200' : 'text-orange-200'}`}>
                    +<AnimatedNumber value={cum[team]} duration={0.6} />
                  </span>
                  <div ref={(el) => { stoneBox.current[pos] = el; }} className="flex min-w-0 flex-wrap gap-1" aria-hidden="true">
                    {Array.from({ length: Math.min(cum[team], MAX_STONES) }, (_, i) => {
                      const d = fly?.[pos];
                      const delay = 0.1 + i * 0.07;
                      return (
                        <motion.i
                          key={i}
                          className={`block size-[10px] rounded-full border ${us ? 'border-teal-100 bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,.6)]' : 'border-orange-100 bg-orange-300 shadow-[0_0_8px_rgba(253,186,116,.6)]'}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={flown && d ? { x: d.dx, y: d.dy, scale: 0.35, opacity: 0 } : { x: 0, y: 0, scale: 1, opacity: 1 }}
                          transition={flown && d
                            ? { duration: 0.9, delay, ease: 'easeInOut', opacity: { duration: 0.25, delay: delay + 0.65 } }
                            : { type: 'spring', stiffness: 420, damping: 18 }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* Zona central: manos enseñadas → desglose por conceptos. Nunca hace scroll. */}
        <div className="min-h-0 flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {stage === 'reveal' && revealed ? (
              <motion.div key="reveal" className="grid gap-[min(1.1dvh,8px)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
                {order.map((seat, i) => {
                  const info = describeHand(revealed[seat], view.config);
                  const tone = seat === mySeat ? 'border-teal-300' : teamOf(seat) === mine ? 'border-teal-300/60' : 'border-orange-300/70';
                  return (
                    <motion.div
                      key={seat}
                      className={`grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border-l-[3px] bg-zinc-900/70 px-2.5 py-1 ${tone}`}
                      initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.2 + i * 0.4, duration: 0.5 } }}
                    >
                      <div className="grid min-w-0 text-[11px] leading-tight text-stone-400">
                        <b className="truncate text-[14px] text-stone-50">{seat === mySeat ? 'Tú' : seats[seat].name}</b>
                        <span className="truncate">{info.pares ?? 'Sin pares'}</span>
                        <span className="truncate">{info.juego}</span>
                      </div>
                      <div className="flex gap-1">
                        {revealed[seat].map((c) => (
                          <div key={c.id} className="aspect-[12/19] w-[min(10.5vw,5dvh,48px)] overflow-hidden rounded-[5px] shadow-[0_3px_8px_rgba(0,0,0,.45)]">
                            <CardFace card={c} eightKings={view.config.eightKings} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.ul key="tally" className="grid gap-[min(1dvh,7px)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-live="polite">
                <AnimatePresence>
                  {lines.slice(0, shown).map((l) => {
                    const us = l.team === mine;
                    return (
                      <motion.li
                        key={l.key}
                        className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border-l-[3px] bg-zinc-900/75 px-3 py-[min(1.2dvh,8px)] ${us ? 'border-teal-300' : 'border-orange-300'}`}
                        initial={{ opacity: 0, x: us ? -40 : 40, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
                      >
                        <span className="min-w-[64px] text-[13px] font-extrabold uppercase tracking-wider text-amber-300">{l.lance}</span>
                        <span className="truncate text-[12px] text-stone-400">{l.label}</span>
                        <b className="whitespace-nowrap text-[14px] text-stone-100">
                          {teamLabel(l.team, mySeat)}{' '}
                          <span className={`text-[clamp(18px,5.4vw,24px)] font-extrabold tabular-nums ${us ? 'text-teal-300' : 'text-orange-300'}`}>
                            {l.special ?? <>+<AnimatedNumber value={l.points} from={0} duration={0.7} /></>}
                          </span>
                        </b>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
                {lines.length === 0 && stage !== 'reveal' && (
                  <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center text-[14px] text-stone-400">
                    Nadie ha puntuado en esta mano
                  </motion.li>
                )}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Pie */}
        <footer className="grid gap-2">
          <button
            type="button"
            disabled={!done || busy || iAmReady}
            onClick={onContinue}
            className="h-[52px] w-full rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-300 to-amber-500 text-[17px] font-bold text-amber-950 shadow-[0_8px_24px_rgba(0,0,0,.35)] transition enabled:active:scale-[.98] disabled:opacity-40"
          >
            {iAmReady ? 'Esperando…' : continueLabel}
          </button>
          <div className="h-[18px] text-center text-[12.5px] text-stone-400">
            {!done ? (
              <button type="button" onClick={skip} className="font-semibold text-stone-300 underline-offset-4 hover:underline">Saltar recuento</button>
            ) : iAmReady && waiting.length > 0 ? `Faltan: ${waiting.join(', ')}` : null}
          </div>
        </footer>
      </div>
    </motion.div>
  );
}
