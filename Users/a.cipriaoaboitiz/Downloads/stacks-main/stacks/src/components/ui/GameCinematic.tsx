import { useId, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { CinematicTone } from '../../services/juice.ts';

/** Paletas por tipo de evento (3 tonos de metal para el degradado del título y del anillo). */
const TONES: Record<CinematicTone, { hi: string; mid: string; lo: string; glow: string; spark: string[] }> = {
  gold: { hi: '#FFF3B0', mid: '#F5D061', lo: '#B8860B', glow: '#F5D061', spark: ['#FFF3B0', '#F5D061', '#D4AF37'] },
  ruby: { hi: '#FFD1D1', mid: '#F87171', lo: '#B91C1C', glow: '#EF4444', spark: ['#FECACA', '#EF4444', '#F5D061'] },
  emerald: { hi: '#D1FAE5', mid: '#34D399', lo: '#047857', glow: '#10B981', spark: ['#A7F3D0', '#10B981', '#F5D061'] },
  electric: { hi: '#E0F2FE', mid: '#60A5FA', lo: '#1D4ED8', glow: '#3B82F6', spark: ['#BAE6FD', '#60A5FA', '#F5D061'] },
};

const isMobile = (): boolean => typeof window !== 'undefined' && window.innerWidth < 768;

/**
 * Cinemática de jugada (~1,5 s). Capa de enfoque a pantalla completa (oscurece y difumina el tapete ~1,1 s:
 * entrada 140 ms, salida 220 ms) + emblema metálico con barrido de luz + título en SVG vectorial (nítido a cualquier
 * tamaño) + 12–20 chispas en forma de rombo. `pointer-events-none`: nunca bloquea la partida.
 */
export function GameCinematic({ title, sub, tone = 'gold' }: { title: string; sub?: string; tone?: CinematicTone }) {
  const t = TONES[tone];
  const uid = useId().replace(/:/g, '');
  const light = useMemo(isMobile, []);
  const count = light ? 8 : 20; // en móvil, 8 partículas ligeras
  const sparks = useMemo(() => Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (i % 3) * 0.25;
    const d = 120 + ((i * 41) % 110);
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, fall: 60 + ((i * 29) % 60), rot: ((i * 83) % 400) - 200, size: 7 + (i % 3) * 3, color: t.spark[i % t.spark.length]!, delay: (i % 4) * 0.025 };
  }), [t, count]);
  // Tamaño de fuente nativo (sin escalar HTML): el SVG se vuelve a rasterizar en cada fotograma → siempre nítido.
  const chars = Math.max(title.length, 6);
  const W = Math.max(360, Math.min(900, chars * 46 + 80));
  const fontSize = chars > 14 ? 40 : 52;
  return (
    <div className="pointer-events-none fixed inset-0 z-[70] grid place-items-center overflow-hidden" aria-live="assertive">
      {/* enfoque: oscurece y difumina el fondo (entrada 140 ms, salida 220 ms) */}
      <motion.div className="cine-focus absolute inset-0 bg-[#05140E]/95 max-md:backdrop-blur-none md:bg-[#030D09]/75 md:backdrop-blur-md"
        initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 1.15, times: [0, 0.122, 0.808, 1], ease: 'linear' }} />
      <div className="relative grid place-items-center">
        {/* chispas vectoriales (rombos) */}
        {sparks.map((p, i) => (
          <motion.span key={i} className="absolute left-1/2 top-1/2 block" style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2, background: p.color, clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)' }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: p.x, y: [0, p.y, p.y + p.fall], opacity: [1, 1, 0], rotate: p.rot, scale: [1, 1, 0.4] }}
            transition={{ duration: 1.1, delay: 0.1 + p.delay, ease: 'easeOut' }} />
        ))}
        <motion.svg width={W} height={W * 0.46} viewBox={`0 0 ${W} ${W * 0.46}`} shapeRendering="geometricPrecision" textRendering="geometricPrecision" aria-hidden
          style={{ maxWidth: '96vw', height: 'auto', overflow: 'visible' }}
          initial={{ opacity: 0, y: -14, scale: 1.18 }} animate={{ opacity: [0, 1, 1, 1, 0], y: [-14, 0, 0, 0, -6], scale: [1.18, 0.98, 1, 1, 1.04] }}
          transition={{ duration: 1.5, times: [0, 0.18, 0.3, 0.82, 1], ease: 'easeOut' }}>
          <defs>
            <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={t.hi} /><stop offset=".5" stopColor={t.mid} /><stop offset="1" stopColor={t.lo} /></linearGradient>
            <linearGradient id={`${uid}-ring`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={t.hi} /><stop offset=".5" stopColor={t.mid} /><stop offset="1" stopColor={t.lo} /></linearGradient>
            <linearGradient id={`${uid}-sweep`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".85" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
            <clipPath id={`${uid}-clip`}><rect x="0" y="0" width={W} height={W * 0.46} /></clipPath>
          </defs>
          {/* emblema: anillo metálico con filo interior luminoso */}
          <ellipse cx={W / 2} cy={W * 0.23} rx={W * 0.46} ry={W * 0.2} fill="rgba(3,13,9,.55)" stroke={`url(#${uid}-ring)`} strokeWidth="4" />
          <ellipse cx={W / 2} cy={W * 0.23} rx={W * 0.46 - 8} ry={W * 0.2 - 8} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1" />
          {/* barrido diagonal de luz (0,6 s) */}
          <g clipPath={`url(#${uid}-clip)`}>
            <motion.rect y={W * 0.03} width={W * 0.18} height={W * 0.4} fill={`url(#${uid}-sweep)`} style={{ transform: 'skewX(-20deg)', transformBox: 'fill-box' }}
              initial={{ x: -W * 0.2 }} animate={{ x: W * 1.05 }} transition={{ duration: 0.6, delay: 0.28, ease: 'easeInOut' }} />
          </g>
          {/* título: contorno oscuro, sombra y relleno metálico */}
          <text x={W / 2} y={W * 0.23 + fontSize * 0.36} textAnchor="middle" fontFamily="'Unbounded','Outfit',sans-serif" fontWeight="800" fontSize={fontSize}
            fill="#000" opacity=".55" transform="translate(0 5)" letterSpacing="2">{title}</text>
          <text x={W / 2} y={W * 0.23 + fontSize * 0.36} textAnchor="middle" fontFamily="'Unbounded','Outfit',sans-serif" fontWeight="800" fontSize={fontSize}
            fill={`url(#${uid}-metal)`} stroke="rgba(6,24,16,.95)" strokeWidth="6" paintOrder="stroke fill" strokeLinejoin="round" letterSpacing="2">{title}</text>
        </motion.svg>
        {sub && (
          <motion.div className="-mt-4 rounded-full border border-white/20 bg-zinc-950/95 px-4 py-1.5 text-[13px] font-bold text-stone-100 shadow-[0_6px_16px_rgba(0,0,0,.5)] ring-1 ring-inset ring-white/10"
            style={{ fontFamily: "'Outfit',sans-serif" }}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -4] }} transition={{ duration: 1.5, times: [0, 0.25, 0.8, 1], delay: 0.1 }}>
            {sub}
          </motion.div>
        )}
      </div>
    </div>
  );
}
