/**
 * Señas del Mus. Viajan por un canal privado de la pareja (nunca por el canal de la mesa).
 * Gestos habituales según Pagat y las reglas vascas; hay variantes regionales, por eso es un catálogo editable.
 */
import { handTotal, norm, paresInfo } from './evaluate.ts';
import type { Rules } from './evaluate.ts';
import type { Card } from './types.ts';

export type SignId =
  | 'ciego' | 'dos_reyes' | 'tres_reyes' | 'cuatro_reyes' | 'solomillo'
  | 'dos_cerdos' | 'tres_cerdos' | 'cuatro_cerdos'
  | 'medias' | 'duples' | 'treinta_y_una' | 'treinta'
  | 'quiero_mus' | 'no_mus';

export interface SignDef {
  id: SignId;
  label: string;
  /** El gesto real que representa (para el tutorial y el tooltip). */
  gesture: string;
  group: 'cartas' | 'jugada' | 'mus';
}

export const SIGNS: readonly SignDef[] = [
  { id: 'ciego', label: 'Ciego', gesture: 'Cerrar los ojos: sin pares ni juego', group: 'jugada' },
  { id: 'dos_reyes', label: 'Dos reyes', gesture: 'Morderse el labio inferior', group: 'cartas' },
  { id: 'tres_reyes', label: 'Tres reyes', gesture: 'Morderse el labio inferior hacia un lado', group: 'cartas' },
  { id: 'cuatro_reyes', label: 'Cuatro reyes', gesture: 'Morderse el labio inferior dos veces', group: 'cartas' },
  { id: 'solomillo', label: 'Solomillo', gesture: 'Beso al aire: tres reyes y un as', group: 'cartas' },
  { id: 'dos_cerdos', label: 'Dos cerdos', gesture: 'Sacar la punta de la lengua', group: 'cartas' },
  { id: 'tres_cerdos', label: 'Tres cerdos', gesture: 'Sacar la lengua hacia un lado', group: 'cartas' },
  { id: 'cuatro_cerdos', label: 'Cuatro cerdos', gesture: 'Sacar la lengua dos veces', group: 'cartas' },
  { id: 'medias', label: 'Medias', gesture: 'Torcer la boca hacia un lado', group: 'jugada' },
  { id: 'duples', label: 'Duples', gesture: 'Levantar las cejas', group: 'jugada' },
  { id: 'treinta_y_una', label: '31', gesture: 'Guiñar un ojo', group: 'jugada' },
  { id: 'treinta', label: 'Punto de 30', gesture: 'Encoger un hombro', group: 'jugada' },
  { id: 'quiero_mus', label: 'Quiero mus', gesture: 'Labios como diciendo «mus»', group: 'mus' },
  { id: 'no_mus', label: 'Corta', gesture: 'Inclinar la cabeza a un lado', group: 'mus' },
];

/**
 * ¿Es cierta la seña con esta mano? Con `truthfulSigns` activo la UI solo habilita las veraces
 * (mentirle a tu pareja solo te perjudica a ti, así que basta con comprobarlo en el cliente).
 */
export function signIsTruthful(id: SignId, hand: readonly Card[], r: Rules): boolean {
  const kings = hand.filter((c) => norm(c.rank, r) === 12).length;
  const aces = hand.filter((c) => norm(c.rank, r) === 1).length;
  const total = handTotal(hand, r);
  const pares = paresInfo(hand, r).kind;
  switch (id) {
    case 'ciego': return pares === 0 && total < 31;
    case 'dos_reyes': return kings === 2;
    case 'tres_reyes': return kings === 3;
    case 'cuatro_reyes': return kings === 4;
    case 'solomillo': return kings === 3 && aces === 1;
    case 'dos_cerdos': return aces === 2;
    case 'tres_cerdos': return aces === 3;
    case 'cuatro_cerdos': return aces === 4;
    case 'medias': return pares === 2;
    case 'duples': return pares === 3;
    case 'treinta_y_una': return total === 31;
    case 'treinta': return total === 30;
    case 'quiero_mus':
    case 'no_mus':
      return true; // intenciones, no cartas: no se pueden comprobar
  }
}
