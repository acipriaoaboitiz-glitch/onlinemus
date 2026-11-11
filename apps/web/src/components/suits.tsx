import type { Suit } from '@mus/engine';

/** Colores de tinta de cada palo sobre papel marfil. */
export const SUIT_COLOR: Record<Suit, string> = {
  oros: '#C78A13',
  copas: '#BB3026',
  espadas: '#214F83',
  bastos: '#277044',
};

export const PAPER = '#FFFDF5';

/** Glifos dibujados en una caja de 24×24; usan `currentColor` para el tinte del palo. */
function SuitShape({ suit }: { suit: Suit }) {
  switch (suit) {
    case 'oros':
      return (
        <>
          <circle cx="12" cy="12" r="10.7" fill="currentColor" />
          <circle cx="12" cy="12" r="8.6" fill="none" stroke="#f6d16e" strokeWidth="1" />
          <circle cx="12" cy="12" r="6.8" fill="none" stroke="#7b4c12" strokeOpacity=".6" strokeWidth=".7" />
          <path d="m12 6.3 1.4 4.1 4.3 1.6-4.3 1.5-1.4 4.2-1.4-4.2-4.3-1.5 4.3-1.6z" fill="#ffe38b" />
          <circle cx="12" cy="12" r="1.2" fill="#9b5b0d" />
        </>
      );
    case 'copas':
      return (
        <>
          <path d="M3.1 3.4h17.8c0 6.8-3.5 10.5-8.9 11.2C6.6 13.9 3.1 10.2 3.1 3.4Z" fill="currentColor" stroke="#7f211c" strokeWidth=".65" />
          <path d="M5.2 5.1c.2 4.8 2.7 7.3 6.8 8" fill="none" stroke="#ffd87a" strokeWidth="1" />
          <path d="M10.5 14.1h3l.7 4.7H9.8z" fill="#d79c33" stroke="#85461b" strokeWidth=".6" />
          <path d="M6.2 22c0-1.8 2.5-2.7 5.8-2.7s5.8.9 5.8 2.7z" fill="currentColor" stroke="#7f211c" strokeWidth=".65" />
          <path d="M4.6 4.7h15" stroke="#ffd87a" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="12" cy="7" r="1.1" fill="#ffe39b" />
        </>
      );
    case 'espadas':
      return (
        <>
          <path d="M12 1.1 16 6l-2 9H10L8 6z" fill="currentColor" stroke="#142c4c" strokeWidth=".8" />
          <path d="m12 2.2 2.8 4-2.8 7.3L9.2 6.2z" fill="#d7ecf2" />
          <path d="M5.1 14.5c2.4 1.3 4.6 1.7 6.9 1.7s4.5-.4 6.9-1.7l1.2 2.2c-2.5 2-5.3 2.8-8.1 2.8s-5.6-.8-8.1-2.8z" fill="#d2a13f" stroke="#63461c" strokeWidth=".7" />
          <path d="M12 18v3.2m-2.5 1h5" stroke="#7a321f" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="21.4" r="1.2" fill="#d2a13f" />
        </>
      );
    case 'bastos':
      return (
        <>
          <path d="M12 1.4c3.2 0 5.3 2.1 5.3 5.1 0 2.1-.8 3.5-2.2 5.2-.8 1-1.1 2-1.1 3.3v4.5c0 1.8-.8 2.8-2 2.8s-2-1-2-2.8V15c0-1.3-.3-2.3-1.1-3.3C7.5 10 6.7 8.6 6.7 6.5c0-3 2.1-5.1 5.3-5.1z" fill="currentColor" stroke="#173b25" strokeWidth=".6" />
          <path d="M9.1 6c1-.7 1.9-.7 2.9 0m1.1 4.1 2 .3m-5.7 2.5 2 .4" stroke="#f8d77b" strokeWidth="1" strokeLinecap="round" />
          <path d="m8.3 18.5 3.7 2.1 3.7-2.1" fill="none" stroke="#f4d276" strokeWidth="1.1" />
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
