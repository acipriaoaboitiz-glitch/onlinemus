import { useNavigate, useSearchParams } from 'react-router-dom';
import { isValidRoomCode } from '../../services/multiplayer.ts';
import { useWallet } from '../../store/wallet.ts';
import { getMusModule } from './adapter.ts';
import MusApp from './MusApp.tsx';
import { exitMatch } from '../../services/exitMatch.ts';

/** Contenedor de `/play/mus`: monta el módulo registrado o, por defecto, la mesa de Mus Online incluida (MusApp). */
export default function MusPlay() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { name } = useWallet();
  const code = params.get('room') ?? undefined;
  const roomCode = code && isValidRoomCode(code) ? code : undefined;
  const mod = getMusModule();

  if (mod) return <mod.Table roomCode={roomCode} playerName={name} onExit={() => void exitMatch(nav)} />;
  return <MusApp roomCode={roomCode} />;
}
