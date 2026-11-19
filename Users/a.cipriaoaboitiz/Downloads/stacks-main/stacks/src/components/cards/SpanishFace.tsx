import type { SpanishCard, SpanishRank } from '../../engine/deck.ts';
import { SPANISH_RANK_NAMES } from '../../engine/deck.ts';
import { Bust, Frame, H, HorseHead, SPANISH_COLOR, SuitMark, SvgDefs, W } from './art.tsx';

/** Pintas de la baraja española real: 0 Oros, 1 Copas, 2 Espadas, 3 Bastos (rayas en el borde superior e inferior). */
const PINTAS: Record<string, number> = { oros: 0, copas: 1, espadas: 2, bastos: 3 };

type Pip = [number, number];
// Posiciones normalizadas (columna 0..1, fila 0..1) dentro del área de motivos.
const PIPS: Partial<Record<SpanishRank, Pip[]>> = {
  2: [[.5, 0], [.5, 1]],
  3: [[.5, 0], [.5, .5], [.5, 1]],
  4: [[0, 0], [1, 0], [0, 1], [1, 1]],
  5: [[0, 0], [1, 0], [.5, .5], [0, 1], [1, 1]],
  6: [[0, 0], [1, 0], [0, .5], [1, .5], [0, 1], [1, 1]],
  7: [[0, 0], [1, 0], [.5, .25], [0, .5], [1, .5], [0, 1], [1, 1]],
};

const NUM: Record<SpanishRank, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 10: '10', 11: '11', 12: '12' };

function Figure({ card }: { card: SpanishCard }) {
  const col = SPANISH_COLOR[card.suit];
  const robe = { oros: '#b4780a', copas: '#9b1c2e', espadas: '#1d3b66', bastos: '#2f6b35' }[card.suit];
  return (
    <g>
      <rect x="104" y="146" width="272" height="468" rx="16" fill={col} opacity=".1" stroke="url(#st-gold)" strokeWidth="3.5" />
      <rect x="114" y="156" width="252" height="448" rx="10" fill="none" stroke={col} strokeWidth="1.6" opacity=".7" />
      {card.rank === 10 && <Bust hat="beret" robe={robe} x={240} y={300} scale={1.45} hair="#5a3a1a" />}
      {card.rank === 11 && (
        <>
          <HorseHead x={246} y={196} scale={1.5} coat={card.suit === 'espadas' ? '#e9e4d6' : '#8b5a2b'} />
        </>
      )}
      {card.rank === 12 && <Bust hat="crown" beard robe={robe} x={240} y={316} scale={1.5} />}
      <SuitMark suit={card.suit} x={240} y={520} size={74} />
      <text x="240" y="586" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize="26" letterSpacing="6" fill={col}>
        {SPANISH_RANK_NAMES[card.rank].toUpperCase()}
      </text>
    </g>
  );
}

/** Baraja española de lujo: marfil, doble marco y motivos vectoriales grabados. */
export function SpanishFace({ card }: { card: SpanishCard }) {
  const { rank, suit } = card;
  const col = SPANISH_COLOR[suit];
  const isFig = rank >= 10;
  const area = { x0: 150, x1: 330, y0: 190, y1: 570 };
  const pips = PIPS[rank] ?? [];
  const size = rank >= 6 ? 106 : 124;
  return (
    <svg shapeRendering="geometricPrecision" viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" aria-hidden="true" preserveAspectRatio="none" style={{ display: 'block' }}>
      <SvgDefs />
      <Frame accent={col} />
      {[0, 1].map((side) => Array.from({ length: PINTAS[suit] ?? 0 }, (_, i) => (
        <rect key={`${side}-${i}`} x={W / 2 + (i - ((PINTAS[suit] ?? 0) - 1) / 2) * 26 - 6} y={side === 0 ? 1 : H - 11} width={12} height={10} rx={2} fill={col} opacity={0.85} />
      )))}
      {[false, true].map((inv) => (
        <g key={String(inv)} transform={inv ? `rotate(180 ${W / 2} ${H / 2})` : undefined}>
          <text x="62" y="100" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900"
            fontSize={NUM[rank].length > 1 ? 58 : 70} fill={col}>{NUM[rank]}</text>
          <SuitMark suit={suit} x={62} y={146} size={46} />
        </g>
      ))}
      {isFig ? <Figure card={card} /> : rank === 1 ? (
        <g>
          <circle cx="240" cy="380" r="150" fill="none" stroke="url(#st-gold)" strokeWidth="3" />
          <circle cx="240" cy="380" r="138" fill="none" stroke={col} strokeWidth="1.4" strokeDasharray="3 7" opacity=".7" />
          <SuitMark suit={suit} x={240} y={380} size={240} />
          <text x="240" y="610" textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize="30" letterSpacing="10" fill={col}>AS</text>
        </g>
      ) : pips.map(([cx, cy], i) => (
        <SuitMark key={i} suit={suit} x={area.x0 + (area.x1 - area.x0) * cx} y={area.y0 + (area.y1 - area.y0) * cy} size={size} />
      ))}
    </svg>
  );
}
