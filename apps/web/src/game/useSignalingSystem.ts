import { useCallback, useEffect, useState } from 'react';
import type { GameEvent, Seat, SignId } from '@mus/engine';
import type { GameSource } from './types.ts';

const CATCH_COOLDOWN_MS = 10_000;

export function useSignalingSystem(source: GameSource, mySeat: Seat) {
  const [pulse, setPulse] = useState<Extract<GameEvent, { t: 'signal_pulse' }> | null>(null);
  const [resolution, setResolution] = useState<Extract<GameEvent, { t: 'signal_resolution' }> | null>(null);
  const [activeSignal, setActiveSignal] = useState<{ id: SignId | null; seat: Seat } | null>(null);
  const [signalUntil, setSignalUntil] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [catching, setCatching] = useState(false);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let pulseTimer: ReturnType<typeof setTimeout> | null = null;
    let resolutionTimer: ReturnType<typeof setTimeout> | null = null;
    const off = source.onEvents((events) => {
      for (const event of events) {
        if (event.t === 'signal_pulse') {
          setPulse(event);
          if (pulseTimer !== null) clearTimeout(pulseTimer);
          pulseTimer = setTimeout(() => setPulse(null), 600);
          setSignalUntil(event.at + 3_000);
          setActiveSignal((previous) => ({
            seat: event.seat,
            id: previous?.seat === event.seat ? previous.id : null,
          }));
        }
        if (event.t === 'signal_resolution') {
          if (event.result === 'caught') {
            setSignalUntil(0);
            setActiveSignal(null);
          }
          if (event.result === 'false_alarm' && event.catcher === mySeat) {
            setCooldownUntil(Date.now() + CATCH_COOLDOWN_MS);
          }
          setResolution(event);
          if (resolutionTimer !== null) clearTimeout(resolutionTimer);
          resolutionTimer = setTimeout(() => setResolution(null), 3_200);
        }
      }
    });
    return () => {
      off();
      if (pulseTimer !== null) clearTimeout(pulseTimer);
      if (resolutionTimer !== null) clearTimeout(resolutionTimer);
    };
  }, [mySeat, source]);

  useEffect(() => {
    const update = () => {
      const current = Date.now();
      setNow(current);
      if (signalUntil > 0 && current >= signalUntil) {
        setSignalUntil(0);
        setActiveSignal(null);
      }
    };
    if (cooldownUntil <= Date.now() && signalUntil <= Date.now()) {
      update();
      return;
    }
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [cooldownUntil, signalUntil]);

  useEffect(() => source.onSign((sign) => {
    setActiveSignal({ id: sign.id, seat: sign.from });
    setSignalUntil(sign.at + 3_000);
  }), [source]);

  const sendSignal = useCallback(async (id: SignId) => {
    const error = await source.sendSign(id);
    if (!error) {
      setActiveSignal({ id, seat: mySeat });
      setSignalUntil(Date.now() + 3_000);
    }
    return error;
  }, [mySeat, source]);
  const catchSignal = useCallback(async () => {
    if (Date.now() < cooldownUntil) return 'Espera antes de volver a sospechar';
    if (catching) return 'La sospecha se está resolviendo';
    setCatching(true);
    try {
      return await source.catchSignal();
    } finally {
      setCatching(false);
    }
  }, [catching, cooldownUntil, source]);

  return {
    pulse,
    pulseAt: (seat: Seat) => pulse?.seat === seat ? pulse.at : null,
    activeSignal,
    signalTimer: Math.max(0, signalUntil - now),
    windowOpen: signalUntil > now,
    resolution,
    catchCooldown: Math.max(0, cooldownUntil - now),
    catchCooldownMs: Math.max(0, cooldownUntil - now),
    catching,
    sendSignal,
    catchSignal,
  };
}
