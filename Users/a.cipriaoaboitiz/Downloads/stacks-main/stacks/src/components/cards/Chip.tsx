import { motion } from 'framer-motion';
import { feedback } from '../../store/settings.ts';

/** Rack de apuestas: blanca 5, roja 25, verde 100, negra 500 y dorada/púrpura 1.000. */
export const CHIP_VALUES = [5, 25, 100, 500, 1000] as const;
export type ChipValue = 1 | (typeof CHIP_VALUES)[number];

const COLORS: Record<ChipValue, { base: string; ring: string; ink: string }> = {
  1: { base: '#cfd3d8', ring: '#7b818a', ink: '#23262e' },
  5: { base: '#f4f1e8', ring: '#c23a3a', ink: '#23262e' },
  25: { base: '#c62f2f', ring: '#fbd5d5', ink: '#fff' },
  100: { base: '#1f8a4c', ring: '#c6f0d6', ink: '#fff' },
  500: { base: '#17181d', ring: '#f0c35f', ink: '#f0c35f' },
  1000: { base: '#6a3fb5', ring: '#f0c35f', ink: '#fff6d8' },
};

/** Ficha de casino en SVG. `onClick` la convierte en botón táctil. */
export function Chip({
  value, size = 56, onClick, disabled, label,
}: { value: ChipValue; size?: number; onClick?: () => void; disabled?: boolean; label?: string }) {
  const c = COLORS[value];
  const svg = (
    <svg shapeRendering="geometricPrecision" width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`chip-${value}`} cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset="1" stopColor="#000" stopOpacity=".25" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="47" fill={c.base} stroke="#0008" strokeWidth="2" />
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x="45" y="2" width="10" height="14" rx="2" fill={c.ring} transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="31" fill="none" stroke={c.ring} strokeWidth="2.5" strokeDasharray="3 4" />
      <circle cx="50" cy="50" r="47" fill={`url(#chip-${value})`} />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fontFamily="JetBrains Mono, monospace"
        fontWeight="800" fontSize={value >= 1000 ? 19 : value >= 100 ? 24 : 30} fill={c.ink}>{value}</text>
    </svg>
  );
  if (!onClick) return svg;
  return (
    <motion.button
      type="button" whileTap={{ scale: 0.88, y: 2 }} onClick={() => { feedback('chip'); onClick(); }} disabled={disabled}
      aria-label={label ?? `Ficha de ${value}`}
      className="rounded-full disabled:opacity-35"
      style={{ background: 'none', border: 0, padding: 0, borderRadius: '50%', boxShadow: '0 3px 5px rgba(0,0,0,.45)' }}
    >
      {svg}
    </motion.button>
  );
}

const ALL: ChipValue[] = [1000, 500, 100, 25, 5, 1];
/** Descompone un importe en fichas (las mayores primero). */
export function chipBreakdown(amount: number, max = 60): ChipValue[] {
  const out: ChipValue[] = [];
  let rest = Math.max(0, Math.floor(amount));
  for (const v of ALL) while (rest >= v && out.length < max) { out.push(v); rest -= v; }
  return out;
}

export function ChipStack({ amount, size = 38 }: { amount: number; size?: number }) {
  return <BetStack chips={chipBreakdown(amount, 12)} size={size} />;
}

/**
 * Pila de apuesta: cada ficha entra deslizándose desde el rack (abajo) y se apila con un desplazamiento
 * vertical de -4 px por ficha. Se dibujan como máximo las 14 últimas.
 */
export function BetStack({ chips, size = 44 }: { chips: ChipValue[]; size?: number }) {
  const shown = chips.slice(-14);
  if (shown.length === 0) return null;
  return (
    <div className="relative" style={{ width: size, height: size + shown.length * 4 }} aria-hidden>
      {shown.map((v, i) => (
        <motion.div key={chips.length - shown.length + i} className="absolute left-0" style={{ bottom: i * 4, borderRadius: '50%', boxShadow: '0 3px 5px rgba(0,0,0,.45)' }}
          initial={{ y: 150, x: (i % 2 ? 14 : -14), opacity: 0, scale: 1.15, rotate: 18 }} animate={{ y: 0, x: 0, opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: Math.min(i, 8) * 0.02 }}>
          <Chip value={v} size={size} />
        </motion.div>
      ))}
    </div>
  );
}
