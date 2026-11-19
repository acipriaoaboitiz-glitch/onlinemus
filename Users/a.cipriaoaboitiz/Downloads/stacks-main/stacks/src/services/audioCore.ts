/**
 * Un único AudioContext para toda la app (efectos de las mesas y de Mus). Los navegadores limitan cuántos pueden existir
 * y en iOS solo se desbloquea tras un gesto del usuario, así que se reanuda en cada toque.
 */
let ctx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch { return null; }
}

if (typeof window !== 'undefined') {
  const unlock = (): void => { getAudioContext(); };
  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true });
}
