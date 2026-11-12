import type { Bubble } from '../game/describe.ts';
import type { SeatInfo } from '../game/types.ts';
import { motion } from 'framer-motion';
import { Avatar } from './ui.tsx';
import { CardBack } from './CardFace.tsx';

interface SeatBadgeProps {
  info: SeatInfo;
  tone: 'us' | 'them' | 'me';
  mano: boolean;
  turn: boolean;
  bubble?: Bubble;
  deadline: number | null;
  cards: number;
  signalPulseAt?: number | null;
}

/** Jugador en la mesa: avatar con anillo de turno (cuenta atrás), mano, estado de conexión y su último "grito". */
export function SeatBadge({ info, tone, mano, turn, bubble, deadline, cards, signalPulseAt }: SeatBadgeProps) {
  const name = info.name ?? 'Libre';
  const remaining = deadline ? Math.max(0, deadline - Date.now()) : 0;
  return (
    <div className={`seat seat--${tone}${turn ? ' seat--turn' : ''}`} role="group" aria-label={`${name}${turn ? ', tiene el turno' : ''}${mano ? ', es mano' : ''}`}>
      <motion.div
        className="seat__avatar"
        key={signalPulseAt ?? 'idle'}
        animate={signalPulseAt
          ? { boxShadow: ['0 0 0 rgba(234,179,8,0)', '0 0 18px rgba(234,179,8,.75)', '0 0 0 rgba(234,179,8,0)'] }
          : undefined}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {turn && deadline !== null && (
          <svg className="ring" viewBox="0 0 56 56" key={deadline} aria-hidden="true">
            <circle cx="28" cy="28" r="26" pathLength={100} style={{ animationDuration: `${remaining}ms` }} />
          </svg>
        )}
        <Avatar name={name} tone={tone} size={46} />
        {mano && <span className="seat__mano" title="Mano">M</span>}
        {!info.isBot && <span className={`seat__dot${info.online ? ' on' : ''}`} title={info.online ? 'Conectado' : 'Desconectado'} />}
      </motion.div>
      <span className="seat__name">{name}</span>
      <span className="seat__cards" aria-label={`${cards} cartas`}>
        {Array.from({ length: cards }, (_, i) => (<span key={i} className="seat__card"><CardBack /></span>))}
      </span>
      {bubble && <span key={bubble.at} className={`bubble bubble--${bubble.tone}`}>{bubble.text}</span>}
    </div>
  );
}
