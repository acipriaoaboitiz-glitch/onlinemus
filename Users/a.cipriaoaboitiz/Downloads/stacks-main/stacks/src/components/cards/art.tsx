import type { SpanishSuit } from '../../engine/deck.ts';

/** Piezas gráficas compartidas por las barajas: degradados, palos españoles y bustos de figuras. */
export const W = 480;
export const H = 760;
export const IVORY = '#FAF6EE';
export const BURGUNDY = '#7a1f2b';
export const GOLD = '#b8861b';

/** Degradados reutilizables (ids `st-*`). Se incluyen una vez dentro de cada <svg shapeRendering="geometricPrecision">. */
export function SvgDefs() {
  return (
    <defs>
      <linearGradient id="st-paper" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fffdf8" /><stop offset=".55" stopColor={IVORY} /><stop offset="1" stopColor="#eadfc6" />
      </linearGradient>
      <linearGradient id="st-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fef08a" /><stop offset=".45" stopColor="#eab308" /><stop offset="1" stopColor="#a16207" />
      </linearGradient>
      <linearGradient id="st-steel" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#4a6a93" /><stop offset=".45" stopColor="#eaf2fb" /><stop offset=".55" stopColor="#9db8d6" /><stop offset="1" stopColor="#2f4a70" />
      </linearGradient>
      <linearGradient id="st-wood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5a3a1a" /><stop offset=".4" stopColor="#b9814a" /><stop offset="1" stopColor="#4a2e14" />
      </linearGradient>
      <linearGradient id="st-red" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ef4444" /><stop offset="1" stopColor="#8f1414" />
      </linearGradient>
      <linearGradient id="st-ink" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3b4252" /><stop offset="1" stopColor="#0b0d12" />
      </linearGradient>
      <radialGradient id="st-coin" cx=".38" cy=".32" r=".8">
        <stop offset="0" stopColor="#fff3b0" /><stop offset=".5" stopColor="#e0a912" /><stop offset="1" stopColor="#8a5a05" />
      </radialGradient>
      <radialGradient id="st-gloss" cx=".3" cy=".25" r=".6">
        <stop offset="0" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

/** Marco doble: filete burdeos exterior + filete dorado interior. */
export function Frame({ accent = BURGUNDY }: { accent?: string }) {
  return (
    <>
      <rect width={W} height={H} rx="34" fill="url(#st-paper)" />
      <rect x="10" y="10" width={W - 20} height={H - 20} rx="26" fill="none" stroke={accent} strokeWidth="3" opacity=".85" />
      <rect x="20" y="20" width={W - 40} height={H - 40} rx="19" fill="none" stroke="url(#st-gold)" strokeWidth="2.5" />
    </>
  );
}

export const SPANISH_COLOR: Record<SpanishSuit, string> = {
  oros: '#9a6a05', copas: '#9b1c2e', espadas: '#1d3b66', bastos: '#2f6b35',
};

/** Emblema de cada palo español, centrado en (0,0), caja ~100×100. */
function SuitBody({ suit }: { suit: SpanishSuit }) {
  switch (suit) {
    case 'oros':
      return (
        <g>
          <circle r="47" fill="url(#st-coin)" stroke="#6b4306" strokeWidth="3" />
          <circle r="39" fill="none" stroke="#6b4306" strokeWidth="1.6" strokeDasharray="2 3.2" />
          <circle r="31" fill="none" stroke="#fff3b0" strokeWidth="1.5" opacity=".8" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M0 -30 L4 -20 L0 -16 L-4 -20Z" fill="#6b4306" opacity=".75" transform={`rotate(${i * 30})`} />
          ))}
          <circle r="13" fill="#fde68a" stroke="#6b4306" strokeWidth="2" />
          <circle r="5" fill="#a16207" />
          <ellipse cx="-16" cy="-22" rx="18" ry="9" fill="url(#st-gloss)" transform="rotate(-30)" />
        </g>
      );
    case 'copas':
      return (
        <g>
          <path d="M-36 -42 H36 C36 -4 18 12 6 16 L6 30 C22 32 24 38 24 44 H-24 C-24 38 -22 32 -6 30 L-6 16 C-18 12 -36 -4 -36 -42Z"
            fill="url(#st-gold)" stroke="#6b4306" strokeWidth="3" strokeLinejoin="round" />
          <path d="M-30 -36 H30 C30 -8 16 6 0 10 C-16 6 -30 -8 -30 -36Z" fill="#9b1c2e" opacity=".92" />
          <path d="M-36 -40 C-52 -38 -52 -14 -34 -10 M36 -40 C52 -38 52 -14 34 -10" fill="none" stroke="#b8861b" strokeWidth="4" strokeLinecap="round" />
          <path d="M-24 -34 C-24 -16 -14 -4 -6 2" fill="none" stroke="#fff" strokeWidth="4" opacity=".4" strokeLinecap="round" />
          <ellipse cx="0" cy="23" rx="9" ry="4" fill="#fde68a" stroke="#6b4306" strokeWidth="2" />
          {[-20, -7, 7, 20].map((x) => <circle key={x} cx={x} cy={-24} r="2.4" fill="#fde68a" stroke="#6b4306" strokeWidth=".8" />)}
          <path d="M-10 -50 L0 -58 L10 -50" fill="none" stroke="url(#st-gold)" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'espadas': {
      const sword = (
        <g>
          <path d="M0 -52 L9 -38 L9 12 L-9 12 L-9 -38Z" fill="url(#st-steel)" stroke="#1f3350" strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M0 -46 V10" stroke="#2f4a70" strokeWidth="1.6" />
          <path d="M-24 12 C-24 19 -14 19 -10 16 H10 C14 19 24 19 24 12 L18 9 H-18Z" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="2.2" strokeLinejoin="round" />
          <rect x="-4.5" y="16" width="9" height="20" rx="3" fill="#7a1f2b" stroke="#3b0d14" strokeWidth="1.8" />
          <circle cy="40" r="6" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="2.2" />
        </g>
      );
      return (<g><g transform="rotate(-30) scale(.9)">{sword}</g><g transform="rotate(30) scale(.9)">{sword}</g></g>);
    }
    case 'bastos':
      return (
        <g transform="rotate(28)">
          <path d="M-9 -48 C-24 -48 -26 -28 -18 -14 C-14 -4 -9 6 -9 18 L-12 46 C-6 50 6 50 12 46 L9 18 C9 6 14 -4 18 -14 C26 -28 24 -48 9 -48 C4 -52 -4 -52 -9 -48Z"
            fill="url(#st-wood)" stroke="#2b1708" strokeWidth="3" strokeLinejoin="round" />
          <path d="M-14 -34 C-16 -20 -10 -8 -6 8 M0 -42 C2 -24 2 -6 0 14 M12 -34 C14 -20 10 -8 6 8" stroke="#2b1708" strokeWidth="1.4" fill="none" opacity=".55" />
          <ellipse cx="-7" cy="-26" rx="4" ry="6" fill="#3b2410" opacity=".8" />
          <ellipse cx="6" cy="2" rx="3" ry="4.5" fill="#3b2410" opacity=".8" />
          <path d="M-15 -36 C-17 -22 -10 -8 -6 8" stroke="#e8c08a" strokeWidth="3" fill="none" opacity=".5" strokeLinecap="round" />
          <path d="M-8 -2 C-30 -8 -34 -28 -22 -34 C-16 -22 -12 -12 -8 -2Z" fill="#3f8f3f" stroke="#1d4d1d" strokeWidth="2" />
          <path d="M8 -6 C30 -12 34 -32 22 -38 C16 -26 12 -16 8 -6Z" fill="#3f8f3f" stroke="#1d4d1d" strokeWidth="2" />
          <path d="M-8 -2 L-22 -30 M8 -6 L22 -34" stroke="#1d4d1d" strokeWidth="1.2" />
        </g>
      );
  }
}

export function SuitMark({ suit, x, y, size, flip = false }: { suit: SpanishSuit; x: number; y: number; size: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size / 100}) ${flip ? 'rotate(180)' : ''}`}
     >
      <SuitBody suit={suit} />
    </g>
  );
}

export type Hat = 'crown' | 'tiara' | 'cap' | 'beret' | 'plume';

/** Busto estilizado (coordenadas locales, cabeza en el origen). Para Rey/Reina/Sota/Jota. */
export function Bust({ hat, beard = false, robe, trim = '#eab308', hair = '#3b2410', x, y, scale = 1 }: {
  hat: Hat; beard?: boolean; robe: string; trim?: string; hair?: string; x: number; y: number; scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* túnica y cuello de armiño */}
      <path d="M-84 128 C-84 60 -46 38 0 38 C46 38 84 60 84 128Z" fill={robe} stroke="#1a1a1a" strokeWidth="3" />
      <path d="M-36 40 C-20 70 20 70 36 40 L52 54 C30 92 -30 92 -52 54Z" fill="#faf6ec" stroke="#1a1a1a" strokeWidth="2.5" />
      {[-24, -8, 8, 24].map((d) => <circle key={d} cx={d} cy={66 + Math.abs(d) * 0.2} r="2.4" fill="#1a1a1a" />)}
      <path d="M-84 128 C-84 60 -46 38 0 38" fill="none" stroke={trim} strokeWidth="5" />
      <path d="M84 128 C84 60 46 38 0 38" fill="none" stroke={trim} strokeWidth="5" />
      {/* pelo, cara */}
      <path d={hat === 'tiara' ? 'M-34 -4 C-44 40 -30 70 -22 74 L22 74 C30 70 44 40 34 -4Z' : 'M-32 -6 C-38 20 -34 40 -28 44 L28 44 C34 40 38 20 32 -6Z'} fill={hair} />
      <ellipse cx="0" cy="12" rx="27" ry="32" fill="#f6d9b8" stroke="#7a4a1f" strokeWidth="2.5" />
      <circle cx="-10" cy="8" r="2.8" fill="#1a1a1a" /><circle cx="10" cy="8" r="2.8" fill="#1a1a1a" />
      <path d="M-6 26 Q0 31 6 26" fill="none" stroke="#7a1f2b" strokeWidth="2.5" strokeLinecap="round" />
      {beard && <path d="M-26 14 C-30 44 -12 56 0 56 C12 56 30 44 26 14 C22 30 10 34 0 34 C-10 34 -22 30 -26 14Z" fill={hair} opacity=".92" />}
      {beard && <path d="M-9 24 Q0 20 9 24" stroke={hair} strokeWidth="5" fill="none" strokeLinecap="round" />}
      {/* tocados */}
      {hat === 'crown' && (
        <g>
          <path d="M-34 -14 L-40 -52 L-18 -34 L0 -62 L18 -34 L40 -52 L34 -14Z" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="3" strokeLinejoin="round" />
          <rect x="-35" y="-17" width="70" height="10" rx="3" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="2.5" />
          <circle cx="0" cy="-12" r="4" fill="#9b1c2e" /><circle cx="-18" cy="-12" r="3" fill="#1d3b66" /><circle cx="18" cy="-12" r="3" fill="#1d3b66" />
          <circle cx="-40" cy="-52" r="4" fill="#fde68a" stroke="#6b4306" strokeWidth="1.5" /><circle cx="0" cy="-62" r="4.5" fill="#fde68a" stroke="#6b4306" strokeWidth="1.5" /><circle cx="40" cy="-52" r="4" fill="#fde68a" stroke="#6b4306" strokeWidth="1.5" />
        </g>
      )}
      {hat === 'tiara' && (
        <g>
          <path d="M-32 -10 C-30 -34 30 -34 32 -10 L24 -12 L16 -30 L0 -12 L-16 -30 L-24 -12Z" fill="url(#st-gold)" stroke="#6b4306" strokeWidth="3" strokeLinejoin="round" />
          <circle cx="0" cy="-22" r="5" fill="#9b1c2e" stroke="#6b4306" strokeWidth="1.5" />
        </g>
      )}
      {hat === 'cap' && (
        <g>
          <path d="M-36 -6 C-36 -40 36 -40 36 -6 C20 -14 -20 -14 -36 -6Z" fill={robe} stroke="#1a1a1a" strokeWidth="3" />
          <path d="M-36 -6 C-20 -14 20 -14 36 -6" fill="none" stroke={trim} strokeWidth="4" />
        </g>
      )}
      {hat === 'beret' && (
        <g>
          <path d="M-42 -4 C-48 -34 -10 -46 24 -38 C46 -32 46 -12 38 -4 C20 -12 -16 -12 -42 -4Z" fill={robe} stroke="#1a1a1a" strokeWidth="3" />
          <path d="M12 -38 C30 -64 50 -62 56 -44 C44 -52 32 -46 22 -34Z" fill="#faf6ec" stroke="#1a1a1a" strokeWidth="2" />
        </g>
      )}
      {hat === 'plume' && (
        <g>
          <path d="M-38 -4 C-36 -34 34 -34 38 -4 C20 -12 -20 -12 -38 -4Z" fill={robe} stroke="#1a1a1a" strokeWidth="3" />
          <path d="M10 -28 C26 -70 58 -62 62 -40 C48 -50 36 -42 24 -22Z" fill="#9b1c2e" stroke="#1a1a1a" strokeWidth="2" />
        </g>
      )}
    </g>
  );
}

/** Cabeza de caballo estilizada (Caballo español). */
export function HorseHead({ x, y, scale = 1, coat = '#8b5a2b' }: { x: number; y: number; scale?: number; coat?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-60 120 C-62 60 -46 8 -10 -34 L-6 -62 L10 -40 C46 -42 74 -8 78 28 L84 56 C86 66 70 70 62 62 L48 50 C40 56 30 58 22 54 C30 90 20 110 20 120Z"
        fill={coat} stroke="#2b1708" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M-10 -34 C-34 -10 -44 30 -42 80" fill="none" stroke="#2b1708" strokeWidth="14" strokeLinecap="round" opacity=".85" />
      <path d="M-24 -20 C-40 6 -46 36 -44 66" fill="none" stroke="#1a1a1a" strokeWidth="5" strokeDasharray="2 9" strokeLinecap="round" />
      <circle cx="40" cy="10" r="5.5" fill="#fff" stroke="#1a1a1a" strokeWidth="2" /><circle cx="42" cy="10" r="2.6" fill="#1a1a1a" />
      <circle cx="74" cy="50" r="3" fill="#1a1a1a" />
      <path d="M-4 -44 L10 -40" stroke="#2b1708" strokeWidth="4" />
      <path d="M24 -20 C42 -16 60 4 70 30" fill="none" stroke="url(#st-gold)" strokeWidth="5" strokeLinecap="round" />
    </g>
  );
}
