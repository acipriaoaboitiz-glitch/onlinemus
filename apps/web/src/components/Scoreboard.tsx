import { scoreboard, teamOf } from '@mus/engine';
import type { PublicState, Seat } from '@mus/engine';

/** Contador automático: amarracos (5 piedras) en cuadrados, piedras sueltas en puntos, "dentro", juegos y vacas. */
export function Scoreboard({ view, mySeat }: { view: PublicState; mySeat: Seat }) {
  const boards = scoreboard(view.score, view.config);
  const mine = teamOf(mySeat);
  const slots = Math.floor(view.config.targetPoints / 5);
  const { juegosParaVaca: needJuegos, vacasParaPartida: needVacas } = view.config;

  return (
    <div className="score" role="group" aria-label="Marcador">
      {[mine, 1 - mine].map((team, row) => {
        const b = boards[team];
        return (
          <div key={team} className={`score__row score__row--${row === 0 ? 'us' : 'them'}`}>
            <span className="score__name">{row === 0 ? 'Nosotros' : 'Ellos'}</span>
            <span className="score__stones" aria-label={`${b.amarracos} amarracos y ${b.piedras} piedras`}>
              {Array.from({ length: slots }, (_, i) => (<i key={i} className={`amarraco${i < b.amarracos ? ' on' : ''}`} />))}
              <span className="score__gap" />
              {Array.from({ length: 4 }, (_, i) => (<i key={i} className={`piedra${i < b.piedras ? ' on' : ''}`} />))}
            </span>
            <b className="score__total">{b.total}</b>
            <span className="score__meta">
              {b.dentro && <em className="score__dentro">dentro</em>}
              {needJuegos > 1 && (
                <span className="pips" title="Juegos">
                  {Array.from({ length: needJuegos }, (_, i) => (<i key={i} className={`pip${i < b.juegos ? ' on' : ''}`} />))}
                </span>
              )}
              {needVacas > 1 && (
                <span className="pips pips--vaca" title="Vacas">
                  {Array.from({ length: needVacas }, (_, i) => (<i key={i} className={`pip${i < b.vacas ? ' on' : ''}`} />))}
                </span>
              )}
            </span>
          </div>
        );
      })}
    </div>
  );
}
