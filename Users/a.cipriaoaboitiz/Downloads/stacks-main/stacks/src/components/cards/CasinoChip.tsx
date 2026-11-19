import { motion } from 'framer-motion';
import { CAN_HOVER } from '../../store/settings.ts';

/** Fichas numeradas de póker: blanca 1, roja 5, azul 10, verde 25 y negra 100. */
export const CASINO_VALUES = [1, 5, 10, 25, 100] as const;
export type CasinoValue = (typeof CASINO_VALUES)[number];

const LOOK: Record<CasinoValue, { base: string; stripe: string; ink: string; ring: string }> = {
  1: { base: '#eeeae0', stripe: '#9aa0a8', ink: '#23262e', ring: '#9aa0a8' },
  5: { base: '#c62f2f', stripe: '#ffffff', ink: '#ffffff', ring: '#ffd0d0' },
  10: { base: '#1f5fbf', stripe: '#ffffff', ink: '#ffffff', ring: '#c9dcff' },
  25: { base: '#1f8a4c', stripe: '#ffffff', ink: '#ffffff', ring: '#c6f0d6' },
  100: { base: '#17181d', stripe: '#f0c35f', ink: '#f0c35f', ring: '#f0c35f' },
};

/** Ficha tipo Las Vegas: borde estriado, aro interior y número en el centro. */
export function CasinoChip({ value, size = 40, onClick, disabled, label }: { value: CasinoValue; size?: number; onClick?: () => void; disabled?: boolean; label?: string }) {
  const c = LOOK[value];
  const svg = (
    <svg shapeRendering="geometricPrecision" width={size} height={size} viewBox="0 0 100 100" aria-hidden style={{ display: 'block' }}>
      <circle cx="50" cy="50" r="48" fill={c.base} stroke="#000" strokeOpacity=".45" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => <rect key={i} x="43" y="2" width="14" height="13" rx="2" fill={c.stripe} transform={`rotate(${i * 30} 50 50)`} />)}
      <circle cx="50" cy="50" r="33" fill="none" stroke={c.ring} strokeWidth="3" strokeDasharray="4 3" />
      <circle cx="50" cy="50" r="27" fill={c.base} stroke="#000" strokeOpacity=".25" strokeWidth="1.5" />
      <text x="50" y="51" textAnchor="middle" dominantBaseline="central" fontFamily="JetBrains Mono, monospace" fontWeight="700" fontSize={value >= 100 ? 24 : 30} fill={c.ink}>{value}</text>
      <circle cx="50" cy="50" r="48" fill="url(#cc-gloss)" />
      <defs><radialGradient id="cc-gloss" cx="32%" cy="26%" r="80%"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#000" stopOpacity=".28" /></radialGradient></defs>
    </svg>
  );
  if (!onClick) return svg;
  return (
    <motion.button type="button" onClick={onClick} disabled={disabled} aria-label={label ?? `Ficha de ${value}`} whileTap={{ scale: 0.88, y: 2 }} whileHover={CAN_HOVER ? { y: -3 } : undefined}
      className="rounded-full disabled:opacity-35" style={{ background: 'none', border: 0, padding: 0, borderRadius: '50%', boxShadow: '0 3px 5px rgba(0,0,0,.45)' }}>
      {svg}
    </motion.button>
  );
}

/** Reparte un importe en fichas (mayores primero) agrupadas por valor. */
export function chipColumns(amount: number): { v: CasinoValue; n: number }[] {
  let rest = Math.max(0, Math.floor(amount));
  const out: { v: CasinoValue; n: number }[] = [];
  for (const v of [...CASINO_VALUES].reverse()) { const n = Math.floor(rest / v); if (n > 0) { out.push({ v, n }); rest -= n * v; } }
  return out;
}

/** Montón de fichas: una columna por valor, con -4 px de desplazamiento vertical por ficha. */
export function ChipPile({ amount, size = 26, maxCols = 5 }: { amount: number; size?: number; maxCols?: number }) {
  const cols = chipColumns(amount).slice(0, maxCols);
  if (cols.length === 0) return null;
  const tall = Math.min(8, Math.max(...cols.map((c) => c.n)));
  return (
    <div className="flex items-end gap-[2px]" style={{ height: size + tall * 4 }} aria-hidden>
      {cols.map((c) => (
        <div key={c.v} className="relative" style={{ width: size, height: size + Math.min(8, c.n) * 4 }}>
          {Array.from({ length: Math.min(8, c.n) }, (_, i) => (
            <motion.div key={i} className="absolute left-0" style={{ bottom: i * 4 }} initial={{ y: -24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: i * 0.03 }}>
              <CasinoChip value={c.v} size={size} />
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}
