import type { Card } from '@mus/engine';
import { cardName } from '../game/describe.ts';
import { PAPER, SUIT_COLOR, SuitMark } from './suits.tsx';

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
      <text x="11" y="26" fontSize="22" fontWeight="700" fill={color} fontFamily="var(--font-display)">{card.rank}</text>
      <SuitMark suit={card.suit} x={17} y={39} size={12} />
    </>
  );
}

function CourtIllustration({ rank, suit }: { rank: 10 | 11 | 12; suit: Card['suit'] }) {
  const ink = SUIT_COLOR[suit];
  if (rank === 12) {
    return (
      <g>
        <path d="M37 53 39 40l7 6 4-11 5 11 7-6 2 13Z" fill="#d4a84e" stroke={ink} strokeWidth="1.5" />
        <path d="M40 43h22M39 52h23" stroke="#f8e6ae" strokeWidth="1.4" />
        <circle cx="50" cy="56" r="13" fill="#f3d9b1" stroke={ink} strokeWidth="1.4" />
        <path d="M38 57c2-10 6-14 12-14s10 4 12 14l-4 9H42Z" fill="#50392d" />
        <path d="M43 58c0-6 3-9 7-9s7 3 7 9v8H43Z" fill="#d59b68" />
        <path d="M44 57h3m6 0h3m-7 5h3" stroke="#332c24" strokeWidth="1.4" strokeLinecap="round" />
        <path d="m43 65 7 5 7-5 8 8v22H35V73Z" fill={ink} stroke="#f3d9b1" strokeWidth="1.4" />
        <path d="m43 67 7 7 7-7m-7 7v17" fill="none" stroke="#d4a84e" strokeWidth="1.5" />
        <SuitMark suit={suit} x={50} y={82} size={9} />
      </g>
    );
  }
  if (rank === 11) {
    return (
      <g>
        <path d="M38 47c2-10 8-14 17-11l7 4-5 5 6 4-6 8H40Z" fill="#d4a84e" stroke={ink} strokeWidth="1.5" />
        <path d="M48 38c-2-8 2-12 8-14-1 6 3 7 7 8-4 2-6 5-6 9" fill="#a8493e" stroke={ink} strokeWidth="1.3" />
        <path d="M42 49c2-6 6-9 11-8 5 1 7 6 6 12l-5 9H43Z" fill="#d59b68" stroke={ink} strokeWidth="1.2" />
        <circle cx="54" cy="49" r="1.5" fill="#292820" />
        <path d="m44 61 14-1 8 10-7 9 6 12H35l6-14-7-8Z" fill={ink} stroke="#f3d9b1" strokeWidth="1.4" />
        <path d="m42 64 8 8 9-8m-9 8v17" fill="none" stroke="#d4a84e" strokeWidth="1.5" />
        <path d="M35 88h30" stroke="#f3d9b1" strokeWidth="2" />
        <SuitMark suit={suit} x={50} y={79} size={9} />
      </g>
    );
  }
  return (
    <g>
      <path d="M40 46c1-9 7-14 15-12 7 2 10 8 8 16l-5 9H42Z" fill="#d59b68" stroke={ink} strokeWidth="1.4" />
      <path d="M37 42c2-9 9-15 18-13l9 5-3 6-12-2-8 9Z" fill={ink} stroke="#d4a84e" strokeWidth="1.5" />
      <path d="m47 31 4-7 4 8m-4-1 7-5" fill="none" stroke="#d4a84e" strokeWidth="2" strokeLinecap="round" />
      <circle cx="55" cy="46" r="1.4" fill="#292820" />
      <path d="M45 51c4 3 8 3 12 0" fill="none" stroke="#754c3b" strokeWidth="1.2" />
      <path d="m42 59 12 2 7 9-4 8 8 13H34l8-13-5-9Z" fill={ink} stroke="#f3d9b1" strokeWidth="1.4" />
      <path d="m43 64 9 8 8-7m-8 7v17" fill="none" stroke="#d4a84e" strokeWidth="1.5" />
      <SuitMark suit={suit} x={52} y={80} size={9} />
    </g>
  );
}

/** Carta de la baraja española dibujada en SVG: legible a tamaño móvil y sin imágenes externas. */
export function CardFace({ card, eightKings = true }: { card: Card; eightKings?: boolean }) {
  const color = SUIT_COLOR[card.suit];
  const isFigure = card.rank >= 10;
  const tag = eightKings ? (card.rank === 3 ? '= REY' : card.rank === 2 ? '= AS' : null) : null;
  return (
    <svg viewBox="0 0 100 150" className="card-svg" role="img" aria-label={cardName(card)}>
      <rect x="1" y="1" width="98" height="148" rx="11" fill={PAPER} stroke="#b9a985" strokeWidth="2" />
      <rect x="5" y="5" width="90" height="140" rx="8" fill="none" stroke="#d1c3a5" strokeWidth=".8" />
      <path d="M8 47V8h27M92 47V8H65M8 103v39h27m57-39v39H65" fill="none" stroke={color} strokeOpacity=".42" strokeWidth="1" />
      <circle cx="50" cy="8" r="1.5" fill={color} fillOpacity=".45" />
      <circle cx="50" cy="142" r="1.5" fill={color} fillOpacity=".45" />
      <Index card={card} />
      <g transform="rotate(180 50 75)">
        <Index card={card} />
      </g>
      {isFigure ? (
        <>
          <rect x="24" y="34" width="52" height="82" rx="5" fill="#eee3ca" stroke={color} strokeWidth="1.5" />
          <path d="M29 39h42v72H29z" fill="none" stroke={color} strokeOpacity=".35" strokeWidth=".8" />
          <path d="M31 103c7-8 13-9 19-9s12 1 19 9v6H31Z" fill="#d6c5a4" />
          <CourtIllustration rank={card.rank as 10 | 11 | 12} suit={card.suit} />
          <path d="M33 105h34" stroke={color} strokeOpacity=".55" strokeWidth=".8" />
          <text x="50" y="113" textAnchor="middle" fontSize="5.8" fontWeight="800" letterSpacing=".8" fill={color}>
            {FIGURE_LABEL[card.rank]}
          </text>
        </>
      ) : (
        (PIPS[card.rank] ?? []).map(([x, y], i) => (
          <g key={i}>
            <SuitMark suit={card.suit} x={x} y={y} size={card.rank === 1 ? 42 : 19} />
            {card.rank === 1 && <circle cx={x} cy={y} r="23" fill="none" stroke={color} strokeOpacity=".28" strokeWidth="1" />}
          </g>
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
