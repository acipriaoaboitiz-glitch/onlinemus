import { useSyncExternalStore } from 'react';

export interface ToastItem {
  id: number;
  text: string;
  tone: 'info' | 'error' | 'ok';
}

let items: ToastItem[] = [];
let seq = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((s) => s());

export function toast(text: string, tone: ToastItem['tone'] = 'info', ms = 2800): void {
  const id = ++seq;
  items = [...items, { id, text, tone }].slice(-3);
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, ms);
}

export function useToasts(): ToastItem[] {
  return useSyncExternalStore(
    (cb) => { subs.add(cb); return () => { subs.delete(cb); }; },
    () => items,
    () => items,
  );
}
