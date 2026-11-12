import { useCallback, useEffect, useState } from 'react';
import type { GameEvent, Seat, SignId } from '@mus/engine';
import type { GameSource } from './types.ts';

const CATCH_COOLDOWN_MS = 2_000;

export function useSignalingSystem(source: GameSource) {
  const [pulse, setPulse] = useState<Extract<GameEvent, { t: 'signal_pulse' }> | null>(null);
  const [resolution, setResolution] = useState<Extract<GameEvent, { t: 'signal_resolution' }> | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let pulseTimer: ReturnType<typeof setTimeout> | null = null;
    let windowTimer: ReturnType<typeof setTimeout> | null = null;
    let resolutionTimer: ReturnType<typeof setTimeout> | null = null;
    const off = source.onEvents((events) => {
      for (const event of events) {
        if (event.t === 'signal_pulse') {
          setPulse(event);
          if (pulseTimer !== null) clearTimeout(pulseTimer);
          pulseTimer = setTimeout(() => setPulse(null), 600);
          setWindowOpen(true);
          if (windowTimer !== null) clearTimeout(windowTimer);
          // Solo controla la indicación local; el servidor decide si la ventana sigue abierta.
          windowTimer = setTimeout(() => setWindowOpen(false), 3_000);
        }
        if (event.t === 'signal_resolution') {
          setWindowOpen(false);
          if (windowTimer !== null) clearTimeout(windowTimer);
          setResolution(event);
          if (resolutionTimer !== null) clearTimeout(resolutionTimer);
          resolutionTimer = setTimeout(() => setResolution(null), 3_200);
        }
      }
    });
    return () => {
      off();
      if (pulseTimer !== null) clearTimeout(pulseTimer);
      if (windowTimer !== null) clearTimeout(windowTimer);
      if (resolutionTimer !== null) clearTimeout(resolutionTimer);
    };
  }, [source]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) {
      setNow(Date.now());
      return;
    }
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const sendSignal = useCallback((id: SignId) => source.sendSign(id), [source]);
  const catchSignal = useCallback(async () => {
    if (Date.now() < cooldownUntil) return 'Espera un momento antes de volver a sospechar';
    setCooldownUntil(Date.now() + CATCH_COOLDOWN_MS);
    return source.catchSignal();
  }, [cooldownUntil, source]);

  return {
    pulse,
    pulseAt: (seat: Seat) => pulse?.seat === seat ? pulse.at : null,
    windowOpen,
    resolution,
    catchCooldownMs: Math.max(0, cooldownUntil - now),
    sendSignal,
    catchSignal,
  };
}
