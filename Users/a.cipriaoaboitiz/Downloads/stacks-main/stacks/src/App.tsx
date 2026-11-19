import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { WelcomeGate } from './components/ui/WelcomeGate.tsx';
import { ClubBackground } from './components/ui/ClubBackground.tsx';
import { SocialRoot } from './components/ui/SocialRoot.tsx';
import { ChipRainHost } from './components/ui/ChipRain.tsx';
import { ErrorBoundary } from './components/ui/ErrorBoundary.tsx';
import Blackjack from './games/blackjack/Blackjack.tsx';
import Brisca from './games/brisca/Brisca.tsx';
import Escoba from './games/escoba/Escoba.tsx';
import Uno from './games/uno/Uno.tsx';
import MusPlay from './games/mus/MusPlay.tsx';
import Chinchon from './games/chinchon/Chinchon.tsx';
import Poker from './games/poker/Poker.tsx';
import Presidente from './games/presidente/Presidente.tsx';
import Seises from './games/seises/Seises.tsx';
import Tute from './games/tute/Tute.tsx';
import Domino from './games/domino/Domino.tsx';
import Mentiroso from './games/mentiroso/Mentiroso.tsx';
import Ruleta from './games/ruleta/Ruleta.tsx';
import TresEnRaya from './games/tres/TresEnRaya.tsx';
import CuatroEnRaya from './games/cuatro/CuatroEnRaya.tsx';
import Flota from './games/flota/Flota.tsx';
import Parchis from './games/parchis/Parchis.tsx';
import Ajedrez from './games/ajedrez/Ajedrez.tsx';
import Damas from './games/damas/Damas.tsx';
import Solitario from './games/solitario/Solitario.tsx';
import Mahjong from './games/mahjong/Mahjong.tsx';
import Game2048 from './games/game2048/Game2048.tsx';
import Sudoku from './games/sudoku/Sudoku.tsx';
import Buscaminas from './games/buscaminas/Buscaminas.tsx';
import Home from './pages/Home.tsx';

// Enlace directo a mesa: «?sala=CODIGO» (WhatsApp, etc.) se traslada al hash que lee el router.
try {
  const q = new URLSearchParams(window.location.search);
  if (q.has('sala') || q.has('join')) window.history.replaceState(null, '', `${window.location.pathname}#/?${q.toString()}`);
} catch { /* sin history */ }

// HashRouter: funciona en hosting estático, PWA y dentro de Capacitor sin reescrituras de servidor.
export default function App() {
  return (
    <ErrorBoundary>
    <ClubBackground />
    <WelcomeGate>
    <HashRouter>
      <SocialRoot />
      <ChipRainHost />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play/mus" element={<MusPlay />} />
        <Route path="/play/blackjack" element={<Blackjack />} />
        <Route path="/play/brisca" element={<Brisca />} />
        <Route path="/play/escoba" element={<Escoba />} />
        <Route path="/play/uno" element={<Uno />} />
        <Route path="/play/chinchon" element={<Chinchon />} />
        <Route path="/play/tute" element={<Tute />} />
        <Route path="/play/poker" element={<Poker />} />
        <Route path="/play/comemierda" element={<Presidente />} />
        <Route path="/play/presidente" element={<Presidente />} />
        <Route path="/play/seises" element={<Seises />} />
        <Route path="/play/domino" element={<Domino />} />
        <Route path="/play/mentiroso" element={<Mentiroso />} />
        <Route path="/play/ruleta" element={<Ruleta />} />
        <Route path="/play/tres" element={<TresEnRaya />} />
        <Route path="/play/cuatro" element={<CuatroEnRaya />} />
        <Route path="/play/flota" element={<Flota />} />
        <Route path="/play/parchis" element={<Parchis />} />
        <Route path="/play/ajedrez" element={<Ajedrez />} />
        <Route path="/play/damas" element={<Damas />} />
        <Route path="/play/solitario" element={<Solitario />} />
        <Route path="/play/mahjong" element={<Mahjong />} />
        <Route path="/play/2048" element={<Game2048 />} />
        <Route path="/play/sudoku" element={<Sudoku />} />
        <Route path="/play/buscaminas" element={<Buscaminas />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
    </WelcomeGate>
    </ErrorBoundary>
  );
}
