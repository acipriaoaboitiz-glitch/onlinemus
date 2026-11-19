import { memo } from 'react';
export type AvatarTone = 'us' | 'them' | 'me' | 'neutral';

const TONE: Record<AvatarTone, string> = {
  us: 'border-teal-300/60 bg-gradient-to-br from-[#1f6a5e] to-[#154a42] text-teal-50',
  me: 'border-teal-300/60 bg-gradient-to-br from-[#1f6a5e] to-[#154a42] text-teal-50',
  them: 'border-orange-300/60 bg-gradient-to-br from-[#77412c] to-[#54301f] text-orange-50',
  neutral: 'border-white/20 bg-zinc-700 text-stone-100',
};

/** Avatar de mesa: se dimensiona con `className` (p. ej. `size-[min(12vw,7dvh)]`) para escalar con la pantalla. */
export const TableAvatar = memo(function TableAvatar({ name, tone = 'neutral', className = '', active = false }: { name: string; tone?: AvatarTone; className?: string; active?: boolean }) {
  // «Jugador 1» → J1, «Player 2» → P2, «Joueur 3» → J3, «Spieler 1» → S1; si no, la primera letra (ignora emojis de rol delante del nombre)
  const bot = /^(\p{L})\p{L}* (\d)(?!\d)/u.exec(name);
  const initial = (bot ? bot[1]! + bot[2]! : (/\p{L}/u.exec(name)?.[0] ?? '?')).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`grid aspect-square select-none place-items-center rounded-full border-2 shadow-[0_3px_8px_rgba(0,0,0,.5),inset_0_2px_3px_rgba(255,255,255,.22),inset_0_-4px_8px_rgba(0,0,0,.4)] font-[var(--font-display)] text-[1.1em] font-bold ${TONE[tone]} ${active ? 'ring-2 ring-amber-300' : ''} ${className}`}
    >
      {initial}
    </span>
  );
});
