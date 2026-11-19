/**
 * Entorno de ejecución y modos de prueba.
 *  · `?local=1` (o `localStorage['stacks.transport'] = 'local'`) fuerza el modo local (BroadcastChannel) aunque haya claves de Supabase:
 *    sirve para probar sin que las identidades de prueba lleguen al proyecto real.
 *  · `?as=Nombre` (solo en desarrollo) da a ESTA pestaña una identidad propia (uid y #TAG), para probar amistades entre dos pestañas
 *    del mismo navegador, que de otro modo comparten perfil y serían el mismo jugador.
 */
const query = (): URLSearchParams => {
  try { return new URLSearchParams(window.location.search); } catch { return new URLSearchParams(); }
};

/** Guarda un parámetro de la URL en sessionStorage (sobrevive a recargas de la pestaña). */
function sticky(key: string, param: string): string | null {
  try {
    const v = query().get(param);
    if (v) sessionStorage.setItem(key, v);
    return sessionStorage.getItem(key);
  } catch { return query().get(param); }
}

const forcedFlag = sticky('stacks.local', 'local');
let storedForce = false;
try { storedForce = localStorage.getItem('stacks.transport') === 'local'; } catch { /* sin almacenamiento */ }
/** Modo local forzado (nunca se usa Supabase). */
export const localForced: boolean = forcedFlag === '1' || storedForce;

/** Identidad de prueba por pestaña (solo desarrollo). */
export const testAs: string | null = import.meta.env.DEV ? sticky('stacks.as', 'as') : null;

/** ¿La app corre instalada (PWA en iPhone/Android o dentro de Capacitor)? */
export function detectStandalone(): boolean {
  try {
    const w = window as unknown as { Capacitor?: unknown; navigator: Navigator & { standalone?: boolean } };
    return Boolean(w.Capacitor) || w.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
  } catch { return false; }
}

/** URL pública para compartir (la app instalada vive en capacitor://localhost, que no sirve fuera). */
export const PUBLIC_URL: string = (import.meta.env.VITE_PUBLIC_URL as string | undefined) ?? 'https://clubstacks.vercel.app';
export const shareBase = (): string => {
  try {
    const { protocol, origin, pathname } = window.location;
    return protocol.startsWith('http') && (import.meta.env.DEV || !origin.includes('localhost')) ? `${origin}${pathname}` : `${PUBLIC_URL}/`;
  } catch { return `${PUBLIC_URL}/`; }
};
