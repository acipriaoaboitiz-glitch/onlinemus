import { useEffect } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  /** Valor inicial del primer pintado. Por defecto, el propio `value` (sin animación al montar). */
  from?: number;
  /** Segundos que tarda en contar hasta `value`. */
  duration?: number;
  /** Segundos de espera antes de empezar a contar. */
  delay?: number;
  className?: string;
}

/** Número que cuenta visualmente (0 → 5) cada vez que cambia `value`. */
export function AnimatedNumber({ value, from, duration = 0.9, delay = 0, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(from ?? value);
  const text = useTransform(mv, (v) => String(Math.round(v)));

  useEffect(() => {
    if (reduce) { mv.set(value); return; }
    const controls = animate(mv, value, { duration, delay, ease: 'easeOut' });
    return () => controls.stop();
  }, [value, duration, delay, mv, reduce]);

  return <motion.span className={className}>{text}</motion.span>;
}
