import { useEffect } from 'react';

/** Mantiene la pantalla encendida mientras se juega (donde el navegador lo permita). */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const acquire = async () => {
      try { lock = await navigator.wakeLock.request('screen'); } catch { /* sin permiso o poca batería */ }
    };
    void acquire();
    const onVisible = () => { if (document.visibilityState === 'visible' && !cancelled) void acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, [active]);
}
