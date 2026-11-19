import { useSearchParams } from 'react-router-dom';
import { juice } from '../../services/juice.ts';
import { progression } from '../../store/progression.ts';
import { feedback } from '../../store/settings.ts';
import { wallet } from '../../store/wallet.ts';
import { findGame } from '../registry.ts';

/** Modo/dificultad elegidos en el lobby (`?mode=`), con el valor por defecto del juego si falta o no es válido. */
export function useSoloMode(gameId: string): string {
  const [params] = useSearchParams();
  const solo = findGame(gameId)?.solo;
  const m = params.get('mode') ?? '';
  const modes = solo?.modes ?? ['normal'];
  return modes.includes(m) ? m : (solo?.def ?? modes[0]!);
}

/** Premio por completar un juego individual: fichas, victoria registrada (misiones), fanfarria y cinemática. */
export function rewardSolo(gameId: string, chips: number, title: string): void {
  wallet.add(chips);
  wallet.recordWin(gameId);
  wallet.recordResult(true);
  progression.track('hand', gameId);
  feedback('jingle');
  juice.chips('me', 12);
  juice.cinematic({ title, sub: `+${chips}`, tone: 'gold', good: true });
}
