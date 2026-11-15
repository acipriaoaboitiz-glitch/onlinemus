import type { Backend } from '../game/backend.ts';

export const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

/** Carga Supabase solo si hay credenciales (y en un trozo aparte: el modo local no lo descarga). */
export async function loadSupabaseBackend(): Promise<Backend | null> {
  if (!supabaseConfigured) return null;
  const [{ createClient }, { createSupabaseBackend }] = await Promise.all([
    import('@supabase/supabase-js'),
    import('../game/supabaseBackend.ts'),
  ]);
  const client = createClient(import.meta.env.VITE_SUPABASE_URL as string, import.meta.env.VITE_SUPABASE_ANON_KEY as string, {
    auth: { persistSession: true, autoRefreshToken: true },
    realtime: { params: { eventsPerSecond: 20 } },
  });
  return createSupabaseBackend(client);
}
