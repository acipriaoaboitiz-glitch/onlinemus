import type { Card } from '@mus/engine';
import { cardName } from '../game/describe.ts';
import { FigureMark, PAPER, SUIT_COLOR, SuitMark } from './suits.tsx';

/** Posiciones de los símbolos en la carta (lienzo de 100×150). */
const PIPS: Record<number, [number, number][]> = {
  1: [[50, 75]],
  2: [[50, 42], [50, 108]],
  3: [[50, 38], [50, 75], [50, 112]],
  4: [[36, 46], [64, 46], [36, 104], [64, 104]],
  5: [[36, 46], [64, 46], [50, 75], [36, 104], [64, 104]],
  6: [[36, 40], [64, 40], [36, 75], [64, 75], [36, 110], [64, 110]],
  7: [[36, 40], [64, 40], [50, 57], [36, 75], [64, 75], [36, 110], [64, 110]],
};

const FIGURE_LABEL: Record<number, string> = { 10: 'SOTA', 11: 'CABALLO', 12: 'REY' };

function Index({ card }: { card: Card }) {
  const color = SUIT_COLOR[card.suit];
  return (
    <>
      <text x="10" y="25" fontSize="24" fontWeight="700" fill={color} fontFamily="var(--font-display)">{card.rank}</text>
      <SuitMark suit={card.suit} x={16} y={38} size={13} />
    </>
  );
}

/** Carta de la baraja española dibujada en SVG: legible a tamaño móvil y sin imágenes externas. */
export function CardFace({ card, eightKings = true }: { card: Card; eightKings?: boolean }) {
  const color = SUIT_COLOR[card.suit];
  const isFigure = card.rank >= 10;
  const tag = eightKings ? (card.rank === 3 ? '= REY' : card.rank === 2 ? '= AS' : null) : null;
  return (
    <svg viewBox="0 0 100 150" className="card-svg" role="img" aria-label={cardName(card)}>
      <rect x="1" y="1" width="98" height="148" rx="11" fill={PAPER} stroke="#D6CBB2" strokeWidth="1.5" />
      <Index card={card} />
      <g transform="rotate(180 50 75)">
        <Index card={card} />
      </g>
      {isFigure ? (
        <>
          <rect x="24" y="34" width="52" height="82" rx="9" fill={color} fillOpacity=".08" stroke={color} strokeOpacity=".35" />
          <FigureMark rank={card.rank as 10 | 11 | 12} suit={card.suit} x={50} y={65} size={40} />
          <SuitMark suit={card.suit} x={50} y={96} size={15} />
          <text x="50" y="110" textAnchor="middle" fontSize="7.5" fontWeight="700" letterSpacing="1.2" fill={color} fillOpacity=".8">
            {FIGURE_LABEL[card.rank]}
          </text>
        </>
      ) : (
        (PIPS[card.rank] ?? []).map(([x, y], i) => (
          <SuitMark key={i} suit={card.suit} x={x} y={y} size={card.rank === 1 ? 46 : 21} />
        ))
      )}
      {tag && (
        <text x="12" y="141" fontSize="7.5" fontWeight="700" letterSpacing=".8" fill={color} fillOpacity=".75">{tag}</text>
      )}
    </svg>
  );
}

export function CardBack() {
  return <div className="card-back" aria-hidden="true" />;
}
