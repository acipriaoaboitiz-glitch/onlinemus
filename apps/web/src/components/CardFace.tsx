import type { Card } from '@mus/engine';
import { cardName } from '../game/describe.ts';

const CARD_ASSET_BASE = `${import.meta.env.BASE_URL}cards/`;

/** Carta de la baraja española usada por playingcards.io. */
export function CardFace({ card, eightKings = true }: { card: Card; eightKings?: boolean }) {
  const rank = eightKings
    ? card.rank === 2 ? 1 : card.rank === 3 ? 12 : card.rank
    : card.rank;
  const filename = `${String(rank).padStart(2, '0')}-${card.suit}.png`;
  const meaning = eightKings && card.rank === 2
    ? ' (cuenta como as)'
    : eightKings && card.rank === 3
      ? ' (cuenta como rey)'
      : '';

  return (
    <img
      src={`${CARD_ASSET_BASE}${filename}`}
      className="card-svg"
      alt={`${cardName(card)}${meaning}`}
      draggable={false}
    />
  );
}

export function CardBack() {
  return <img src={`${CARD_ASSET_BASE}reverso.png`} className="card-back" alt="" aria-hidden="true" draggable={false} />;
}
