Set vectorial opcional de UNO (108 cartas). Si esta carpeta contiene los SVG, el juego los usa;
si no, dibuja el diseño vectorial propio (src/games/uno/UnoCard.tsx).

Nombres esperados:
  {red|yellow|green|blue}_{0-9|skip|reverse|draw2}.svg     p. ej. red_7.svg, blue_skip.svg
  wild_wild.svg (comodin)  ·  wild_wild4.svg (comodin +4)  ·  back.svg (reverso)

Proporcion 2:3. Solo se comprueba red_0.svg una vez al abrir UNO.
