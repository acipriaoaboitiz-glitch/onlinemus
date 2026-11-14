import { scoreboard, teamOf } from '@mus/engine';
import type { PublicState, Seat } from '@mus/engine';
import { AnimatedNumber } from './AnimatedNumber.tsx';

/** Contador automático compacto: total animado, amarracos y piedras, «dentro», juegos y vacas. */
export function Scoreboard({ view, mySeat }: { view: PublicState; mySeat: Seat }) {
  const boards = scoreboard(view.score, view.config);
  const mine = teamOf(mySeat);
  const { juegosParaVaca: needJuegos, vacasParaPartida: needVacas, targetPoints } = view.config;

  return (
    <div className="grid w-full grid-cols-2 gap-[min(1.8vw,8px)]" role="group" aria-label="Marcador">
      {[mine, 1 - mine].map((team, row) => {
        const b = boards[team];
        const us = row === 0;
        const dot = us ? 'border-teal-200 bg-teal-300 shadow-[0_0_7px_rgba(94,234,212,.6)]' : 'border-orange-200 bg-orange-300 shadow-[0_0_7px_rgba(253,186,116,.6)]';
        return (
          <div
            key={team}
            className={`min-w-0 rounded-[13px] border border-white/10 px-[min(2.4vw,10px)] py-[min(1.1dvh,6px)] ${us ? 'bg-gradient-to-br from-teal-400/10 to-black/30' : 'bg-gradient-to-br from-orange-400/10 to-black/30'}`}
          >
            <div className="flex items-baseline justify-between gap-1">
              <span className={`truncate text-[9px] font-extrabold uppercase tracking-[.14em] ${us ? 'text-teal-300' : 'text-orange-300'}`}>
                {us ? 'Nosotros' : 'Ellos'}
              </span>
              <b className="font-[var(--font-display)] text-[clamp(17px,5.4vw,22px)] leading-none tabular-nums">
                <AnimatedNumber value={b.total} duration={0.7} />
                <small className="font-sans text-[9px] font-bold text-stone-400">/{targetPoints}</small>
              </b>
            </div>
            <div className="mt-1 flex items-center justify-between gap-1">
              <span className="flex min-w-0 items-center gap-[3px]" aria-hidden="true">
                {Array.from({ length: Math.ceil(targetPoints / 5) }, (_, i) => (
                  <i key={`a${i}`} className={`block size-[6px] rotate-45 rounded-[1px] border transition-colors duration-300 ${i < b.amarracos ? dot : 'border-white/20 bg-white/[.04]'}`} />
                ))}
                <span className="w-[2px]" />
                {Array.from({ length: 4 }, (_, i) => (
                  <i key={`p${i}`} className={`block size-[5px] rounded-full border transition-colors duration-300 ${i < b.piedras ? 'border-amber-100 bg-amber-200 shadow-[0_0_6px_rgba(253,230,138,.7)]' : 'border-white/20 bg-white/[.04]'}`} />
                ))}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {b.dentro && (
                  <em className="rounded-full bg-amber-300 px-[6px] py-[2px] text-[8px] font-extrabold uppercase not-italic tracking-wider text-amber-950">dentro</em>
                )}
                {needJuegos > 1 && (
                  <span className="flex gap-[2px]" title="Juegos" aria-label={`${b.juegos} de ${needJuegos} juegos`}>
                    {Array.from({ length: needJuegos }, (_, i) => (
                      <i key={i} className={`block size-[6px] rounded-full border-[1.5px] ${i < b.juegos ? 'border-amber-300 bg-amber-300' : 'border-stone-500'}`} />
                    ))}
                  </span>
                )}
                {needVacas > 1 && (
                  <span className="flex gap-[3px]" title="Vacas" aria-label={`${b.vacas} de ${needVacas} vacas`}>
                    {Array.from({ length: needVacas }, (_, i) => (
                      <i key={i} className={`block size-[6px] rotate-45 rounded-[1px] border-[1.5px] ${i < b.vacas ? 'border-amber-300 bg-amber-300' : 'border-stone-500'}`} />
                    ))}
                  </span>
                )}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
