import { memo } from 'react';
import { CupGroup, IsoDefs, IsoDie } from '../../games/mentiroso/Dice.tsx';
import { WheelGroup } from '../../games/ruleta/Wheel.tsx';
import { ART2, Body2, TableArt2Defs } from './TableArt2.tsx';

/** Ilustraciones vectoriales de los juegos de mesa (Dominó, El Mentiroso, Ruleta VIP). viewBox 150×150, nítidas a cualquier tamaño. */
const P = { tl: [14, 14], tr: [36, 14], ml: [14, 25], mr: [36, 25], c: [25, 25], bl: [14, 36], br: [36, 36] } as const;
const PIPS: Record<number, (keyof typeof P)[]> = {
  0: [], 1: ['c'], 2: ['tl', 'br'], 3: ['tl', 'c', 'br'], 4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'c', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
};
function Defs() {
  return (
    <>
    <IsoDefs />
    <TableArt2Defs />
    <defs>
      <linearGradient id="ta-ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFBEA" /><stop offset=".6" stopColor="#F1E7C6" /><stop offset="1" stopColor="#D2C292" /></linearGradient>
      <linearGradient id="ta-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FCE38A" /><stop offset=".5" stopColor="#D4AF37" /><stop offset="1" stopColor="#8B6914" /></linearGradient>
      <linearGradient id="ta-cup" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0b0907" /><stop offset=".35" stopColor="#2f281c" /><stop offset=".62" stopColor="#15110b" /><stop offset="1" stopColor="#070605" /></linearGradient>
      <linearGradient id="ta-goldr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF6C4" /><stop offset=".5" stopColor="#D4AF37" /><stop offset="1" stopColor="#8a6410" /></linearGradient>
      <linearGradient id="ta-ruby" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFB0BB" /><stop offset=".5" stopColor="#C3162C" /><stop offset="1" stopColor="#4d0711" /></linearGradient>
      <radialGradient id="ta-radar" cx=".5" cy=".5" r=".75"><stop offset="0" stopColor="#0d4a36" /><stop offset="1" stopColor="#03120d" /></radialGradient>
      <linearGradient id="ta-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E9D9A6" /><stop offset="1" stopColor="#6a5224" /></linearGradient>
      <radialGradient id="ta-wood" cx=".5" cy=".4" r=".7"><stop offset="0" stopColor="#4a2e17" /><stop offset="1" stopColor="#1b0f07" /></radialGradient>
      <radialGradient id="ta-hub" cx=".4" cy=".35" r=".8"><stop offset="0" stopColor="#FCE38A" /><stop offset=".45" stopColor="#B8860B" /><stop offset="1" stopColor="#4d3407" /></radialGradient>
    </defs>
    </>
  );
}

function Tile({ x, y, r, a, b }: { x: number; y: number; r: number; a: number; b: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(.78) translate(-50 -25)`} style={{ filter: 'drop-shadow(0 6px 5px rgba(0,0,0,.55))' }}>
      <rect x="1" y="1" width="98" height="48" rx="7" fill="url(#ta-ivory)" stroke="#8B7A45" strokeWidth="1.2" />
      <rect x="2.5" y="2.5" width="95" height="45" rx="5.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth=".8" />
      <line x1="50" y1="7" x2="50" y2="43" stroke="#D4AF37" strokeWidth="2" />
      <circle cx="50" cy="25" r="2.4" fill="#B8860B" />
      {[[a, 0], [b, 50]].map(([n, ox]) => PIPS[n!]!.map((k) => (
        <g key={`${ox}${k}`}><circle cx={P[k][0] + ox!} cy={P[k][1]} r="5.6" fill="#B8860B" opacity=".55" /><circle cx={P[k][0] + ox!} cy={P[k][1]} r="4.6" fill="#16120a" /></g>
      )))}
    </g>
  );
}

function Dice({ x, y, r, face, s = 1 }: { x: number; y: number; r: number; face: number; s?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${r}) scale(${0.62 * s}) translate(-50 -50)`} style={{ filter: 'drop-shadow(0 5px 4px rgba(0,0,0,.5))' }}><IsoDie face={face} /></g>;
}


function Body({ id }: { id: string }) {
  if (ART2.has(id)) return <Body2 id={id} />;
  if (id === 'domino') {
    return (
      <g>
        <ellipse cx="75" cy="128" rx="58" ry="9" fill="rgba(0,0,0,.5)" />
        <Tile x={44} y={92} r={-24} a={6} b={4} />
        <Tile x={96} y={96} r={14} a={4} b={2} />
        <Tile x={76} y={44} r={-4} a={6} b={6} />
      </g>
    );
  }
  if (id === 'mentiroso') {
    return (
      <g>
        <ellipse cx="75" cy="128" rx="58" ry="9" fill="rgba(0,0,0,.5)" />
        <Dice x={50} y={102} r={-10} face={5} s={1.25} />
        <Dice x={104} y={106} r={14} face={3} s={1.1} />
        <g transform="translate(58 16) scale(.8) rotate(-10 40 33)" style={{ filter: 'drop-shadow(0 8px 6px rgba(0,0,0,.55))' }}><CupGroup /></g>
            </g>
    );
  }
  if (id === 'tres') {
    return (
      <g>
        <ellipse cx="75" cy="134" rx="54" ry="7" fill="rgba(0,0,0,.5)" />
        <rect x="20" y="22" width="110" height="110" rx="12" fill="url(#ta-wood)" stroke="url(#ta-gold)" strokeWidth="2" />
        <rect x="25" y="27" width="100" height="100" rx="8" fill="none" stroke="#000" strokeOpacity=".5" strokeWidth="1.5" />
        {[56, 92].map((p) => <g key={p}><line x1={p} y1="34" x2={p} y2="120" stroke="url(#ta-gold)" strokeWidth="1.6" /><line x1="32" y1={p + 6} x2="118" y2={p + 6} stroke="url(#ta-gold)" strokeWidth="1.6" /></g>)}
        <g stroke="url(#ta-gold)" strokeWidth="6" strokeLinecap="round"><line x1="34" y1="40" x2="50" y2="56" /><line x1="50" y1="40" x2="34" y2="56" /></g>
        <g stroke="url(#ta-gold)" strokeWidth="6" strokeLinecap="round"><line x1="66" y1="72" x2="82" y2="88" /><line x1="82" y1="72" x2="66" y2="88" /></g>
        <g stroke="url(#ta-gold)" strokeWidth="6" strokeLinecap="round"><line x1="98" y1="104" x2="114" y2="120" /><line x1="114" y1="104" x2="98" y2="120" /></g>
        <circle cx="74" cy="48" r="8" fill="none" stroke="url(#ta-ivory)" strokeWidth="5.5" />
        <circle cx="42" cy="80" r="8" fill="none" stroke="url(#ta-ivory)" strokeWidth="5.5" />
        <path d="M30 45 L118 123" stroke="#FCE38A" strokeOpacity=".5" strokeWidth="9" strokeLinecap="round" />
        <path d="M30 45 L118 123" stroke="#FFF6C6" strokeWidth="2.4" strokeLinecap="round" />
      </g>
    );
  }
  if (id === 'cuatro') {
    const holes = [];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) holes.push([c, r]);
    const gold = [[2, 4], [3, 4], [3, 3], [4, 4], [5, 4], [3, 2]];
    const ruby = [[1, 4], [2, 3], [4, 3], [2, 2]];
    const has = (list: number[][], c: number, r: number): boolean => list.some(([x, y]) => x === c && y === r);
    return (
      <g>
        <ellipse cx="75" cy="136" rx="58" ry="7" fill="rgba(0,0,0,.5)" />
        <rect x="12" y="24" width="126" height="108" rx="12" fill="url(#ta-wood)" stroke="url(#ta-gold)" strokeWidth="1.6" />
        <rect x="17" y="29" width="116" height="98" rx="8" fill="#050b09" />
        {holes.map(([c, r]) => {
          const x = 27 + c * 19.2; const y = 40 + r * 19.2;
          const fill = has(gold, c, r) ? 'url(#ta-goldr)' : has(ruby, c, r) ? 'url(#ta-ruby)' : '#0b1512';
          return <g key={c + '-' + r}><circle cx={x} cy={y} r="8.2" fill={fill} /><circle cx={x} cy={y} r="8.4" fill="none" stroke="#6c7a72" strokeOpacity=".6" strokeWidth="1.2" /></g>;
        })}
      </g>
    );
  }
  if (id === 'flota') {
    return (
      <g>
        <ellipse cx="75" cy="136" rx="56" ry="7" fill="rgba(0,0,0,.5)" />
        <rect x="16" y="16" width="118" height="118" rx="16" fill="url(#ta-radar)" stroke="url(#ta-gold)" strokeWidth="2" />
        {[50, 36, 22].map((r) => <circle key={r} cx="75" cy="75" r={r} fill="none" stroke="#D4AF37" strokeOpacity=".25" strokeWidth="1" />)}
        {[1, 2, 3, 4, 5, 6].map((i) => <g key={i}><line x1={16 + i * 16.9} y1="22" x2={16 + i * 16.9} y2="128" stroke="#3fe0a8" strokeOpacity=".22" strokeWidth=".8" /><line x1="22" y1={16 + i * 16.9} x2="128" y2={16 + i * 16.9} stroke="#3fe0a8" strokeOpacity=".22" strokeWidth=".8" /></g>)}
        <rect x="28" y="40" width="64" height="14" rx="7" fill="url(#ta-hull)" stroke="#FCE38A" strokeOpacity=".7" />
        <rect x="95" y="62" width="14" height="44" rx="7" fill="url(#ta-hull)" stroke="#FCE38A" strokeOpacity=".7" />
        <circle cx="60" cy="97" r="7" fill="#b91c1c" stroke="#FCE38A" strokeWidth="2" />
        <circle cx="42" cy="114" r="6" fill="none" stroke="#38bdf8" strokeWidth="2.4" />
        <circle cx="42" cy="114" r="12" fill="none" stroke="#34d399" strokeOpacity=".5" strokeWidth="1.4" />
      </g>
    );
  }
  // ruleta: la rueda completa (misma que en la mesa) y una ficha de casino
  return (
    <g>
      <ellipse cx="75" cy="134" rx="56" ry="7" fill="rgba(0,0,0,.5)" />
      <g transform="translate(9 4) scale(.66)"><WheelGroup /></g>
      <circle cx="104" cy="45" r="3.2" fill="#fff" stroke="#999" strokeWidth=".5" />
      <g transform="translate(116 114)" style={{ filter: 'drop-shadow(0 4px 4px rgba(0,0,0,.55))' }}>
        <circle r="16" fill="#7f1d1d" stroke="#fde68a" strokeWidth="2.6" strokeDasharray="6 4" />
        <circle r="10" fill="none" stroke="#fde68a" strokeWidth="1.2" />
        <circle r="5" fill="#fde68a" opacity=".85" />
      </g>
    </g>
  );
}

export const TABLE_GAMES = new Set(['domino', 'mentiroso', 'ruleta', 'tres', 'cuatro', 'flota', ...ART2]);

/** Ilustración 150×150 de un juego de mesa (el tamaño final lo da `size`). */
export const TableArt = memo(function TableArt({ id, size = 150 }: { id: string; size?: number }) {
  return (
    <svg shapeRendering="geometricPrecision" viewBox="0 0 150 150" width={size} height={size} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
      <Defs />
      <Body id={id} />
    </svg>
  );
});

/** Cuerpo para incrustar en un emblema de viewBox 100×100. */
export function TableEmblemBody({ id }: { id: string }) {
  return <g transform="translate(0 4) scale(.66)"><Defs /><Body id={id} /></g>;
}
