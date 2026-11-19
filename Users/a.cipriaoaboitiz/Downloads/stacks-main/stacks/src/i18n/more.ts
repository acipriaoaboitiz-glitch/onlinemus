/** Ocho juegos clásicos nuevos (Parchís, Ajedrez, Damas, Solitario, Mahjong, 2048, Sudoku y Buscaminas) y las 5 secciones del lobby, en 4 idiomas. */
type Dict = Record<string, string>;

const names = (v: Record<string, [string, string, string]>): Dict => {
  const d: Dict = {};
  for (const [id, [name, tag, pl]] of Object.entries(v)) { d[`g.${id}.name`] = name; d[`g.${id}.tag`] = tag; d[`g.${id}.pl`] = pl; }
  return d;
};

export const moreEs: Dict = {
  'cat.all': 'Todos', 'cat.es': 'Baraja Española', 'cat.casino': 'Cartas & Casino', 'cat.mesa': 'Mesa & Estrategia', 'cat.logic': 'Lógica & Ingenio',
  'mode.title': 'Modo', 'mode.easy': 'Fácil', 'mode.normal': 'Normal', 'mode.expert': 'Experto', 'mode.draw1': 'Robar 1', 'mode.draw3': 'Robar 3', 'lobby.playNow': 'Jugar ahora',
  'g8.score': 'Puntos', 'g8.best': 'Récord', 'g8.actions': 'Acciones', 'g8.undo': 'Deshacer', 'g8.newGame': 'Nueva partida', 'g8.over': 'Fin de la partida', 'g8.mines': 'Minas', 'g8.time': 'Tiempo',
  'g8.dig': 'Cavar', 'g8.flag': 'Bandera', 'g8.errors': 'Errores', 'g8.notes': 'Notas', 'g8.erase': 'Borrar', 'g8.won': '¡Completado!', 'g8.lost': 'Partida perdida', 'g8.moves': 'Movimientos',
  'g8.auto': 'Autocompletar', 'g8.tiles': 'Fichas', 'g8.hint': 'Pista', 'g8.shuffle': 'Mezclar', 'g8.captured': 'Capturadas', 'g8.promote': 'Coronar', 'g8.draw': 'Tablas',
  'dm8.mine': 'Tuyas', 'dm8.rival': 'Rival', 'pc.goal': 'Fichas en meta', 'pc.roll': 'Tirar',
  'm.winLogic': 'Completa un juego de Lógica & Ingenio',
  ...names({
    parchis: ['Parchís', 'Saca un 5, captura y llega a casa', '2–4 jugadores'], ajedrez: ['Ajedrez', 'Reglas completas, tres niveles', '1v1'], damas: ['Damas', 'Captura obligatoria y saltos', '1v1'],
    solitario: ['Solitario', 'Klondike clásico, robar 1 o 3', '1 jugador'], mahjong: ['Mahjong', 'Pirámide de fichas de marfil', '1 jugador'], game2048: ['2048', 'Fusiona hasta el oro imperial', '1 jugador'],
    sudoku: ['Sudoku', 'Lógica pura 9×9', '1 jugador'], buscaminas: ['Buscaminas', 'Despeja sin pisar una mina', '1 jugador'],
  }),
};

export const moreEn: Dict = {
  'cat.all': 'All', 'cat.es': 'Spanish Deck', 'cat.casino': 'Cards & Casino', 'cat.mesa': 'Table & Strategy', 'cat.logic': 'Logic & Wit',
  'mode.title': 'Mode', 'mode.easy': 'Easy', 'mode.normal': 'Normal', 'mode.expert': 'Expert', 'mode.draw1': 'Draw 1', 'mode.draw3': 'Draw 3', 'lobby.playNow': 'Play now',
  'g8.score': 'Score', 'g8.best': 'Best', 'g8.actions': 'Actions', 'g8.undo': 'Undo', 'g8.newGame': 'New game', 'g8.over': 'Game over', 'g8.mines': 'Mines', 'g8.time': 'Time',
  'g8.dig': 'Dig', 'g8.flag': 'Flag', 'g8.errors': 'Errors', 'g8.notes': 'Notes', 'g8.erase': 'Erase', 'g8.won': 'Completed!', 'g8.lost': 'Game lost', 'g8.moves': 'Moves',
  'g8.auto': 'Auto-complete', 'g8.tiles': 'Tiles', 'g8.hint': 'Hint', 'g8.shuffle': 'Shuffle', 'g8.captured': 'Captured', 'g8.promote': 'Promote', 'g8.draw': 'Draw',
  'dm8.mine': 'Yours', 'dm8.rival': 'Rival', 'pc.goal': 'Pieces home', 'pc.roll': 'Roll',
  'm.winLogic': 'Complete a Logic & Wit game',
  ...names({
    parchis: ['Ludo', 'Roll a 5, capture and get home', '2–4 players'], ajedrez: ['Chess', 'Full rules, three levels', '1v1'], damas: ['Checkers', 'Forced captures and jumps', '1v1'],
    solitario: ['Solitaire', 'Classic Klondike, draw 1 or 3', '1 player'], mahjong: ['Mahjong', 'Ivory tile pyramid', '1 player'], game2048: ['2048', 'Merge up to imperial gold', '1 player'],
    sudoku: ['Sudoku', 'Pure 9×9 logic', '1 player'], buscaminas: ['Minesweeper', 'Clear it without a blast', '1 player'],
  }),
};

export const moreFr: Dict = {
  'cat.all': 'Tous', 'cat.es': 'Jeu espagnol', 'cat.casino': 'Cartes & Casino', 'cat.mesa': 'Table & Stratégie', 'cat.logic': 'Logique & Esprit',
  'mode.title': 'Mode', 'mode.easy': 'Facile', 'mode.normal': 'Normal', 'mode.expert': 'Expert', 'mode.draw1': 'Piocher 1', 'mode.draw3': 'Piocher 3', 'lobby.playNow': 'Jouer maintenant',
  'g8.score': 'Points', 'g8.best': 'Record', 'g8.actions': 'Actions', 'g8.undo': 'Annuler', 'g8.newGame': 'Nouvelle partie', 'g8.over': 'Fin de partie', 'g8.mines': 'Mines', 'g8.time': 'Temps',
  'g8.dig': 'Creuser', 'g8.flag': 'Drapeau', 'g8.errors': 'Erreurs', 'g8.notes': 'Notes', 'g8.erase': 'Effacer', 'g8.won': 'Terminé !', 'g8.lost': 'Partie perdue', 'g8.moves': 'Coups',
  'g8.auto': 'Auto-terminer', 'g8.tiles': 'Tuiles', 'g8.hint': 'Indice', 'g8.shuffle': 'Mélanger', 'g8.captured': 'Capturées', 'g8.promote': 'Promouvoir', 'g8.draw': 'Nulle',
  'dm8.mine': 'À vous', 'dm8.rival': 'Rival', 'pc.goal': 'Pions arrivés', 'pc.roll': 'Lancer',
  'm.winLogic': 'Terminez un jeu de Logique & Esprit',
  ...names({
    parchis: ['Petits Chevaux', 'Sortez avec un 5, capturez, rentrez', '2–4 joueurs'], ajedrez: ['Échecs', 'Règles complètes, trois niveaux', '1v1'], damas: ['Dames', 'Prise obligatoire et sauts', '1v1'],
    solitario: ['Solitaire', 'Klondike classique, piocher 1 ou 3', '1 joueur'], mahjong: ['Mahjong', 'Pyramide de tuiles en ivoire', '1 joueur'], game2048: ['2048', 'Fusionnez jusqu’à l’or impérial', '1 joueur'],
    sudoku: ['Sudoku', 'Logique pure 9×9', '1 joueur'], buscaminas: ['Démineur', 'Déminez sans exploser', '1 joueur'],
  }),
};

export const moreDe: Dict = {
  'cat.all': 'Alle', 'cat.es': 'Spanisches Blatt', 'cat.casino': 'Karten & Casino', 'cat.mesa': 'Tisch & Strategie', 'cat.logic': 'Logik & Köpfchen',
  'mode.title': 'Modus', 'mode.easy': 'Leicht', 'mode.normal': 'Normal', 'mode.expert': 'Experte', 'mode.draw1': '1 ziehen', 'mode.draw3': '3 ziehen', 'lobby.playNow': 'Jetzt spielen',
  'g8.score': 'Punkte', 'g8.best': 'Rekord', 'g8.actions': 'Aktionen', 'g8.undo': 'Zurück', 'g8.newGame': 'Neues Spiel', 'g8.over': 'Spiel vorbei', 'g8.mines': 'Minen', 'g8.time': 'Zeit',
  'g8.dig': 'Graben', 'g8.flag': 'Flagge', 'g8.errors': 'Fehler', 'g8.notes': 'Notizen', 'g8.erase': 'Löschen', 'g8.won': 'Geschafft!', 'g8.lost': 'Spiel verloren', 'g8.moves': 'Züge',
  'g8.auto': 'Automatisch', 'g8.tiles': 'Steine', 'g8.hint': 'Tipp', 'g8.shuffle': 'Mischen', 'g8.captured': 'Geschlagen', 'g8.promote': 'Umwandeln', 'g8.draw': 'Remis',
  'dm8.mine': 'Deine', 'dm8.rival': 'Gegner', 'pc.goal': 'Figuren im Ziel', 'pc.roll': 'Würfeln',
  'm.winLogic': 'Schließe ein Logik- & Denkspiel ab',
  ...names({
    parchis: ['Ludo', 'Mit der 5 raus, schlagen, nach Hause', '2–4 Spieler'], ajedrez: ['Schach', 'Alle Regeln, drei Stufen', '1v1'], damas: ['Dame', 'Schlagzwang und Sprünge', '1v1'],
    solitario: ['Solitär', 'Klassisches Klondike, 1 oder 3 ziehen', '1 Spieler'], mahjong: ['Mahjong', 'Pyramide aus Elfenbeinsteinen', '1 Spieler'], game2048: ['2048', 'Verschmelze bis zum Kaisergold', '1 Spieler'],
    sudoku: ['Sudoku', 'Reine 9×9-Logik', '1 Spieler'], buscaminas: ['Minesweeper', 'Räume ohne Knall frei', '1 Spieler'],
  }),
};

/** Reglas (modal «?») en inglés, francés y alemán. */
export const MORE_RULES: Record<'en' | 'fr' | 'de', Record<string, string[]>> = {
  en: {
    parchis: ['Each player has 4 pieces at home; bring all 4 to the central goal to win. One die is used.', 'A 5 brings a piece out to your start square. A 6 gives another roll. Two pieces on one square form a barrier nobody can pass.', 'Landing on a rival piece (not on a star-marked safe square) captures it and gives you 20 bonus steps with another piece.', 'Reaching the goal needs an exact roll and gives 10 bonus steps. Captured pieces go back home.'],
    ajedrez: ['Official rules: every piece moves its own way and the aim is to checkmate the enemy king.', 'Tap a piece to see its valid squares. Castling, en passant and promotion (choose a piece in the bottom bar) are included.', 'You cannot leave your king in check. A king in check glows crimson. No moves and no check is a stalemate draw.', 'Against the AI choose Easy, Normal or Expert.'],
    damas: ['8×8 board: pieces move diagonally forward on the dark squares.', 'Capturing is mandatory: jump over a rival piece to a free square, chaining several jumps when possible.', 'Reaching the last row crowns the piece a King, which moves and captures backwards too.', 'Win by capturing every rival piece or leaving them without moves.'],
    solitario: ['Klondike: 7 tableau columns, a draw pile and 4 foundations built from Ace to King by suit.', 'On the columns build down in alternating colours. A King (or a run starting with a King) can fill an empty column.', 'Tap a card to send it to its foundation if it can go; otherwise tap it to select and tap the destination column.', 'Choose Draw 1 or Draw 3. Undo is available, and Auto-complete once every card is face up.'],
    mahjong: ['Clear the whole pyramid by matching identical tiles.', 'A tile is free if nothing lies on top and its left or right side is open. Blocked tiles look dimmed.', 'Tap two matching free tiles to remove them. “Hint” shows a pair and “Shuffle” rearranges the rest.', 'Difficulty limits the hints and shuffles you have.'],
    game2048: ['Swipe (or use the arrow keys) to slide every tile. Two equal tiles merge into one of double value.', 'A new tile (2 or 4) appears after each move. Reach 2048 — you can keep going afterwards.', 'You lose when the board is full and no merges are possible. You can undo moves.', 'Difficulty changes the board size and how many undos you get.'],
    sudoku: ['Fill the 9×9 grid so every row, column and 3×3 box holds 1 to 9 without repeats.', 'Tap a cell to highlight its row, column and equal numbers; use the number pad below.', '“Notes” pencils in candidates. “Erase” clears a cell.', 'You have 3 mistakes: the third one ends the game.'],
    buscaminas: ['Clear every square that has no mine. Each number counts the mines in the 8 squares around it.', 'Your first tap is never a mine. Empty areas open in a cascade.', 'Use the “Dig / Flag” switch below (or long-press a square) to flag mines.', 'Boards: easy 8×8, normal 10×12 and expert 12×16.'],
  },
  fr: {
    parchis: ['Chaque joueur a 4 pions à la maison ; amenez les 4 à l’arrivée centrale pour gagner. On joue avec un dé.', 'Un 5 sort un pion sur votre case de départ. Un 6 fait rejouer. Deux pions sur une case forment une barrière infranchissable.', 'Tomber sur un pion adverse (hors case sûre marquée d’une étoile) le capture et vous donne 20 cases bonus avec un autre pion.', 'Arriver exige un lancer exact et donne 10 cases bonus. Les pions capturés rentrent à la maison.'],
    ajedrez: ['Règles officielles : chaque pièce se déplace à sa façon et le but est de mater le roi adverse.', 'Touchez une pièce pour voir ses cases valides. Roque, prise en passant et promotion (choisissez la pièce dans la barre du bas) sont inclus.', 'Vous ne pouvez pas laisser votre roi en échec. Un roi en échec brille en carmin. Sans coup légal ni échec, c’est pat.', 'Contre l’IA, choisissez Facile, Normal ou Expert.'],
    damas: ['Plateau 8×8 : les pions avancent en diagonale sur les cases sombres.', 'La prise est obligatoire : sautez un pion adverse vers une case libre, en enchaînant plusieurs sauts.', 'Atteindre la dernière rangée couronne le pion en Dame, qui se déplace et prend aussi en arrière.', 'Gagnez en capturant tous les pions adverses ou en les bloquant.'],
    solitario: ['Klondike : 7 colonnes, une pioche et 4 fondations montées de l’As au Roi par couleur.', 'Sur les colonnes, empilez en descendant et en alternant les couleurs. Un Roi (ou une suite commençant par un Roi) occupe une colonne vide.', 'Touchez une carte pour l’envoyer à sa fondation si possible ; sinon touchez-la puis la colonne de destination.', 'Piochez 1 ou 3 cartes. Annuler et Auto-terminer (quand tout est face visible) sont disponibles.'],
    mahjong: ['Videz la pyramide en associant des tuiles identiques.', 'Une tuile est libre si rien ne la recouvre et si son côté gauche ou droit est dégagé. Les bloquées sont assombries.', 'Touchez deux tuiles libres identiques pour les retirer. « Indice » montre une paire et « Mélanger » réorganise le reste.', 'La difficulté limite les indices et les mélanges.'],
    game2048: ['Glissez le doigt (ou utilisez les flèches) pour déplacer toutes les tuiles. Deux tuiles égales fusionnent en une de valeur double.', 'Une nouvelle tuile (2 ou 4) apparaît à chaque coup. Visez 2048, puis continuez si vous voulez.', 'Vous perdez quand la grille est pleine sans fusion possible. Vous pouvez annuler.', 'La difficulté change la taille de la grille et le nombre d’annulations.'],
    sudoku: ['Remplissez la grille 9×9 pour que chaque ligne, colonne et bloc 3×3 contienne 1 à 9 sans répétition.', 'Touchez une case pour surligner sa ligne, sa colonne et les chiffres identiques ; utilisez le pavé numérique.', '« Notes » inscrit des candidats au crayon. « Effacer » vide la case.', 'Vous avez 3 erreurs : la troisième termine la partie.'],
    buscaminas: ['Dégagez toutes les cases sans mine. Chaque chiffre compte les mines dans les 8 cases voisines.', 'Votre premier toucher n’est jamais une mine. Les zones vides s’ouvrent en cascade.', 'Utilisez l’interrupteur « Creuser / Drapeau » (ou un appui long) pour poser un drapeau.', 'Grilles : facile 8×8, normal 10×12, expert 12×16.'],
  },
  de: {
    parchis: ['Jeder Spieler hat 4 Figuren zu Hause; bringe alle 4 ins Ziel in der Mitte. Gespielt wird mit einem Würfel.', 'Eine 5 bringt eine Figur auf dein Startfeld. Eine 6 gibt einen weiteren Wurf. Zwei Figuren auf einem Feld bilden eine Sperre, die niemand passieren kann.', 'Wer auf eine gegnerische Figur zieht (nicht auf ein sicheres Sternfeld), schlägt sie und darf 20 Felder mit einer anderen Figur ziehen.', 'Das Ziel verlangt einen genauen Wurf und bringt 10 Bonusfelder. Geschlagene Figuren gehen nach Hause.'],
    ajedrez: ['Offizielle Regeln: Jede Figur zieht auf ihre Art, Ziel ist es, den gegnerischen König matt zu setzen.', 'Tippe eine Figur an, um ihre gültigen Felder zu sehen. Rochade, En passant und Umwandlung (Figur in der unteren Leiste wählen) sind enthalten.', 'Der eigene König darf nicht im Schach stehen. Ein König im Schach leuchtet karminrot. Ohne Zug und ohne Schach ist es Patt.', 'Gegen die KI wähle Leicht, Normal oder Experte.'],
    damas: ['8×8-Brett: Steine ziehen diagonal vorwärts auf den dunklen Feldern.', 'Schlagen ist Pflicht: Springe über einen gegnerischen Stein auf ein freies Feld, mehrere Sprünge können verkettet werden.', 'Wer die letzte Reihe erreicht, wird zur Dame, die auch rückwärts zieht und schlägt.', 'Gewonnen hat, wer alle gegnerischen Steine schlägt oder blockiert.'],
    solitario: ['Klondike: 7 Spalten, ein Vorratsstapel und 4 Ablagen, die nach Farbe von Ass bis König aufgebaut werden.', 'In den Spalten wird absteigend mit wechselnden Farben gelegt. Ein König (oder eine Reihe ab König) füllt eine leere Spalte.', 'Tippe eine Karte an, um sie auf die Ablage zu schicken, wenn sie passt; sonst wähle sie aus und tippe die Zielspalte.', 'Wähle 1 oder 3 ziehen. Zurück und Automatisch (wenn alle Karten offen sind) stehen bereit.'],
    mahjong: ['Räume die ganze Pyramide ab, indem du gleiche Steine paarst.', 'Ein Stein ist frei, wenn nichts auf ihm liegt und seine linke oder rechte Seite offen ist. Blockierte Steine sind abgedunkelt.', 'Tippe zwei passende freie Steine an, um sie zu entfernen. „Tipp“ zeigt ein Paar, „Mischen“ ordnet den Rest neu.', 'Die Schwierigkeit begrenzt Tipps und Mischvorgänge.'],
    game2048: ['Wische (oder nutze die Pfeiltasten), um alle Steine zu schieben. Zwei gleiche Steine verschmelzen zu einem mit doppeltem Wert.', 'Nach jedem Zug erscheint ein neuer Stein (2 oder 4). Erreiche 2048 – danach kannst du weiterspielen.', 'Du verlierst, wenn das Feld voll ist und nichts mehr verschmilzt. Züge lassen sich zurücknehmen.', 'Die Schwierigkeit ändert die Feldgröße und die Anzahl der Rücknahmen.'],
    sudoku: ['Fülle das 9×9-Gitter so, dass jede Zeile, Spalte und jeder 3×3-Block 1 bis 9 ohne Wiederholung enthält.', 'Tippe ein Feld an, um Zeile, Spalte und gleiche Zahlen hervorzuheben; nutze den Ziffernblock unten.', '„Notizen“ trägt Kandidaten mit Bleistift ein. „Löschen“ leert das Feld.', 'Du hast 3 Fehler: der dritte beendet das Spiel.'],
    buscaminas: ['Räume alle Felder ohne Mine frei. Jede Zahl zählt die Minen in den 8 umliegenden Feldern.', 'Dein erster Tipp ist nie eine Mine. Leere Bereiche öffnen sich in einer Kaskade.', 'Nutze den Schalter „Graben / Flagge“ (oder drücke lange auf ein Feld), um Minen zu markieren.', 'Felder: leicht 8×8, normal 10×12, Experte 12×16.'],
  },
};
