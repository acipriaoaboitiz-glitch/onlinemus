/** Textos de los juegos de mesa del Club VIP (Dominó, El Mentiroso y Ruleta VIP) en español, inglés, francés y alemán. */
type Dict = Record<string, string>;

export const clubEs: Dict = {
  'g.tres.name': '3 en Raya', 'g.tres.tag': 'Serie al mejor de 3', 'g.tres.pl': '1v1',
  'g.cuatro.name': '4 en Raya', 'g.cuatro.tag': 'Deja caer, conecta cuatro', 'g.cuatro.pl': '1v1',
  'g.flota.name': 'Hundir la Flota', 'g.flota.tag': 'Radar 7×7, duelo rápido', 'g.flota.pl': '1v1',
  'fl.shots': 'Disparos', 'fl.ships': 'Barcos', 'fl.random': 'Aleatorio', 'fl.ready': 'Listo', 'fl.actions': 'Acciones',
  'lobby.mesaTitle': 'Juegos de mesa', 'lobby.mesaSub': 'Dominó, dados y ruleta',
  'g.domino.name': 'Dominó', 'g.domino.tag': 'Marfil, doble seis y cierre', 'g.domino.pl': '1v1 · 2v2',
  'g.mentiroso.name': 'El Mentiroso', 'g.mentiroso.tag': 'Dados, faroles y cubiletes', 'g.mentiroso.pl': '2–4 jugadores',
  'g.ruleta.name': 'Ruleta VIP', 'g.ruleta.tag': 'Pleno, docenas y golpe de suerte', 'g.ruleta.pl': 'Mesa compartida',
  'dm.f1': '1 contra 1', 'dm.f2': '2 contra 2 (parejas)', 'dm.intro': 'Al mejor de 3 rondas. Abre el doble más alto.',
  'dm.mustStart': 'Abre con el doble más alto', 'dm.yourTurn': 'Tu turno: toca una ficha', 'dm.wait': 'Juega {n}…', 'dm.actions': 'Acciones', 'dm.left': 'Izquierda', 'dm.right': 'Derecha',
  'dm.draw': 'Robar', 'dm.hand': 'Tus fichas', 'dm.turn': 'Turno', 'dm.pool': 'Pozo', 'dm.pts': 'pts', 'dm.taunt': 'Marfil y madera: así se juega.',
  'mt.f2': '2 jugadores', 'mt.f3': '3 jugadores', 'mt.f4': '4 jugadores', 'mt.intro': '5 dados cada uno. Sube la apuesta o canta ¡MENTIROSO!',
  'mt.firstBid': 'Haz la primera apuesta', 'mt.bidBy': 'Apuesta de {n}', 'mt.found': 'Hay {n} con el {f}', 'mt.loses': '{n} pierde un dado', 'mt.gains': '{n} recupera un dado',
  'mt.tapCup': 'Toca el cubilete', 'mt.out': 'Sin dados', 'mt.raise': 'Subir', 'mt.liar': '¡MENTIROSO!', 'mt.exact': '¡EXACTO!', 'mt.dice': 'Dados restantes', 'mt.taunt': 'Los faroles se pagan caros.', 'mt.winner': 'Gana {n}',
  'rl.even': 'PAR', 'rl.odd': 'IMPAR', 'rl.chips': 'Fichas', 'rl.bet': 'Apuesta', 'rl.actions': 'Acciones', 'rl.undo': 'Deshacer', 'rl.clear': 'Borrar', 'rl.repeat': 'Repetir', 'rl.spin': 'Girar Ruleta',
  'rl.hud': 'Mesa', 'rl.balance': 'Fichas', 'rl.last': 'Últimos',
  'm.handsRl': 'Juega 5 giros de Ruleta', 'm.winTable': 'Gana un juego de Duelos & Mesa',
};

export const clubEn: Dict = {
  'g.tres.name': 'Tic-Tac-Toe', 'g.tres.tag': 'Best of 3 series', 'g.tres.pl': '1v1',
  'g.cuatro.name': 'Connect Four', 'g.cuatro.tag': 'Drop it, connect four', 'g.cuatro.pl': '1v1',
  'g.flota.name': 'Battleship', 'g.flota.tag': '7×7 radar, quick duel', 'g.flota.pl': '1v1',
  'fl.shots': 'Shots', 'fl.ships': 'Ships', 'fl.random': 'Random', 'fl.ready': 'Ready', 'fl.actions': 'Actions',
  'lobby.mesaTitle': 'Table games', 'lobby.mesaSub': 'Dominoes, dice and roulette',
  'g.domino.name': 'Dominoes', 'g.domino.tag': 'Ivory, double six and block', 'g.domino.pl': '1v1 · 2v2',
  'g.mentiroso.name': 'Liar’s Dice', 'g.mentiroso.tag': 'Dice, bluffs and cups', 'g.mentiroso.pl': '2–4 players',
  'g.ruleta.name': 'VIP Roulette', 'g.ruleta.tag': 'Straight-up, dozens and a stroke of luck', 'g.ruleta.pl': 'Shared table',
  'dm.f1': '1 vs 1', 'dm.f2': '2 vs 2 (pairs)', 'dm.intro': 'Best of 3 rounds. The highest double opens.',
  'dm.mustStart': 'Open with the highest double', 'dm.yourTurn': 'Your turn: tap a tile', 'dm.wait': '{n} is playing…', 'dm.actions': 'Actions', 'dm.left': 'Left', 'dm.right': 'Right',
  'dm.draw': 'Draw', 'dm.hand': 'Your tiles', 'dm.turn': 'Turn', 'dm.pool': 'Boneyard', 'dm.pts': 'pts', 'dm.taunt': 'Ivory and wood: that’s how it’s played.',
  'mt.f2': '2 players', 'mt.f3': '3 players', 'mt.f4': '4 players', 'mt.intro': '5 dice each. Raise the bid or call LIAR!',
  'mt.firstBid': 'Make the first bid', 'mt.bidBy': 'Bid by {n}', 'mt.found': '{n} showing {f}', 'mt.loses': '{n} loses a die', 'mt.gains': '{n} regains a die',
  'mt.tapCup': 'Tap the cup', 'mt.out': 'No dice', 'mt.raise': 'Raise', 'mt.liar': 'LIAR!', 'mt.exact': 'EXACT!', 'mt.dice': 'Dice left', 'mt.taunt': 'Bluffs come at a price.', 'mt.winner': '{n} wins',
  'rl.even': 'EVEN', 'rl.odd': 'ODD', 'rl.chips': 'Chips', 'rl.bet': 'Bet', 'rl.actions': 'Actions', 'rl.undo': 'Undo', 'rl.clear': 'Clear', 'rl.repeat': 'Repeat', 'rl.spin': 'Spin Roulette',
  'rl.hud': 'Table', 'rl.balance': 'Chips', 'rl.last': 'Last',
  'm.handsRl': 'Play 5 Roulette spins', 'm.winTable': 'Win a Duels & Table game',
};

export const clubFr: Dict = {
  'g.tres.name': 'Morpion', 'g.tres.tag': 'Série au meilleur de 3', 'g.tres.pl': '1v1',
  'g.cuatro.name': 'Puissance 4', 'g.cuatro.tag': 'Lâchez, alignez quatre', 'g.cuatro.pl': '1v1',
  'g.flota.name': 'Bataille Navale', 'g.flota.tag': 'Radar 7×7, duel rapide', 'g.flota.pl': '1v1',
  'fl.shots': 'Tirs', 'fl.ships': 'Navires', 'fl.random': 'Aléatoire', 'fl.ready': 'Prêt', 'fl.actions': 'Actions',
  'lobby.mesaTitle': 'Jeux de table', 'lobby.mesaSub': 'Dominos, dés et roulette',
  'g.domino.name': 'Dominos', 'g.domino.tag': 'Ivoire, double six et blocage', 'g.domino.pl': '1v1 · 2v2',
  'g.mentiroso.name': 'Le Menteur', 'g.mentiroso.tag': 'Dés, bluffs et gobelets', 'g.mentiroso.pl': '2–4 joueurs',
  'g.ruleta.name': 'Roulette VIP', 'g.ruleta.tag': 'Plein, douzaines et coup de chance', 'g.ruleta.pl': 'Table partagée',
  'dm.f1': '1 contre 1', 'dm.f2': '2 contre 2 (paires)', 'dm.intro': 'Au meilleur de 3 manches. Le plus gros double ouvre.',
  'dm.mustStart': 'Ouvrez avec le plus gros double', 'dm.yourTurn': 'À vous : touchez un domino', 'dm.wait': '{n} joue…', 'dm.actions': 'Actions', 'dm.left': 'Gauche', 'dm.right': 'Droite',
  'dm.draw': 'Piocher', 'dm.hand': 'Vos dominos', 'dm.turn': 'Tour', 'dm.pool': 'Pioche', 'dm.pts': 'pts', 'dm.taunt': 'Ivoire et bois : ainsi se joue.',
  'mt.f2': '2 joueurs', 'mt.f3': '3 joueurs', 'mt.f4': '4 joueurs', 'mt.intro': '5 dés chacun. Surenchérissez ou annoncez MENTEUR !',
  'mt.firstBid': 'Faites la première mise', 'mt.bidBy': 'Mise de {n}', 'mt.found': '{n} avec le {f}', 'mt.loses': '{n} perd un dé', 'mt.gains': '{n} récupère un dé',
  'mt.tapCup': 'Touchez le gobelet', 'mt.out': 'Plus de dés', 'mt.raise': 'Monter', 'mt.liar': 'MENTEUR !', 'mt.exact': 'EXACT !', 'mt.dice': 'Dés restants', 'mt.taunt': 'Les bluffs se paient cher.', 'mt.winner': '{n} gagne',
  'rl.even': 'PAIR', 'rl.odd': 'IMPAIR', 'rl.chips': 'Jetons', 'rl.bet': 'Mise', 'rl.actions': 'Actions', 'rl.undo': 'Annuler', 'rl.clear': 'Effacer', 'rl.repeat': 'Répéter', 'rl.spin': 'Lancer la roulette',
  'rl.hud': 'Table', 'rl.balance': 'Jetons', 'rl.last': 'Derniers',
  'm.handsRl': 'Jouez 5 tours de Roulette', 'm.winTable': 'Gagnez un jeu Duels & Table',
};

export const clubDe: Dict = {
  'g.tres.name': 'Drei gewinnt', 'g.tres.tag': 'Serie, Best of 3', 'g.tres.pl': '1v1',
  'g.cuatro.name': 'Vier gewinnt', 'g.cuatro.tag': 'Fallen lassen, vier verbinden', 'g.cuatro.pl': '1v1',
  'g.flota.name': 'Schiffe versenken', 'g.flota.tag': '7×7-Radar, Schnellduell', 'g.flota.pl': '1v1',
  'fl.shots': 'Schüsse', 'fl.ships': 'Schiffe', 'fl.random': 'Zufällig', 'fl.ready': 'Bereit', 'fl.actions': 'Aktionen',
  'lobby.mesaTitle': 'Tischspiele', 'lobby.mesaSub': 'Domino, Würfel und Roulette',
  'g.domino.name': 'Domino', 'g.domino.tag': 'Elfenbein, Doppelsechs und Blockade', 'g.domino.pl': '1v1 · 2v2',
  'g.mentiroso.name': 'Lügner', 'g.mentiroso.tag': 'Würfel, Bluffs und Becher', 'g.mentiroso.pl': '2–4 Spieler',
  'g.ruleta.name': 'VIP-Roulette', 'g.ruleta.tag': 'Plein, Dutzende und Glückstreffer', 'g.ruleta.pl': 'Gemeinsamer Tisch',
  'dm.f1': '1 gegen 1', 'dm.f2': '2 gegen 2 (Paare)', 'dm.intro': 'Best of 3 Runden. Der höchste Pasch eröffnet.',
  'dm.mustStart': 'Mit dem höchsten Pasch eröffnen', 'dm.yourTurn': 'Du bist dran: Stein antippen', 'dm.wait': '{n} spielt…', 'dm.actions': 'Aktionen', 'dm.left': 'Links', 'dm.right': 'Rechts',
  'dm.draw': 'Ziehen', 'dm.hand': 'Deine Steine', 'dm.turn': 'Zug', 'dm.pool': 'Vorrat', 'dm.pts': 'Pkt', 'dm.taunt': 'Elfenbein und Holz: so wird gespielt.',
  'mt.f2': '2 Spieler', 'mt.f3': '3 Spieler', 'mt.f4': '4 Spieler', 'mt.intro': 'Je 5 Würfel. Erhöhe das Gebot oder rufe LÜGNER!',
  'mt.firstBid': 'Mach das erste Gebot', 'mt.bidBy': 'Gebot von {n}', 'mt.found': '{n} mal die {f}', 'mt.loses': '{n} verliert einen Würfel', 'mt.gains': '{n} bekommt einen Würfel zurück',
  'mt.tapCup': 'Becher antippen', 'mt.out': 'Keine Würfel', 'mt.raise': 'Erhöhen', 'mt.liar': 'LÜGNER!', 'mt.exact': 'GENAU!', 'mt.dice': 'Verbleibende Würfel', 'mt.taunt': 'Bluffs kosten.', 'mt.winner': '{n} gewinnt',
  'rl.even': 'GERADE', 'rl.odd': 'UNGERADE', 'rl.chips': 'Chips', 'rl.bet': 'Einsatz', 'rl.actions': 'Aktionen', 'rl.undo': 'Zurück', 'rl.clear': 'Löschen', 'rl.repeat': 'Wiederholen', 'rl.spin': 'Roulette drehen',
  'rl.hud': 'Tisch', 'rl.balance': 'Chips', 'rl.last': 'Zuletzt',
  'm.handsRl': 'Spiele 5 Roulette-Drehungen', 'm.winTable': 'Gewinne ein Duell- & Tischspiel',
};

/** Reglas (modal «?») de los tres juegos en inglés, francés y alemán. El español sale del registro. */
export const CLUB_RULES: Record<'en' | 'fr' | 'de', Record<string, string[]>> = {
  en: {
    tres: [
      "3×3 board. One plays X (gold) and the other O (ivory); take turns placing a piece on a free square.",
      "Whoever lines up three of their pieces horizontally, vertically or diagonally wins the round. A golden bolt marks the winning line.",
      "If the board fills with no line it is a draw and the round does not score. Each round starts with a different player.",
      "First to win 2 rounds wins the match (best of 3).",
    ],
    cuatro: [
      "Vertical board of 7 columns by 6 rows. Tap a column to drop your piece (gold or ruby): it falls to the lowest free square.",
      "Whoever connects four of their pieces in a row, column or diagonal wins the round. The four light up with a golden halo.",
      "If the board fills with no connection it is a draw. Each round starts with a different player.",
      "First to win 2 rounds wins the match (best of 3).",
    ],
    flota: [
      "Each player has 4 ships of 4, 3, 2 and 2 squares on a 7×7 board. Press “Random” to reshuffle your fleet and “Ready” when you like it.",
      "On your turn tap a square on the enemy radar to fire. A blue wave means water; a gold and crimson flash means a hit.",
      "Hit a ship and you fire again; miss and the turn passes. A ship with every square hit is sunk.",
      "Whoever sinks the whole enemy fleet first wins. Games last 2 to 3 minutes.",
    ],
    domino: [
      'Played with 28 tiles (double blank to double six). Each player gets 7 tiles; in 1v1 the other 14 form the boneyard, and 2v2 is played in pairs.',
      'The player with the highest double (6-6) opens. Then, on your turn, place a tile matching either end of the chain. Tap a tile and, if it fits both ends, choose Left or Right.',
      'If you cannot play, in 1v1 you draw from the boneyard until you can; if it is empty (or in 2v2), you pass.',
      'DOMINO! goes to whoever empties their hand; BLOCK! if nobody can move, the lowest hand wins. The winner scores the rivals’ pips. First to win 2 rounds takes the match (best of 3).',
    ],
    mentiroso: [
      'Each player has 5 dice under a cup. Tap your cup to lift it and peek at your dice in secret.',
      'On your turn you raise the bid on how many dice of one face are on the WHOLE table (“four 5s”): a higher quantity, or the same quantity with a higher face.',
      'Or call “LIAR!” if you think the last bid is false: every cup is lifted and the dice are counted. If there are fewer than bid, the bidder loses a die; if there are as many or more, you lose one.',
      '“EXACT!” (if there are exactly the bid dice you regain one; otherwise you lose one). The loser of the duel opens the next round. Last player with dice wins.',
    ],
    ruleta: [
      'European roulette with 37 pockets (0–36). Pick a 10, 50, 100 or 500 chip and tap the board to bet; you can place several bets.',
      'A straight-up number pays ×36 (35 to 1). A dozen (1–12, 13–24, 25–36) pays ×3. Red/Black and Even/Odd pay ×2. Zero only pays straight-up.',
      'Press “Spin Roulette”: the wheel and ball slow down until the ball drops into a pocket and winning bets are paid.',
      'Undo removes the last chip, Clear removes all and Repeat places the previous spin’s bets again. Virtual chips, never real money.',
    ],
  },
  fr: {
    tres: [
      "Plateau 3×3. L’un joue X (or) et l’autre O (ivoire) ; chacun pose à son tour un pion sur une case libre.",
      "Celui qui aligne trois pions à l’horizontale, à la verticale ou en diagonale gagne la manche. Un éclair doré marque la ligne.",
      "Si le plateau se remplit sans ligne, c’est nul et la manche ne compte pas. Chaque manche est ouverte par un joueur différent.",
      "Le premier à gagner 2 manches remporte la partie (au meilleur de 3).",
    ],
    cuatro: [
      "Plateau vertical de 7 colonnes sur 6 rangées. Touchez une colonne pour lâcher votre jeton (or ou rubis) : il tombe sur la case libre la plus basse.",
      "Celui qui aligne quatre jetons en ligne, colonne ou diagonale gagne la manche. Les quatre s’illuminent d’un halo doré.",
      "Si le plateau se remplit sans alignement, c’est nul. Chaque manche est ouverte par un joueur différent.",
      "Le premier à gagner 2 manches remporte la partie (au meilleur de 3).",
    ],
    flota: [
      "Chaque joueur a 4 navires de 4, 3, 2 et 2 cases sur un plateau 7×7. Appuyez sur « Aléatoire » pour replacer votre flotte et sur « Prêt » quand elle vous plaît.",
      "À votre tour, touchez une case du radar adverse pour tirer. Une onde bleue signifie à l’eau ; un éclat or et carmin, touché.",
      "Si vous touchez, vous rejouez ; sinon le tour passe. Un navire dont toutes les cases sont touchées est coulé.",
      "Le premier à couler toute la flotte adverse gagne. Parties de 2 à 3 minutes.",
    ],
    domino: [
      'Se joue avec 28 dominos (du double blanc au double six). Chacun reçoit 7 dominos ; en 1v1 les 14 restants forment la pioche, et le 2v2 se joue par paires.',
      'Le joueur qui a le plus gros double (6-6) ouvre. Ensuite, à votre tour, posez un domino qui correspond à l’un des deux bouts de la chaîne. Touchez un domino et, s’il s’adapte aux deux bouts, choisissez Gauche ou Droite.',
      'Si vous ne pouvez pas jouer, en 1v1 vous piochez jusqu’à pouvoir jouer ; si la pioche est vide (ou en 2v2), vous passez.',
      'DOMINO ! à celui qui vide sa main ; BLOCAGE ! si personne ne peut jouer, la plus petite main gagne. Le vainqueur marque les points des adversaires. Le premier à gagner 2 manches remporte la partie (au meilleur de 3).',
    ],
    mentiroso: [
      'Chaque joueur a 5 dés sous son gobelet. Touchez votre gobelet pour le soulever et voir vos dés en secret.',
      'À votre tour, surenchérissez sur le nombre de dés d’une face sur TOUTE la table (« quatre 5 ») : plus de dés, ou autant avec une face plus haute.',
      'Ou annoncez « MENTEUR ! » si vous pensez que la mise précédente est fausse : tous les gobelets se soulèvent et on compte. S’il y en a moins que misé, le parieur perd un dé ; s’il y en a autant ou plus, c’est vous.',
      '« EXACT ! » (s’il y en a exactement autant, vous récupérez un dé ; sinon vous en perdez un). Le perdant du duel ouvre la manche suivante. Le dernier joueur avec des dés gagne.',
    ],
    ruleta: [
      'Roulette européenne à 37 cases (0–36). Choisissez un jeton de 10, 50, 100 ou 500 et touchez le tapis pour miser ; vous pouvez faire plusieurs mises.',
      'Un plein paie ×36 (35 contre 1). Une douzaine (1–12, 13–24, 25–36) paie ×3. Rouge/Noir et Pair/Impair paient ×2. Le 0 ne paie que le plein.',
      'Appuyez sur « Lancer la roulette » : la roue et la bille ralentissent jusqu’à ce que la bille tombe dans une case et que les mises gagnantes soient payées.',
      'Annuler retire le dernier jeton, Effacer les retire tous et Répéter replace les mises du tour précédent. Jetons virtuels, jamais d’argent réel.',
    ],
  },
  de: {
    tres: [
      "3×3-Brett. Einer spielt X (Gold), der andere O (Elfenbein); abwechselnd wird ein Stein auf ein freies Feld gesetzt.",
      "Wer drei eigene Steine waagerecht, senkrecht oder diagonal in eine Reihe bringt, gewinnt die Runde. Ein goldener Blitz markiert die Linie.",
      "Ist das Brett voll ohne Reihe, ist es unentschieden und die Runde zählt nicht. Jede Runde eröffnet ein anderer Spieler.",
      "Wer zuerst 2 Runden gewinnt, gewinnt das Spiel (Best of 3).",
    ],
    cuatro: [
      "Senkrechtes Brett mit 7 Spalten und 6 Reihen. Tippe auf eine Spalte, um deinen Stein (Gold oder Rubin) fallen zu lassen: er fällt aufs unterste freie Feld.",
      "Wer vier eigene Steine in einer Reihe, Spalte oder Diagonale verbindet, gewinnt die Runde. Die vier leuchten in einem goldenen Schein.",
      "Ist das Brett voll ohne Vierer, ist es unentschieden. Jede Runde eröffnet ein anderer Spieler.",
      "Wer zuerst 2 Runden gewinnt, gewinnt das Spiel (Best of 3).",
    ],
    flota: [
      "Jeder Spieler hat 4 Schiffe mit 4, 3, 2 und 2 Feldern auf einem 7×7-Brett. „Zufällig“ ordnet deine Flotte neu, „Bereit“ bestätigt sie.",
      "Tippe in deinem Zug auf ein Feld des gegnerischen Radars, um zu schießen. Blaue Welle heißt Wasser; goldener und karminroter Blitz heißt Treffer.",
      "Triffst du ein Schiff, schießt du erneut; bei Fehlschuss wechselt der Zug. Ein Schiff mit allen getroffenen Feldern ist versenkt.",
      "Wer zuerst die ganze gegnerische Flotte versenkt, gewinnt. Partien dauern 2 bis 3 Minuten.",
    ],
    domino: [
      'Gespielt wird mit 28 Steinen (vom Doppel-Blank bis zur Doppelsechs). Jeder erhält 7 Steine; im 1v1 bilden die übrigen 14 den Vorrat, 2v2 wird in Paaren gespielt.',
      'Wer den höchsten Pasch (6-6) hat, eröffnet. Danach legst du einen Stein an, der zu einem Ende der Kette passt. Tippe einen Stein an und wähle bei zwei Möglichkeiten Links oder Rechts.',
      'Kannst du nicht legen, ziehst du im 1v1 vom Vorrat, bis du kannst; ist er leer (oder im 2v2), passt du.',
      'DOMINO! für den, der seine Hand leert; BLOCKADE! wenn niemand mehr ziehen kann, gewinnt die kleinste Hand. Der Sieger erhält die Augen der Gegner. Wer zuerst 2 Runden gewinnt, gewinnt das Spiel (Best of 3).',
    ],
    mentiroso: [
      'Jeder Spieler hat 5 Würfel unter einem Becher. Tippe deinen Becher an, um ihn zu heben und heimlich zu schauen.',
      'Du erhöhst das Gebot, wie viele Würfel einer Augenzahl am GANZEN Tisch liegen („vier 5er“): mehr Würfel oder gleich viele mit höherer Augenzahl.',
      'Oder rufe „LÜGNER!“, wenn du das letzte Gebot für falsch hältst: alle Becher werden gehoben und gezählt. Sind es weniger als geboten, verliert der Bieter einen Würfel; sind es gleich viele oder mehr, verlierst du einen.',
      '„GENAU!“ (liegen genau so viele, bekommst du einen Würfel zurück; sonst verlierst du einen). Wer das Duell verliert, eröffnet die nächste Runde. Gewinner ist der letzte Spieler mit Würfeln.',
    ],
    ruleta: [
      'Europäisches Roulette mit 37 Fächern (0–36). Wähle einen Chip (10, 50, 100 oder 500) und tippe aufs Feld, um zu setzen; mehrere Einsätze sind möglich.',
      'Plein zahlt ×36 (35 zu 1). Dutzend (1–12, 13–24, 25–36) zahlt ×3. Rot/Schwarz und Gerade/Ungerade zahlen ×2. Die 0 zahlt nur beim Plein.',
      'Drücke „Roulette drehen“: Rad und Kugel werden langsamer, bis die Kugel in ein Fach fällt und Gewinne ausgezahlt werden.',
      'Zurück nimmt den letzten Chip weg, Löschen alle, und Wiederholen setzt die Einsätze der letzten Runde erneut. Virtuelle Chips, nie echtes Geld.',
    ],
  },
};

/** Secciones del lobby. */
export const catEs: Record<string, string> = { 'cat.all': 'Todos', 'cat.es': 'Baraja Española', 'cat.casino': 'Casino & Cartas', 'cat.duel': 'Duelos & Mesa' };
export const catEn: Record<string, string> = { 'cat.all': 'All', 'cat.es': 'Spanish Deck', 'cat.casino': 'Casino & Cards', 'cat.duel': 'Duels & Table' };
export const catFr: Record<string, string> = { 'cat.all': 'Tous', 'cat.es': 'Jeu espagnol', 'cat.casino': 'Casino & Cartes', 'cat.duel': 'Duels & Table' };
export const catDe: Record<string, string> = { 'cat.all': 'Alle', 'cat.es': 'Spanisches Blatt', 'cat.casino': 'Casino & Karten', 'cat.duel': 'Duelle & Tisch' };

/** Subtítulos de Ajustes. */
export const setEs: Record<string, string> = { 'set.soundSub': 'Efectos y fichas', 'set.vibSub': 'Respuesta háptica al jugar', 'set.speedSub': 'Ritmo de las animaciones' };
export const setEn: Record<string, string> = { 'set.soundSub': 'Effects and chips', 'set.vibSub': 'Haptic feedback while playing', 'set.speedSub': 'Animation pace' };
export const setFr: Record<string, string> = { 'set.soundSub': 'Effets et jetons', 'set.vibSub': 'Retour haptique en jouant', 'set.speedSub': 'Rythme des animations' };
export const setDe: Record<string, string> = { 'set.soundSub': 'Effekte und Chips', 'set.vibSub': 'Haptisches Feedback beim Spielen', 'set.speedSub': 'Tempo der Animationen' };
