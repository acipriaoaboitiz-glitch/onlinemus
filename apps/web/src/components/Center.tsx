import type { Lance, PublicState, Seat } from '@mus/engine';
import { LANCE_LABEL, betSummary, turnHint } from '../game/describe.ts';

const ORDER: Lance[] = ['grande', 'chica', 'pares', 'juego'];

/** Resumen de la mano: lance activo, envite y turno. */
export function Center({ view, mySeat, names, banner }: { view: PublicState; mySeat: Seat; names: string[]; banner: string | null }) {
  const current = view.lance ? ORDER.indexOf(view.lance.lance === 'punto' ? 'juego' : view.lance.lance) : view.phase === 'handEnd' || view.phase === 'matchEnd' ? 4 : -1;
  const bet = betSummary(view, mySeat, names);
  const hint = turnHint(view, mySeat, names);
  const isPunto = view.lance?.lance === 'punto' || view.settlements.some((s) => s.lance === 'punto');

  return (
    <div className="game-hud">
      <ol className="lances" aria-label="Lances">
        {ORDER.map((l, i) => {
          const st = view.settlements.find((s) => s.lance === (l === 'juego' && isPunto ? 'punto' : l));
          const state = i < current ? 'done' : i === current ? 'now' : 'next';
          return (
            <li key={l} className={`lance lance--${state}`}>
              {l === 'juego' && isPunto ? 'Punto' : LANCE_LABEL[l]}
              {st && <small>{st.outcome === 'seen' ? st.stake : st.outcome === 'folded' ? '✕' : '–'}</small>}
            </li>
          );
        })}
      </ol>

      <div className="center__main">
        {banner ? (
          <div key={banner} className="banner">{banner}</div>
        ) : (
          <>
            <div className="center__title">{view.lance ? (view.lance.lance === 'punto' ? 'Punto' : LANCE_LABEL[view.lance.lance]) : view.phase === 'discard' ? 'Descarte' : view.phase === 'mus' ? 'Mus' : ''}</div>
            {bet && (
              <div className={`center__bet${view.lance?.bet ? ' center__bet--hot' : ''}${view.lance?.bet?.total === 'ordago' ? ' center__bet--ordago' : ''}`}>
                <b>{bet.head}</b>
                <span>{bet.sub}</span>
              </div>
            )}
          </>
        )}
      </div>

      <p className={`hint${hint.mine ? ' hint--mine' : ''}`}>{hint.text}</p>
    </div>
  );
}
