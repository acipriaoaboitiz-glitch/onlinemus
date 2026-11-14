import { useEffect, useRef, useState } from 'react';
import { SIGNS, signIsTruthful } from '@mus/engine';
import type { Card, GameEvent, RoomConfig, Seat, SignId } from '@mus/engine';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CAUGHT_HOLD_MS } from '../game/useTableDirector.ts';
import type { CaughtCine } from '../game/useTableDirector.ts';
import type { IncomingSign } from '../game/types.ts';
import { haptic } from '../lib/feedback.ts';
import { IconEye, IconHand } from './icons.tsx';
import { TableAvatar } from './TableAvatar.tsx';

// ═════════════════════════════ Disparador: tu avatar ═════════════════════════════

const HOLD_MS = 450;
export interface Anchor { x: number; y: number }

/**
 * Tu avatar es el disparador de las señas: lleva una manita discreta y, al mantenerlo pulsado, se abre el menú radial.
 * Sin etiquetas ni colores llamativos: nadie que mire por encima del hombro debería notarlo.
 */
export function SignTrigger({ name, disabled, pulseAt, onOpen }: {
  name: string; disabled?: boolean; pulseAt: number | null; onOpen: (anchor: Anchor) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);

  const cancel = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    setPressing(false);
  };
  useEffect(() => () => { if (timer.current !== null) clearTimeout(timer.current); }, []);

  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    onOpen(r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : { x: window.innerWidth / 2, y: window.innerHeight * 0.7 });
  };
  const start = () => {
    if (disabled) return;
    setPressing(true);
    timer.current = setTimeout(() => { timer.current = null; setPressing(false); haptic(14); open(); }, HOLD_MS);
  };

  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      aria-label="Mantén pulsado para pasar una seña a tu pareja"
      title="Mantén pulsado: señas"
      className="relative grid touch-none select-none place-items-center rounded-full p-[3px] outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-60"
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); } }}
    >
      <TableAvatar name={name} tone="me" className="size-[30px] text-[13px]" />
      <span className="absolute -bottom-[3px] -right-[3px] grid size-[15px] place-items-center rounded-full bg-zinc-950/80 text-amber-200/80 ring-1 ring-amber-200/30 [&>svg]:size-[10px]" aria-hidden="true">
        <IconHand />
      </span>
      {pressing && (
        <svg className="pointer-events-none absolute inset-[-2px] size-[calc(100%+4px)] -rotate-90" viewBox="0 0 40 40" aria-hidden="true">
          <motion.circle cx="20" cy="20" r="18.5" fill="none" stroke="#f0c35f" strokeWidth="2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: HOLD_MS / 1000, ease: 'linear' }} />
        </svg>
      )}
      {pulseAt !== null && (
        <motion.span
          key={pulseAt}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          initial={{ boxShadow: '0 0 0 rgba(234,179,8,0)' }}
          animate={{ boxShadow: ['0 0 0 rgba(234,179,8,0)', '0 0 18px rgba(234,179,8,.8)', '0 0 0 rgba(234,179,8,0)'] }}
          transition={{ duration: 0.5 }}
        />
      )}
    </button>
  );
}

// ═════════════════════════════ Menú radial de señas ═════════════════════════════

type GroupId = 'cartas' | 'jugada' | 'mus';
const GROUPS: { id: GroupId; label: string }[] = [
  { id: 'cartas', label: 'Cartas' },
  { id: 'jugada', label: 'Jugada' },
  { id: 'mus', label: 'Mus' },
];

/** Etiqueta compacta de cada seña dentro de su nodo; el nombre completo y el gesto salen en el centro. */
const SHORT: Record<SignId, { top: string; sub: string }> = {
  ciego: { top: '—', sub: 'ciego' },
  dos_reyes: { top: '2', sub: 'reyes' },
  tres_reyes: { top: '3', sub: 'reyes' },
  cuatro_reyes: { top: '4', sub: 'reyes' },
  solomillo: { top: '3+1', sub: 'solom.' },
  dos_cerdos: { top: '2', sub: 'cerdos' },
  tres_cerdos: { top: '3', sub: 'cerdos' },
  cuatro_cerdos: { top: '4', sub: 'cerdos' },
  medias: { top: 'M', sub: 'medias' },
  duples: { top: 'D', sub: 'duples' },
  treinta_y_una: { top: '31', sub: 'juego' },
  treinta: { top: '30', sub: 'punto' },
  quiero_mus: { top: '¿?', sub: 'mus' },
  no_mus: { top: '✂', sub: 'corta' },
};

const RADIUS = 112;
const NODE = 52;
const GROUP_NODE = 64;
const HUB = 108;

const place = (i: number, n: number) => {
  const a = (-90 + (i * 360) / n) * (Math.PI / 180);
  return { x: Math.cos(a) * RADIUS, y: Math.sin(a) * RADIUS };
};

/**
 * Menú circular semitransparente alrededor de tu avatar. Nivel 1: tres grupos (Cartas · Jugada · Mus).
 * Nivel 2: las señas del grupo en círculo. Tocar una la marca (el centro muestra su gesto) y tocar el centro la envía:
 * así una pulsación torpe nunca delata nada. Las señas que no coinciden con tu mano salen apagadas.
 */
export function SignRadialMenu({ open, anchor, onClose, hand, config, onSend }: {
  open: boolean; anchor: Anchor; onClose: () => void; hand: Card[]; config: RoomConfig; onSend: (id: SignId) => void | Promise<unknown>;
}) {
  const reduce = useReducedMotion();
  const [group, setGroup] = useState<GroupId | null>(null);
  const [selected, setSelected] = useState<SignId | null>(null);

  useEffect(() => { if (open) { setGroup(null); setSelected(null); } }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // El círculo se ancla al avatar, pero nunca se sale de la pantalla.
  const pad = RADIUS + GROUP_NODE / 2 + 10;
  const vw = typeof window === 'undefined' ? 390 : window.innerWidth;
  const vh = typeof window === 'undefined' ? 844 : window.innerHeight;
  const cx = Math.max(pad, Math.min(vw - pad, anchor.x));
  const cy = Math.max(pad + 8, Math.min(vh - pad - 8, anchor.y));

  const items = group ? SIGNS.filter((s) => s.group === group) : [];
  const def = selected ? SIGNS.find((s) => s.id === selected) ?? null : null;
  const truthful = (id: SignId) => !config.truthfulSigns || signIsTruthful(id, hand, config);

  const send = (id: SignId) => { void onSend(id); onClose(); };
  const hub = () => {
    if (selected) send(selected);
    else if (group) { setGroup(null); setSelected(null); }
    else onClose();
  };
  const spring = { type: 'spring' as const, stiffness: 320, damping: 22 };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="radial"
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
          aria-label="Señas para tu pareja"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <button type="button" aria-label="Cerrar señas" className="absolute inset-0 cursor-default bg-black/45 backdrop-blur-[3px]" onClick={onClose} />

          <div className="pointer-events-none absolute" style={{ left: cx, top: cy }}>
            {/* Aro translúcido */}
            <motion.div
              aria-hidden="true"
              className="absolute rounded-full border border-white/15 bg-zinc-950/50 shadow-[0_0_60px_rgba(0,0,0,.55),inset_0_0_30px_rgba(240,195,95,.06)] backdrop-blur-xl"
              style={{ left: -(RADIUS + 26), top: -(RADIUS + 26), width: (RADIUS + 26) * 2, height: (RADIUS + 26) * 2 }}
              initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={spring}
            />
            <div aria-hidden="true" className="absolute rounded-full border border-dashed border-amber-200/15" style={{ left: -RADIUS, top: -RADIUS, width: RADIUS * 2, height: RADIUS * 2 }} />

            {/* Nodos: primero los grupos, luego las señas del grupo */}
            <AnimatePresence mode="wait">
              <motion.div key={group ?? 'root'} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
                {!group && GROUPS.map((g, i) => {
                  const p = place(i, GROUPS.length);
                  return (
                    <motion.button
                      key={g.id}
                      type="button"
                      className="pointer-events-auto absolute grid place-items-center rounded-full border border-amber-200/40 bg-gradient-to-br from-amber-300/25 to-zinc-900/80 text-[11px] font-extrabold uppercase tracking-wide text-amber-100 shadow-[0_6px_18px_rgba(0,0,0,.4)]"
                      style={{ left: -GROUP_NODE / 2, top: -GROUP_NODE / 2, width: GROUP_NODE, height: GROUP_NODE }}
                      initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                      animate={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                      transition={reduce ? { duration: 0 } : { ...spring, delay: i * 0.05 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => { haptic(8); setGroup(g.id); setSelected(null); }}
                    >
                      {g.label}
                    </motion.button>
                  );
                })}
                {group && items.map((s, i) => {
                  const p = place(i, items.length);
                  const ok = truthful(s.id);
                  const on = selected === s.id;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      disabled={!ok}
                      aria-label={`${s.label}: ${s.gesture}`}
                      aria-pressed={on}
                      className={`pointer-events-auto absolute grid place-items-center rounded-full border leading-none shadow-[0_6px_16px_rgba(0,0,0,.4)] ${
                        on ? 'border-amber-200 bg-amber-300 text-amber-950' : 'border-white/20 bg-zinc-900/85 text-stone-100'
                      }`}
                      style={{ left: -NODE / 2, top: -NODE / 2, width: NODE, height: NODE }}
                      initial={{ x: 0, y: 0, scale: 0.3, opacity: 0 }}
                      animate={{ x: p.x, y: p.y, scale: on ? 1.16 : 1, opacity: ok ? 1 : 0.28 }}
                      transition={reduce ? { duration: 0 } : { ...spring, delay: i * 0.03 }}
                      whileTap={ok ? { scale: 0.92 } : undefined}
                      onClick={() => { if (on) send(s.id); else { haptic(8); setSelected(s.id); } }}
                    >
                      <b className="text-[15px] font-extrabold">{SHORT[s.id].top}</b>
                      <small className="mt-[2px] text-[8.5px] font-bold uppercase tracking-tight opacity-80">{SHORT[s.id].sub}</small>
                    </motion.button>
                  );
                })}
              </motion.div>
            </AnimatePresence>

            {/* Centro: información de la seña marcada, y botón de enviar / volver / cerrar */}
            <motion.button
              type="button"
              aria-label={selected ? 'Enviar la seña marcada a tu pareja' : group ? 'Volver a los grupos' : 'Cerrar'}
              className={`pointer-events-auto absolute grid place-items-center rounded-full border p-3 text-center shadow-[0_8px_30px_rgba(0,0,0,.5)] ${
                selected ? 'border-amber-200 bg-gradient-to-br from-amber-300/30 to-zinc-900/90' : 'border-white/15 bg-zinc-950/80'
              }`}
              style={{ left: -HUB / 2, top: -HUB / 2, width: HUB, height: HUB }}
              initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={spring}
              whileTap={{ scale: 0.95 }}
              onClick={hub}
            >
              {def ? (
                <span className="grid gap-[2px]">
                  <b className="text-[13px] font-extrabold leading-tight text-amber-100">{def.label}</b>
                  <small className="line-clamp-3 text-[9.5px] leading-tight text-stone-300">{def.gesture}</small>
                  <em className="text-[9px] font-bold uppercase not-italic tracking-wider text-amber-300">Toca: enviar</em>
                </span>
              ) : group ? (
                <span className="grid gap-[2px]">
                  <b className="text-[13px] font-extrabold text-stone-100">‹ Volver</b>
                  <small className="text-[10px] text-stone-400">Elige una seña</small>
                </span>
              ) : (
                <span className="grid justify-items-center gap-1 text-stone-300">
                  <span className="[&>svg]:size-[22px]"><IconHand /></span>
                  <b className="text-[12px] font-extrabold">Señas</b>
                  <small className="text-[9.5px] text-stone-400">Solo tu pareja las ve</small>
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═════════════════════════════ Pillar: el ojo ═════════════════════════════

/** Ojo discreto: «¡Pillada!». Un anillo rojo late mientras hay una seña rival viva; tras una falsa alarma se bloquea. */
export function CatchEyeButton({ cooldownMs, disabled, windowOpen, onClick }: {
  cooldownMs: number; disabled?: boolean; windowOpen?: boolean; onClick: () => void;
}) {
  const blocked = cooldownMs > 0;
  return (
    <motion.button
      type="button"
      className="relative grid size-10 place-items-center rounded-full border border-orange-300/30 bg-orange-300/[.08] text-orange-200 transition-colors enabled:hover:bg-orange-300/20 disabled:opacity-40"
      disabled={disabled || blocked}
      onClick={onClick}
      title="¡Pillada! Sospecho de una seña rival"
      aria-label="¡Pillada! Sospecho que un rival ha pasado una seña"
      animate={windowOpen ? { boxShadow: ['0 0 0 rgba(255,77,94,0)', '0 0 16px rgba(255,77,94,.6)', '0 0 0 rgba(255,77,94,0)'] } : { boxShadow: '0 0 0 rgba(255,77,94,0)' }}
      transition={windowOpen ? { duration: 1.1, repeat: Infinity } : { duration: 0.2 }}
      whileTap={{ scale: 0.9 }}
    >
      <IconEye />
      {blocked && (
        <span className="absolute -bottom-1 -right-1 grid min-w-[17px] place-items-center rounded-full bg-zinc-950 px-1 text-[9px] font-extrabold text-stone-300 ring-1 ring-white/15">
          {Math.ceil(cooldownMs / 1000)}
        </span>
      )}
    </motion.button>
  );
}

// ═════════════════════════════ Cinemáticas ═════════════════════════════

const seatName = (names: readonly string[], seat: Seat | null, mySeat: Seat): string =>
  seat === null ? '' : seat === mySeat ? 'Tú' : names[seat] || `Jugador ${seat + 1}`;

/**
 * SEÑA CAZADA. La mesa se congela al instante: filtro rojo/dorado oscuro sobre toda la pantalla, destello, sacudida y un
 * cartel agresivo en el centro durante CAUGHT_HOLD_MS (3,6 s), con una barra que se vacía para que se vea cuánto falta.
 */
export function SignalCaughtOverlay({ caught, names, mySeat }: { caught: CaughtCine | null; names: readonly string[]; mySeat: Seat }) {
  const reduce = useReducedMotion();
  const ev = caught?.event ?? null;
  const sign = ev?.signalId ? SIGNS.find((s) => s.id === ev.signalId) ?? null : null;
  const actor = ev ? seatName(names, ev.signalSeat ?? ev.catcher, mySeat) : '';
  const catcher = ev ? seatName(names, ev.catcher, mySeat) : '';

  return (
    <AnimatePresence>
      {caught && ev && (
        <motion.div
          key={caught.key}
          role="alert"
          className="absolute inset-0 z-50 grid place-items-center overflow-hidden px-5"
          initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.1 } }} exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          {/* Filtro rojo/dorado oscuro */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(170,20,35,.55)_0%,rgba(60,8,14,.88)_50%,rgba(6,2,3,.97)_100%)] backdrop-blur-[3px]" />
          <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(240,195,95,.12)_50%,transparent_60%)]" />
          {/* Destello dorado del impacto */}
          <motion.div className="absolute inset-0 bg-amber-200" initial={{ opacity: 0.85 }} animate={{ opacity: 0 }} transition={{ duration: 0.55, ease: 'easeOut' }} />

          <motion.div
            className="relative grid w-full max-w-[640px] justify-items-center gap-[min(2dvh,16px)] text-center"
            animate={reduce ? undefined : { x: [0, -12, 10, -7, 5, -2, 0] }}
            transition={{ duration: 0.5, delay: 0.12 }}
          >
            <motion.span
              className="rounded-full border border-amber-300/60 bg-black/40 px-4 py-1 text-[11px] font-black uppercase tracking-[.4em] text-amber-300"
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
            >
              ¡Pillada!
            </motion.span>

            <motion.h2
              className="font-sans text-[clamp(56px,19vw,120px)] font-black uppercase italic leading-[.84] tracking-tighter [-webkit-text-stroke:1.5px_rgba(0,0,0,.55)] drop-shadow-[0_8px_28px_rgba(220,38,38,.7)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 2.6, rotate: -9 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: -3, transition: { type: 'spring', stiffness: 320, damping: 15 } }}
            >
              <span className="block bg-gradient-to-b from-amber-100 via-amber-400 to-amber-600 bg-clip-text text-transparent">Seña</span>
              <span className="block bg-gradient-to-b from-red-400 via-red-500 to-red-800 bg-clip-text text-transparent">cazada</span>
            </motion.h2>

            <motion.span
              aria-hidden="true"
              className="h-[3px] w-[min(70vw,380px)] origin-left bg-gradient-to-r from-amber-400 via-red-500 to-transparent"
              initial={{ scaleX: 0 }} animate={{ scaleX: 1, transition: { delay: 0.35, duration: 0.5, ease: 'easeOut' } }}
            />

            <motion.div
              className="grid gap-1"
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.7, duration: 0.5 } }}
            >
              <p className="text-[clamp(17px,5vw,26px)] font-extrabold text-stone-50">
                {actor} pasaba <span className="text-amber-300">«{sign?.label ?? 'una seña'}»</span>
              </p>
              {sign && <p className="text-[clamp(12px,3.4vw,15px)] italic text-amber-100/70">{sign.gesture}</p>}
              <p className="pt-1 text-[12px] font-semibold uppercase tracking-[.16em] text-red-200/80">Lo ha pillado {catcher} · la seña queda expuesta</p>
            </motion.div>
          </motion.div>

          {/* Cuenta atrás visible */}
          <motion.span
            aria-hidden="true"
            className="absolute bottom-0 left-0 h-[5px] w-full origin-left bg-gradient-to-r from-amber-400 to-red-500"
            initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: CAUGHT_HOLD_MS / 1000, ease: 'linear' }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Falsa alarma: aviso breve (no congela la mesa). Quien sospechó queda bloqueado 10 s. */
export function FalseAlarmToast({ event, names, mySeat }: {
  event: Extract<GameEvent, { t: 'signal_resolution' }> | null; names: readonly string[]; mySeat: Seat;
}) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          key={`${event.catcher}-${event.team}`}
          role="alert"
          className="pointer-events-none absolute inset-x-0 top-[24%] z-[45] flex justify-center px-6"
          initial={{ opacity: 0, y: -14, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.25 } }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <div className="grid max-w-[420px] gap-1 rounded-2xl border border-amber-300/40 bg-zinc-950/90 px-5 py-3 text-center shadow-[0_12px_40px_rgba(0,0,0,.5)] backdrop-blur-md">
            <span className="text-[10px] font-black uppercase tracking-[.3em] text-amber-300">Falsa alarma</span>
            <b className="text-[15px] text-stone-50">{seatName(names, event.catcher, mySeat)}: no había una seña activa</b>
            <small className="text-[12px] text-stone-400">No podrá volver a sospechar durante 10 segundos</small>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Lo que te llega de tu pareja: solo aparece en tu pantalla. */
export function SignToast({ sign, partner }: { sign: IncomingSign | null; partner: string }) {
  const def = sign ? SIGNS.find((s) => s.id === sign.id) ?? null : null;
  return (
    <AnimatePresence>
      {sign && def && (
        <motion.div
          key={sign.at}
          role="status"
          className="flex items-center gap-2.5 rounded-2xl border border-amber-300/70 bg-zinc-900/95 px-3 py-2 text-amber-300 shadow-[0_10px_24px_rgba(0,0,0,.4)] backdrop-blur-md"
          initial={{ opacity: 0, y: 16, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, transition: { duration: 0.2 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          <span className="[&>svg]:size-[22px]"><IconHand /></span>
          <div className="grid leading-tight">
            <small className="text-[11px] text-stone-400">{partner} te hace una seña</small>
            <b className="font-[var(--font-display)] text-[18px] text-stone-50">{def.label}</b>
            <em className="text-[11.5px] not-italic text-stone-300">{def.gesture}</em>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
