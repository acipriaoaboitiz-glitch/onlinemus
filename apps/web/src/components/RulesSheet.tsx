import { Sheet } from './ui.tsx';

/** Chuleta de puntuación para quien no se sabe el Mus de memoria. */
export function RulesSheet({ open, onClose, eightKings }: { open: boolean; onClose: () => void; eightKings: boolean }) {
  return (
    <Sheet open={open} onClose={onClose} title="Cómo se puntúa">
      <div className="rules">
        <h3>Lances, por orden</h3>
        <p><b>Grande</b>: gana la carta más alta. <b>Chica</b>: la más baja. <b>Pares</b>: pareja, medias (tres iguales) o duples (dos parejas). <b>Juego</b>: sumar 31 o más; si nadie lo tiene se juega al <b>Punto</b> (el más cercano a 30).</p>
        <h3>Valores</h3>
        <p>Figuras valen 10, el as 1{eightKings && <>. Con 8 reyes el <b>3 es rey</b> (vale 10) y el <b>2 es as</b> (vale 1)</>}. Juego, de mejor a peor: 31, 32, 40, 37, 36, 35, 34, 33.</p>
        <h3>Puntos</h3>
        <ul>
          <li>Grande, Chica y Punto: 1 piedra si todos pasan.</li>
          <li>Pares: 1 por pares, 2 por medias, 3 por duples (los de los dos compañeros).</li>
          <li>Juego: 3 por el 31 y 2 por los demás.</li>
          <li>Un envite aceptado se lo lleva el ganador del lance; si nadie quiere, quien envidó cobra al instante lo ya aceptado (el <b>deje</b>).</li>
          <li><b>Órdago</b>: si se acepta, quien gane ese lance gana el juego.</li>
        </ul>
        <h3>Marcador</h3>
        <p>Un <b>amarraco</b> son 5 piedras. Cuando faltan 5 o menos para ganar el juego, el equipo está <b>dentro</b>. Los empates los gana quien está más cerca de la mano.</p>
        <h3>Señas y pilladas</h3>
        <p>Mantén pulsado <b>tu avatar</b> para pasarle una seña a tu pareja (solo ella la ve). Si sospechas de una seña rival, toca el <b>ojo</b> mientras late: si aciertas, la seña queda expuesta; si fallas, el ojo se bloquea 10 s. Ninguna de las dos cosas cambia las piedras.</p>
      </div>
    </Sheet>
  );
}
