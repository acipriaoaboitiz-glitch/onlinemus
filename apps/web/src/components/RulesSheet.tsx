import { Manual } from './Manual.tsx';
import type { ManualTab } from './Manual.tsx';

/** «Reglas»: el manual completo, abierto por defecto en la sección de puntos. */
export function RulesSheet({ open, onClose, eightKings, tab = 'puntos' }: {
  open: boolean; onClose: () => void; eightKings: boolean; tab?: ManualTab;
}) {
  return <Manual open={open} onClose={onClose} initialTab={tab} eightKings={eightKings} />;
}
