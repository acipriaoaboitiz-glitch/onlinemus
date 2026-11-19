import { useCallback, useState } from 'react';
import { Gem } from 'lucide-react';
import { useT } from '../../i18n/index.ts';

/**
 * Serie «al mejor de 3 rondas»: gana la partida quien gane 2 rondas. El estado vive fuera de los motores (cada ronda es una partida
 * del motor) y se alimenta una sola vez por ronda con `record(clave del ganador)`; un empate (`null`) no suma.
 */
export interface Series { wins: Record<string, number>; played: number; champion: string | null; lastWinner: string | null }
const INIT: Series = { wins: {}, played: 0, champion: null, lastWinner: null };

export function useSeries(need = 2, maxRounds = 0) {
  const [st, setSt] = useState<Series>(INIT);
  const record = useCallback((winner: string | null): void => {
    setSt((c) => {
      if (c.champion !== null) return c;
      const wins = { ...c.wins };
      if (winner) wins[winner] = (wins[winner] ?? 0) + 1;
      const played = c.played + 1;
      let champion: string | null = winner && wins[winner]! >= need ? winner : null;
      // Serie de rondas fijas (COME💩): al llegar al máximo gana quien más rondas tenga (en empate, quien ganó la última).
      if (!champion && maxRounds > 0 && played >= maxRounds) {
        const top = Math.max(0, ...Object.values(wins));
        const leaders = Object.keys(wins).filter((k) => wins[k] === top);
        champion = leaders.includes(winner ?? '') ? winner : (leaders[0] ?? null);
      }
      return { wins, played, champion, lastWinner: winner };
    });
  }, [need, maxRounds]);
  /** Al repartir una ronda nueva: si la serie anterior ya tenía campeón, empieza otra desde cero. */
  const roundStarted = useCallback((): void => { setSt((c) => (c.champion !== null ? INIT : c)); }, []);
  const reset = useCallback((): void => setSt(INIT), []);
  return { ...st, need, record, roundStarted, reset };
}

/** Gemas de rondas ganadas por bando (2 por bando: la 2.ª ronda ganada proclama campeón) con la etiqueta «Al mejor de 3». */
export function SeriesGems({ entries, need = 2 }: { entries: { key: string; label: string; wins: number }[]; need?: number }) {
  const t = useT();
  const side = (e: { key: string; label: string; wins: number }, flip = false) => (
    <span key={e.key} className={`flex min-w-0 items-center gap-1 ${flip ? 'flex-row-reverse' : ''}`}>
      <span className="max-w-[64px] truncate">{e.label}</span>
      <span className="flex gap-[3px]">
        {Array.from({ length: need }, (_, k) => (
          <Gem key={k} size={13} aria-hidden className={k < e.wins ? 'fill-amber-300 text-amber-200' : 'text-stone-600'} />
        ))}
      </span>
    </span>
  );
  const badge = <span key="bo3" className="rounded-full bg-white/10 px-2 py-[1px] text-[9px] uppercase tracking-wider text-amber-200">{t('ser.bo3')}</span>;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 px-1 text-[10px] font-bold text-stone-300" role="group" aria-label={`${t('ser.bo3')} · ${t('ser.score')}`}>
      {entries.length === 2 ? [side(entries[0]!), badge, side(entries[1]!, true)] : [...entries.map((e) => side(e)), badge]}
    </div>
  );
}
