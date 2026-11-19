import type { RoomConfig, Score, Team } from './types.ts';

/**
 * Contador automático. En la mesa real: piedras = 1 punto, amarracos = 5 piedras.
 * Cuando un equipo está a 5 o menos de ganar el juego dice "dentro" (35 de 40, 25 de 30…).
 */
export interface Tally {
  total: number;
  amarracos: number;
  piedras: number;
  dentro: boolean;
}

export function tally(points: number, target: number): Tally {
  const total = Math.max(0, Math.min(points, target));
  return {
    total,
    amarracos: Math.floor(total / 5),
    piedras: total % 5,
    dentro: total >= target - 5 && total < target,
  };
}

export interface TeamBoard extends Tally {
  team: Team;
  juegos: number;
  vacas: number;
}

/** Todo lo que necesita el componente <Scoreboard/> para pintar los dos equipos. */
export function scoreboard(score: Score, config: Pick<RoomConfig, 'targetPoints'>): [TeamBoard, TeamBoard] {
  const board = (team: Team): TeamBoard => ({
    team,
    ...tally(score.points[team], config.targetPoints),
    juegos: score.juegos[team],
    vacas: score.vacas[team],
  });
  return [board(0), board(1)];
}
