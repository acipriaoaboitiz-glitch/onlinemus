import { memo } from 'react';

const JADE = '#0f7a54'; const RUBY = '#b3122a'; const GOLD = '#c99a1e'; const INK = '#1a2420';
/** Numerales 1–5 dibujados con trazos (sin glifos de texto). */
const NUMERAL = ['M16 30H44', 'M20 22H40M14 38H46', 'M20 18H40M17 30H43M12 42H48', 'M16 16H44V44H16ZM25 16V32M35 16V32M25 32Q30 40 35 32', 'M16 16H44M24 16L22 44M19 30H41M40 30L38 44M13 44H47'];

const CIRCLE_POS: [number, number][][] = [
  [[30, 40]],
  [[30, 25], [30, 55]],
  [[18, 22], [30, 40], [42, 58]],
  [[20, 26], [40, 26], [20, 54], [40, 54]],
  [[19, 24], [41, 24], [30, 40], [19, 56], [41, 56]],
];
const BAMBOO_POS: [number, number][][] = [
  [[30, 40]],
  [[22, 40], [38, 40]],
  [[22, 28], [38, 28], [30, 56]],
  [[22, 28], [38, 28], [22, 56], [38, 56]],
  [[20, 26], [40, 26], [30, 40], [20, 56], [40, 56]],
];

function Stick({ x, y, red }: { x: number; y: number; red?: boolean }) {
  return (
    <g>
      <rect x={x - 3.4} y={y - 11} width="6.8" height="22" rx="3.2" fill={red ? RUBY : JADE} stroke="#06382a" strokeWidth=".6" />
      <path d={`M${x - 3.4} ${y - 1}h6.8M${x - 3.4} ${y + 5}h6.8`} stroke="#06382a" strokeWidth=".7" />
      <rect x={x - 1.6} y={y - 9} width="1.3" height="17" rx=".6" fill="#fff" opacity=".35" />
    </g>
  );
}

/** Dibujo de cada uno de los 22 tipos: círculos 1–5, bambúes 1–5, caracteres 1–5, 4 vientos y 3 dragones. Viewbox 60×80. */
export const Face = memo(function Face({ type }: { type: number }) {
  if (type < 5) {
    return (
      <g>
        {CIRCLE_POS[type]!.map(([x, y], i) => {
          const r = type === 0 ? 14 : type < 3 ? 9.5 : 8;
          const col = i % 2 === 0 ? JADE : RUBY;
          return <g key={i}><circle cx={x} cy={y} r={r} fill="#f8f2dc" stroke={col} strokeWidth="2.2" /><circle cx={x} cy={y} r={r * 0.55} fill={col} /><circle cx={x} cy={y} r={r * 0.2} fill={GOLD} /></g>;
        })}
      </g>
    );
  }
  if (type < 10) {
    const n = type - 5;
    return <g>{BAMBOO_POS[n]!.map(([x, y], i) => <Stick key={i} x={x} y={y} red={n === 0 || (n === 4 && i === 2)} />)}</g>;
  }
  if (type < 15) {
    const n = type - 10;
    return (
      <g>
        <path d={NUMERAL[n]!} fill="none" stroke={INK} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* sello carmesí (en lugar de un glifo de texto) */}
        <rect x="17" y="52" width="26" height="22" rx="4" fill={RUBY} stroke="#5c0a14" strokeWidth="1.4" />
        <path d="M23 60H37M30 56.5V69M24 66H36" stroke="#fff" strokeOpacity=".92" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    );
  }
  if (type < 19) {
    return (
      <g>
        <circle cx="30" cy="40" r="19" fill="#f8f2dc" stroke={INK} strokeWidth="2.4" />
        <g transform={`rotate(${[90, 180, 270, 0][type - 15]} 30 40)`}>
          <path d="M30 22 L38 42 L30 37 L22 42 Z" fill={type === 18 ? RUBY : INK} stroke="#000" strokeWidth=".8" strokeLinejoin="round" />
          <path d="M30 58 L30 44" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="30" cy="40" r="2.6" fill={GOLD} />
        </g>
      </g>
    );
  }
  if (type === 19) return <g><rect x="14" y="24" width="32" height="32" rx="3" transform="rotate(45 30 40)" fill={RUBY} stroke="#5c0a14" strokeWidth="1.6" /><circle cx="30" cy="40" r="7" fill="#FCE38A" /></g>;
  if (type === 20) return <g><path d="M30 14 C48 24 48 54 30 66 C12 54 12 24 30 14Z" fill={JADE} stroke="#06382a" strokeWidth="1.6" /><path d="M30 20 V62" stroke="#7ff0c0" strokeWidth="1.8" /></g>;
  return <g><rect x="13" y="21" width="34" height="38" rx="4" fill="none" stroke="#2c4f8f" strokeWidth="3" /><rect x="19" y="27" width="22" height="26" rx="2" fill="none" stroke="#2c4f8f" strokeWidth="1.6" /></g>;
});
