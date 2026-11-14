export type AvatarTone = 'us' | 'them' | 'me' | 'neutral';

const TONE: Record<AvatarTone, string> = {
  us: 'border-teal-300/60 bg-gradient-to-br from-[#1f6a5e] to-[#154a42] text-teal-50',
  me: 'border-teal-300/60 bg-gradient-to-br from-[#1f6a5e] to-[#154a42] text-teal-50',
  them: 'border-orange-300/60 bg-gradient-to-br from-[#77412c] to-[#54301f] text-orange-50',
  neutral: 'border-white/20 bg-zinc-700 text-stone-100',
};

/** Avatar de mesa: se dimensiona con `className` (p. ej. `size-[min(12vw,7dvh)]`) para escalar con la pantalla. */
export function TableAvatar({ name, tone = 'neutral', className = '' }: { name: string; tone?: AvatarTone; className?: string }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`grid aspect-square select-none place-items-center rounded-full border-2 font-[var(--font-display)] text-[1.1em] font-bold shadow-[0_3px_12px_rgba(0,0,0,.35),inset_0_1px_rgba(255,255,255,.14)] ${TONE[tone]} ${className}`}
    >
      {initial}
    </span>
  );
}
