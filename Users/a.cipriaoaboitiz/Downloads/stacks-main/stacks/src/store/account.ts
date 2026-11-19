import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { ensureSession, getSupabase, isSupabaseConfigured, resetSessionCache } from '../lib/supabase.ts';
import { hydrateFromCloud, pushProfile } from './profileSync.ts';
import { social } from './social.ts';

/**
 * Cuenta de STACKS sobre Supabase Auth. Por defecto cada jugador es un invitado persistente (sesión anónima o uuid local);
 * puede vincular correo + contraseña (o Google) para recuperar fichas, victorias, amigos y cosméticos en cualquier dispositivo.
 */
export interface AccountState { configured: boolean; user: User | null; anonymous: boolean; email: string | null }
export type AccountResult = { ok: true; message?: string } | { ok: false; error: string };

const fail = (e: unknown): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

let inflight: Promise<boolean> | null = null;
/** Tras iniciar sesión: recupera el perfil de la nube (una sola vez aunque lleguen varios avisos a la vez) y reinicia lo social. */
function afterSignIn(): Promise<boolean> {
  inflight ??= (async () => {
    resetSessionCache();
    const restored = await hydrateFromCloud();
    if (restored) { social.stop(); void social.start(); } else await pushProfile(true);
    return restored;
  })().finally(() => { window.setTimeout(() => { inflight = null; }, 1500); });
  return inflight;
}

let watching = false;
/** Se llama una vez al arrancar: escucha el retorno de Google o un inicio de sesión desde otra pestaña. */
export function watchAccount(): void {
  const c = getSupabase();
  if (!c || watching) return;
  watching = true;
  c.auth.onAuthStateChange((event, session) => { if (event === 'SIGNED_IN' && session && !session.user.is_anonymous) void afterSignIn(); });
}

const SESSION_KEY = 'stacks_active_session';
/** Marca que este dispositivo ya pasó por el acceso (para entrar directo al lobby las próximas veces). */
export function markSession(kind: 'account' | 'guest'): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ kind, at: Date.now() })); } catch { /* sin almacenamiento */ }
}
export const hasActiveSession = (): boolean => { try { return localStorage.getItem(SESSION_KEY) !== null; } catch { return false; } };

export const account = {
  /** Vincula correo y contraseña a la sesión actual (si era anónima conserva el mismo usuario) o crea una cuenta nueva. */
  async signUp(email: string, password: string): Promise<AccountResult> {
    const c = getSupabase();
    if (!c) return { ok: false, error: 'offline' };
    try {
      const session = await ensureSession();
      if (session?.user.is_anonymous) {
        const { error } = await c.auth.updateUser({ email, password });
        if (error) return fail(error);
        return { ok: true, message: 'confirm' }; // Supabase envía un correo de confirmación si está activado
      }
      const { data, error } = await c.auth.signUp({ email, password });
      if (error) return fail(error);
      if (!data.session) return { ok: true, message: 'confirm' };
      markSession('account');
      await afterSignIn();
      return { ok: true };
    } catch (e) { return fail(e); }
  },
  /** Inicia sesión con una cuenta existente y recupera su perfil. */
  async signIn(email: string, password: string): Promise<AccountResult> {
    const c = getSupabase();
    if (!c) return { ok: false, error: 'offline' };
    try {
      const { error } = await c.auth.signInWithPassword({ email, password });
      if (error) return fail(error);
      markSession('account');
      const restored = await afterSignIn();
      return { ok: true, message: restored ? 'restored' : 'new' };
    } catch (e) { return fail(e); }
  },
  /** Google (hay que activar el proveedor en Supabase). El retorno llega con `?code=` (PKCE) y se hidrata solo. */
  async signInGoogle(): Promise<AccountResult> {
    const c = getSupabase();
    if (!c) return { ok: false, error: 'offline' };
    try {
      const { error } = await c.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${window.location.pathname}` } });
      return error ? fail(error) : { ok: true };
    } catch (e) { return fail(e); }
  },
  async signOut(): Promise<void> {
    const c = getSupabase();
    try { await c?.auth.signOut(); } catch { /* sin red */ }
    resetSessionCache();
  },
  /** Cerrar sesión de verdad: sale de Supabase, borra los datos de este dispositivo y vuelve a la pantalla de acceso. */
  async signOutAndReset(): Promise<void> {
    await account.signOut();
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* sin almacenamiento */ }
    window.location.reload();
  },
};

/** Estado de la cuenta en vivo (se actualiza al iniciar/cerrar sesión). */
export function useAccount(): AccountState {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const c = getSupabase();
    if (!c) return;
    let alive = true;
    void c.auth.getSession().then(({ data }) => { if (alive) setUser(data.session?.user ?? null); });
    const { data } = c.auth.onAuthStateChange((_event, session) => { setUser(session?.user ?? null); });
    return () => { alive = false; data.subscription.unsubscribe(); };
  }, []);
  return { configured: isSupabaseConfigured, user, anonymous: Boolean(user?.is_anonymous), email: user?.email ?? null };
}
