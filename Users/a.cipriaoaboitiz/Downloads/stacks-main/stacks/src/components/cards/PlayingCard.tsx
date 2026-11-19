import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { AnyCard } from '../../engine/deck.ts';
import { FRENCH_ASPECT, cardLabel } from '../../engine/deck.ts';
import { CardBackArt, FrenchFace } from './FrenchFace.tsx';
import { SpanishFace } from './SpanishFace.tsx';
import { CAN_HOVER } from '../../store/settings.ts';

const ASPECT = 480 / 760; // proporción real de las cartas Fournier
const ASSET = `${import.meta.env.BASE_URL}cards/`;

export type BackVariant = 'emerald' | 'crimson' | 'midnight';

interface Props {
  card: AnyCard;
  /** true = se ve el reverso. Al cambiar, la carta hace un volteo 3D real (rotateY). */
  faceDown?: boolean;
  /** Ancho en px (el alto sale de la proporción de la carta). */
  width?: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  layoutId?: string;
  back?: BackVariant;
  /** Borde de pan de oro (cartas VIP / resaltadas). */
  vip?: boolean;
  /** Rotación base en grados (abanico, caída natural sobre la mesa). */
  rotate?: number;
  /** Sello del reverso. */
  seal?: string;
  /** Cartas del abanico: se elevan al pasar el dedo/ratón. */
  lift?: boolean;
  className?: string;
}

/** Arte auténtico Fournier (public/cards/NN-palo.webp); si falta la imagen, ilustración SVG equivalente con pintas. */
function Face({ card }: { card: AnyCard }) {
  const [failed, setFailed] = useState(false);
  if (card.deck === 'fr') return <FrenchFace card={card} />;
  if (failed) return <SpanishFace card={card} />;
  return (
    <img src={`${ASSET}${String(card.rank).padStart(2, '0')}-${card.suit}.webp`} alt="" draggable={false}
      onError={() => setFailed(true)} style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} />
  );
}

/**
 * Carta física de lujo (española 40 / francesa 52): marfil, doble marco, sombras de profundidad y volteo 3D.
 * Dos caras con `backface-visibility: hidden` dentro de un contenedor que rota en Y.
 */
export function PlayingCard({
  card, faceDown = false, width = 72, selected, dimmed, onClick, layoutId, back = 'emerald', vip, rotate = 0, seal, lift, className,
}: Props) {
  const height = Math.round(width / (card.deck === 'fr' ? FRENCH_ASPECT : ASPECT));
  const radius = 0;
  const side: CSSProperties = {
    position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    borderRadius: radius, overflow: 'hidden',
    boxShadow: vip
      ? '0 0 0 2px #eab308, 0 0 18px rgba(234,179,8,.55), 0 12px 20px rgba(0,0,0,.55)'
      : '0 1px 0 rgba(255,255,255,.5) inset, 0 12px 24px rgba(0,0,0,0.65)',
  };

  const inner = (
    <motion.div
      initial={false}
      animate={{ rotateY: faceDown ? 180 : 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      style={{ position: 'relative', width, height, transformStyle: 'preserve-3d' }}
    >
      <div style={side} className="card-face card-front"><Face card={card} /><span className="card-sheen" aria-hidden /></div>
      <div style={{ ...side, transform: 'rotateY(180deg)' }} className="card-face"><CardBackArt variant={back} seal={seal} /></div>
    </motion.div>
  );

  const common = {
    layoutId,
    animate: { y: selected ? -14 : 0, rotate, opacity: dimmed ? 0.62 : 1 },
    transition: { type: 'spring' as const, stiffness: 320, damping: 26 },
    style: { width, height, perspective: 800, flexShrink: 0 },
  };
  const cls = className;

  if (!onClick) return <motion.div {...common} className={cls}>{inner}</motion.div>;
  return (
    <motion.button type="button" className={`card-btn ${cls ?? ''}`} whileTap={{ scale: 0.95 }} onClick={onClick}
      whileHover={lift && CAN_HOVER ? { y: -22, scale: 1.08, rotate: 0, zIndex: 30 } : undefined} {...common}
      aria-pressed={selected} aria-label={faceDown ? 'Carta boca abajo' : cardLabel(card)}
      style={{
        ...common.style, background: 'none', border: 0, padding: 0, borderRadius: radius,
        outline: selected ? '2px solid #fef08a' : undefined, outlineOffset: 2,
      }}>
      {inner}
    </motion.button>
  );
}

/** Mazo 3D: el grosor real se ve como un canto marfil en el lateral derecho/inferior (una capa por ~3 cartas). */
export function DeckPile({ count, width = 60, back = 'emerald', seal }: { count: number; width?: number; deck?: 'es' | 'fr'; back?: BackVariant; seal?: string }) {
  const height = Math.round(width / ASPECT);
  const layers = Math.max(1, Math.min(14, Math.ceil(count / 3)));
  const radius = 0;
  return (
    <div style={{ position: 'relative', width: width + layers * 1.1, height: height + layers * 1.5 }} aria-label={`Mazo: ${count} cartas`}>
      {Array.from({ length: layers - 1 }, (_, k) => {
        const i = layers - 1 - k;
        return (
          <div key={i} style={{
            position: 'absolute', left: 0, top: 0, width, height, transform: `translate(${i * 1.1}px, ${i * 1.5}px)`,
            borderRadius: radius, background: i % 2 ? '#e8dcc0' : '#cdbf9c', border: '1px solid rgba(60,40,10,.55)',
            boxShadow: i === layers - 1 ? '4px 8px 14px rgba(0,0,0,.6)' : undefined,
          }} />
        );
      })}
      <div style={{ position: 'absolute', left: 0, top: 0, width, height, overflow: 'hidden', borderRadius: radius, boxShadow: '0 1px 0 rgba(255,255,255,.4) inset' }}>
        <CardBackArt variant={back} seal={seal} />
      </div>
    </div>
  );
}

export const cardHeight = (width: number): number => Math.round(width / ASPECT);
