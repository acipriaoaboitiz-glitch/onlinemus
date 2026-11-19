import { memo, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { WHEEL, colorOf, pocketAngle } from './engine.ts';

const STEP = 360 / WHEEL.length;
const C = 100;
const pt = (r: number, deg: number): string => {
  const a = (deg * Math.PI) / 180;
  return `${(C + r * Math.sin(a)).toFixed(2)} ${(C - r * Math.cos(a)).toFixed(2)}`;
};
const FILL = { red: ['#c3162c', '#6f0a16'], black: ['#1a1a1f', '#050506'], green: ['#12a064', '#064a2e'] } as const;

/**
 * Cara de la rueda, multicapa: aro exterior de caoba con vetas y tachuelas de oro, pista metálica de la bola con 8 deflectores,
 * 37 casillas rubí / obsidiana / esmeralda con separadores dorados, y turret central de bronce con cruceta y remate.
 * Estática: solo se anima su contenedor.
 */
export const WheelGroup = memo(function WheelGroup() {
  return (
    <>
      <defs>
        <radialGradient id="rw-wood" cx=".5" cy=".38" r=".75"><stop offset="0" stopColor="#7a3f1d" /><stop offset=".55" stopColor="#4a2210" /><stop offset="1" stopColor="#1d0d06" /></radialGradient>
        <linearGradient id="rw-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FCE38A" /><stop offset=".5" stopColor="#D4AF37" /><stop offset="1" stopColor="#7a5a10" /></linearGradient>
        <radialGradient id="rw-track" cx=".5" cy=".5" r=".5"><stop offset=".78" stopColor="#6c7078" /><stop offset=".86" stopColor="#c9ced6" /><stop offset=".94" stopColor="#7d828b" /><stop offset="1" stopColor="#3b3e44" /></radialGradient>
        <radialGradient id="rw-bowl" cx=".5" cy=".5" r=".5"><stop offset=".6" stopColor="#0f0c09" /><stop offset=".9" stopColor="#241b12" /></radialGradient>
        <radialGradient id="rw-hub" cx=".38" cy=".32" r=".85"><stop offset="0" stopColor="#FFF0B0" /><stop offset=".35" stopColor="#D4AF37" /><stop offset=".75" stopColor="#8a5a14" /><stop offset="1" stopColor="#3f2808" /></radialGradient>
        <linearGradient id="rw-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={FILL.red[0]} /><stop offset="1" stopColor={FILL.red[1]} /></linearGradient>
        <linearGradient id="rw-black" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={FILL.black[0]} /><stop offset="1" stopColor={FILL.black[1]} /></linearGradient>
        <linearGradient id="rw-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={FILL.green[0]} /><stop offset="1" stopColor={FILL.green[1]} /></linearGradient>
      </defs>
      {/* aro de caoba con vetas */}
      <circle cx={C} cy={C} r="99" fill="url(#rw-wood)" />
      {[93, 95.4, 97.2].map((r, i) => <circle key={r} cx={C} cy={C} r={r} fill="none" stroke="#000" strokeOpacity={0.18 - i * 0.04} strokeWidth=".6" strokeDasharray={`${14 + i * 9} ${5 + i * 4}`} />)}
      <circle cx={C} cy={C} r="98.4" fill="none" stroke="#000" strokeOpacity=".55" strokeWidth="1.2" />
      <circle cx={C} cy={C} r="96.2" fill="none" stroke="url(#rw-gold)" strokeWidth="1.6" />
      {/* tachuelas de oro */}
      {Array.from({ length: 24 }, (_, i) => <circle key={i} cx={(C + 92.6 * Math.sin((i * 15 * Math.PI) / 180)).toFixed(2)} cy={(C - 92.6 * Math.cos((i * 15 * Math.PI) / 180)).toFixed(2)} r="1.25" fill="url(#rw-gold)" />)}
      {/* pista metálica de la bola */}
      <circle cx={C} cy={C} r="89" fill="url(#rw-track)" stroke="#2a2c30" strokeWidth=".8" />
      <circle cx={C} cy={C} r="82.5" fill="url(#rw-bowl)" stroke="#8B6914" strokeWidth="1" />
      {Array.from({ length: 8 }, (_, i) => (
        <g key={i} transform={`rotate(${i * 45 + 22.5} ${C} ${C})`}><path d={`M${C} 14.5 l3 4.5 l-3 4.5 l-3 -4.5 Z`} fill="url(#rw-gold)" stroke="#5c430b" strokeWidth=".4" /></g>
      ))}
      {/* casillas */}
      {WHEEL.map((n, i) => {
        const a0 = (i - 0.5) * STEP; const a1 = (i + 0.5) * STEP;
        const d = `M${pt(74, a0)} A74 74 0 0 1 ${pt(74, a1)} L${pt(52, a1)} A52 52 0 0 0 ${pt(52, a0)} Z`;
        return <path key={n} d={d} fill={`url(#rw-${colorOf(n)})`} stroke="url(#rw-gold)" strokeWidth=".7" />;
      })}
      {WHEEL.map((n, i) => (
        <text key={n} x={C} y={C - 66.5} transform={`rotate(${(i * STEP).toFixed(2)} ${C} ${C})`} textAnchor="middle" dominantBaseline="central"
          fontSize={n > 9 ? 6.2 : 6.8} fontWeight="800" fill="#FFF3CF" fontFamily="Outfit, system-ui, sans-serif" style={{ fontVariantNumeric: 'tabular-nums' }}>{n}</text>
      ))}
      <circle cx={C} cy={C} r="74" fill="none" stroke="url(#rw-gold)" strokeWidth="1.4" />
      <circle cx={C} cy={C} r="52" fill="none" stroke="url(#rw-gold)" strokeWidth="1.6" />
      {/* cono central de bronce */}
      <circle cx={C} cy={C} r="47" fill="#2b1d0e" stroke="#8B6914" strokeWidth=".9" />
      <circle cx={C} cy={C} r="40" fill="url(#rw-hub)" stroke="#FCE38A" strokeWidth=".9" />
      <circle cx={C} cy={C} r="30" fill="none" stroke="#5c3d0a" strokeOpacity=".5" strokeWidth=".8" />
      <circle cx={C} cy={C} r="21" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth=".8" />
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a} ${C} ${C})`}>
          <path d={`M${C - 2.6} ${C - 8} L${C - 1.6} 62 L${C + 1.6} 62 L${C + 2.6} ${C - 8} Z`} fill="url(#rw-gold)" stroke="#5c430b" strokeWidth=".4" />
          <circle cx={C} cy="61" r="3.6" fill="url(#rw-hub)" stroke="#5c430b" strokeWidth=".5" />
          <circle cx={C - 1} cy="60" r="1" fill="#fff" opacity=".7" />
        </g>
      ))}
      <circle cx={C} cy={C} r="8.4" fill="url(#rw-hub)" stroke="#5c430b" strokeWidth=".7" />
      <circle cx={C} cy={C} r="3.2" fill="#2b1d0e" />
      <circle cx={C - 2.4} cy={C - 2.6} r="1.6" fill="#fff" opacity=".8" />
    </>
  );
});

const WheelFace = memo(function WheelFace() {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" shapeRendering="geometricPrecision" style={{ display: 'block', width: '100%', height: '100%' }}>
      <WheelGroup />
    </svg>
  );
});

interface Props {
  /** Cambia en cada giro. */
  spin: number;
  result: number | null;
  /** Segundos que dura el giro. */
  duration: number;
  className?: string;
}

const BALL = 'radial-gradient(circle at 34% 28%, #ffffff 0%, #e9ecf1 38%, #9aa0aa 78%, #5d626b 100%)';

/**
 * Rueda y bola con inercia física: la rueda gira hacia un lado y frena; la bola, en sentido contrario por la pista exterior, pierde
 * velocidad, cae a la zona de casillas con tres rebotes y queda exactamente en el número sorteado. Solo se animan transform y opacity.
 */
export function Wheel({ spin, result, duration, className = '' }: Props) {
  const [ang, setAng] = useState({ w: 0, b: 0 });
  const [moving, setMoving] = useState(false);
  const last = useRef(0);
  useEffect(() => {
    if (spin === 0 || spin === last.current || result === null) return;
    last.current = spin;
    setAng((cur) => {
      const w = cur.w + 360 * 3 + Math.random() * 360;
      const target = (((w + pocketAngle(result)) % 360) + 360) % 360;
      const x = (((cur.b - target) % 360) + 360) % 360;
      return { w, b: cur.b - 360 * 7 - x };
    });
    setMoving(true);
    const id = window.setTimeout(() => setMoving(false), duration * 1000 * 0.86);
    return () => window.clearTimeout(id);
  }, [spin, result, duration]);
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: '1', contain: 'layout' }}>
      {/* sombra estática (box-shadow): el filtro sobre capas que giran costaría fotogramas en móvil */}
      <div aria-hidden className="absolute inset-[1.5%] rounded-full" style={{ boxShadow: '0 12px 22px rgba(0,0,0,.6)' }} />
      <motion.div className="absolute inset-0" initial={false} animate={{ rotate: ang.w }} transition={{ duration, ease: [0.1, 0.55, 0.25, 1] }} style={{ willChange: 'transform' }}>
        <WheelFace />
      </motion.div>
      <motion.div className="pointer-events-none absolute inset-0" initial={false} animate={{ rotate: ang.b }} transition={{ duration, ease: [0.22, 0.6, 0.3, 1] }} style={{ willChange: 'transform', opacity: spin === 0 ? 0 : 1 }}>
        <motion.div key={spin} className="absolute inset-0" initial={{ scale: 1 }} animate={{ scale: [1, 1, 0.97, 0.8, 0.765, 0.79, 0.765] }}
          transition={{ duration, times: [0, 0.62, 0.8, 0.9, 0.95, 0.98, 1], ease: 'easeOut' }} style={{ willChange: 'transform' }}>
          {/* estela suave: la bola se mueve en sentido antihorario, la cola queda detrás (ángulo mayor) */}
          {[10, 7, 4].map((deg, i) => (
            <span key={deg} className="absolute inset-0" style={{ transform: `rotate(${deg}deg)`, opacity: moving ? 0.16 + (2 - i) * 0.1 : 0, transition: 'opacity .35s' }}>
              <span className="absolute left-1/2 block rounded-full" style={{ top: '8.9%', width: `${3 - i * 0.55}%`, height: `${3 - i * 0.55}%`, transform: 'translateX(-50%)', background: '#e8ecf3', filter: 'blur(.4px)' }} />
            </span>
          ))}
          <span className="absolute left-1/2 block rounded-full" style={{ top: '8.4%', width: '3.6%', height: '3.6%', transform: 'translateX(-50%)', background: BALL, boxShadow: '0 1.5px 3px rgba(0,0,0,.75), 0 0 4px rgba(255,255,255,.35)' }} />
        </motion.div>
      </motion.div>
    </div>
  );
}
