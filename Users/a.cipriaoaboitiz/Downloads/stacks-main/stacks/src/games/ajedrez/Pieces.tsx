import { memo } from 'react';
import type { Kind, Side } from './engine.ts';

/** Siluetas estilo Staunton (viewBox 45×45). Todas comparten peana, cintura y brillo para parecer talladas. */
const PATHS: Record<Kind, string[]> = {
  p: ['M22.5 8.2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z', 'M16.4 20.4h12.2v2.6H16.4Z', 'M17.2 23.4h10.6c.6 3 2.6 6 3.6 10.2H13.6c1-4.2 3-7.2 3.6-10.2Z'],
  r: ['M13 14.2V8.4h4.2v3h3.4v-3h3.8v3h3.4v-3H32v5.8Z', 'M14.6 15.6h15.8l1.2 17.6H13.4Z', 'M12.6 18h19.8v2.4H12.6Z'],
  n: ['M13.2 33.4c.4-6.4 3-11.4 6.4-15.6-2-.4-4.6.6-6.6 3.4-.8-2.6.4-6 3.6-9l1.8-5.6 2.8 3.2c7.2-.4 12.4 5.6 12.8 14.2.2 4.4-.6 6.6-.8 9.4Z', 'M18.8 14.2c1 .2 1.8.9 2.2 1.8', 'M14.6 23.4c1.6-.4 3.2-1.8 4.2-3.6'],
  b: ['M22.5 4.2a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z', 'M22.5 9.4c5 3.6 6.8 8.8 3.2 13.2l1.6 1c1.8 3.2 3.2 6.2 3.2 9.8H14.5c0-3.6 1.4-6.6 3.2-9.8l1.6-1c-3.6-4.4-1.8-9.6 3.2-13.2Z', 'M20.4 17.4l4.2 4.2'],
  q: ['M11.2 33.4 8.6 14.6l6.4 6.4 1.8-11.4 5.7 10.8 5.7-10.8 1.8 11.4 6.4-6.4-2.6 18.8Z', 'M8.6 11.4a2 2 0 1 1 .001 0M16.8 7.4a2 2 0 1 1 .001 0M22.5 6.2a2 2 0 1 1 .001 0M28.2 7.4a2 2 0 1 1 .001 0M36.4 11.4a2 2 0 1 1 .001 0', 'M12.4 28h20.2v2.4H12.4Z'],
  k: ['M20.6 3.4h3.8v3.4h3.4v3.8h-3.4V14h-3.8v-3.4h-3.4V6.8h3.4Z', 'M13.4 33.4c0-7 2.8-10.2 5.6-13.6h7c2.8 3.4 5.6 6.6 5.6 13.6Z', 'M17.2 17.8h10.6c1.4 1.4 2 2.4 2.4 4H14.8c.4-1.6 1-2.6 2.4-4Z'],
};

const BASE = 'M9.6 40.4h25.8v-2.6c0-.9-.7-1.6-1.6-1.6H11.2c-.9 0-1.6.7-1.6 1.6Z';

/** Contenido de una pieza (defs + formas) para incrustarla en otros <svg> de viewBox 45×45. */
export const PieceShapes = memo(function PieceShapes({ kind, side }: { kind: Kind; side: Side }) {
  const gold = side === 0;
  const id = gold ? 'cp-g' : 'cp-o';
  return (
    <>
      <defs>
        <linearGradient id="cp-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF3B0" /><stop offset=".45" stopColor="#D4AF37" /><stop offset="1" stopColor="#8a6410" /></linearGradient>
        <linearGradient id="cp-o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4a504d" /><stop offset=".5" stopColor="#151a18" /><stop offset="1" stopColor="#050706" /></linearGradient>
      </defs>
      <ellipse cx="22.5" cy="41" rx="14" ry="2.2" fill="#000" opacity=".4" />
      <g fill={`url(#${id})`} stroke={gold ? '#5c430b' : '#D4AF37'} strokeWidth={gold ? 0.9 : 0.8} strokeLinejoin="round" strokeOpacity={gold ? 1 : 0.75}>
        <path d={BASE} />
        {PATHS[kind].map((d, i) => <path key={i} d={d} fill={i > 0 && (kind === 'n' || (kind === 'b' && i === 2)) ? 'none' : undefined} />)}
      </g>
      <path d="M16 36.4h13" stroke="#fff" strokeOpacity={gold ? 0.55 : 0.22} strokeWidth="1" strokeLinecap="round" />
      {/* reflejo metálico vertical sobre el cuerpo */}
      <path d="M17.4 33 C18 27 20 23 22 20" stroke="#fff" strokeOpacity={gold ? 0.7 : 0.3} strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {kind === 'n' && <circle cx="24.6" cy="14.6" r="1.1" fill={gold ? '#4a3204' : '#FCE38A'} />}
    </>
  );
});

/** Pieza vectorial: oro cepillado (blancas, `p0`) u obsidiana con filo dorado (negras, `p1`). */
export const ChessPiece = memo(function ChessPiece({ kind, side, size = '100%' }: { kind: Kind; side: Side; size?: string }) {
  return (
    <svg viewBox="0 0 45 45" style={{ width: size, height: size, display: 'block', overflow: 'visible' }} shapeRendering="geometricPrecision" aria-hidden="true">
      <PieceShapes kind={kind} side={side} />
    </svg>
  );
});
