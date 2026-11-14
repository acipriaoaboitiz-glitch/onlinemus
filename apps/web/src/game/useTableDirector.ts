import { useEffect, useRef, useState } from 'react';
import type { GameEvent, Lance, Seat } from '@mus/engine';
import { LANCE_LABEL } from './describe.ts';
import type { GameSource } from './types.ts';

/** Duración (en segundos) de cada tramo del cartel de fase: entra, se mantiene 1,5 s y se va. */
export const CINE = { in: 0.7, hold: 1.5, out: 0.6 } as const;
/** Cuánto permanece el cartel «SEÑA CAZADA» antes de devolver el control (ms). */
export const CAUGHT_HOLD_MS = 3_600;

export interface PhaseCine {
  key: number;
  lance: Lance;
  title: string;
  subtitle: string | null;
}

export type CaughtEvent = Extract<GameEvent, { t: 'signal_resolution' }>;
export interface CaughtCine {
  key: number;
  event: CaughtEvent;
}

export interface TableDirector {
  /** Cartel de fase visible ahora mismo (null entre carteles). */
  phase: PhaseCine | null;
  /** Hay una cinemática de fase en cola o en pantalla. */
  phaseActive: boolean;
  /** Seña cazada en pantalla. */
  caught: CaughtCine | null;
  /** La mesa está congelada: ni botones, ni atajos, ni turnos de bots. */
  frozen: boolean;
}

/**
 * Director de ritmo de la mesa. Escucha los eventos del juego y decide qué se ve y cuándo:
 *  · cada cambio de lance (Grande → Chica → Pares → Juego/Punto) encola un cartel a pantalla casi completa;
 *  · una seña cazada congela la mesa al instante y la deja así CAUGHT_HOLD_MS.
 * Mientras algo de esto está en pantalla, `frozen` es true y (en local) se detiene a los bots.
 * Todo son temporizadores: no depende de que las animaciones lleguen a terminar.
 */
export function useTableDirector(source: GameSource, names: readonly string[], mySeat: Seat): TableDirector {
  const [phase, setPhase] = useState<PhaseCine | null>(null);
  const [phaseActive, setPhaseActive] = useState(false);
  const [caught, setCaught] = useState<CaughtCine | null>(null);

  const namesRef = useRef(names);
  namesRef.current = names;
  const queue = useRef<PhaseCine[]>([]);
  const running = useRef(false);
  const seq = useRef(0);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const caughtTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const later = (fn: () => void, ms: number) => {
    const t = setTimeout(() => { timers.current.delete(t); fn(); }, ms);
    timers.current.add(t);
  };

  useEffect(() => {
    const nm = (s: Seat) => (s === mySeat ? 'Tú' : namesRef.current[s] || `Jugador ${s + 1}`);

    const step = (): void => {
      const next = queue.current.shift();
      if (!next) {
        running.current = false;
        setPhase(null);
        setPhaseActive(false);
        return;
      }
      setPhase(next);
      later(() => setPhase(null), (CINE.in + CINE.hold) * 1000); // arranca la salida…
      later(step, (CINE.in + CINE.hold + CINE.out) * 1000); // …y cuando termina, el siguiente cartel (o fin)
    };

    const reset = (): void => {
      queue.current.length = 0;
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      running.current = false;
      setPhase(null);
      setPhaseActive(false);
    };

    const off = source.onEvents((events) => {
      let note: string | null = null;
      for (const e of events) {
        if (e.t === 'handStart') { reset(); note = null; continue; }
        if (e.t === 'lanceSkipped') { note = 'Nadie tiene pares'; continue; }
        if (e.t === 'lanceStart') {
          let subtitle: string | null = note;
          if (e.lance === 'punto') subtitle = 'Nadie tiene juego';
          else if ((e.lance === 'pares' || e.lance === 'juego') && e.participants.length > 0) {
            const who = `Juegan: ${e.participants.map(nm).join(', ')}`;
            subtitle = subtitle ? `${subtitle} · ${who}` : who;
          }
          note = null;
          queue.current.push({ key: ++seq.current, lance: e.lance, title: LANCE_LABEL[e.lance].toUpperCase(), subtitle });
        }
        if (e.t === 'signal_resolution' && e.result === 'caught') {
          // Se congela AL INSTANTE: se pausa a los bots antes de que React llegue a pintar.
          source.setPaused?.(true);
          if (caughtTimer.current !== null) clearTimeout(caughtTimer.current);
          setCaught({ key: ++seq.current, event: e });
          caughtTimer.current = setTimeout(() => { caughtTimer.current = null; setCaught(null); }, CAUGHT_HOLD_MS);
        }
      }
      if (queue.current.length > 0 && !running.current) {
        running.current = true;
        setPhaseActive(true);
        source.setPaused?.(true);
        step();
      }
    });

    return () => {
      off();
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      if (caughtTimer.current !== null) clearTimeout(caughtTimer.current);
    };
  }, [source, mySeat]);

  const frozen = phaseActive || caught !== null;
  useEffect(() => {
    source.setPaused?.(frozen);
    return () => source.setPaused?.(false);
  }, [frozen, source]);

  return { phase, phaseActive, caught, frozen };
}
