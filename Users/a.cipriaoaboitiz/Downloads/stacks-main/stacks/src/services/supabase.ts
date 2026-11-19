// Reexporta el cliente canónico de src/lib/supabase.ts (se mantiene la ruta antigua para no tocar los imports existentes).
export { ensureAnonAuth, ensureSession, getSupabase, isSupabaseConfigured, resetSessionCache, supabaseEnabled } from '../lib/supabase.ts';
