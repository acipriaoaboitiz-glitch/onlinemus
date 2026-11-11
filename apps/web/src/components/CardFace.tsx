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
      <g strokeLinejoin="round">
        <path d="M40 41 39 31l7 5 4-10 5 10 7-5-1 12Z" fill="#e0b547" stroke="#653b22" strokeWidth="1.2" />
        <path d="m43 35 3 1 4-8 4 8 4-1" fill="none" stroke="#fff0b4" strokeWidth="1.1" />
        <circle cx="50" cy="26" r="1.8" fill="#bd3026" />
        <path d="M39 42c2-5 6-7 11-7s9 2 11 7v5H39Z" fill="#b73329" stroke="#653b22" strokeWidth="1.2" />
        <path d="M41 43c2-4 5-6 9-6s7 2 9 6" fill="none" stroke="#f3d788" strokeWidth="1.2" />
        <path d="M43 43c1-4 4-6 7-6s6 2 7 6v12c0 5-3 8-7 8s-7-3-7-8Z" fill="#f0c99a" stroke="#653b22" strokeWidth="1.1" />
        <path d="M43 46c2-2 4-3 7-3s5 1 7 3v5c-2-2-4-3-7-3s-5 1-7 3Z" fill="#49352c" />
        <path d="M46 52h2m5 0h2m-6 5h2" stroke="#3b2b24" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M41 62 34 71l5 8-4 15h30l-4-15 5-8-7-9-9 5Z" fill={ink} stroke="#633b25" strokeWidth="1.4" />
        <path d="m41 64 9 9 9-9m-9 9v19" fill="none" stroke="#efcf76" strokeWidth="1.5" />
        <path d="m35 73 7 2m23-2-7 2" stroke="#f6e5bb" strokeWidth="1.2" />
        <path d="M37 91h26" stroke="#e5ba55" strokeWidth="2" />
        <SuitMark suit={suit} x={50} y={81} size={9} />
      </g>
    );
  }
  if (rank === 11) {
    return (
      <g strokeLinejoin="round">
        <path d="M37 70c2-5 7-8 13-8 4 0 7 2 10 5l5 2-3 5-8-1-8 5-11-2Z" fill="#ba5436" stroke="#603b2c" strokeWidth="1.4" />
        <path d="M46 73c6-3 12-2 16 1l2 10-6 5H42l-6-5 2-8Z" fill="#dfb34c" stroke="#603b2c" strokeWidth="1.3" />
        <path d="m42 84-3 11m6-10-1 11m12-11 2 10m5-12 4 12" fill="none" stroke="#633d2c" strokeWidth="2" strokeLinecap="round" />
        <path d="m35 93 9 1m11 0 12 1" stroke="#4f382d" strokeWidth="1.4" />
        <path d="M46 65c1-7 5-11 11-10 5 1 7 5 6 10l-5 6h-9Z" fill="#edc596" stroke="#603b2c" strokeWidth="1.2" />
        <path d="M44 61c2-6 6-9 12-8l7 4-3 5-10-2-5 5Z" fill={ink} stroke="#603b2c" strokeWidth="1.2" />
        <path d="m49 54 3-8 4 7m-3 0 6-5" fill="none" stroke="#d7a840" strokeWidth="2" strokeLinecap="round" />
        <circle cx="59" cy="62" r="1.1" fill="#322a24" />
        <path d="M46 70 40 77m21-7 7 6" stroke="#f3e5c4" strokeWidth="1.4" />
        <path d="m39 75 4 8m18-8-4 8" stroke="#c33529" strokeWidth="2" />
      </g>
    );
  }
  return (
    <g strokeLinejoin="round">
      <path d="M42 49c0-8 4-13 10-13 6 0 10 5 10 13l-4 8H46Z" fill="#edc596" stroke="#68412e" strokeWidth="1.2" />
      <path d="M39 43c1-8 7-13 14-13 6 0 10 3 12 8l-5 3-3-3-5 4-5-3-5 7Z" fill={ink} stroke="#68412e" strokeWidth="1.2" />
      <path d="m50 33 1-8 4 7m-3 0 7-5" fill="none" stroke="#d6a53c" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="48" r="1.1" fill="#322a24" />
      <path d="M48 54c2 2 5 2 7 0" fill="none" stroke="#794936" strokeWidth="1.1" />
      <path d="M48 57 42 61l-7 13 6 4-2 16h27l-3-16 5-4-8-13-7-4-3 5Z" fill={ink} stroke="#68412e" strokeWidth="1.3" />
      <path d="m43 63 9 7 9-7m-9 7v21" fill="none" stroke="#e5bd60" strokeWidth="1.5" />
      <path d="m42 65-5 8m22-8 5 8" stroke="#f5e4bd" strokeWidth="1.4" />
      <path d="M39 91h27" stroke="#d7a641" strokeWidth="2" />
      <path d="m36 74 5-1m22 1 5-1" stroke="#c43b2e" strokeWidth="1.4" />
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
