import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { playCoinCascade } from '../../store/settings.ts';

/** Fichas doradas que vuelan desde el centro al saldo (arriba a la derecha): cofre diario, misiones, rescate. Solo transform/opacity. */
let listener: ((n: number) => void) | null = null;
export const chipRain = (n = 8): void => { playCoinCascade(n); listener?.(n); };

function Burst({ n }: { n: number }) {
  const chips = useMemo(() => Array.from({ length: n }, (_, i) => ({ sx: ((i * 47) % 70) - 35, sy: ((i * 31) % 40) - 20, delay: i * 0.06, arc: 30 + ((i * 13) % 50) })), [n]);
  const W = window.innerWidth, H = window.innerHeight;
  const tx = W / 2 - 70, ty = -H / 2 + 34; // destino relativo al centro: el saldo de la cabecera
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[65] grid place-items-center">
      {chips.map((c, i) => (
        <motion.span key={i} className="absolute block size-6 rounded-full"
          style={{ background: 'radial-gradient(circle at 35% 30%, #FFF3B0, #F5D061 45%, #B8860B 100%)', boxShadow: 'inset 0 0 0 2px #9A7018, inset 0 0 0 4px rgba(255,243,176,.55), 0 3px 6px rgba(0,0,0,.5)' }}
          initial={{ x: c.sx, y: c.sy, opacity: 0, scale: 0.6 }}
          animate={{ x: [c.sx, (c.sx + tx) / 2 - c.arc, tx], y: [c.sy, (c.sy + ty) / 2 + c.arc, ty], opacity: [0, 1, 1, 0], scale: [0.6, 1.1, 0.9, 0.5] }}
          transition={{ duration: 0.9, delay: c.delay, ease: 'easeInOut', opacity: { times: [0, 0.12, 0.85, 1], duration: 0.9, delay: c.delay }, scale: { times: [0, 0.12, 0.85, 1], duration: 0.9, delay: c.delay } }} />
      ))}
    </div>
  );
}

export function ChipRainHost() {
  const [burst, setBurst] = useState<{ id: number; n: number } | null>(null);
  useEffect(() => {
    let t = 0;
    listener = (n) => { setBurst({ id: Date.now(), n }); window.clearTimeout(t); t = window.setTimeout(() => setBurst(null), 1800); };
    return () => { listener = null; window.clearTimeout(t); };
  }, []);
  return burst ? <Burst key={burst.id} n={burst.n} /> : null;
}
