import { useMemo, useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home'; code?: string }
  | { name: 'local' }
  | { name: 'room'; id: string };

export function parseRoute(hash: string): Route {
  const [a, b] = hash.replace(/^#\/?/, '').split('/');
  if (a === 'local') return { name: 'local' };
  if (a === 'room' && b) return { name: 'room', id: decodeURIComponent(b) };
  if (a === 'join' && b && /^\d{4,6}$/.test(b)) return { name: 'home', code: b };
  return { name: 'home' };
}

const subscribe = (cb: () => void): (() => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => '');
  return useMemo(() => parseRoute(hash), [hash]);
}

export function navigate(path: string, replace = false): void {
  if (replace) window.location.replace(`#${path}`);
  else window.location.hash = path;
}
