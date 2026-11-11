import type { Suit } from '@mus/engine';

/** Colores de tinta de cada palo sobre papel marfil. */
export const SUIT_COLOR: Record<Suit, string> = {
  oros: '#C2820F',
  copas: '#B3261E',
  espadas: '#223F6B',
  bastos: '#2E6B3C',
};

export const PAPER = '#F6F0E2';

/** Glifos dibujados en una caja de 24×24; usan `currentColor` para el tinte del palo. */
function SuitShape({ suit }: { suit: Suit }) {
  switch (suit) {
    case 'oros':
      return (
        <>
          <circle cx="12" cy="12" r="10.6" fill="currentColor" />
          <circle cx="12" cy="12" r="7.3" fill="none" stroke={PAPER} strokeOpacity=".6" strokeWidth="1.3" />
          <circle cx="12" cy="12" r="2.6" fill={PAPER} fillOpacity=".65" />
        </>
      );
    case 'copas':
      return (
        <>
          <path d="M3.8 3.4h16.4c0 6.6-3.2 10.4-8.2 11-5-.6-8.2-4.4-8.2-11z" fill="currentColor" />
          <path d="M10.6 14.4h2.8l.6 5h-4z" fill="currentColor" />
          <path d="M6.4 22c0-1.6 2.5-2.4 5.6-2.4s5.6.8 5.6 2.4z" fill="currentColor" />
          <path d="M6.8 6.2h10.4" stroke={PAPER} strokeOpacity=".5" strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case 'espadas':
      return (
        <>
          <path d="M12 1.2l3 4.6v9.6H9V5.8z" fill="currentColor" />
          <rect x="5" y="15.2" width="14" height="2.4" rx="1.2" fill="currentColor" />
          <rect x="10.7" y="17.4" width="2.6" height="4" rx="1" fill="currentColor" />
          <circle cx="12" cy="22.2" r="1.5" fill="currentColor" />
          <path d="M12 4.6v10" stroke={PAPER} strokeOpacity=".5" strokeWidth="1.1" strokeLinecap="round" />
        </>
      );
    case 'bastos':
      return (
        <>
          <path
            d="M12 1.6c3.4 0 5.6 2.3 5.6 5.3 0 2.1-.9 3.5-1.9 4.7-.8 1-1.2 2-1.2 3.4v5.4c0 1.3-1 2.1-2.5 2.1s-2.5-.8-2.5-2.1v-5.4c0-1.4-.4-2.4-1.2-3.4-1-1.2-1.9-2.6-1.9-4.7 0-3 2.2-5.3 5.6-5.3z"
            fill="currentColor"
          />
          <path d="M9.6 6.4l1.8.7M13 9.4l1.8-.6M10 11.6l1.6.5" stroke={PAPER} strokeOpacity=".55" strokeWidth="1.1" strokeLinecap="round" />
        </>
      );
  }
}

/** Glifo del palo centrado en (x, y) con `size` píxeles de lado. */
export function SuitMark({ suit, x, y, size }: { suit: Suit; x: number; y: number; size: number }) {
  const k = size / 24;
  return (
    <g transform={`translate(${x - 12 * k} ${y - 12 * k}) scale(${k})`} style={{ color: SUIT_COLOR[suit] }}>
      <SuitShape suit={suit} />
    </g>
  );
}

/** Figuras: 10 = sota, 11 = caballo, 12 = rey. */
function FigureShape({ rank }: { rank: 10 | 11 | 12 }) {
  if (rank === 12) {
    return (
      <>
        <path d="M2.6 18.4L4 7.2l4.9 4.6L12 4.2l3.1 7.6L20 7.2l1.4 11.2z" fill="currentColor" />
        <rect x="2.6" y="19.6" width="18.8" height="2.6" rx="1" fill="currentColor" />
        <circle cx="4" cy="5.9" r="1.5" fill="currentColor" />
        <circle cx="12" cy="2.9" r="1.5" fill="currentColor" />
        <circle cx="20" cy="5.9" r="1.5" fill="currentColor" />
      </>
    );
  }
  if (rank === 11) {
    return (
      <>
        <path
          d="M7.6 22c.2-3.2 1.2-5.2 3.2-6.8l-3.3 1.2c-1.9.7-3.6.2-4.2-1.4-.4-1.1 0-2.2 1-3.2l5.6-5.4.4-3.4 2.1 1.8c3.4.4 6.1 3.3 6.3 7.3.2 3.2-.7 6.4-1.2 8.9z"
          fill="currentColor"
        />
        <circle cx="9.7" cy="9.4" r="1" fill={PAPER} />
        <path d="M13.6 8.2c1.6 1.1 2.6 3 2.6 5.4" stroke={PAPER} strokeOpacity=".55" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </>
    );
  }
  return (
    <>
      <path d="M13.2 3.4c1.4-2 3.6-2.4 5-1.8-.4 1.8-1.8 3.6-4 4z" fill="currentColor" />
      <circle cx="11.6" cy="7" r="3.7" fill="currentColor" />
      <path d="M11.8 11.9c-3.8 0-6.4 2.6-6.6 6.5-.1 1.7 1 2.8 2.3 2.8h8.6c1.3 0 2.4-1.1 2.3-2.8-.2-3.9-2.8-6.5-6.6-6.5z" fill="currentColor" />
      <rect x="4.3" y="21.6" width="15" height="1.8" rx=".9" fill="currentColor" />
    </>
  );
}

export function FigureMark({ rank, suit, x, y, size }: { rank: 10 | 11 | 12; suit: Suit; x: number; y: number; size: number }) {
  const k = size / 24;
  return (
    <g transform={`translate(${x - 12 * k} ${y - 12 * k}) scale(${k})`} style={{ color: SUIT_COLOR[suit] }}>
      <FigureShape rank={rank} />
    </g>
  );
}
