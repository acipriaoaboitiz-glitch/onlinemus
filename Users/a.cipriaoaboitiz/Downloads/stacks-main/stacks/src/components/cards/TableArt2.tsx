import { PieceShapes } from '../../games/ajedrez/Pieces.tsx';
import { Face } from '../../games/mahjong/Faces.tsx';

/** Portadas vectoriales de los 8 clásicos nuevos (cuadro 150×150, nítidas a cualquier tamaño). */
export const ART2 = new Set(['parchis', 'ajedrez', 'damas', 'solitario', 'mahjong', 'game2048', 'sudoku', 'buscaminas']);
const BASE = import.meta.env.BASE_URL;

function Defs2() {
  return (
    <defs>
      <linearGradient id="t2-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF0B0" /><stop offset=".5" stopColor="#D4AF37" /><stop offset="1" stopColor="#8a6410" /></linearGradient>
      <linearGradient id="t2-ivory" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFEF4" /><stop offset="1" stopColor="#D9CBA3" /></linearGradient>
      <linearGradient id="t2-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a3a22" /><stop offset="1" stopColor="#2b1a0d" /></linearGradient>
      <linearGradient id="t2-walnut" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6a4528" /><stop offset="1" stopColor="#3f2714" /></linearGradient>
      <linearGradient id="t2-marble" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#26302d" /><stop offset="1" stopColor="#0c1210" /></linearGradient>
      <linearGradient id="t2-em" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1f6a52" /><stop offset="1" stopColor="#082a1f" /></linearGradient>
      <radialGradient id="t2-dg" cx=".34" cy=".28" r=".8"><stop offset="0" stopColor="#FFF6C4" /><stop offset=".5" stopColor="#D4AF37" /><stop offset="1" stopColor="#8a6410" /></radialGradient>
      <radialGradient id="t2-di" cx=".34" cy=".28" r=".8"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#E3D6B0" /><stop offset="1" stopColor="#9c8d62" /></radialGradient>
      <radialGradient id="t2-r" cx=".34" cy=".28" r=".8"><stop offset="0" stopColor="#FF8A9A" /><stop offset=".55" stopColor="#C3162C" /><stop offset="1" stopColor="#5c0a14" /></radialGradient>
      <radialGradient id="t2-b" cx=".34" cy=".28" r=".8"><stop offset="0" stopColor="#8DB4FF" /><stop offset=".55" stopColor="#1D4FBF" /><stop offset="1" stopColor="#0b2260" /></radialGradient>
      <radialGradient id="t2-g" cx=".34" cy=".28" r=".8"><stop offset="0" stopColor="#7ff0c0" /><stop offset=".55" stopColor="#0a8a5c" /><stop offset="1" stopColor="#04382a" /></radialGradient>
      <radialGradient id="t2-y" cx=".34" cy=".28" r=".8"><stop offset="0" stopColor="#FFE08A" /><stop offset=".55" stopColor="#E0A21A" /><stop offset="1" stopColor="#6b4a05" /></radialGradient>
    </defs>
  );
}

const Shadow = () => <ellipse cx="75" cy="136" rx="56" ry="7" fill="rgba(0,0,0,.5)" />;

function Tile2048({ x, y, v, fill, fg }: { x: number; y: number; v: string; fill: string; fg: string }) {
  return (
    <g>
      <rect x={x} y={y} width="30" height="30" rx="6" fill={fill} stroke="#fff" strokeOpacity=".25" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="26" height="9" rx="4" fill="#fff" opacity=".22" />
      <text x={x + 15} y={y + 20.5} textAnchor="middle" fontSize={v.length > 3 ? 11 : v.length > 2 ? 13 : 16} fontWeight="800" fill={fg} fontFamily="Outfit, system-ui, sans-serif">{v}</text>
    </g>
  );
}

export function Body2({ id }: { id: string }) {
  switch (id) {
    case 'parchis': {
      const cells: [number, number][] = [];
      for (let i = 0; i < 6; i++) { cells.push([60 + (i % 3) * 10, 26 + Math.floor(i / 3) * 10]); }
      return (
        <g>
          <Shadow />
          <rect x="14" y="16" width="122" height="116" rx="14" fill="url(#t2-wood)" stroke="url(#t2-gold)" strokeWidth="2" />
          {[[22, 24, 't2-r'], [92, 24, 't2-b'], [22, 82, 't2-g'], [92, 82, 't2-y']].map(([x, y, f]) => <rect key={String(f)} x={Number(x)} y={Number(y)} width="36" height="42" rx="8" fill={`url(#${f})`} opacity=".92" />)}
          <rect x="58" y="22" width="34" height="104" rx="4" fill="url(#t2-ivory)" />
          <rect x="20" y="58" width="110" height="34" rx="4" fill="url(#t2-ivory)" />
          {[0, 1, 2, 3].map((i) => <line key={i} x1="58" x2="92" y1={30 + i * 22} y2={30 + i * 22} stroke="#8a7a55" strokeOpacity=".5" />)}
          <polygon points="58,58 92,58 75,75" fill="#C3162C" /><polygon points="58,92 92,92 75,75" fill="#0a8a5c" /><polygon points="58,58 58,92 75,75" fill="#1D4FBF" /><polygon points="92,58 92,92 75,75" fill="#E0A21A" />
          <circle cx="40" cy="45" r="7" fill="url(#t2-r)" /><circle cx="110" cy="45" r="7" fill="url(#t2-b)" /><circle cx="40" cy="103" r="7" fill="url(#t2-g)" /><circle cx="110" cy="103" r="7" fill="url(#t2-y)" />
          <polygon points="75,32 77,37 82,37 78,40 79.5,45 75,42 70.5,45 72,40 68,37 73,37" fill="url(#t2-gold)" />
          {cells.length ? null : null}
        </g>
      );
    }
    case 'ajedrez':
      return (
        <g>
          <Shadow />
          <rect x="14" y="40" width="122" height="92" rx="10" fill="url(#t2-wood)" stroke="url(#t2-gold)" strokeWidth="1.6" />
          {Array.from({ length: 24 }, (_, i) => { const c = i % 8; const r = Math.floor(i / 8); return <rect key={i} x={20 + c * 13.7} y={46 + r * 13.7} width="13.7" height="13.7" fill={(r + c) % 2 ? 'url(#t2-walnut)' : 'url(#t2-ivory)'} />; })}
          <g transform="translate(14 8) scale(1.6)"><PieceShapes kind="k" side={0} /></g>
          <g transform="translate(66 22) scale(1.35)"><PieceShapes kind="n" side={1} /></g>
          <g transform="translate(28 70) scale(1.0)"><PieceShapes kind="p" side={0} /></g>
        </g>
      );
    case 'damas':
      return (
        <g>
          <Shadow />
          <rect x="14" y="18" width="122" height="116" rx="12" fill="url(#t2-wood)" stroke="url(#t2-gold)" strokeWidth="1.6" />
          {Array.from({ length: 36 }, (_, i) => { const c = i % 6; const r = Math.floor(i / 6); return <rect key={i} x={21 + c * 18} y={25 + r * 17.5} width="18" height="17.5" fill={(r + c) % 2 ? 'url(#t2-marble)' : '#c9a26b'} />; })}
          {[[3, 1, 'g'], [5, 1, 'g'], [4, 2, 'i'], [2, 3, 'g'], [4, 4, 'i'], [1, 5, 'i']].map(([c, r, k]) => (
            <g key={`${c}${r}`}><circle cx={21 + Number(c) * 18 + 9} cy={25 + Number(r) * 17.5 + 9} r="7.2" fill={k === 'g' ? 'url(#t2-dg)' : 'url(#t2-di)'} stroke="#000" strokeOpacity=".35" /><circle cx={21 + Number(c) * 18 + 9} cy={25 + Number(r) * 17.5 + 9} r="4.4" fill="none" stroke="#000" strokeOpacity=".22" /></g>
          ))}
          <path d="M92 56l-3 8h12l-3-8-3 4z" fill="#4a3204" opacity=".85" />
        </g>
      );
    case 'solitario':
      return (
        <g>
          <Shadow />
          {[['king_of_spades', 34, 40, -14], ['queen_of_hearts', 62, 30, -4], ['jack_of_clubs', 90, 32, 8], ['ace_of_diamonds', 112, 44, 18]].map(([f, x, y, r]) => (
            <g key={String(f)} transform={`translate(${x} ${y}) rotate(${r} 20 50)`} style={{ filter: 'drop-shadow(0 5px 4px rgba(0,0,0,.5))' }}>
              <rect x="-1" y="-1" width="42" height="62" rx="3" fill="#fdfbf7" />
              <image href={`${BASE}cards/french/${f}.svg`} x="0" y="0" width="40" height="60" preserveAspectRatio="xMidYMid meet" />
            </g>
          ))}
        </g>
      );
    case 'mahjong':
      return (
        <g>
          <Shadow />
          {[[26, 70, 3], [58, 70, 7], [90, 70, 12], [42, 42, 17], [74, 42, 20]].map(([x, y, tp], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <rect x="4" y="4" width="34" height="46" rx="5" fill="#b3a173" />
              <rect x="0" y="0" width="34" height="46" rx="5" fill="url(#t2-ivory)" stroke="#a8975f" strokeWidth=".8" />
              <g transform="translate(3 3) scale(.47)"><Face type={Number(tp)} /></g>
            </g>
          ))}
        </g>
      );
    case 'game2048':
      return (
        <g>
          <Shadow />
          <rect x="14" y="18" width="122" height="116" rx="14" fill="#08110E" stroke="url(#t2-gold)" strokeWidth="1.6" />
          <Tile2048 x={22} y={26} v="2" fill="url(#t2-ivory)" fg="#4a3d1a" /><Tile2048 x={60} y={26} v="16" fill="#C98749" fg="#2d1503" /><Tile2048 x={98} y={26} v="64" fill="#1f9b72" fg="#eafff6" />
          <Tile2048 x={22} y={64} v="256" fill="#2f6fe0" fg="#eef5ff" /><Tile2048 x={60} y={64} v="1024" fill="#d6203f" fg="#fff0f3" /><Tile2048 x={98} y={64} v="2048" fill="url(#t2-gold)" fg="#3a2603" />
          <Tile2048 x={22} y={102} v="4" fill="url(#t2-ivory)" fg="#4a3d1a" /><Tile2048 x={60} y={102} v="8" fill="#C98749" fg="#2d1503" />
        </g>
      );
    case 'sudoku': {
      const digits = ['5', '', '', '7', '', '', '3', '', '9', '', '2', '', '', '8', '', '', '4', '', '6', '', '', '1', '', '', '', '', '2', ''];
      return (
        <g>
          <Shadow />
          <rect x="18" y="20" width="114" height="114" rx="10" fill="#08110E" stroke="url(#t2-gold)" strokeWidth="1.6" />
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <g key={i}><line x1={22 + i * 12.2} y1="24" x2={22 + i * 12.2} y2="130" stroke={i % 3 === 0 ? '#D4AF37' : '#fff'} strokeOpacity={i % 3 === 0 ? 0.9 : 0.14} strokeWidth={i % 3 === 0 ? 1.6 : 0.6} /><line x1="22" y1={24 + i * 11.7} x2="128" y2={24 + i * 11.7} stroke={i % 3 === 0 ? '#D4AF37' : '#fff'} strokeOpacity={i % 3 === 0 ? 0.9 : 0.14} strokeWidth={i % 3 === 0 ? 1.6 : 0.6} /></g>)}
          {digits.map((d, i) => d && <text key={i} x={22 + (i % 9) * 12.2 + 6} y={24 + Math.floor(i / 9) * 11.7 + 9} textAnchor="middle" fontSize="10" fontWeight="700" fill={i % 4 === 0 ? '#F0C35F' : '#F8FAF9'} fontFamily="Outfit, system-ui, sans-serif">{d}</text>)}
          {[[34, 58, '4'], [83, 92, '6'], [47, 105, '9']].map(([x, y, d]) => <text key={String(x)} x={Number(x)} y={Number(y)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#F0C35F" fontFamily="Outfit, system-ui, sans-serif">{d}</text>)}
        </g>
      );
    }
    default: // buscaminas
      return (
        <g>
          <Shadow />
          <rect x="16" y="18" width="118" height="116" rx="12" fill="#041410" stroke="url(#t2-gold)" strokeWidth="1.6" />
          {Array.from({ length: 25 }, (_, i) => {
            const c = i % 5; const r = Math.floor(i / 5); const x = 22 + c * 21.2; const y = 24 + r * 21;
            const open = (r === 1 && c > 0 && c < 4) || (r === 2 && c < 3) || (r === 3 && c === 0);
            return <rect key={i} x={x} y={y} width="19.5" height="19" rx="4" fill={open ? '#0a1511' : 'url(#t2-em)'} stroke={open ? '#000' : '#7fe8c0'} strokeOpacity={open ? 0.5 : 0.25} />;
          })}
          {[[1, 1, '1', '#5aa8ff'], [2, 1, '2', '#3fe0a8'], [3, 1, '1', '#5aa8ff'], [1, 2, '3', '#ff7a7a']].map(([c, r, d, col]) => <text key={`${c}${r}`} x={22 + Number(c) * 21.2 + 9.7} y={24 + Number(r) * 21 + 14} textAnchor="middle" fontSize="13" fontWeight="800" fill={String(col)} fontFamily="Outfit, system-ui, sans-serif">{d}</text>)}
          <path d="M101 84v18M101 84l12 5-12 5" fill="#FCE38A" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" />
          <g transform="translate(36 108)"><circle r="7" fill="#1b1b1b" stroke="#FCE38A" strokeWidth="1.4" /><path d="M-10 0h20M0 -10v20M-7 -7l14 14M7 -7l-14 14" stroke="#FCE38A" strokeWidth="1.6" strokeLinecap="round" /><circle r="7" fill="#1b1b1b" /><circle cx="-2" cy="-2" r="2" fill="#fff" opacity=".6" /></g>
        </g>
      );
  }
}

export function TableArt2Defs() { return <Defs2 />; }
