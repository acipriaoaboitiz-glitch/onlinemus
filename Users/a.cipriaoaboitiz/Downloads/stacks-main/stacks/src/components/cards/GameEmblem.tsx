import type { ReactNode } from 'react';
import { SvgDefs } from './art.tsx';
import { TableEmblemBody } from './TableArt.tsx';

/** Emblema SVG a medida para cada juego (viewBox 100×100). */
function Card({ x, y, r = 0, w = 34, h = 50, children }: { x: number; y: number; r?: number; w?: number; h?: number; children?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx="5" fill="url(#st-paper)" stroke="url(#st-gold)" strokeWidth="2" />
      <rect x={-w / 2 + 3} y={-h / 2 + 3} width={w - 6} height={h - 6} rx="3" fill="none" stroke="#7a1f2b" strokeWidth=".8" opacity=".6" />
      {children}
    </g>
  );
}
const Crown = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-16 8 L-20 -10 L-8 0 L0 -14 L8 0 L20 -10 L16 8Z" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="2" strokeLinejoin="round" />
    <rect x="-16" y="9" width="32" height="5" rx="2" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="1.5" />
  </g>
);


const BASE = import.meta.env.BASE_URL;
/** Naipe oficial (arte Fournier de public/cards) como miniatura del emblema. */
function Real({ x, y, r = 0, w = 34, file }: { x: number; y: number; r?: number; w?: number; file: string }) {
  const h = (w * 760) / 480;
  const id = `rc-${file.replace(/\W/g, '')}`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`} >
      <clipPath id={id}><rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.07} /></clipPath>
      <image href={`${BASE}cards/${file}.webp`} x={-w / 2} y={-h / 2} width={w} height={h} clipPath={`url(#${id})`} preserveAspectRatio="none" />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.07} fill="none" stroke="#6b4306" strokeWidth=".8" />
    </g>
  );
}

function Body({ id }: { id: string }) {
  switch (id) {
    case 'mus':
      return (<g><Real x={28} y={58} r={-18} w={30} file="12-oros" /><Real x={42} y={54} r={-6} w={30} file="12-copas" /><Real x={58} y={54} r={6} w={30} file="12-espadas" /><Real x={72} y={58} r={18} w={30} file="12-bastos" /><Crown x={50} y={16} s={1.1} /></g>);
    case 'brisca':
      return (<g><Real x={36} y={54} r={-12} w={38} file="01-oros" /><Real x={64} y={54} r={12} w={38} file="03-oros" /></g>);
    case 'tute':
      return (<g><Real x={34} y={56} r={-10} w={38} file="12-oros" /><Real x={66} y={56} r={10} w={38} file="11-oros" /><path d="M50 6 C60 20 70 24 64 38 C60 30 54 32 50 38 C46 32 40 30 36 38 C30 24 40 20 50 6Z" fill="#f97316" stroke="#fde68a" strokeWidth="2" /></g>);
    case 'chinchon':
      return (<g>{[1, 2, 3, 4, 5, 6, 7].map((n, i) => <Real key={n} x={14 + i * 12} y={62 - i * 5} w={26} file={`0${n}-oros`} />)}</g>);
    case 'escoba':
      return (<g><g transform="rotate(35 50 50)"><rect x="46" y="8" width="8" height="52" rx="4" fill="url(#st-wood)" stroke="#2b1708" strokeWidth="2" /><path d="M34 60 H66 L72 92 H28Z" fill="#d9a63c" stroke="#6b4306" strokeWidth="2" />{[38, 44, 50, 56, 62].map((x) => <path key={x} d={`M${x} 64 V90`} stroke="#6b4306" strokeWidth="1.5" />)}</g><circle cx="22" cy="24" r="15" fill="url(#st-coin)" stroke="#6b4306" strokeWidth="2" /><text x="22" y="24" textAnchor="middle" dominantBaseline="central" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="14" fill="#3b2410">15</text></g>);
    case 'cinquillo':
      return (<g>{[3, 4, 5, 6, 7].map((n, i) => <Real key={n} x={16 + i * 17} y={52} w={26} file={`0${n}-oros`} />)}<path d="M10 86 H90" stroke="url(#st-gold)" strokeWidth="3" strokeLinecap="round" /></g>);
    case 'solitario-es':
      return (<g>{(['oros', 'copas', 'espadas', 'bastos'] as const).map((su, i) => <Real key={su} x={22 + i * 19} y={34 + i * 9} w={28} file={`01-${su}`} />)}</g>);
    case 'uno': {
      const cs: [string, string, number, number, number][] = [['#d72600', '7', -22, 30, 58], ['#2f9a14', '+2', -4, 46, 52], ['#0956bf', '⊘', 14, 62, 54], ['#ecb800', '5', 30, 76, 60]];
      return (
        <g>
          {cs.map(([c, t, r, x, y]) => (
            <g key={t} transform={`translate(${x} ${y}) rotate(${r})`}>
              <rect x="-17" y="-26" width="34" height="52" rx="5" fill="#fff" />
              <rect x="-14.5" y="-23.5" width="29" height="47" rx="3.5" fill={c} />
              <ellipse rx="10" ry="17" fill="#fff" transform="rotate(30)" />
              <text textAnchor="middle" dominantBaseline="central" fontFamily="Manrope, sans-serif" fontWeight="800" fontStyle="italic" fontSize="15" fill={c}>{t}</text>
            </g>
          ))}
        </g>
      );
    }
    case 'seises':
      return (<g><Real x={30} y={58} r={-12} w={38} file="05-oros" /><Real x={50} y={52} r={0} w={38} file="06-oros" /><Real x={70} y={58} r={12} w={38} file="07-oros" /></g>);
    case 'presidente':
      return (
        <g>
          <Real x={34} y={58} r={-12} w={34} file="02-oros" />
          <Real x={66} y={58} r={12} w={34} file="01-espadas" />
          <path d="M30 18 L40 28 L50 12 L60 28 L70 18 L66 32 H34Z" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="2" />
        </g>
      );
    case 'blackjack':
      return (
        <g>
          {[['ace_of_spades', 36, -12], ['king_of_hearts', 64, 12]].map(([f, x, r]) => (
            <g key={f as string} transform={`translate(${x} 54) rotate(${r})`} >
              <image href={`${BASE}cards/french/${f}.svg`} x="-20" y="-29" width="40" height="58" preserveAspectRatio="xMidYMid meet" />
            </g>
          ))}
          <circle cx="50" cy="14" r="11" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="2" />
          <text x="50" y="14" textAnchor="middle" dominantBaseline="central" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize="11" fill="#2a1a02">21</text>
        </g>
      );
    case 'poker':
      return (
        <g>
          {[['ace_of_spades', -24], ['king_of_hearts', -12], ['queen_of_clubs', 0], ['jack_of_diamonds', 12], ['10_of_spades', 24]].map(([f, r]) => (
            <g key={f as string} transform={`translate(${50 + (r as number) * 1.15} ${56 - Math.abs(r as number) * 0.25}) rotate(${r})`} >
              <image href={`${BASE}cards/french/${f}.svg`} x="-15" y="-22" width="30" height="44" preserveAspectRatio="xMidYMid meet" />
            </g>
          ))}
          <circle cx="82" cy="84" r="12" fill="#7f1d1d" stroke="#fde68a" strokeWidth="2.5" strokeDasharray="4 3" />
        </g>
      );
    case 'domino': case 'mentiroso': case 'ruleta':
      return <TableEmblemBody id={id} />;
    case 'sieteymedia':
      return (<g><circle cx="50" cy="50" r="40" fill="url(#st-coin)" stroke="#6b4306" strokeWidth="3" /><circle cx="50" cy="50" r="32" fill="none" stroke="#6b4306" strokeWidth="1.5" strokeDasharray="2 3" /><text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontFamily="Cinzel, Georgia, serif" fontWeight="900" fontSize="30" fill="#3b2410">7½</text></g>);
    case 'klondike':
      return (<g>{[0, 1, 2, 3].map((i) => <g key={i}>{Array.from({ length: i + 1 }, (_, j) => <Card key={j} x={18 + i * 21} y={22 + j * 9} w={19} h={26} />)}</g>)}<text x="82" y="86" textAnchor="middle" fontSize="20" fill="#0f1218">♠</text></g>);
    default:
      return <circle cx="50" cy="50" r="30" fill="url(#st-gold)" />;
  }
}

export function GameEmblem({ id, size = 84 }: { id: string; size?: number }) {
  return (
    <svg shapeRendering="geometricPrecision" viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ display: 'block' }}>
      <SvgDefs />
      <Body id={id} />
    </svg>
  );
}
