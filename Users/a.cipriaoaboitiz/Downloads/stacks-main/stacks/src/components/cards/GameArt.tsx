import type { CSSProperties } from 'react';
import { UnoFace } from '../../games/uno/UnoCard.tsx';
import type { UnoCard } from '../../games/uno/engine.ts';
import { Chip } from './Chip.tsx';
import { TABLE_GAMES, TableArt } from './TableArt.tsx';

const BASE = import.meta.env.BASE_URL;
interface Piece { src?: string; uno?: UnoCard; x: number; y: number; r: number }

const es = (n: string): string => `${BASE}cards/${n}.webp`;
const fr = (n: string): string => `${BASE}cards/french/${n}.svg`;
const U = (color: UnoCard['color'], kind: UnoCard['kind'], n = 0): UnoCard => ({ id: `${color}${kind}${n}`, color, kind, n });

const ART: Record<string, { cards: Piece[]; chips?: { v: 1 | 5 | 25 | 100 | 500; x: number; y: number }[] }> = {
  mus: { cards: [{ src: es('12-oros'), x: -66, y: 14, r: -22 }, { src: es('12-copas'), x: -22, y: 0, r: -7 }, { src: es('12-espadas'), x: 22, y: 0, r: 8 }, { src: es('12-bastos'), x: 66, y: 14, r: 23 }] },
  brisca: { cards: [{ src: es('03-espadas'), x: -44, y: 8, r: -14 }, { src: es('01-espadas'), x: 0, y: -4, r: 0 }, { src: es('12-espadas'), x: 44, y: 8, r: 14 }] },
  escoba: { cards: [{ src: es('07-oros'), x: -50, y: 10, r: -16 }, { src: es('05-copas'), x: 0, y: -4, r: 0 }, { src: es('03-bastos'), x: 50, y: 10, r: 16 }] },
  chinchon: { cards: [3, 4, 5, 6, 7].map((n, i) => ({ src: es(`0${n}-copas`), x: -72 + i * 36, y: 14 - Math.abs(i - 2) * 6, r: -24 + i * 12 })) },
  tute: { cards: [{ src: es('12-bastos'), x: -40, y: 8, r: -12 }, { src: es('11-bastos'), x: 0, y: -2, r: 0 }, { src: es('01-oros'), x: 40, y: 8, r: 12 }] },
  blackjack: { cards: [{ src: fr('ace_of_spades'), x: -34, y: 4, r: -10 }, { src: fr('king_of_hearts'), x: 34, y: 0, r: 10 }], chips: [{ v: 100, x: -64, y: 66 }, { v: 25, x: -38, y: 76 }, { v: 500, x: 64, y: 70 }] },
  poker: { cards: [{ src: fr('ace_of_spades'), x: -68, y: 14, r: -20 }, { src: fr('ace_of_hearts'), x: -34, y: 2, r: -9 }, { src: fr('king_of_spades'), x: 0, y: -4, r: 0 }, { src: fr('queen_of_spades'), x: 34, y: 2, r: 9 }, { src: fr('jack_of_spades'), x: 68, y: 14, r: 20 }], chips: [{ v: 500, x: 0, y: 78 }] },
  presidente: { cards: [{ src: es('02-oros'), x: -60, y: 14, r: -20 }, { src: es('12-copas'), x: -20, y: 2, r: -7 }, { src: es('01-espadas'), x: 20, y: 2, r: 8 }, { src: es('02-bastos'), x: 60, y: 14, r: 22 }] },
  seises: { cards: [{ src: es('05-oros'), x: -50, y: 12, r: -14 }, { src: es('06-oros'), x: 0, y: -4, r: 0 }, { src: es('07-oros'), x: 50, y: 12, r: 14 }] },
  uno: { cards: [{ uno: U('red', 'num', 7), x: -58, y: 12, r: -20 }, { uno: U('blue', 'draw2'), x: -20, y: 0, r: -6 }, { uno: U('wild', 'wild4'), x: 20, y: 0, r: 8 }, { uno: U('green', 'reverse'), x: 58, y: 12, r: 22 }] },
};

/** Ilustración realista de cada juego: naipes reales con brillo y sombra de contacto, y fichas de casino. */
export function GameArt({ id, size = 150 }: { id: string; size?: number }) {
  if (TABLE_GAMES.has(id)) return <TableArt id={id} size={size} />;
  const art = ART[id] ?? ART.mus!;
  const k = size / 150;
  const french = id === 'blackjack' || id === 'poker';
  const w = (french ? 62 : 56) * k;
  const h = w * (french ? 1.452 : 1.583);
  const card = (p: Piece, i: number) => {
    const style: CSSProperties = {
      position: 'absolute', left: '50%', top: '42%', width: w, height: p.uno ? w * 1.5 : h, marginLeft: -w / 2, marginTop: -h / 2,
      transform: `translate(${p.x * k * 0.8}px, ${p.y * k}px) rotate(${p.r}deg)`, transformOrigin: '50% 120%', borderRadius: 0, overflow: 'hidden', background: '#fdfbf7',
      boxShadow: `0 ${10 * k}px ${16 * k}px rgba(0,0,0,.55), 0 ${2 * k}px ${3 * k}px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.25)`, zIndex: i,
    };
    return (
      <div key={i} style={style}>
        {p.uno ? <UnoFace card={p.uno} /> : <img src={p.src} alt="" draggable={false} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} />}
        <span aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, rgba(255,255,255,.38) 0%, rgba(255,255,255,0) 38%, rgba(0,0,0,.18) 100%)' }} />
      </div>
    );
  };
  return (
    <div style={{ position: 'relative', width: size, height: size }} aria-hidden>
      <div style={{ position: 'absolute', left: '50%', bottom: size * 0.04, width: size * 0.82, height: size * 0.12, marginLeft: -size * 0.41, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,.6), transparent 70%)' }} />
      {art.cards.map(card)}
      {art.chips?.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: '50%', top: '42%', transform: `translate(${c.x * k * 0.8 - 18 * k}px, ${c.y * k - 18 * k}px)`, zIndex: 20 + i, borderRadius: '50%', boxShadow: '0 4px 6px rgba(0,0,0,.55)' }}>
          <Chip value={c.v} size={36 * k} />
        </div>
      ))}
    </div>
  );
}
