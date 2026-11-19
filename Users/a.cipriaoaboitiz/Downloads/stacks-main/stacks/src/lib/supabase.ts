import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { localForced } from '../services/env.ts';

/**
 * Cliente de Supabase de STACKS. El proyecto de Supabase se COMPARTE con otra app (`onlinemus`), así que TODO lo de STACKS vive
 * detrás del prefijo `stacks_` (tablas `stacks_profiles`, `stacks_friendships`, `stacks_game_invites`, `stacks_rooms`) y de canales
 * Realtime que empiezan por `stacks-` / `stacks:`. Nunca se toca nada sin ese prefijo.
 * Si faltan las variables (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`) o se fuerza `?local=1`, la app sigue en modo local.
 */
const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** ¿Hay Supabase configurado y permitido? (false → todo el online cae al modo local sin errores). */
export const isSupabaseConfigured: boolean = Boolean(URL && KEY) && !localForced;

let client: SupabaseClient | null = null;
/** Cliente compartido. Nunca lanza: devuelve null si no hay claves o falla la creación. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  try {
    client ??= createClient(URL!, KEY!, {
      realtime: { params: { eventsPerSecond: 10 } },
      // PKCE: el retorno de Google llega como `?code=` (con el implícito, los tokens irían en el hash y chocarían con HashRouter).
      auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'stacks-auth' },
    });
  } catch { client = null; }
  return client;
}

let authed: Promise<Session | null> | null = null;
/**
 * Sesión de Supabase Auth: la existente (email/Google/anónima) o, si no hay, una anónima silenciosa.
 * Requiere «Anonymous sign-ins» activado en Authentication; si no lo está, devuelve null y el jugador sigue en local.
 */
export function ensureSession(): Promise<Session | null> {
  authed ??= (async () => {
    const c = getSupabase();
    if (!c) return null;
    try {
      const { data } = await c.auth.getSession();
      if (data.session) return data.session;
      const { data: anon, error } = await c.auth.signInAnonymously();
      return error ? null : anon.session;
    } catch { return null; }
  })();
  return authed;
}
/** Fuerza una nueva comprobación de sesión (tras iniciar o cerrar sesión). */
export function resetSessionCache(): void { authed = null; }

/** Compatibilidad con el código existente. */
export const supabaseEnabled = isSupabaseConfigured;
export const ensureAnonAuth = async (): Promise<boolean> => (await ensureSession()) !== null;
