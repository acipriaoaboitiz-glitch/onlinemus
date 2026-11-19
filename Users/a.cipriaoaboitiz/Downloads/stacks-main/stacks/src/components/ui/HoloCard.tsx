import { useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CAN_HOVER } from '../../store/settings.ts';

export interface HoloCardProps {
  children: ReactNode;
  /** Color base del foil (se mezcla con el arcoíris). */
  foilColor?: string;
  intensity?: number;
  scale?: number;
  edgeSparkle?: number;
  /** Grosor del marco luminoso en px. */
  frame?: number;
  glare?: number;
  tiltMax?: number;
  hoverScale?: number;
  radius?: number;
  width?: number | string;
  height?: number | string;
  /** Se mece sola cuando no hay puntero encima. */
  idle?: boolean;
  shadow?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Carta holográfica: se inclina siguiendo el dedo o el ratón, con foil arcoíris que se desplaza,
 * destello (glare) bajo el puntero y chispas en el borde. Con `idle` se mece sola.
 */
export function HoloCard({
  children, foilColor = '#e2e6ec', intensity = 0.85, scale = 1, edgeSparkle = 0.8, frame = 4, glare = 0.5, tiltMax = 14,
  hoverScale = 1.04, radius = 14, width, height, idle = true, shadow = true, disabled = false, className = '',
}: HoloCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 160, damping: 18 });
  const sy = useSpring(py, { stiffness: 160, damping: 18 });
  const rotY = useTransform(sx, [0, 1], [-tiltMax, tiltMax]);
  const rotX = useTransform(sy, [0, 1], [tiltMax, -tiltMax]);
  const foilPos = useTransform(sx, [0, 1], ['0% 0%', '100% 100%']);
  const glareBg = useTransform([sx, sy], ([x, y]: number[]) => `radial-gradient(circle at ${x! * 100}% ${y! * 100}%, rgba(255,255,255,${glare}) 0%, rgba(255,255,255,0) 55%)`);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    const r = ref.current!.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
    setHover(true);
  };
  const leave = () => { px.set(0.5); py.set(0.5); setHover(false); };

  const box: CSSProperties = { borderRadius: radius };
  const mask = 'linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)';
  return (
    <div style={{ perspective: 900, width, height }} className={className}>
      <motion.div
        ref={ref}
        onPointerMove={move} onPointerLeave={leave} onPointerCancel={leave}
        animate={idle && !hover && !disabled ? { rotateX: [0, 5, 0, -5, 0], rotateY: [0, -7, 0, 7, 0] } : undefined}
        transition={idle && !hover ? { duration: 7, repeat: Infinity, ease: 'easeInOut' } : undefined}
        whileHover={disabled || !CAN_HOVER ? undefined : { scale: hoverScale }}
        style={{
          ...box, width: '100%', height: '100%', scale, position: 'relative', transformStyle: 'preserve-3d',
          rotateX: hover ? rotX : undefined, rotateY: hover ? rotY : undefined,
          boxShadow: shadow ? '0 26px 40px -12px rgba(0,0,0,.65), 0 8px 14px rgba(0,0,0,.35)' : undefined,
        }}
      >
        <div style={{ ...box, position: 'relative', overflow: 'hidden', width: '100%', height: '100%' }}>{children}</div>
        {/* foil arcoíris */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-color-dodge"
          style={{
            ...box, opacity: intensity * 0.45, backgroundSize: '260% 260%', backgroundPosition: foilPos,
            backgroundImage: `linear-gradient(115deg, transparent 15%, #ff6ec7 30%, #ffd86e 42%, #6effb4 54%, #6ec7ff 66%, #b66eff 78%, transparent 92%), linear-gradient(0deg, ${foilColor}33, ${foilColor}00)`,
          }} />
        {/* destello */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0 mix-blend-overlay" style={{ ...box, background: glareBg, opacity: hover ? 1 : 0.5 }} />
        {/* marco y chispas del borde */}
        <motion.div aria-hidden className="pointer-events-none absolute inset-0"
          style={{
            ...box, padding: frame, opacity: edgeSparkle, WebkitMask: mask, mask,
            background: `conic-gradient(from 0deg, ${foilColor}, #ff6ec7, #ffd86e, #6effb4, #6ec7ff, ${foilColor})`,
          }}
          animate={{ filter: ['hue-rotate(0deg)', 'hue-rotate(360deg)'] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }} />
      </motion.div>
    </div>
  );
}
