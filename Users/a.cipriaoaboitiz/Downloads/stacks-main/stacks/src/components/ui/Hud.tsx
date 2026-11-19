import { useEffect, useRef, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { Crown, Diamond, Flame, Plus, Sparkles, Spade, Swords, Zap, type LucideIcon } from 'lucide-react';
import { Chip } from '../cards/Chip.tsx';
import { useProfile } from '../../store/profile.ts';
import { useWallet } from '../../store/wallet.ts';

export function AnimatedNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    const c = animate(prev.current, value, { duration: 0.8, ease: 'easeOut', onUpdate: (v) => setShown(Math.round(v)) });
    prev.current = value;
    return () => c.stop();
  }, [value]);
  return <>{shown.toLocaleString('es-ES')}</>;
}

export const RANKS = [
  { min: 0, name: 'Novato', color: '#a8a29e' },
  { min: 1000, name: 'Tahúr', color: '#34d399' },
  { min: 5000, name: 'Capo', color: '#60a5fa' },
  { min: 20000, name: 'Maestro', color: '#c084fc' },
  { min: 100000, name: 'Leyenda', color: '#fef08a' },
] as const;

export function rankFor(chips: number): { name: string; color: string; level: number } {
  let level = 0;
  RANKS.forEach((r, i) => { if (chips >= r.min) level = i; });
  return { name: RANKS[level]!.name, color: RANKS[level]!.color, level: level + 1 };
}

export const AVATARS: { icon: LucideIcon | null; bg: string }[] = [
  { icon: null, bg: 'radial-gradient(circle at 30% 25%, #1f6b52, #06241b)' },
  { icon: Crown, bg: 'radial-gradient(circle at 30% 25%, #b8860b, #3b2a05)' },
  { icon: Spade, bg: 'radial-gradient(circle at 30% 25%, #3b4252, #0b0d12)' },
  { icon: Diamond, bg: 'radial-gradient(circle at 30% 25%, #b3261e, #3a0d0b)' },
  { icon: Flame, bg: 'radial-gradient(circle at 30% 25%, #e07a1f, #5a1d05)' },
  { icon: Zap, bg: 'radial-gradient(circle at 30% 25%, #2f6bd0, #0a1d4a)' },
  { icon: Sparkles, bg: 'radial-gradient(circle at 30% 25%, #7c4fd0, #1e1245)' },
  { icon: Swords, bg: 'radial-gradient(circle at 30% 25%, #5b6b78, #1b242b)' },
];

/** Avatar con marco de rango/nivel; si recibe onClick es un botón (abre el perfil). */
export function PlayerAvatar({ name, chips, size = 44, avatar, photo, onClick }: { name: string; chips: number; size?: number; avatar?: number; photo?: string | null; onClick?: () => void }) {
  const prof = useProfile();
  const pic = photo !== undefined ? photo : avatar === undefined ? prof?.photo ?? null : null;
  const rank = rankFor(chips);
  const w = useWallet();
  const a = AVATARS[avatar ?? w.avatar] ?? AVATARS[0]!;
  const inner = (
    <>
      <div className="avatar-ring h-full w-full" style={{ background: `conic-gradient(from 210deg, #fff, ${rank.color}, #3b2a05, ${rank.color})` }}>
        <div className="font-display grid h-full w-full place-items-center rounded-full font-black" style={{ background: a.bg, color: '#fef08a', fontSize: size * 0.42 }}>
          {pic ? <img src={pic} alt="" draggable={false} className="h-full w-full rounded-full object-cover" /> : a.icon ? <a.icon size={size * 0.5} /> : name.slice(0, 1).toUpperCase()}
        </div>
      </div>
      <span className="font-mono absolute -bottom-1 -right-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px]"
        style={{ background: rank.color, color: '#0b0b0b', border: '1.5px solid #020a08' }} aria-label={`Nivel ${rank.level}`}>{rank.level}</span>
    </>
  );
  const style = { width: size, height: size, background: 'none', border: 0, padding: 0 };
  return onClick
    ? <button type="button" onClick={onClick} aria-label="Perfil" className="relative shrink-0" style={style}>{inner}</button>
    : <div className="relative shrink-0" style={style}>{inner}</div>;
}

/** Contador de fichas con ficha 3D giratoria. `onPlus` añade el botón de recarga. */
export function ChipBalance({ onPlus, className = '', alert = false }: { onPlus?: () => void; className?: string; /** Punto rojo: hay cofre o misiones por cobrar. */ alert?: boolean }) {
  const { chips } = useWallet();
  return (
    <div className={`glass-panel flex items-center gap-1.5 rounded-full py-1 pl-1.5 ${onPlus ? 'pr-1' : 'pr-3'} ${className}`} aria-label={`${chips} fichas`}>
      <motion.span style={{ display: 'block', perspective: 200 }} animate={{ rotateY: [0, 360] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}>
        <Chip value={25} size={26} />
      </motion.span>
      <span className="font-mono text-sm font-bold gold-text"><AnimatedNumber value={chips} /></span>
      {onPlus && (
        <button type="button" onClick={onPlus} aria-label="Recargar fichas"
          className="gold-foil relative ml-0.5 grid h-7 w-7 place-items-center rounded-full" style={{ boxShadow: '0 2px 0 #6b4306' }}>
          <Plus size={16} strokeWidth={3} />
          {alert && <span aria-hidden className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border border-[#04120C] bg-red-500" />}
        </button>
      )}
    </div>
  );
}
