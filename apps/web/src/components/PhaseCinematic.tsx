import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CINE } from '../game/useTableDirector.ts';
import type { PhaseCine } from '../game/useTableDirector.ts';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Cartel de cambio de lance (GRANDE · CHICA · PARES · JUEGO · PUNTO).
 * Oscurece la mesa, el texto entra con `opacity` + `scale`, se mantiene CINE.hold s y se desvanece.
 * Mientras está en pantalla cubre la mesa y bloquea toques: los botones de envite aparecen después.
 */
export function PhaseCinematic({ cine }: { cine: PhaseCine | null }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {cine && (
        <motion.div
          key={cine.key}
          role="status"
          aria-live="polite"
          aria-label={cine.title}
          className="absolute inset-0 z-30 grid place-items-center bg-black/60 px-6 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.45 } }}
          exit={{ opacity: 0, transition: { duration: CINE.out } }}
        >
          <div className="grid w-full max-w-[640px] justify-items-center gap-[min(2.4dvh,18px)] text-center">
            <motion.span
              aria-hidden="true"
              className="h-px w-[min(52vw,260px)] origin-center bg-gradient-to-r from-transparent via-amber-300/80 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1, transition: { duration: CINE.in + 0.2, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: CINE.out } }}
            />
            <motion.h2
              className="bg-gradient-to-b from-amber-50 via-yellow-400 to-amber-700 bg-clip-text pl-[.12em] font-[var(--font-display)] text-[clamp(54px,18vw,112px)] font-bold leading-none tracking-[.12em] text-transparent drop-shadow-[0_6px_30px_rgba(240,195,95,.35)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.82, letterSpacing: '.3em' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, letterSpacing: '.12em', transition: { duration: CINE.in, ease: EASE } }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.08, transition: { duration: CINE.out, ease: 'easeIn' } }}
            >
              {cine.title}
            </motion.h2>
            <motion.span
              aria-hidden="true"
              className="h-px w-[min(34vw,170px)] origin-center bg-gradient-to-r from-transparent via-amber-300/60 to-transparent"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1, transition: { duration: CINE.in + 0.2, delay: 0.15, ease: EASE } }}
              exit={{ opacity: 0, transition: { duration: CINE.out } }}
            />
            {cine.subtitle && (
              <motion.p
                className="max-w-[80vw] text-[clamp(13px,3.6vw,17px)] font-semibold tracking-wide text-amber-100/80"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.4 } }}
                exit={{ opacity: 0, transition: { duration: CINE.out } }}
              >
                {cine.subtitle}
              </motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
