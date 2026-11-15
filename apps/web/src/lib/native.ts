/**
 * Puente con el envoltorio nativo (Capacitor). En el navegador todo esto es inerte: se detecta la
 * plataforma con el objeto global que inyecta la app nativa y los plugins se cargan solo si hacen falta.
 */
interface CapGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
}
const cap = (): CapGlobal | undefined => (globalThis as { Capacitor?: CapGlobal }).Capacitor;

export const isNative = (): boolean => Boolean(cap()?.isNativePlatform?.());
export const platform = (): string => cap()?.getPlatform?.() ?? 'web';

/** ¿Abierta como app instalada (PWA) o dentro del envoltorio nativo? */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    isNative() ||
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

export async function nativeVibrate(ms: number): Promise<void> {
  try {
    const { Haptics } = await import('@capacitor/haptics');
    await Haptics.vibrate({ duration: ms });
  } catch { /* sin plugin: no pasa nada */ }
}

/** Ajustes al arrancar dentro de la app nativa: barra de estado, orientación, atrás y enlaces de invitación. */
export async function initNative(): Promise<void> {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (platform() === 'android') await StatusBar.setBackgroundColor({ color: '#0A0E13' });
  } catch { /* opcional */ }
  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    // En móviles se fuerza vertical (la mesa está pensada así); en tabletas se deja libre.
    if (Math.min(window.screen.width, window.screen.height) < 600) await ScreenOrientation.lock({ orientation: 'portrait' });
  } catch { /* opcional */ }
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appUrlOpen', ({ url }) => {
      const i = url.indexOf('#/');
      if (i >= 0) window.location.hash = url.slice(i + 1);
    });
    await App.addListener('backButton', ({ canGoBack }) => {
      const home = window.location.hash === '' || window.location.hash === '#/';
      if (canGoBack && !home) window.history.back();
      else void App.minimizeApp();
    });
  } catch { /* opcional */ }
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* opcional */ }
}
