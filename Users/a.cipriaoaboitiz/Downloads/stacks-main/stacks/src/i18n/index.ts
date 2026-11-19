import { getSettings, useSettings, type Lang } from '../store/settings.ts';
import { coreDe, coreFr } from './core2.ts';
import { accDe, accEn, accEs, accFr } from './acc.ts';
import { catDe, catEn, catEs, catFr, setDe, setEn, setEs, setFr, clubDe, clubEn, clubEs, clubFr, CLUB_RULES } from './club.ts';
import { olDe, olEn, olEs, olFr } from './ol.ts';
import { MORE_RULES, moreDe, moreEn, moreEs, moreFr } from './more.ts';
import { RULES } from './rules.ts';
import { uiDe, uiEn, uiEs, uiFr } from './ui.ts';

/** i18n sin recargar: español (fuente), euskera e inglés. Lo que falta en un idioma cae al español. */
type Dict = Record<string, string>;

const es: Dict = {
  'app.tagline': 'Club privado de cartas',
  'lobby.esTitle': 'Baraja española oficial', 'lobby.esSub': '40 cartas · Oros, Copas, Espadas y Bastos',
  'lobby.frTitle': 'Baraja inglesa oficial', 'lobby.frSub': '52 cartas · Picas, Corazones, Diamantes y Tréboles',
  'lobby.otherTitle': 'Otros juegos', 'lobby.otherSub': 'Baraja de colores',
  'lobby.playAi': 'Jugar contra la IA', 'lobby.online': 'Sala online', 'lobby.free': 'Fichas virtuales gratuitas · nunca dinero real',
  'lobby.rulesPick': 'Reglas de los juegos',
  'g.mus.name': 'Mus', 'g.mus.tag': 'El rey de las mesas vascas', 'g.mus.pl': '4 · 2 vs 2',
  'g.brisca.name': 'Brisca', 'g.brisca.tag': 'Triunfo y arrastre', 'g.brisca.pl': '1v1 · 2v2',
  'g.escoba.name': 'Escoba', 'g.escoba.tag': 'Suma 15 y barre la mesa', 'g.escoba.pl': '2–4 jugadores',
  'g.chinchon.name': 'Chinchón', 'g.chinchon.tag': 'Escaleras, tríos y −10', 'g.chinchon.pl': '2–4 jugadores',
  'g.tute.name': 'Tute', 'g.tute.tag': 'Cantes de las 20 y las 40', 'g.tute.pl': '2 o 4 jugadores',
  'g.blackjack.name': 'Blackjack 21', 'g.blackjack.tag': 'Pide, plántate, dobla', 'g.blackjack.pl': 'vs Crupier',
  'g.poker.name': 'Póker', 'g.poker.tag': 'Ciegas, flop, turn y river', 'g.poker.pl': 'Mesa de 4',
  'g.seises.name': 'Los Seises', 'g.seises.tag': 'Escaleras al corte por palos', 'g.seises.pl': '2–4 jugadores',
  'g.presidente.name': 'COME💩', 'g.presidente.tag': 'De mendigo a rey de la mesa', 'g.presidente.pl': '4 jugadores',
  'g.uno.name': 'Uno', 'g.uno.tag': 'Vacía tu mano el primero', 'g.uno.pl': '2–4 jugadores',
  'a.pass': 'Pasar', 'a.bet': 'Envidar', 'a.hit': 'Pedir carta', 'a.stand': 'Plantarse', 'a.double': 'Doblar', 'a.split': 'Dividir',
  'a.deal': 'Repartir', 'a.again': 'Repetir', 'a.clear': 'Quitar', 'a.close': 'Cerrar', 'a.fold': 'Retirarse', 'a.check': 'Pasar',
  'a.call': 'Igualar', 'a.raise': 'Subir', 'a.allin': 'All-in', 'a.take': 'Llevar', 'a.throw': 'Tirar a la mesa', 'a.draw': 'Robar carta',
  'a.discard': 'Descartar', 'a.continue': 'Continuar', 'a.rematch': 'Revancha', 'a.next': 'Siguiente ronda', 'a.lobby': 'Volver al inicio',
  'a.mus': 'Mus', 'a.noMus': 'No hay mus', 'a.quiero': 'Quiero', 'a.noQuiero': 'No quiero', 'a.ordago': '¡Órdago!', 'a.raiseBet': 'Subir…', 'a.betDots': 'Envido…',
  'a.sing20': 'Cantar las 20', 'a.sing40': 'Cantar las 40', 'a.sing': 'Cantar', 'a.newHand': 'Nueva mano', 'a.confirm': 'Confirmar', 'a.cancel': 'Cancelar',
  'a.deck': 'Mazo', 'a.discardPile': 'Descarte', 'a.format': 'Elige formato',
  'set.title': 'Ajustes', 'set.table': 'Color del tapete', 'set.lang': 'Idioma de la interfaz', 'set.game': 'Experiencia de juego',
  'set.sound': 'Efectos de sonido', 'set.speed': 'Velocidad de animaciones / IA', 'set.normal': 'Normal', 'set.fast': 'Rápida',
  'set.help': 'Ayuda visual en cartas', 'set.helpSub': 'Muestra el valor en puntos sobre cada naipe', 'set.vibration': 'Vibración', 'set.close': 'Cerrar',
  'th.esmeralda': 'Verde Esmeralda Clásico', 'th.royal': 'Azul Casino Royal', 'th.burdeos': 'Rojo Burdeos Club', 'th.obsidiana': 'Negro Obsidiana VIP', 'th.purpura': 'Púrpura Noche Torneo',
  'menu.title': 'Menú', 'menu.rules': 'Reglas rápidas', 'menu.settings': 'Ajustes', 'menu.exit': 'Salir al inicio', 'menu.sound': 'Sonido', 'menu.soundOn': 'Sonido activado', 'menu.soundOff': 'Sonido desactivado',
  'g.you': 'Tú', 'g.bot': 'Bot', 'g.yourTurn': 'Te toca', 'g.thinking': 'Pensando…', 'g.win': '¡Has ganado!', 'g.lose': 'Has perdido', 'g.points': 'Puntos', 'g.chips': 'Fichas', 'g.bet': 'Apuesta',
};

const en: Dict = {
  'app.tagline': 'Private card club',
  'lobby.esTitle': 'Official Spanish deck', 'lobby.esSub': '40 cards · Coins, Cups, Swords and Clubs',
  'lobby.frTitle': 'Official English deck', 'lobby.frSub': '52 cards · Spades, Hearts, Diamonds and Clubs',
  'lobby.otherTitle': 'Other games', 'lobby.otherSub': 'Colour deck',
  'lobby.playAi': 'Play vs AI', 'lobby.online': 'Online room', 'lobby.free': 'Free virtual chips · never real money',
  'lobby.rulesPick': 'Game rules',
  'g.mus.tag': 'The king of Basque tables', 'g.mus.pl': '4 · 2 vs 2',
  'g.brisca.tag': 'Trump and drag', 'g.escoba.tag': 'Make 15 and sweep the table', 'g.escoba.pl': '2–4 players',
  'g.chinchon.tag': 'Runs, sets and −10', 'g.chinchon.pl': '2–4 players',
  'g.tute.tag': 'Calls of 20 and 40', 'g.tute.pl': '2 or 4 players',
  'g.blackjack.tag': 'Hit, stand, double', 'g.blackjack.pl': 'vs Dealer',
  'g.poker.tag': 'Blinds, flop, turn and river', 'g.poker.pl': '4-seat table',
  'g.seises.tag': 'Ladders cut by suit', 'g.seises.pl': '2–4 players', 'g.presidente.tag': 'From beggar to king of the table', 'g.presidente.pl': '4 players', 'g.uno.tag': 'Empty your hand first', 'g.uno.pl': '2–4 players',
  'a.pass': 'Pass', 'a.bet': 'Bet', 'a.hit': 'Hit', 'a.stand': 'Stand', 'a.double': 'Double', 'a.split': 'Split',
  'a.deal': 'Deal', 'a.again': 'Repeat', 'a.clear': 'Clear', 'a.close': 'Close', 'a.fold': 'Fold', 'a.check': 'Check',
  'a.call': 'Call', 'a.raise': 'Raise', 'a.allin': 'All-in', 'a.take': 'Take', 'a.throw': 'Throw to table', 'a.draw': 'Draw card',
  'a.discard': 'Discard', 'a.continue': 'Continue', 'a.rematch': 'Rematch', 'a.next': 'Next round', 'a.lobby': 'Back to lobby',
  'a.mus': 'Mus', 'a.noMus': 'No mus', 'a.quiero': 'Accept', 'a.noQuiero': 'Decline', 'a.ordago': 'All-in!', 'a.raiseBet': 'Raise…', 'a.betDots': 'Bet…',
  'a.sing20': 'Sing the 20', 'a.sing40': 'Sing the 40', 'a.sing': 'Sing', 'a.newHand': 'New hand', 'a.confirm': 'Confirm', 'a.cancel': 'Cancel',
  'a.deck': 'Deck', 'a.discardPile': 'Discard', 'a.format': 'Choose format',
  'set.title': 'Settings', 'set.table': 'Table colour', 'set.lang': 'Interface language', 'set.game': 'Game experience',
  'set.sound': 'Sound effects', 'set.speed': 'Animation / AI speed', 'set.normal': 'Normal', 'set.fast': 'Fast',
  'set.help': 'Visual card help', 'set.helpSub': 'Shows point values on each card', 'set.vibration': 'Vibration', 'set.close': 'Close',
  'th.esmeralda': 'Classic Emerald Green', 'th.royal': 'Casino Royal Blue', 'th.burdeos': 'Burgundy Club Red', 'th.obsidiana': 'Obsidian VIP Black', 'th.purpura': 'Tournament Night Purple',
  'menu.title': 'Menu', 'menu.rules': 'Quick rules', 'menu.settings': 'Settings', 'menu.exit': 'Exit to lobby', 'menu.sound': 'Sound', 'menu.soundOn': 'Sound on', 'menu.soundOff': 'Sound off',
  'g.you': 'You', 'g.yourTurn': 'Your turn', 'g.thinking': 'Thinking…', 'g.win': 'You won!', 'g.lose': 'You lost', 'g.points': 'Points', 'g.chips': 'Chips', 'g.bet': 'Bet',
};

const eu: Dict = {
  'app.tagline': 'Karta-kluba pribatua',
  'lobby.esTitle': 'Espainiako baraja ofiziala', 'lobby.esSub': '40 karta · Urreak, Kopak, Ezpatak eta Makilak',
  'lobby.frTitle': 'Ingeles baraja ofiziala', 'lobby.frSub': '52 karta · Pikak, Bihotzak, Diamanteak eta Hirurakoak',
  'lobby.otherTitle': 'Beste jokoak', 'lobby.otherSub': 'Koloretako baraja',
  'lobby.playAi': 'Jolastu IAren aurka', 'lobby.online': 'Online gela', 'lobby.free': 'Doako txanpon birtualak · inoiz ez benetako dirua',
  'lobby.rulesPick': 'Jokoen arauak',
  'g.mus.tag': 'Euskal mahaien erregea', 'g.mus.pl': '4 · 2 vs 2',
  'g.brisca.tag': 'Triunfoa eta arrastea', 'g.escoba.tag': 'Batu 15 eta garbitu mahaia', 'g.escoba.pl': '2–4 jokalari',
  'g.chinchon.tag': 'Eskailerak, hirukoak eta −10', 'g.chinchon.pl': '2–4 jokalari',
  'g.tute.tag': '20ko eta 40ko kantuak', 'g.tute.pl': '2 edo 4 jokalari',
  'g.blackjack.tag': 'Eskatu, plantatu, bikoiztu', 'g.blackjack.pl': 'Krupierraren aurka',
  'g.poker.tag': 'Itsuak, flop, turn eta river', 'g.poker.pl': '4ko mahaia',
  'g.seises.tag': 'Eskailerak palu bakoitzean', 'g.seises.pl': '2–4 jokalari', 'g.presidente.tag': 'Eskaleko eskalea', 'g.presidente.pl': '4 jokalari', 'g.uno.tag': 'Hustu zure eskua lehenengo', 'g.uno.pl': '2–4 jokalari',
  'a.pass': 'Pasa', 'a.bet': 'Enbidatu', 'a.hit': 'Eskatu karta', 'a.stand': 'Plantatu', 'a.double': 'Bikoiztu', 'a.split': 'Zatitu',
  'a.deal': 'Banatu', 'a.again': 'Errepikatu', 'a.clear': 'Kendu', 'a.close': 'Itxi', 'a.fold': 'Erretiratu', 'a.check': 'Pasa',
  'a.call': 'Berdindu', 'a.raise': 'Igo', 'a.allin': 'All-in', 'a.take': 'Hartu', 'a.throw': 'Bota mahaira', 'a.draw': 'Hartu karta',
  'a.discard': 'Baztertu', 'a.continue': 'Jarraitu', 'a.rematch': 'Mendekua', 'a.next': 'Hurrengo txanda', 'a.lobby': 'Itzuli hasierara',
  'a.mus': 'Mus', 'a.noMus': 'Ez dago mus', 'a.quiero': 'Nahi dut', 'a.noQuiero': 'Ez dut nahi', 'a.ordago': 'Hordago!', 'a.raiseBet': 'Igo…', 'a.betDots': 'Enbido…',
  'a.sing20': '20ak kantatu', 'a.sing40': '40ak kantatu', 'a.sing': 'Kantatu', 'a.newHand': 'Esku berria', 'a.confirm': 'Baieztatu', 'a.cancel': 'Utzi',
  'a.deck': 'Mazoa', 'a.discardPile': 'Baztertuak', 'a.format': 'Aukeratu formatua',
  'set.title': 'Ezarpenak', 'set.table': 'Mahai-oihalaren kolorea', 'set.lang': 'Interfazearen hizkuntza', 'set.game': 'Jolas-esperientzia',
  'set.sound': 'Soinu-efektuak', 'set.speed': 'Animazio / IA abiadura', 'set.normal': 'Normala', 'set.fast': 'Azkarra',
  'set.help': 'Laguntza bisuala kartetan', 'set.helpSub': 'Karta bakoitzaren puntu-balioa erakusten du', 'set.vibration': 'Dardara', 'set.close': 'Itxi',
  'th.esmeralda': 'Esmeralda berde klasikoa', 'th.royal': 'Casino Royal urdina', 'th.burdeos': 'Burdeos gorria', 'th.obsidiana': 'Obsidiana beltz VIPa', 'th.purpura': 'Txapelketa gaueko more iluna',
  'menu.title': 'Menua', 'menu.rules': 'Arau laburrak', 'menu.settings': 'Ezarpenak', 'menu.exit': 'Irten hasierara', 'menu.sound': 'Soinua', 'menu.soundOn': 'Soinua piztuta', 'menu.soundOff': 'Soinua itzalita',
  'g.you': 'Zu', 'g.yourTurn': 'Zure txanda', 'g.thinking': 'Pentsatzen…', 'g.win': 'Irabazi duzu!', 'g.lose': 'Galdu duzu', 'g.points': 'Puntuak', 'g.chips': 'Fitxak', 'g.bet': 'Apustua',
};

const DICTS: Record<Lang, Dict> = {
  es: { ...es, ...uiEs, ...olEs, ...accEs, ...clubEs, ...catEs, ...setEs, ...moreEs },
  en: { ...en, ...uiEn, ...olEn, ...accEn, ...clubEn, ...catEn, ...setEn, ...moreEn },
  eu: { ...eu },
  fr: { ...coreFr, ...uiFr, ...olFr, ...accFr, ...clubFr, ...catFr, ...setFr, ...moreFr },
  de: { ...coreDe, ...uiDe, ...olDe, ...accDe, ...clubDe, ...catDe, ...setDe, ...moreDe },
};

/** Sustituye `{n}`, `{h}`… en una traducción. */
export const fmt = (text: string, vars: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
/** Traducción con variables: `trf('lb.pos', { a: 1, b: 4 })`. */
export const trf = (key: string, vars: Record<string, string | number>, lang: Lang = getSettings().lang): string => fmt(tr(key, lang), vars);
/** Nombre de un bot en el idioma activo: «Jugador 1», «Player 1», «Joueur 1», «Spieler 1». */
export const botName = (i: number): string => `${tr('bot.name')} ${i}`;
/** Reglas de un juego en el idioma activo (cae al texto español del registro). */
export const rulesFor = (id: string, fallback: string[], lang: Lang = getSettings().lang): string[] => RULES[lang]?.[id] ?? (lang === 'en' || lang === 'fr' || lang === 'de' ? CLUB_RULES[lang][id] ?? MORE_RULES[lang][id] : undefined) ?? fallback;

/** Traducción puntual (fuera de componentes). */
export function tr(key: string, lang: Lang = getSettings().lang): string {
  return DICTS[lang][key] ?? DICTS.es[key] ?? key;
}

/** Hook: `const t = useT(); t('a.pass')`. Re-renderiza al cambiar de idioma. */
export function useT(): (key: string, vars?: Record<string, string | number>) => string {
  const { lang } = useSettings();
  return (key: string, vars?: Record<string, string | number>) => (vars ? fmt(tr(key, lang), vars) : tr(key, lang));
}
