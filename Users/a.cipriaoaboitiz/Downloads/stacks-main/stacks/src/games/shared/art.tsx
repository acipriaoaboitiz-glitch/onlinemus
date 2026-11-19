import { memo } from 'react';

/** Piezas vectoriales propias (sin emojis ni símbolos de texto): barcos, mina naval, bandera dorada y corona grabada. */

/** Degradados compartidos de latón / acero. Se incluyen una vez en cada <svg> que los use. */
export function MetalDefs() {
  return (
    <defs>
      <linearGradient id="mt-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E8EEF2" /><stop offset=".45" stopColor="#9aa7b0" /><stop offset="1" stopColor="#4c5861" /></linearGradient>
      <linearGradient id="mt-steel-d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9c4cb" /><stop offset=".5" stopColor="#6c7a84" /><stop offset="1" stopColor="#2f3a42" /></linearGradient>
      <linearGradient id="mt-brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF0B0" /><stop offset=".5" stopColor="#D4AF37" /><stop offset="1" stopColor="#8a6410" /></linearGradient>
      <radialGradient id="mt-sphere" cx=".35" cy=".3" r=".85"><stop offset="0" stopColor="#7c8a94" /><stop offset=".45" stopColor="#2b353c" /><stop offset="1" stopColor="#0a0e11" /></radialGradient>
      <linearGradient id="mt-wreck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a2a33" /><stop offset="1" stopColor="#3a0b11" /></linearGradient>
    </defs>
  );
}

/**
 * Silueta de barco de guerra en acero con detalles de latón. Se dibuja horizontal (proa a la derecha) en un rectángulo de
 * `len * 100` × 100 con origen arriba a la izquierda; `vertical` lo gira para que ocupe `len` casillas hacia abajo.
 */
export const ShipArt = memo(function ShipArt({ len, x, y, vertical, sunk }: { len: number; x: number; y: number; vertical: boolean; sunk?: boolean }) {
  const W = len * 100;
  const hull = sunk ? 'url(#mt-wreck)' : 'url(#mt-steel)';
  const deck = sunk ? '#5a1620' : 'url(#mt-steel-d)';
  const turrets = len >= 4 ? [0.26, 0.5, 0.74] : len === 3 ? [0.3, 0.7] : [0.5];
  return (
    <g transform={vertical ? `translate(${x + 100} ${y}) rotate(90)` : `translate(${x} ${y})`} strokeLinejoin="round">
      <g transform="translate(0 -10)">
      <ellipse cx={W / 2} cy="88" rx={W / 2 - 14} ry="7" fill="#000" opacity=".4" />
      {/* casco con proa afilada y línea de flotación de latón */}
      <path d={`M10 50 H${W - 12} L${W - 44} 84 H30 Q10 84 10 66 Z`} fill={hull} stroke="#1b232a" strokeWidth="3" />
      <path d={`M16 63 H${W - 22}`} stroke={sunk ? '#ef4444' : 'url(#mt-brass)'} strokeWidth="3.4" strokeLinecap="round" opacity=".95" />
      <path d={`M18 54 H${W - 24}`} stroke="#fff" strokeOpacity=".5" strokeWidth="2.2" strokeLinecap="round" />
      {/* cubierta y puente */}
      <rect x={W * 0.34} y="30" width={Math.max(30, W * 0.2)} height="24" rx="5" fill={deck} stroke="#1b232a" strokeWidth="2.4" />
      <rect x={W * 0.34 + 6} y="35" width={Math.max(18, W * 0.2 - 12)} height="7" rx="2.5" fill={sunk ? '#2a0a0f' : '#1f2a31'} />
      {len >= 3 && <><rect x={W * 0.34 + 10} y="18" width="9" height="14" rx="2" fill={deck} stroke="#1b232a" strokeWidth="2" /><rect x={W * 0.34 + 24} y="22" width="9" height="10" rx="2" fill={deck} stroke="#1b232a" strokeWidth="2" /></>}
      {/* torretas con cañones */}
      {turrets.map((t, i) => (
        <g key={i}>
          <circle cx={W * t} cy="46" r="10.5" fill="url(#mt-brass)" stroke="#5c430b" strokeWidth="2" />
          <rect x={W * t} y="43.6" width="24" height="5" rx="2.4" fill={deck} stroke="#1b232a" strokeWidth="1.6" transform={i === 0 && len >= 3 ? `rotate(180 ${W * t} 46)` : undefined} />
        </g>
      ))}
      {/* mástil */}
      <path d={`M${W * 0.44} 30 V12`} stroke="url(#mt-brass)" strokeWidth="3.4" strokeLinecap="round" />
      <path d={`M${W * 0.44 - 8} 17 H${W * 0.44 + 8}`} stroke="url(#mt-brass)" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </g>
  );
});

/** Mina naval: esfera de acero oscuro con 8 púas de latón y remaches. Cabe en un cuadro de 100×100 centrado en (50, 50). */
export const MineArt = memo(function MineArt({ size = '100%' }: { size?: string }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size, display: 'block' }} shapeRendering="geometricPrecision" aria-hidden="true">
      <MetalDefs />
      <ellipse cx="50" cy="90" rx="26" ry="5" fill="#000" opacity=".4" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 45} 50 50)`}>
          <path d="M44 24 L50 6 L56 24 Z" fill="url(#mt-brass)" stroke="#5c430b" strokeWidth="1.6" />
          <circle cx="50" cy="6" r="3.2" fill="#FCE38A" stroke="#5c430b" strokeWidth="1" />
        </g>
      ))}
      <circle cx="50" cy="50" r="28" fill="url(#mt-sphere)" stroke="#05080a" strokeWidth="2" />
      <circle cx="50" cy="50" r="22" fill="none" stroke="#D4AF37" strokeOpacity=".55" strokeWidth="1.6" />
      <path d="M50 28v44M28 50h44" stroke="#D4AF37" strokeOpacity=".35" strokeWidth="1.2" />
      <ellipse cx="40" cy="38" rx="9" ry="5" fill="#fff" opacity=".35" transform="rotate(-28 40 38)" />
    </svg>
  );
});

/** Bandera de oro cepillado sobre un mástil de latón, con pliegue y brillo. */
export const FlagArt = memo(function FlagArt({ size = '100%' }: { size?: string }) {
  return (
    <svg viewBox="16 2 74 92" style={{ width: size, height: size, display: 'block' }} shapeRendering="geometricPrecision" aria-hidden="true">
      <MetalDefs />
      <ellipse cx="46" cy="88" rx="24" ry="5" fill="#000" opacity=".4" />
      <path d="M28 88 H64" stroke="url(#mt-brass)" strokeWidth="7" strokeLinecap="round" />
      <path d="M44 88 V12" stroke="url(#mt-brass)" strokeWidth="5.4" strokeLinecap="round" />
      <circle cx="44" cy="11" r="4.4" fill="url(#mt-brass)" stroke="#5c430b" strokeWidth="1.2" />
      <path d="M47 16 L84 28 Q78 38 84 48 L47 58 Z" fill="url(#mt-brass)" stroke="#6b4a08" strokeWidth="2.4" />
      <path d="M47 16 L84 28 Q78 38 84 48" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2.2" />
      <path d="M56 24 Q62 38 56 53" fill="none" stroke="#6b4a08" strokeOpacity=".35" strokeWidth="2.4" />
    </svg>
  );
});

/** Corona de Dama grabada en oro sobre la ficha (viewBox 100×100). */
export const CrownArt = memo(function CrownArt({ dark = '#5c430b', size = '100%' }: { dark?: string; size?: string }) {
  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size, display: 'block' }} shapeRendering="geometricPrecision" aria-hidden="true">
      <path d="M18 70 L12 34 L32 52 L50 24 L68 52 L88 34 L82 70 Z" fill="rgba(255,244,190,.5)" stroke={dark} strokeWidth="5" strokeLinejoin="round" />
      <path d="M20 78 H80" stroke={dark} strokeWidth="7" strokeLinecap="round" />
      <circle cx="12" cy="31" r="5.2" fill={dark} /><circle cx="50" cy="20" r="5.6" fill={dark} /><circle cx="88" cy="31" r="5.2" fill={dark} />
      <path d="M30 64 H70" stroke={dark} strokeOpacity=".55" strokeWidth="3" />
    </svg>
  );
});
