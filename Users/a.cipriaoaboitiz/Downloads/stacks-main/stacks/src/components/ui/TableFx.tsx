import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ChipTarget } from '../../services/juice.ts';

const GOLD = ['#FFF3B0', '#F5D061', '#D4AF37'];

/** Chispas doradas (rombos) que saltan del punto de impacto (centro del tapete). Solo transform/opacity. */
export function SlamSparks() {
  const sparks = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.3;
    const d = 44 + ((i * 37) % 46);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d - 8, size: 5 + (i % 3) * 2, color: GOLD[i % 3]!, rot: ((i * 71) % 300) - 150 };
  }), []);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[25] grid place-items-center">
      {sparks.map((p, i) => (
        <motion.span key={i} className="absolute block" style={{ width: p.size, height: p.size, background: p.color, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }} animate={{ x: p.x, y: [0, p.y, p.y + 22], opacity: [1, 1, 0], scale: [1, 1, 0.3], rotate: p.rot }}
          transition={{ duration: 0.55, ease: 'easeOut' }} />
      ))}
    </div>
  );
}

const reach = (t: ChipTarget, w: number, h: number): { x: number; y: number } =>
  t === 'top' ? { x: 0, y: -h * 0.42 } : t === 'left' ? { x: -w * 0.4, y: -h * 0.04 } : t === 'right' ? { x: w * 0.4, y: -h * 0.04 } : { x: 0, y: h * 0.46 };

/** 6–10 fichas doradas en cascada del centro del tapete hacia el ganador. Se miden `w`×`h` del tapete al lanzarse. */
export function ChipFlight({ target, n, w, h }: { target: ChipTarget; n: number; w: number; h: number }) {
  const to = reach(target, w, h);
  const chips = useMemo(() => Array.from({ length: n }, (_, i) => ({
    sx: ((i * 53) % 40) - 20, sy: ((i * 29) % 24) - 12, arc: -((i * 17) % 40) - 26, delay: i * 0.07, spin: ((i * 61) % 240) - 120,
  })), [n]);
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[60] grid place-items-center">
      {chips.map((c, i) => (
        <motion.span key={i} className="absolute block size-[22px] rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 30%, #FFF3B0, #F5D061 45%, #B8860B 100%)', boxShadow: 'inset 0 0 0 2px #9A7018, inset 0 0 0 4px rgba(255,243,176,.55), 0 3px 5px rgba(0,0,0,.5)' }}
          initial={{ x: c.sx, y: c.sy, opacity: 0, scale: 0.6, rotate: 0 }}
          animate={{ x: [c.sx, (c.sx + to.x) / 2, to.x], y: [c.sy, (c.sy + to.y) / 2 + c.arc, to.y], opacity: [0, 1, 1, 0], scale: [0.6, 1.05, 0.95, 0.5], rotate: c.spin }}
          transition={{ duration: 0.75, delay: c.delay, ease: 'easeInOut', opacity: { times: [0, 0.15, 0.8, 1], duration: 0.75, delay: c.delay }, scale: { times: [0, 0.15, 0.8, 1], duration: 0.75, delay: c.delay } }} />
      ))}
    </div>
  );
}
