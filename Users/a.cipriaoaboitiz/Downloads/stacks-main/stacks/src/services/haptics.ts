/**
 * Respuesta háptica. Si la app corre dentro de Capacitor con `@capacitor/haptics` instalado se usa el motor nativo
 * (detección en tiempo de ejecución: no hace falta añadir la dependencia hasta preparar la versión de tienda);
 * en el navegador, `navigator.vibrate`.
 */
interface HapticsPlugin { impact?: (o: { style: 'LIGHT' | 'MEDIUM' | 'HEAVY' }) => Promise<void>; vibrate?: (o: { duration: number }) => Promise<void> }
const nativePlugin = (): HapticsPlugin | null => {
  try { return (window as unknown as { Capacitor?: { Plugins?: { Haptics?: HapticsPlugin } } }).Capacitor?.Plugins?.Haptics ?? null; } catch { return null; }
};

export function triggerHaptic(pattern: number | number[] = 10): void {
  const ms = Array.isArray(pattern) ? Math.max(...pattern) : pattern;
  const native = nativePlugin();
  if (native?.impact) { void native.impact({ style: ms >= 40 ? 'HEAVY' : ms >= 18 ? 'MEDIUM' : 'LIGHT' }).catch(() => {}); return; }
  try { if ('vibrate' in navigator) navigator.vibrate(pattern); } catch { /* iOS / sin soporte */ }
}
