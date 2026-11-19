import { useState } from 'react';
import type { FrenchCard, FrenchRank, FrenchSuit } from '../../engine/deck.ts';
import { FRENCH_RANK_LABEL, frenchFileName } from '../../engine/deck.ts';
import { APP_NAME } from '../../config.ts';
import { Bust, Frame, GOLD, H, SvgDefs, W } from './art.tsx';
import { useCardBack, type BackVariant } from '../../store/cosmetics.ts';

const RED = '#b3141c';
const INK = '#0f1218';
const SUIT_COLOR: Record<FrenchSuit, string> = { picas: INK, treboles: INK, corazones: RED, diamantes: RED };
const SUIT_FILL: Record<FrenchSuit, string> = { picas: 'url(#st-ink)', treboles: 'url(#st-ink)', corazones: 'url(#st-red)', diamantes: 'url(#st-red)' };

function SuitPath({ suit }: { suit: FrenchSuit }) {
  switch (suit) {
    case 'corazones':
      return <path d="M0 46 C-74 -2 -54 -52 -27 -52 C-13 -52 -3 -44 0 -33 C3 -44 13 -52 27 -52 C54 -52 74 -2 0 46Z" />;
    case 'diamantes':
      return <path d="M0 -54 C14 -27 31 -13 47 0 C31 13 14 27 0 54 C-14 27 -31 13 -47 0 C-31 -13 -14 -27 0 -54Z" />;
    case 'picas':
      return <path d="M0 -52 C10 -27 52 -15 52 14 C52 35 29 39 12 27 C14 38 16 46 25 52 L-25 52 C-16 46 -14 38 -12 27 C-29 39 -52 35 -52 14 C-52 -15 -10 -27 0 -52Z" />;
    case 'treboles':
      return (
        <g>
          <circle cx="0" cy="-23" r="23" /><circle cx="-25" cy="12" r="23" /><circle cx="25" cy="12" r="23" />
          <path d="M-5 10 C-4 31 -8 44 -19 52 L19 52 C8 44 4 31 5 10Z" />
        </g>
      );
  }
}

/** Palo con degradado y brillo especular. */
function Suit({ suit, x, y, size, flip }: { suit: FrenchSuit; x: number; y: number; size: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 100}) ${flip ? 'rotate(180)' : ''}`}
     >
      <g fill={SUIT_FILL[suit]}><SuitPath suit={suit} /></g>
      <ellipse cx="-16" cy="-20" rx="16" ry="8" fill="url(#st-gloss)" transform="rotate(-35 -16 -20)" />
    </g>
  );
}

type Pip = [number, number, boolean?];
const L = 0, C = 0.5, R = 1;
const PIPS: Partial<Record<FrenchRank, Pip[]>> = {
  2: [[C, 0], [C, 1, true]],
  3: [[C, 0], [C, 0.5], [C, 1, true]],
  4: [[L, 0], [R, 0], [L, 1, true], [R, 1, true]],
  5: [[L, 0], [R, 0], [C, 0.5], [L, 1, true], [R, 1, true]],
  6: [[L, 0], [R, 0], [L, 0.5], [R, 0.5], [L, 1, true], [R, 1, true]],
  7: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [L, 1, true], [R, 1, true]],
  8: [[L, 0], [R, 0], [C, 0.25], [L, 0.5], [R, 0.5], [C, 0.75, true], [L, 1, true], [R, 1, true]],
  9: [[L, 0], [R, 0], [L, 0.33], [R, 0.33], [C, 0.5], [L, 0.67, true], [R, 0.67, true], [L, 1, true], [R, 1, true]],
  10: [[L, 0], [R, 0], [C, 0.17], [L, 0.33], [R, 0.33], [L, 0.67, true], [R, 0.67, true], [C, 0.83, true], [L, 1, true], [R, 1, true]],
};

/** Mitad superior de una figura (K/Q/J): busto con tocado; la inferior es el giro de 180°. */
function FigureHalf({ rank, suit }: { rank: 11 | 12 | 13; suit: FrenchSuit }) {
  const robe = suit === 'corazones' || suit === 'diamantes' ? '#9b1c2e' : '#1d3b66';
  const hat = rank === 13 ? 'crown' : rank === 12 ? 'tiara' : 'plume';
  return (
    <g>
      <Bust hat={hat} beard={rank === 13} robe={robe} hair={rank === 12 ? '#c9a227' : '#4a3216'} x={240} y={272} scale={1.18} />
      <Suit suit={suit} x={150} y={228} size={44} />
    </g>
  );
}

/** Baraja francesa de casino: marfil cálido, doble marco, palos lacados con brillo. */
function FrenchFaceDrawn({ card }: { card: FrenchCard }) {
  const { rank, suit } = card;
  const color = SUIT_COLOR[suit];
  const label = FRENCH_RANK_LABEL(rank);
  const isFace = rank >= 11;
  const px = { x0: 150, x1: 330, y0: 175, y1: 585 };
  return (
    <svg shapeRendering="geometricPrecision" viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" preserveAspectRatio="none" style={{ display: 'block' }}>
      <SvgDefs />
      <Frame accent={suit === 'corazones' || suit === 'diamantes' ? '#7a1f2b' : '#26303f'} />
      {[false, true].map((inv) => (
        <g key={String(inv)} transform={inv ? `rotate(180 ${W / 2} ${H / 2})` : undefined}>
          <text x="62" y="104" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900"
            fontSize={label.length > 1 ? 66 : 80} fill={color}>{label}</text>
          <Suit suit={suit} x={62} y={152} size={44} />
        </g>
      ))}
      {isFace ? (
        <g>
          <rect x="104" y="150" width="272" height="460" rx="16" fill={color} opacity=".06" stroke="url(#st-gold)" strokeWidth="3.5" />
          <clipPath id="fr-top"><rect x="104" y="150" width="272" height="230" /></clipPath>
          <g clipPath="url(#fr-top)"><FigureHalf rank={rank as 11 | 12 | 13} suit={suit} /></g>
          <g transform={`rotate(180 ${W / 2} ${H / 2})`} clipPath="url(#fr-top)"><FigureHalf rank={rank as 11 | 12 | 13} suit={suit} /></g>
          <path d="M104 380 H376" stroke="url(#st-gold)" strokeWidth="3" />
          <circle cx="240" cy="380" r="16" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="2" />
          <text x="240" y="387" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize="20" fill="#2a1a02">{label}</text>
        </g>
      ) : rank === 1 ? (
        <g>
          <circle cx="240" cy="380" r="150" fill="none" stroke="url(#st-gold)" strokeWidth="3" />
          <circle cx="240" cy="380" r="138" fill="none" stroke={GOLD} strokeWidth="1.4" strokeDasharray="3 7" />
          <Suit suit={suit} x={240} y={380} size={230} />
          <text x="240" y="640" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize="22" letterSpacing="8" fill={GOLD}>{APP_NAME}</text>
        </g>
      ) : (
        (PIPS[rank] ?? []).map(([cx, cy, inv], i) => (
          <Suit key={i} suit={suit} x={px.x0 + (px.x1 - px.x0) * cx} y={px.y0 + (px.y1 - px.y0) * cy}
            size={rank >= 9 ? 74 : 86} flip={inv} />
        ))
      )}
    </svg>
  );
}

/** Reverso Art Déco: filigrana dorada sobre esmeralda oscuro con el emblema central de STACKS. */
export function CardBackArt({ variant: forced, seal = APP_NAME }: { variant?: BackVariant; seal?: string }) {
  const equipped = useCardBack();
  const variant = forced ?? equipped; // por defecto, el dorso que el jugador tiene equipado en la tienda
  const base = { emerald: '#06281e', crimson: '#3a0f14', midnight: '#0B1528', gold: '#2b1f05' }[variant];
  const mid = { emerald: '#0c4333', crimson: '#6b1c24', midnight: '#16305a', gold: '#6e5012' }[variant];
  const id = `bk-${variant}`;
  const cx = W / 2, cy = H / 2;
  return (
    <svg shapeRendering="geometricPrecision" viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }}>
      <SvgDefs />
      <defs>
        <pattern id={id} width="56" height="56" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="56" height="56" fill={base} />
          <path d="M0 28 H56 M28 0 V56" stroke={mid} strokeWidth="2" />
          <path d="M28 6 L50 28 L28 50 L6 28Z" fill="none" stroke="url(#st-gold)" strokeWidth="1.6" opacity=".7" />
          <circle cx="28" cy="28" r="3" fill="url(#st-gold)" />
        </pattern>
        <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".6">
          <stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".55" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} rx="34" fill="#f6efdc" />
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="24" fill={`url(#${id})`} />
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="24" fill={`url(#${id}-glow)`} />
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="24" fill="none" stroke="url(#st-gold)" strokeWidth="5" />
      <rect x="36" y="36" width={W - 72} height={H - 72} rx="14" fill="none" stroke="url(#st-gold)" strokeWidth="1.6" />
      {/* esquinas déco en abanico */}
      {[[56, 56, 0], [W - 56, 56, 90], [W - 56, H - 56, 180], [56, H - 56, 270]].map(([x, y, r]) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`} stroke="url(#st-gold)" strokeWidth="2" fill="none">
          {[14, 26, 38].map((d) => <path key={d} d={`M0 ${d} A${d} ${d} 0 0 1 ${d} 0`} />)}
        </g>
      ))}
      {/* emblema central */}
      <g transform={`translate(${cx} ${cy})`}>
        <circle r="104" fill={base} stroke="url(#st-gold)" strokeWidth="5" />
        <circle r="92" fill="none" stroke="url(#st-gold)" strokeWidth="1.6" strokeDasharray="2 6" />
        {Array.from({ length: 16 }, (_, i) => (
          <path key={i} d="M0 -88 L6 -74 L0 -66 L-6 -74Z" fill="url(#st-gold)" transform={`rotate(${i * 22.5})`} />
        ))}
        <circle r="56" fill={mid} stroke="url(#st-gold)" strokeWidth="3" />
        <path d="M-26 -22 L0 -40 L26 -22 L0 -4Z M-26 0 L0 -18 L26 0 L0 18Z M-26 22 L0 4 L26 22 L0 40Z" fill="none" stroke="url(#st-gold)" strokeWidth="4" strokeLinejoin="round" />
      </g>
      <text x={cx} y={cy + 150} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize={seal.length > 6 ? 26 : 30} letterSpacing={seal.length > 6 ? 5 : 8} fill="url(#st-gold)">{seal}</text>
    </svg>
  );
}

/** Carta francesa real: carga `/cards/french/${rank}_of_${suit}.svg`; si falta el archivo, se dibuja una equivalente. */
export function FrenchFace({ card }: { card: FrenchCard }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <FrenchFaceDrawn card={card} />;
  return (
    <img src={`${import.meta.env.BASE_URL}cards/french/${frenchFileName(card)}`} alt="" draggable={false} onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} />
  );
}
