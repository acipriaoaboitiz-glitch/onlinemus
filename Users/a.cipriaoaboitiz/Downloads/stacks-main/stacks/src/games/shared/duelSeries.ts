import { useEffect, useRef } from 'react';
import { juice } from '../../services/juice.ts';
import { gameTimeout } from '../../services/timers.ts';
import { wallet } from '../../store/wallet.ts';
import { useSeries } from './series.tsx';

interface Opts {
  gameId: string;
  round: number;
  /** 0 o 1 = ganó esa plaza · 'draw' = tablas · null = ronda en curso. */
  winner: 0 | 1 | 'draw' | null;
  myIdx: 0 | 1;
  hostLike: boolean;
  /** Empieza la ronda siguiente (solo la llama el anfitrión). */
  next: () => void;
  bonus: number;
  /** Título de la cinemática al ganar la serie. */
  cine: string;
  /** Pausa antes de la ronda siguiente (ms), para ver el trazo de la línea ganadora. */
  delay?: number;
}

/**
 * Serie al mejor de 3 para los duelos: anota cada ronda una sola vez, lanza el vuelo de fichas al ganador, pasa sola a la ronda
 * siguiente y, si ganas la serie, paga el premio, cuenta la victoria y dispara la cinemática.
 */
export function useDuelSeries({ gameId, round, winner, myIdx, hostLike, next, bonus, cine, delay = 1700 }: Opts) {
  const series = useSeries();
  const { record, roundStarted, champion, played } = series;
  const recorded = useRef(0);
  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    if (winner === null) { roundStarted(); return; }
    if (recorded.current === round) return;
    recorded.current = round;
    record(winner === 'draw' ? null : winner === myIdx ? 'me' : 'them');
    if (winner !== 'draw') juice.chips(winner === myIdx ? 'me' : 'top');
  }, [winner, round, myIdx, record, roundStarted]);

  useEffect(() => {
    if (champion !== 'me') return;
    wallet.add(bonus); wallet.recordWin(gameId);
    juice.cinematic({ title: cine, sub: `+${bonus}`, tone: 'gold', good: true });
  }, [champion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entre rondas (sin campeón todavía): el anfitrión abre la siguiente tras una pausa breve.
  useEffect(() => {
    if (winner === null || champion !== null || played !== round || !hostLike) return;
    const id = gameTimeout(() => nextRef.current(), delay);
    return () => window.clearTimeout(id);
  }, [winner, champion, played, round, hostLike, delay]);

  const newSeries = (restart: () => void): void => { recorded.current = 0; series.reset(); restart(); };
  return { series, champion, newSeries };
}
