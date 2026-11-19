import { memo } from 'react';

/** Rejilla de puntos en una cara de 100×100. */
const G = { tl: [27, 27], tr: [73, 27], ml: [27, 50], mr: [73, 50], c: [50, 50], bl: [27, 73], br: [73, 73] } as const;
const PIPS: Record<number, (keyof typeof G)[]> = {
  1: ['c'], 2: ['tl', 'br'], 3: ['tl', 'c', 'br'], 4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'c', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
};

function Pips({ face }: { face: number }) {
  return (
    <>
      {PIPS[face]?.map((k) => (
        <g key={k}>
          <circle cx={G[k][0] + 1.2} cy={G[k][1] + 1.8} r="11.5" fill="#fff" opacity=".55" />
          <circle cx={G[k][0]} cy={G[k][1]} r="10.4" fill={face === 1 ? 'url(#iso-pip-red)' : 'url(#iso-pip)'} />
        </g>
      ))}
    </>
  );
}

/** Degradados del dado isométrico (se declaran una vez en cada <svg shapeRendering="geometricPrecision"> que lo use). */
export function IsoDefs() {
  return (
    <defs>
      <linearGradient id="iso-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFFEF6" /><stop offset="1" stopColor="#F2E8C6" /></linearGradient>
      <linearGradient id="iso-left" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E7DBB0" /><stop offset="1" stopColor="#CDBE8C" /></linearGradient>
      <linearGradient id="iso-right" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C2B27E" /><stop offset="1" stopColor="#9C8A55" /></linearGradient>
      <radialGradient id="iso-pip" cx=".38" cy=".34" r=".8"><stop offset="0" stopColor="#3a342a" /><stop offset=".6" stopColor="#0f0c07" /><stop offset="1" stopColor="#000" /></radialGradient>
      <radialGradient id="iso-pip-red" cx=".38" cy=".34" r=".8"><stop offset="0" stopColor="#c43a3a" /><stop offset=".6" stopColor="#7a1414" /><stop offset="1" stopColor="#3d0707" /></radialGradient>
    </defs>
  );
}

/**
 * Dado isométrico 3D de marfil con aristas doradas: cara superior (el valor), frontal-izquierda y lateral derecha en tonos distintos.
 * Ocupa un cuadro 100×100 (necesita <IsoDefs /> en el mismo <svg shapeRendering="geometricPrecision">).
 */
export function IsoDie({ face }: { face: number }) {
  const left = (face % 6) + 1;
  const right = ((face + 1) % 6) + 1;
  return (
    <g strokeLinejoin="round">
      <ellipse cx="50" cy="95" rx="34" ry="4.5" fill="#000" opacity=".35" />
      {/* caras */}
      <path d="M8 28 L50 50 L50 94 L8 72 Z" fill="url(#iso-left)" />
      <path d="M92 28 L50 50 L50 94 L92 72 Z" fill="url(#iso-right)" />
      <path d="M50 6 L92 28 L50 50 L8 28 Z" fill="url(#iso-top)" />
      {/* puntos proyectados sobre cada cara */}
      <g transform="matrix(.42 .22 -.42 .22 50 6)"><Pips face={face} /></g>
      <g transform="matrix(.42 .22 0 .44 8 28)"><Pips face={left} /></g>
      <g transform="matrix(.42 -.22 0 .44 50 50)"><Pips face={right} /></g>
      {/* aristas */}
      <path d="M50 6 L92 28 L92 72 L50 94 L8 72 L8 28 Z" fill="none" stroke="#B8860B" strokeWidth="2.2" />
      <path d="M8 28 L50 50 L92 28 M50 50 L50 94" fill="none" stroke="#D4AF37" strokeWidth="1.4" opacity=".9" />
      <path d="M50 8.5 L88 28.4" stroke="#fff" strokeWidth="1.6" opacity=".7" strokeLinecap="round" />
    </g>
  );
}

interface DieProps {
  face: number;
  /** Lado como longitud CSS. */
  size: string;
  /** Resalta el dado (coincide con la apuesta durante el recuento). */
  hit?: boolean;
  dim?: boolean;
  className?: string;
}

/** Dado de marfil isométrico (vectorial). */
export const Die = memo(function Die({ face, size, hit, dim, className = '' }: DieProps) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`} style={{ width: size, height: size, opacity: dim ? 0.4 : 1, transition: 'opacity .2s' }}>
      <svg viewBox="0 0 100 100" aria-hidden="true" shapeRendering="geometricPrecision" style={{ display: 'block', width: '100%', height: '100%', filter: hit ? 'drop-shadow(0 0 7px rgba(252,227,138,.95))' : undefined }}>
        <IsoDefs />
        <IsoDie face={face} />
      </svg>
    </span>
  );
});

/** Contenido del cubilete (defs + trazos) para incrustarlo en otros <svg shapeRendering="geometricPrecision"> de viewBox 80×66. */
export const CupGroup = memo(function CupGroup() {
  return (
    <>
      <defs>
        <linearGradient id="cup-body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#0a0706" /><stop offset=".3" stopColor="#2c211a" /><stop offset=".55" stopColor="#17100c" /><stop offset="1" stopColor="#060403" /></linearGradient>
        <linearGradient id="cup-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8B6914" /><stop offset=".35" stopColor="#FCE38A" /><stop offset=".7" stopColor="#D4AF37" /><stop offset="1" stopColor="#7a5a10" /></linearGradient>
        <linearGradient id="cup-top" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b2d22" /><stop offset="1" stopColor="#120c08" /></linearGradient>
      </defs>
      <path d="M13 5 Q40 1 67 5 L77 55 Q40 62 3 55 Z" fill="url(#cup-body)" stroke="#D4AF37" strokeWidth=".8" strokeOpacity=".5" />
      {/* base (el fondo del cubilete, visible arriba) */}
      <ellipse cx="40" cy="5" rx="27" ry="3.4" fill="url(#cup-top)" stroke="url(#cup-gold)" strokeWidth="1" />
      {/* costura vertical y costura bajo el aro */}
      <path d="M40 8 L40 50" stroke="#D4AF37" strokeOpacity=".5" strokeWidth=".9" strokeDasharray="2.2 1.8" strokeLinecap="round" />
      <path d="M6.5 48 Q40 54.4 73.5 48" fill="none" stroke="#D4AF37" strokeOpacity=".55" strokeWidth=".9" strokeDasharray="2.2 1.8" strokeLinecap="round" />
      {/* aro dorado en la boca */}
      <path d="M3 55 Q40 63 77 55 L78 60.5 Q40 68.5 2 60.5 Z" fill="url(#cup-gold)" />
      <path d="M3.4 56.4 Q40 64.2 76.6 56.4" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth=".7" />
      {/* brillo del cuero */}
      <path d="M24 12 Q17 30 15 48" stroke="#fff" strokeOpacity=".13" strokeWidth="3.4" strokeLinecap="round" fill="none" />
    </>
  );
});

/** Cubilete de cuero oscuro boca abajo, con costuras doradas y aro de oro en la boca. Ocupa su caja entera. */
export const Cup = memo(function Cup({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 66" aria-hidden="true" shapeRendering="geometricPrecision" className={className} style={{ display: 'block', width: '100%', height: '100%', filter: 'drop-shadow(0 5px 5px rgba(0,0,0,.55))' }}>
      <CupGroup />
    </svg>
  );
});
