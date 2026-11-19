import { useEffect, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { SPEED_FACTOR, feedback, useSettings } from '../../store/settings.ts';

/**
 * Reparto físico: la carta sale del mazo (esquina superior derecha por defecto) describiendo un arco
 * (x y la y con curvas distintas) y rotando hasta su sitio. `index` escalona el reparto.
 */
export function DealIn({
  children, index = 0, from = { x: 150, y: -140 },
}: { children: ReactNode; index?: number; from?: { x: number; y: number } }) {
  const k = SPEED_FACTOR[useSettings().speed];
  useEffect(() => {
    const t = window.setTimeout(() => feedback('deal'), ((index * 0.12) / k) * 1000);
    return () => window.clearTimeout(t);
  }, [index, k]);
  return (
    <motion.div
      initial={{ x: from.x, y: from.y, rotate: 28, opacity: 0, scale: 0.8 }}
      animate={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 }}
      transition={{
        delay: (index * 0.12) / k,
        x: { duration: 0.42 / k, ease: 'easeOut' },
        y: { duration: 0.42 / k, ease: [0.3, 1.25, 0.5, 1] },
        rotate: { duration: 0.42 / k },
        opacity: { duration: 0.15 / k, delay: (index * 0.12) / k },
        scale: { duration: 0.42 / k },
      }}
      style={{ flexShrink: 0 }}
    >
      {children}
    </motion.div>
  );
}
