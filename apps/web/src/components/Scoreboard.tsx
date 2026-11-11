import { scoreboard, teamOf } from '@mus/engine';
import type { PublicState, Seat } from '@mus/engine';

/** Contador automático: amarracos (5 piedras) en cuadrados, piedras sueltas en puntos, "dentro", juegos y vacas. */
export function Scoreboard({ view, mySeat }: { view: PublicState; mySeat: Seat }) {
  const boards = scoreboard(view.score, view.config);
  const mine = teamOf(mySeat);
  const { juegosParaVaca: needJuegos, vacasParaPartida: needVacas } = view.config;

  return (
    <div className="score" role="group" aria-label="Marcador">
      {[mine, 1 - mine].map((team, row) => {
        const b = boards[team];
        return (
          <div key={team} className={`score__row score__row--${row === 0 ? 'us' : 'them'}`}>
            <span className="score__name">{row === 0 ? 'Nosotros' : 'Ellos'}</span>
            <b key={b.total} className="score__total">{b.total}<small>/{view.config.targetPoints}</small></b>
            <span className="score__meta">
              {b.dentro && <em className="score__dentro">dentro</em>}
              {needJuegos > 1 && (
                <span className="pips" title="Juegos" aria-label={`${b.juegos} de ${needJuegos} juegos`}>
                  {Array.from({ length: needJuegos }, (_, i) => (<i key={i} className={`pip${i < b.juegos ? ' on' : ''}`} />))}
                </span>
              )}
              {needVacas > 1 && (
                <span className="pips pips--vaca" title="Vacas" aria-label={`${b.vacas} de ${needVacas} vacas`}>
                  {Array.from({ length: needVacas }, (_, i) => (<i key={i} className={`pip${i < b.vacas ? ' on' : ''}`} />))}
                </span>
              )}
            </span>
            <span className="score__track" role="progressbar" aria-label={`${row === 0 ? 'Nosotros' : 'Ellos'}: ${b.total} de ${view.config.targetPoints} piedras`} aria-valuenow={Math.min(b.total, view.config.targetPoints)} aria-valuemin={0} aria-valuemax={view.config.targetPoints}>
              <i key={b.total} style={{ width: `${Math.min(100, (b.total / view.config.targetPoints) * 100)}%` }} />
            </span>
            <span className="score__units">{b.amarracos} amarracos <i /> {b.piedras} piedras</span>
          </div>
        );
      })}
    </div>
  );
}
