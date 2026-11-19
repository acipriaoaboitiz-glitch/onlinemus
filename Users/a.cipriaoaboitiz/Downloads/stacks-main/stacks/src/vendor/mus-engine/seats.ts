import type { Seat, Team } from './types.ts';

export const SEATS: readonly Seat[] = [0, 1, 2, 3];

/** Asientos 0-2 = equipo 0 · asientos 1-3 = equipo 1. */
export const teamOf = (seat: Seat): Team => (seat % 2) as Team;
export const partnerOf = (seat: Seat): Seat => ((seat + 2) % 4) as Seat;
export const nextSeat = (seat: Seat): Seat => ((seat + 1) % 4) as Seat;

/** Asientos en orden de palabra empezando por la mano (sentido antihorario). */
export const orderFrom = (mano: Seat): Seat[] => SEATS.map((_, k) => ((mano + k) % 4) as Seat);

/** Rivales de `seat` que participan en el lance, en el orden en que les toca responder. */
export function opponentsAfter(seat: Seat, participants: readonly Seat[]): Seat[] {
  const out: Seat[] = [];
  for (let k = 1; k < 4; k++) {
    const s = ((seat + k) % 4) as Seat;
    if (participants.includes(s) && teamOf(s) !== teamOf(seat)) out.push(s);
  }
  return out;
}
