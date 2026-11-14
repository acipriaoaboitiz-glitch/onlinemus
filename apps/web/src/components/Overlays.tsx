import { motion } from 'framer-motion';
import { teamOf } from '@mus/engine';
import type { PublicState, Seat, Team } from '@mus/engine';
import { LANCE_LABEL, awardRows, describeHand, teamLabel } from '../game/describe.ts';
import type { SeatInfo } from '../game/types.ts';
import { CardFace } from './CardFace.tsx';
import { Button } from './ui.tsx';

interface HandEndProps {
  view: PublicState;
  mySeat: Seat;
  seats: SeatInfo[];
  busy: boolean;
  onContinue: () => void;
  /** Texto del botón (por defecto "Continuar"). */
  continueLabel?: string;
  /** Última mano de la partida: no se espera a nadie, el botón solo pasa al resultado final. */
  final?: boolean;
}

/** Fin de la mano: manos enseñadas, de dónde sale cada punto y botón para seguir. */
export function HandEndOverlay({ view, mySeat, seats, busy, onContinue, continueLabel = 'Continuar', final = false }: HandEndProps) {
  const res = view.handResult;
  const rows = awardRows(view.awards, mySeat);
  const pointsByTeam: [number, number] = [0, 0];
  rows.forEach((row) => { pointsByTeam[row.team] += row.points; });
  const revealed = view.revealedHands;
  const waiting = seats.filter((s) => !s.isBot && !view.ready[s.seat]).map((s) => s.name ?? '');
  const iAmReady = !final && view.ready[mySeat];
  const title = final ? (res?.matchWinner === teamOf(mySeat) ? '¡Última mano: ganáis!' : 'Última mano') : res?.gameWinner != null ? `¡Juego para ${teamLabel(res.gameWinner, mySeat).toLowerCase()}!` : 'Fin de la mano';
  const order = [0, 1, 2, 3].map((k) => ((mySeat + k) % 4) as Seat);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Fin de la mano">
      <div className="overlay__body">
        <h2 className={`overlay__title${res?.gameWinner != null ? ' overlay__title--big' : ''}`}>{title}</h2>

        {revealed && (
          <div className="reveal">
            {order.map((seat) => {
              const info = describeHand(revealed[seat], view.config);
              const tone = seat === mySeat ? 'me' : teamOf(seat) === teamOf(mySeat) ? 'us' : 'them';
              return (
                <div key={seat} className={`reveal__row reveal__row--${tone}`}>
                  <div className="reveal__who">
                    <b>{seat === mySeat ? 'Tú' : seats[seat].name}</b>
                    <span>{info.pares ?? 'Sin pares'}</span>
                    <span>{info.juego}</span>
                  </div>
                  <div className="reveal__cards">
                    {revealed[seat].map((c) => (<div key={c.id} className="mini"><CardFace card={c} eightKings={view.config.eightKings} /></div>))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ul className="awards">
          {rows.length === 0 && <li className="awards__empty">Nadie ha puntuado en esta mano</li>}
          {rows.map((r, index) => (
            <motion.li
              key={r.key}
              className={`awards__row awards__row--${r.team === teamOf(mySeat) ? 'us' : 'them'}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.2, ease: 'easeOut' }}
            >
              <span className="awards__lance">{LANCE_LABEL[r.lance]}</span>
              <span className="awards__label">{r.label}</span>
              <b>{r.who} <span>+{r.points}</span></b>
            </motion.li>
          ))}
        </ul>

        <section className="hand-score" aria-label="Recuento de puntos de esta mano">
          <h3>Recuento de esta mano</h3>
          <div className="hand-score__teams">
            {([teamOf(mySeat), 1 - teamOf(mySeat)] as Team[]).map((team, teamIndex) => {
              const points = pointsByTeam[team];
              return (
                <div key={team} className={`hand-score__team hand-score__team--${team === teamOf(mySeat) ? 'us' : 'them'}`}>
                  <div className="hand-score__head">
                    <span>{teamLabel(team, mySeat)}</span>
                    <b>+{points}</b>
                  </div>
                  <div className="hand-score__stones" aria-label={`${points} ${points === 1 ? 'piedra' : 'piedras'}`}>
                    {Array.from({ length: points }, (_, index) => (
                      <motion.i
                        key={index}
                        initial={{ opacity: 0, scale: 0.3, y: 7 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: Math.min(rows.length * 0.2, 1.6) + teamIndex * 0.12 + index * 0.07 }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="overlay__foot">
        <Button variant="primary" block disabled={busy || iAmReady} onClick={onContinue}>
          {iAmReady ? 'Esperando…' : continueLabel}
        </Button>
        {iAmReady && waiting.length > 0 && <p className="overlay__wait">Faltan: {waiting.join(', ')}</p>}
      </div>
    </div>
  );
}

interface MatchEndProps {
  view: PublicState;
  mySeat: Seat;
  primaryLabel: string | null;
  onPrimary: () => void;
  onExit: () => void;
  note?: string;
}

export function MatchEndOverlay({ view, mySeat, primaryLabel, onPrimary, onExit, note }: MatchEndProps) {
  const winner = view.handResult?.matchWinner ?? null;
  const won = winner === teamOf(mySeat);
  return (
    <div className="overlay overlay--center" role="dialog" aria-modal="true" aria-label="Fin de la partida">
      <div className="overlay__body overlay__body--center">
        <div className={`trophy${won ? ' trophy--win' : ''}`}>{won ? '★' : '·'}</div>
        <h2 className="overlay__title overlay__title--big">{won ? '¡Ganasteis la partida!' : 'Han ganado ellos'}</h2>
        <p className="overlay__sub">
          Vacas: {view.score.vacas[teamOf(mySeat)]} – {view.score.vacas[1 - teamOf(mySeat)]}
          {view.config.juegosParaVaca > 1 && <> · Juegos de la última vaca: {view.score.juegos[teamOf(mySeat)]} – {view.score.juegos[1 - teamOf(mySeat)]}</>}
        </p>
        {note && <p className="overlay__wait">{note}</p>}
      </div>
      <div className="overlay__foot">
        {primaryLabel && <Button variant="primary" block onClick={onPrimary}>{primaryLabel}</Button>}
        <Button variant="ghost" block onClick={onExit}>Salir</Button>
      </div>
    </div>
  );
}
