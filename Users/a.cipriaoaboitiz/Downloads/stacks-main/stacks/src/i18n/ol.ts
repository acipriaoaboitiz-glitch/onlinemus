/** Sala online (crear / unirse / sala de espera) en los 4 idiomas. */
type Dict = Record<string, string>;

export const olEs: Dict = {
  'ol.title': '{g} · Online', 'ol.code': 'Código de sala', 'ol.copyCode': 'Copiar código', 'ol.connected': 'Conectado', 'ol.connecting': 'Conectando…', 'ol.noConn': 'Sin conexión',
  'ol.supabase': 'Supabase en vivo', 'ol.localFallback': 'Modo local (Supabase no responde)', 'ol.localTabs': 'Modo local (pestañas del navegador)', 'ol.players': '{n}/{c} jugadores',
  'ol.sit': 'Libre · sentarse', 'ol.ready': 'Listo', 'ol.waiting': 'Esperando', 'ol.you': '(tú)', 'ol.host': 'Anfitrión', 'ol.teamA': 'EQUIPO A', 'ol.teamB': 'EQUIPO B',
  'ol.teamHint': 'Toca un asiento libre para cambiar de pareja · A: ↓↑ · B: ←→', 'ol.fill': 'Rellenar huecos con IA', 'ol.leave': 'Salir de la sala', 'ol.start': 'Empezar partida',
  'ol.imReady': 'Estoy listo', 'ol.readyCancel': 'Listo ✓ (tocar para cancelar)', 'ol.hintAllReady': 'Todo listo', 'ol.hintWaitHost': 'Espera al anfitrión', 'ol.hintMissing': 'Faltan {n} jugador(es)',
  'ol.hintEveryone': 'Esperando a que todos estén listos', 'ol.hintPublic': 'Buscando jugadores… {n} s · los huecos se rellenan con bots',
  'ol.create': 'Crear sala privada', 'ol.creating': 'Creando sala…', 'ol.public': 'Partida pública', 'ol.searchingTable': 'Buscando mesa…', 'ol.orCode': 'o únete con un código', 'ol.enter': 'Entrar',
  'ol.noteSupabase': 'Conectado a Supabase Realtime.', 'ol.noteLocal': 'Modo local: abre otra pestaña de STACKS para probar la sala. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para jugar en red.',
};
export const olEn: Dict = {
  'ol.title': '{g} · Online', 'ol.code': 'Room code', 'ol.copyCode': 'Copy code', 'ol.connected': 'Connected', 'ol.connecting': 'Connecting…', 'ol.noConn': 'Offline',
  'ol.supabase': 'Supabase live', 'ol.localFallback': 'Local mode (Supabase not responding)', 'ol.localTabs': 'Local mode (browser tabs)', 'ol.players': '{n}/{c} players',
  'ol.sit': 'Free · sit here', 'ol.ready': 'Ready', 'ol.waiting': 'Waiting', 'ol.you': '(you)', 'ol.host': 'Host', 'ol.teamA': 'TEAM A', 'ol.teamB': 'TEAM B',
  'ol.teamHint': 'Tap a free seat to switch teams · A: ↓↑ · B: ←→', 'ol.fill': 'Fill empty seats with AI', 'ol.leave': 'Leave room', 'ol.start': 'Start game',
  'ol.imReady': 'I’m ready', 'ol.readyCancel': 'Ready ✓ (tap to cancel)', 'ol.hintAllReady': 'All set', 'ol.hintWaitHost': 'Waiting for the host', 'ol.hintMissing': '{n} more player(s) needed',
  'ol.hintEveryone': 'Waiting for everyone to be ready', 'ol.hintPublic': 'Looking for players… {n} s · empty seats are filled with bots',
  'ol.create': 'Create private room', 'ol.creating': 'Creating room…', 'ol.public': 'Public game', 'ol.searchingTable': 'Finding a table…', 'ol.orCode': 'or join with a code', 'ol.enter': 'Join',
  'ol.noteSupabase': 'Connected to Supabase Realtime.', 'ol.noteLocal': 'Local mode: open another STACKS tab to try the room. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to play over the network.',
};
export const olFr: Dict = {
  'ol.title': '{g} · En ligne', 'ol.code': 'Code du salon', 'ol.copyCode': 'Copier le code', 'ol.connected': 'Connecté', 'ol.connecting': 'Connexion…', 'ol.noConn': 'Hors ligne',
  'ol.supabase': 'Supabase en direct', 'ol.localFallback': 'Mode local (Supabase ne répond pas)', 'ol.localTabs': 'Mode local (onglets du navigateur)', 'ol.players': '{n}/{c} joueurs',
  'ol.sit': 'Libre · s’asseoir', 'ol.ready': 'Prêt', 'ol.waiting': 'En attente', 'ol.you': '(vous)', 'ol.host': 'Hôte', 'ol.teamA': 'ÉQUIPE A', 'ol.teamB': 'ÉQUIPE B',
  'ol.teamHint': 'Touchez un siège libre pour changer d’équipe · A : ↓↑ · B : ←→', 'ol.fill': 'Remplir les places vides avec l’IA', 'ol.leave': 'Quitter le salon', 'ol.start': 'Lancer la partie',
  'ol.imReady': 'Je suis prêt', 'ol.readyCancel': 'Prêt ✓ (toucher pour annuler)', 'ol.hintAllReady': 'Tout est prêt', 'ol.hintWaitHost': 'En attente de l’hôte', 'ol.hintMissing': 'Il manque {n} joueur(s)',
  'ol.hintEveryone': 'On attend que tout le monde soit prêt', 'ol.hintPublic': 'Recherche de joueurs… {n} s · les places vides sont remplies par des bots',
  'ol.create': 'Créer un salon privé', 'ol.creating': 'Création du salon…', 'ol.public': 'Partie publique', 'ol.searchingTable': 'Recherche d’une table…', 'ol.orCode': 'ou rejoignez avec un code', 'ol.enter': 'Entrer',
  'ol.noteSupabase': 'Connecté à Supabase Realtime.', 'ol.noteLocal': 'Mode local : ouvrez un autre onglet STACKS pour tester le salon. Ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY pour jouer en réseau.',
};
export const olDe: Dict = {
  'ol.title': '{g} · Online', 'ol.code': 'Raumcode', 'ol.copyCode': 'Code kopieren', 'ol.connected': 'Verbunden', 'ol.connecting': 'Verbinde…', 'ol.noConn': 'Offline',
  'ol.supabase': 'Supabase live', 'ol.localFallback': 'Lokaler Modus (Supabase antwortet nicht)', 'ol.localTabs': 'Lokaler Modus (Browser-Tabs)', 'ol.players': '{n}/{c} Spieler',
  'ol.sit': 'Frei · hinsetzen', 'ol.ready': 'Bereit', 'ol.waiting': 'Wartet', 'ol.you': '(du)', 'ol.host': 'Gastgeber', 'ol.teamA': 'TEAM A', 'ol.teamB': 'TEAM B',
  'ol.teamHint': 'Tippe auf einen freien Platz, um das Team zu wechseln · A: ↓↑ · B: ←→', 'ol.fill': 'Freie Plätze mit KI füllen', 'ol.leave': 'Raum verlassen', 'ol.start': 'Spiel starten',
  'ol.imReady': 'Ich bin bereit', 'ol.readyCancel': 'Bereit ✓ (tippen zum Abbrechen)', 'ol.hintAllReady': 'Alles bereit', 'ol.hintWaitHost': 'Warte auf den Gastgeber', 'ol.hintMissing': 'Es fehlen {n} Spieler',
  'ol.hintEveryone': 'Warte, bis alle bereit sind', 'ol.hintPublic': 'Suche Spieler… {n} s · freie Plätze werden mit Bots gefüllt',
  'ol.create': 'Privaten Raum erstellen', 'ol.creating': 'Raum wird erstellt…', 'ol.public': 'Öffentliches Spiel', 'ol.searchingTable': 'Suche Tisch…', 'ol.orCode': 'oder mit Code beitreten', 'ol.enter': 'Beitreten',
  'ol.noteSupabase': 'Mit Supabase Realtime verbunden.', 'ol.noteLocal': 'Lokaler Modus: Öffne einen weiteren STACKS-Tab, um den Raum zu testen. Füge VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY hinzu, um übers Netz zu spielen.',
};
