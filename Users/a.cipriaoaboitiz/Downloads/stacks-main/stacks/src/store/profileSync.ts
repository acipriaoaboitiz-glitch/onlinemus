import { adoptIdentity, displayName, getIdent, rerollTag, subscribeIdent } from './identity.ts';
import { getProfile, saveProfile, subscribeProfile } from './profile.ts';
import { getSettings, subscribeSettings } from './settings.ts';
import { cosmetics, equippedForCloud, subscribeCosmetics } from './cosmetics.ts';
import { getWallet, subscribeWallet, totalWins, wallet } from './wallet.ts';
import { dbLoadOwnProfile, dbUpsertProfile, type ProfilePayload } from '../services/socialDb.ts';

/**
 * Sincronización del perfil con `stacks_profiles`:
 *  · `startProfileSync` sube fichas, victorias, partidas y cosméticos equipados en segundo plano (debounce de 3 s).
 *  · `hydrateFromCloud` hace lo contrario al iniciar sesión en otro dispositivo: recupera apodo, TAG, saldo y cosméticos.
 */
const payload = (): ProfilePayload | null => {
  const p = getProfile();
  if (!p) return null;
  const eq = equippedForCloud();
  const w = getWallet();
  return {
    id: getIdent().uid, username: displayName(), tag: getIdent().tag, avatar_id: String(w.avatar), title: p.title,
    chips: w.chips, wins: totalWins(w), games_played: w.games, equipped_card_back: eq.card_back, equipped_table: eq.table,
  };
};

let lastSent = '';
/** Sube el perfil ahora. Si el «Apodo#TAG» ya existe en la nube, sortea otro TAG y reintenta. */
export async function pushProfile(force = false): Promise<'ok' | 'conflict' | 'off'> {
  for (let i = 0; i < 6; i++) {
    const pl = payload();
    if (!pl) return 'off';
    const key = JSON.stringify({ ...pl });
    if (!force && key === lastSent) return 'ok';
    const r = await dbUpsertProfile(pl);
    if (r === 'ok') { lastSent = key; return 'ok'; }
    if (r !== 'conflict') return 'off';
    rerollTag();
  }
  return 'off';
}

let timer = 0;
const schedule = (): void => {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { void pushProfile(); }, 3000);
};

let running = false;
/** Arranca la sincronización (idempotente). Devuelve la función que la detiene. */
export function startProfileSync(): () => void {
  if (running) return () => {};
  running = true;
  const offs = [subscribeWallet(schedule), subscribeCosmetics(schedule), subscribeProfile(schedule), subscribeSettings(schedule), subscribeIdent(schedule)];
  void pushProfile(true); // primera subida: crea la fila y, de paso, la sesión anónima
  return () => { running = false; window.clearTimeout(timer); offs.forEach((o) => o()); };
}

/**
 * Recupera la cuenta de la nube (tras iniciar sesión con email o Google): identidad, apodo, título, avatar, fichas, victorias y
 * cosméticos equipados. Devuelve false si esa cuenta aún no tiene perfil guardado.
 */
export async function hydrateFromCloud(): Promise<boolean> {
  const row = await dbLoadOwnProfile();
  if (!row) return false;
  adoptIdentity(row.id, row.tag);
  saveProfile({ name: row.username, title: row.title ?? getProfile()?.title ?? 'Jugador VIP', avatar: Number(row.avatar_id ?? 0) || 0, photo: getProfile()?.photo ?? null });
  wallet.hydrate({ chips: Number(row.chips), wins: row.wins, games: row.games_played });
  cosmetics.hydrate(row.equipped_card_back, row.equipped_table);
  lastSent = '';
  return true;
}

/** Tema de tapete actual (útil para depuración). */
export const equippedTable = (): string => getSettings().theme;
